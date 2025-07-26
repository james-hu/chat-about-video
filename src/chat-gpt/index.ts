import type { ResponseFormatJSONSchema } from 'openai/resources/shared';

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
  UsageMetadata,
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
    const requestOptions = effectiveOptions as OpenAI.ChatCompletionCreateParamsNonStreaming;
    if (effectiveOptions.jsonResponse) {
      requestOptions.response_format =
        effectiveOptions.jsonResponse === true
          ? { type: 'json_object' }
          : {
              type: 'json_schema',
              json_schema: {
                ...(effectiveOptions.jsonResponse as Partial<ResponseFormatJSONSchema.JSONSchema>),
                name: effectiveOptions.jsonResponse.name ?? 'InlineResponseSchema',
              },
            };
    }

    // OpenAI does not allow unknown properties
    delete effectiveOptions.backoffOnDownloadError;
    delete effectiveOptions.backoffOnConnectivityError;
    delete effectiveOptions.backoffOnServerError;
    delete effectiveOptions.backoffOnThrottling;
    delete effectiveOptions.systemPromptText;
    delete effectiveOptions.startPromptText;
    delete effectiveOptions.jsonResponse;

    // These fields were used in previous versions of chat-about-video, just in case they are not removed from the config/options/settings.
    delete (effectiveOptions as any).maxTokens;
    delete (effectiveOptions as any).deploymentName;
    delete (effectiveOptions as any).extractVideoFrames;

    return this.client.chat.completions.create({ ...requestOptions, messages: prompt, stream: false });
  }

  async getResponseText(result: ChatGptResponse): Promise<string | undefined> {
    return result?.choices?.[0]?.message?.content ?? undefined;
  }

  async getUsageMetadata(result: ChatGptResponse): Promise<UsageMetadata | undefined> {
    if (result.usage) {
      return {
        totalTokens: result.usage.total_tokens,
        promptTokens: result.usage.prompt_tokens,
        completionTokens: result.usage.completion_tokens,
      };
    }
    return undefined;
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
  //
  // Another example error object:
  //   {
  //   "status": 400,
  //   "headers": {
  //     "api-supported-versions": "1",
  //     "apim-request-id": "aa24a9c4-d46b-47d6-b9bc-6f3ad0e2cc29",
  //     "content-length": "612",
  //     "content-type": "application/json; charset=utf-8",
  //     "date": "Sat, 26 Jul 2025 06:15:34 GMT",
  //     "request-id": "aa24a9c4-d46b-47d6-b9bc-6f3ad0e2cc29",
  //     "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
  //     "x-content-type-options": "nosniff",
  //     "x-envoy-upstream-service-time": "1084",
  //     "x-ms-deployment-name": "gpt-4o",
  //     "x-ms-region": "East US 2",
  //     "x-ratelimit-limit-requests": "4500",
  //     "x-ratelimit-limit-tokens": "450000",
  //     "x-ratelimit-remaining-requests": "4499",
  //     "x-ratelimit-remaining-tokens": "438897"
  //   },
  //   "error": {
  //     "inner_error": {
  //       "code": "ResponsibleAIPolicyViolation",
  //       "content_filter_results": {
  //         "sexual": {
  //           "filtered": true,
  //           "severity": "high"
  //         },
  //         "violence": {
  //           "filtered": false,
  //           "severity": "safe"
  //         },
  //         "hate": {
  //           "filtered": false,
  //           "severity": "safe"
  //         },
  //         "self_harm": {
  //           "filtered": false,
  //           "severity": "safe"
  //         }
  //       }
  //     },
  //     "code": "content_filter",
  //     "message": "The response was filtered due to the prompt triggering Azure OpenAI's content management policy. Please modify your prompt and retry. To learn more about our content filtering policies please read our documentation: \r\nhttps://go.microsoft.com/fwlink/?linkid=2198766.",
  //     "param": "prompt",
  //     "type": null
  //   },
  //   "code": "content_filter",
  //   "param": "prompt",
  //   "type": null
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

  isConnectivityError(error: any): boolean {
    return ['Request timed out.', 'Connection error.'].includes(error?.message);
  }

  isDownloadError(error: any): boolean {
    const type = String(error?.type ?? error?.error?.type);
    const code = String(error?.code ?? error?.error?.code);
    const message = String(error?.message ?? error?.error?.message);
    return (type === 'invalid_request_error' && code === 'invalid_image_url') || message.startsWith('Timeout while downloading ');
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
