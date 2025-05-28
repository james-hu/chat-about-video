import os from 'node:os';
import { AzureClientOptions, AzureOpenAI, OpenAI } from 'openai';

import type {
  AdditionalCompletionOptions,
  BuildPromptOutput,
  ChatApi,
  ChatApiOptions,
  ExtractVideoFramesOptions,
  ImageInput,
  StorageOptions,
} from '../types';

import { buildImagesPromptFromVideo, generateTempConversationId } from '../chat';
import { effectiveExtractVideoFramesOptions, effectiveStorageOptions, findCommonParentPath } from '../utils';

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
    delete effectiveOptions.startPromptText;

    // These fields were used in previous versions of chat-about-video, just in case they are removed from the config/options/settings.
    delete (effectiveOptions as any).maxTokens;
    delete (effectiveOptions as any).deploymentName;
    delete (effectiveOptions as any).extractVideoFrames;

    return this.client.chat.completions.create({ ...effectiveOptions, messages: prompt, stream: false });
  }

  async getResponseText(result: ChatGptResponse): Promise<string | undefined> {
    return result?.choices?.[0]?.message?.content ?? undefined;
  }

  // Example error object:
  // {
  //   "name": "Error",
  //   "message": "400 Invalid image data",
  //   "stack": "...",
  //   "status:": 400,
  //   "code": "BadRequest",
  //   "param": null,
  //   "type": null,
  //   "headers": {
  //     ...
  //   },
  //   "error": {
  //     "code": "BadRequest",
  //     "message": "Invalid image data",
  //     "param": null,
  //     "type": null,
  //   }
  // }

  isThrottlingError(error: any): boolean {
    const code = String(error?.status ?? error?.code ?? error?.error?.code);
    return code === 'TooManyRequests' || code === '429';
  }

  isServerError(error: any): boolean {
    return ['500', 'InternalServerError', '502', 'BadGateway', '503', 'ServiceUnavailable', '504', 'GatewayTimeout'].includes(
      String(error?.status ?? error?.code ?? error?.error?.code),
    );
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

  async buildVideoPrompt(
    videoFile: string,
    conversationId = generateTempConversationId(),
  ): Promise<BuildPromptOutput<ChatGptPrompt, ChatGptCompletionOptions>> {
    return buildImagesPromptFromVideo(this, this.extractVideoFrames!, this.tmpDir, videoFile, conversationId);
  }

  async buildImagesPrompt(
    imageInputs: ImageInput[],
    conversationId = generateTempConversationId(),
  ): Promise<BuildPromptOutput<ChatGptPrompt, ChatGptCompletionOptions>> {
    const { commonParent, relativePaths } = findCommonParentPath(imageInputs.map((imageInput) => imageInput.imageFile));

    const { downloadUrls: frameImageUrls, cleanup: cleanupUploadedFrames } = await this.storage.uploader(
      commonParent,
      relativePaths,
      this.storage.storageContainerName!,
      `${this.storage.storagePathPrefix}${conversationId}/`,
    );

    const messages: ChatGptPrompt = [];
    messages.push(
      ...frameImageUrls.map((url, i) => {
        const content: OpenAI.ChatCompletionUserMessageParam['content'] = [];
        const { promptText } = imageInputs[i];
        if (promptText) {
          content.push({
            type: 'text',
            text: promptText,
          });
        }
        content.push({
          type: 'image_url',
          image_url: {
            url,
            detail: 'auto',
          },
        });
        return {
          role: 'user',
          content,
        } as OpenAI.ChatCompletionUserMessageParam;
      }),
    );
    return {
      prompt: messages,
      cleanup: async () => {
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
