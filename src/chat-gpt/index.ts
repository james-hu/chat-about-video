import type {
  ChatCompletions,
  ChatMessageContentItem,
  ChatRequestMessage,
  ChatRequestUserMessage,
  GetChatCompletionsOptions,
  OpenAIClientOptions,
} from '@azure/openai';

import { OpenAIClient } from '@azure/openai';
import { generateRandomString } from '@handy-common-utils/misc-utils';
import os from 'node:os';
import path from 'node:path';

import {
  BuildVideoPromptOutput,
  ChatAPI,
  ChatApiClientOptions,
  ExtractVideoFramesOptions,
  StorageOptions,
  VideoRetrievalIndexOptions,
} from '../types';
import { effectiveExtractVideoFramesOptions, effectiveStorageOptions, effectiveVideoRetrievalIndexOptions } from '../utils';

export type ChatGptClientOptions = ChatApiClientOptions<OpenAIClientOptions, GetChatCompletionsOptions>;

export type ChatGptPromptContent = Parameters<OpenAIClient['getChatCompletions']>[1];
export type ChatGptCompletionOptions = Parameters<OpenAIClient['getChatCompletions']>[2];

export class ChatGptApi implements ChatAPI<OpenAIClient, ChatGptCompletionOptions, ChatGptPromptContent, ChatCompletions> {
  protected client: OpenAIClient;
  protected storage: ReturnType<typeof effectiveStorageOptions>;
  protected extractVideoFrames?: ReturnType<typeof effectiveExtractVideoFramesOptions>;
  protected videoRetrievalIndex?: ReturnType<typeof effectiveVideoRetrievalIndexOptions>;
  protected tmpDir: string;

  constructor(
    protected options: {
      videoRetrievalIndex?: VideoRetrievalIndexOptions;
      extractVideoFrames?: ExtractVideoFramesOptions;
      storage: StorageOptions;
    } & ChatGptClientOptions,
  ) {
    const { credential, endpoint, clientSettings } = options;
    this.client = endpoint ? new OpenAIClient(endpoint, credential, clientSettings) : new OpenAIClient(credential, clientSettings);
    this.storage = effectiveStorageOptions(options.storage);
    if (options.videoRetrievalIndex?.apiKey && options.videoRetrievalIndex?.endpoint) {
      this.videoRetrievalIndex = effectiveVideoRetrievalIndexOptions(options.videoRetrievalIndex);
    } else {
      this.extractVideoFrames = effectiveExtractVideoFramesOptions(options.extractVideoFrames);
    }
    this.tmpDir = options.tmpDir ?? os.tmpdir();
  }

  async getClient(): Promise<OpenAIClient> {
    return this.client;
  }

  async generateContent(prompt: ChatGptPromptContent, options: ChatGptCompletionOptions): Promise<ChatCompletions> {
    const { deploymentName, completionOptions } = this.options;
    return this.client.getChatCompletions(deploymentName, prompt, { ...completionOptions, ...options });
  }

  async appendToPrompt(newPromptOrResponse: ChatGptPromptContent | ChatCompletions, prompt?: ChatGptPromptContent): Promise<ChatGptPromptContent> {
    prompt = prompt ?? [];
    if (isChatCompletions(newPromptOrResponse)) {
      const responseText = getResponseText(newPromptOrResponse) ?? '';
      prompt.push({
        role: 'assistant',
        content: responseText,
      });
    } else {
      prompt.push(...newPromptOrResponse);
    }
    return prompt;
  }

  async buildTextPrompt(text: string, _conversationId?: string): Promise<{ prompt: ChatGptPromptContent }> {
    return {
      prompt: [
        {
          role: 'user',
          content: text,
        },
      ],
    };
  }

  buildVideoPrompt(
    videoFile: string,
    conversationId?: string | undefined,
  ): Promise<BuildVideoPromptOutput<ChatGptPromptContent, ChatGptCompletionOptions>> {
    if (this.extractVideoFrames) {
      return this.buildVideoPromptWithFrames(videoFile, conversationId);
    } else if (this.videoRetrievalIndex) {
      return this.buildVideoPromptWithVideoRetrievalIndex(videoFile, conversationId);
    } else {
      throw new Error('One of extractVideoFrames or videoRetrievalIndex must be specified in options');
    }
  }

