import type {
  ChatCompletions,
  ChatMessageContentItem,
  ChatRequestMessage,
  ChatRequestSystemMessage,
  ChatRequestUserMessage,
  OpenAIClientOptions,
} from '@azure/openai';

import { OpenAIClient, OpenAIKeyCredential } from '@azure/openai';
import { generateRandomString } from '@handy-common-utils/misc-utils';
import os from 'node:os';
import path from 'node:path';

import type {
  AdditionalCompletionOptions,
  BuildPromptOutput,
  ChatApi,
  ChatApiOptions,
  ExtractVideoFramesOptions,
  StorageOptions,
  VideoRetrievalIndexOptions,
} from '../types';

import { fixClient } from '../azure/client-hack';
import { effectiveExtractVideoFramesOptions, effectiveStorageOptions, effectiveVideoRetrievalIndexOptions } from '../utils';

export type ChatGptClient = OpenAIClient;
export type ChatGptResponse = ChatCompletions;
export type ChatGptPrompt = Parameters<OpenAIClient['getChatCompletions']>[1];
export type ChatGptCompletionOptions = {
  deploymentName: string;
} & AdditionalCompletionOptions &
  Parameters<OpenAIClient['getChatCompletions']>[2];
export type ChatGptOptions = {
  videoRetrievalIndex?: VideoRetrievalIndexOptions;
  extractVideoFrames?: ExtractVideoFramesOptions;
  storage: StorageOptions;
} & ChatApiOptions<OpenAIClientOptions, ChatGptCompletionOptions>;

export class ChatGptApi implements ChatApi<ChatGptClient, ChatGptCompletionOptions, ChatGptPrompt, ChatGptResponse> {
  protected client: ChatGptClient;
  protected storage: ReturnType<typeof effectiveStorageOptions>;
  protected extractVideoFrames?: ReturnType<typeof effectiveExtractVideoFramesOptions>;
  protected videoRetrievalIndex?: ReturnType<typeof effectiveVideoRetrievalIndexOptions>;
  protected tmpDir: string;

  constructor(protected options: ChatGptOptions) {
    const { credential, endpoint, clientSettings } = options;
    this.client = endpoint
      ? new OpenAIClient(endpoint, credential, clientSettings)
      : new OpenAIClient(new OpenAIKeyCredential(credential.key), clientSettings);
    fixClient(this.client); // Hacking for supporting Video Retrieval Indexer enhancement
    this.storage = effectiveStorageOptions(options.storage);
    if (options.videoRetrievalIndex?.apiKey && options.videoRetrievalIndex?.endpoint) {
      this.videoRetrievalIndex = effectiveVideoRetrievalIndexOptions(options.videoRetrievalIndex);
    } else {
      this.extractVideoFrames = effectiveExtractVideoFramesOptions(options.extractVideoFrames);
    }
    this.tmpDir = options.tmpDir ?? os.tmpdir();
  }

  async getClient(): Promise<ChatGptClient> {
    return this.client;
  }

  async generateContent(prompt: ChatGptPrompt, options: ChatGptCompletionOptions): Promise<ChatGptResponse> {
    const effectiveOptions = {
      ...this.options.completionOptions,
      ...options,
    };
    const { deploymentName } = effectiveOptions;
    return this.client.getChatCompletions(deploymentName, prompt, effectiveOptions);
  }

  async getResponseText(result: ChatGptResponse): Promise<string | undefined> {
    return result?.choices?.[0]?.message?.content ?? undefined;
  }

  isThrottlingError(error: any): boolean {
    const code = String(error?.code);
    return code === 'TooManyRequests' || code === '429';
  }

  async appendToPrompt(newPromptOrResponse: ChatGptPrompt | ChatGptResponse, prompt?: ChatGptPrompt): Promise<ChatGptPrompt> {
    prompt =
      prompt ??
      (this.options.completionOptions?.systemPromptText
        ? [
            {
              role: 'system',
              content: this.options.completionOptions!.systemPromptText,
            } as ChatRequestSystemMessage,
          ]
        : []);
    if (isChatGptResponse(newPromptOrResponse)) {
      const responseText = (await this.getResponseText(newPromptOrResponse)) ?? '';
      prompt.push({
        role: 'assistant',
        content: responseText,
      });
    } else {
      prompt.push(...newPromptOrResponse);
    }
    return prompt;
  }

  async buildTextPrompt(text: string, _conversationId?: string): Promise<{ prompt: ChatGptPrompt }> {
    return {
      prompt: [
        {
          role: 'user',
          content: text,
        },
      ],
    };
  }

  buildVideoPrompt(videoFile: string, conversationId?: string | undefined): Promise<BuildPromptOutput<ChatGptPrompt, ChatGptCompletionOptions>> {
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
  ): Promise<BuildPromptOutput<ChatGptPrompt, ChatGptCompletionOptions>> {
    const extractVideoFrames = this.extractVideoFrames!;
    const videoFramesDir = path.join(this.tmpDir, conversationId);
    const { relativePaths: frameImageFiles, cleanup: cleanupExtractedFrames } = await extractVideoFrames.extractor(
      videoFile,
      videoFramesDir,
      extractVideoFrames.interval,
      undefined,
      extractVideoFrames.width,
      extractVideoFrames.height,
      undefined,
      undefined,
      extractVideoFrames.limit,
    );

    const { downloadUrls: frameImageUrls, cleanup: cleanupUploadedFrames } = await this.storage.uploader(
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
      cleanup: async () => {
        if (extractVideoFrames.deleteFilesWhenConversationEnds) {
          await cleanupExtractedFrames();
        }
        if (this.storage.deleteFilesWhenConversationEnds) {
          await cleanupUploadedFrames();
        }
      },
    };
  }

  protected async buildVideoPromptWithVideoRetrievalIndex(
    videoFile: string,
    conversationId = `tmp-${generateRandomString(24)}`,
  ): Promise<BuildPromptOutput<ChatGptPrompt, ChatGptCompletionOptions>> {
    const {
      downloadUrls: [videoUrl],
      cleanup: cleanupUploadedVideo,
    } = await this.storage.uploader(
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
    const indexName =
      specifiedIndexName ??
      conversationId
        .toLowerCase()
        .replaceAll(/[^\dA-Za-z]/g, '-')
        .slice(0, 24);
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
        if (this.storage.deleteFilesWhenConversationEnds) {
          await cleanupUploadedVideo();
        }
        if (deleteIndexAfterConversation) {
          await videoRetrievalIndexClient.deleteIndex(indexName);
        } else if (deleteDocumentAfterConversation) {
          await videoRetrievalIndexClient.deleteDocument(indexName, documentUrl);
        }
      },
    };
  }
}

function isChatGptResponse(obj: any): obj is ChatGptResponse {
  return Array.isArray(obj.choices);
}
