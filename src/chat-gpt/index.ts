import { generateRandomString } from '@handy-common-utils/misc-utils';
import os from 'node:os';
import { AzureClientOptions, AzureOpenAI, OpenAI } from 'openai';

import type { AdditionalCompletionOptions, BuildPromptOutput, ChatApi, ChatApiOptions, ExtractVideoFramesOptions, StorageOptions } from '../types';

import { effectiveExtractVideoFramesOptions, effectiveStorageOptions } from '../utils';

export type ChatGptClient = AzureOpenAI | OpenAI;
export type ChatGptResponse = OpenAI.ChatCompletion;
export type ChatGptPrompt = OpenAI.ChatCompletionCreateParamsNonStreaming['messages'];
export type ChatGptCompletionOptions = AdditionalCompletionOptions & Omit<OpenAI.ChatCompletionCreateParamsNonStreaming, 'messages' | 'stream'>;
export type ChatGptOptions = {
  extractVideoFrames?: ExtractVideoFramesOptions;
  storage: StorageOptions;
} & ChatApiOptions<AzureClientOptions, ChatGptCompletionOptions>;

export class ChatGptApi implements ChatApi<ChatGptClient, ChatGptCompletionOptions, ChatGptPrompt, ChatGptResponse> {
  protected client: ChatGptClient;
  protected storage: ReturnType<typeof effectiveStorageOptions>;
  protected extractVideoFrames?: ReturnType<typeof effectiveExtractVideoFramesOptions>;
  protected tmpDir: string;

  constructor(protected options: ChatGptOptions) {
    const { credential, endpoint, clientSettings } = options;
    this.client = endpoint
      ? new AzureOpenAI({ ...clientSettings, endpoint, apiKey: credential.key })
      : new OpenAI({ ...clientSettings, apiKey: credential.key });
    this.storage = effectiveStorageOptions(options.storage);
    this.extractVideoFrames = effectiveExtractVideoFramesOptions(options.extractVideoFrames);
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
    // OpenAI does not allow unknown properties
    delete effectiveOptions.backoffOnServerError;
    delete effectiveOptions.backoffOnThrottling;
    delete effectiveOptions.systemPromptText;

    return this.client.chat.completions.create({ ...effectiveOptions, messages: prompt, stream: false });
  }

  async getResponseText(result: ChatGptResponse): Promise<string | undefined> {
    return result?.choices?.[0]?.message?.content ?? undefined;
  }

  isThrottlingError(error: any): boolean {
    const code = String(error?.code);
    return code === 'TooManyRequests' || code === '429';
  }

  isServerError(error: any): boolean {
    return ['500', 'InternalServerError', '502', 'BadGateway', '503', 'ServiceUnavailable', '504', 'GatewayTimeout'].includes(String(error?.status));
  }

  async appendToPrompt(newPromptOrResponse: ChatGptPrompt | ChatGptResponse, prompt?: ChatGptPrompt): Promise<ChatGptPrompt> {
    prompt =
      prompt ??
      (this.options.completionOptions?.systemPromptText
        ? [
            {
              role: 'system',
              content: this.options.completionOptions!.systemPromptText,
            } as OpenAI.ChatCompletionSystemMessageParam,
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
    } else {
      throw new Error('Provider of extractVideoFrames must be specified in options');
    }
  }

  protected async buildVideoPromptWithFrames(
    videoFile: string,
    conversationId = `tmp-${generateRandomString(24)}`,
  ): Promise<BuildPromptOutput<ChatGptPrompt, ChatGptCompletionOptions>> {
    const extractVideoFrames = this.extractVideoFrames!;
    const videoFramesDir = extractVideoFrames.framesDirectoryResolver(videoFile, this.tmpDir, conversationId);
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

    const messages: ChatGptPrompt = [];
    messages.push(
      ...frameImageUrls.map(
        (url) =>
          ({
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url,
                  detail: 'auto',
                },
              },
            ],
          }) as OpenAI.ChatCompletionUserMessageParam,
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
}

function isChatGptResponse(obj: any): obj is ChatGptResponse {
  return Array.isArray(obj?.choices);
}