  protected async buildVideoPromptWithFrames(
    videoFile: string,
    conversationId = `tmp-${generateRandomString(24)}`,
  ): Promise<BuildVideoPromptOutput<ChatGptPromptContent, ChatGptCompletionOptions>> {
    const extractVideoFrames = this.extractVideoFrames!;
    const videoFramesDir = path.join(this.tmpDir, conversationId);
    const frameImageFiles = await extractVideoFrames.extractor(
      videoFile,
      videoFramesDir,
      extractVideoFrames.interval,
      undefined,
      extractVideoFrames.width,
      extractVideoFrames.height,
      extractVideoFrames.limit,
    );

    const frameImageUrls = await this.storage.uploader(
      videoFramesDir,
      frameImageFiles,
      this.storage.storageContainerName!,
      `${this.storage.storagePathPrefix}${conversationId}/`,
    );

    const messages: ChatRequestMessage[] = [];
    messages.push(
      ...frameImageUrls.map(
        (url) =>
          ({
            role: 'user',
            content: [
              {
                type: 'image_url',
                imageUrl: {
                  url,
                  detail: 'auto',
                },
              },
            ],
          }) as ChatRequestUserMessage,
      ),
    );
    return {
      prompt: messages,
    };
  }

  protected async buildVideoPromptWithVideoRetrievalIndex(
    videoFile: string,
    conversationId = `tmp-${generateRandomString(24)}`,
  ): Promise<BuildVideoPromptOutput<ChatGptPromptContent, ChatGptCompletionOptions>> {
    const [videoUrl] = await this.storage.uploader(
      path.dirname(videoFile),
      [path.basename(videoFile)],
      this.storage.storageContainerName!,
      `${this.storage.storagePathPrefix}${conversationId}/`,
    );

    const {
      endpoint,
      apiKey,
      indexName: specifiedIndexName,
      createIndexIfNotExists: createIndexIfNotExist,
      deleteDocumentWhenConversationEnds: deleteDocumentAfterConversation,
      deleteIndexWhenConversationEnds: deleteIndexAfterConversation,
    } = this.videoRetrievalIndex!;
    const indexName = specifiedIndexName ?? conversationId.toLowerCase().replaceAll(/[^\dA-Za-z]/g, '-');
    const ingestionName = conversationId;
    const documentId = conversationId;
    const documentUrl = videoUrl;

    const { VideoRetrievalApiClient } = await import('../azure');
    const videoRetrievalIndexClient = new VideoRetrievalApiClient(endpoint, apiKey);

    if (createIndexIfNotExist) {
      await videoRetrievalIndexClient.createIndexIfNotExist(indexName);
    }

    await videoRetrievalIndexClient.ingest(indexName, ingestionName, {
      moderation: false,
      generateInsightIntervals: true,
      filterDefectedFrames: true,
      includeSpeechTranscript: true,
      videos: [
        {
          mode: 'add',
          documentId,
          documentUrl,
        },
      ],
    });

    const messages: ChatRequestMessage[] = [];
    messages.push({
      role: 'user',
      content: [
        {
          type: 'acv_document_id',
          acv_document_id: documentId,
        } as unknown as ChatMessageContentItem,
      ],
    } as ChatRequestUserMessage);
    return {
      prompt: messages,
      options: {
        azureExtensionOptions: {
          enhancements: {
            video: {
              enabled: true,
            },
          } as any,
          extensions: [
            {
              type: 'AzureComputerVisionVideoIndex',
              parameters: {
                endpoint: endpoint,
                computer_vision_api_key: apiKey,
                index_name: indexName,
                video_urls: [videoUrl],
              },
            } as any,
          ],
        },
      },
      cleanup: async () => {
        if (deleteIndexAfterConversation) {
          await videoRetrievalIndexClient.deleteIndex(indexName);
        } else if (deleteDocumentAfterConversation) {
          await videoRetrievalIndexClient.deleteDocument(indexName, documentUrl);
        }
      },
    };
  }
}

function isChatCompletions(obj: any): obj is ChatCompletions {
  return Array.isArray(obj.choices);
}

function getResponseText(result: ChatCompletions): string | undefined {
  return result?.choices?.[0]?.message?.content ?? undefined;
}
