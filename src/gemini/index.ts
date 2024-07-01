import type { GenerateContentRequest, GenerateContentResult, GenerativeModel, ModelParams, RequestOptions } from '@google/generative-ai';

import { GoogleGenerativeAI } from '@google/generative-ai';

import { ChatAPI, ChatApiClientOptions } from '../types';

export type GeminiClientOptions = ChatApiClientOptions<{ modelParams: ModelParams; requestOptions: RequestOptions }, string>;

export type GeminiPromptContent = GenerateContentRequest['contents'];
export type GeminiPromptOptions = Omit<GenerateContentRequest, 'contents'>;

export class GeminiApi implements ChatAPI<GenerativeModel, GeminiPromptOptions, GeminiPromptContent, GenerateContentResult> {
  protected client: GenerativeModel;

  constructor(protected options: GeminiClientOptions) {
    if (options.endpoint != null) {
      options.clientSettings.requestOptions = options.clientSettings.requestOptions ?? {};
      options.clientSettings.requestOptions.baseUrl = options.endpoint;
    }
    const genAI = new GoogleGenerativeAI(options.credential.key);
    this.client = genAI.getGenerativeModel(options.clientSettings.modelParams, options.clientSettings.requestOptions);
  }

  async getClient(): Promise<GenerativeModel> {
    return this.client;
  }

  async generateContent(prompt: GeminiPromptContent, options: GeminiPromptOptions): Promise<GenerateContentResult> {
    return this.client.generateContent({ contents: prompt, ...options });
  }

  async appendToPrompt(newPromptOrResponse: GeminiPromptContent | GenerateContentResult, prompt?: GeminiPromptContent): Promise<GeminiPromptContent> {
    prompt = prompt ?? [];
    if (isGenerateContentResult(newPromptOrResponse)) {
      const responseText = getResponseText(newPromptOrResponse) ?? '';
      prompt.push({
        role: 'model',
        parts: [
          {
            text: responseText,
          },
        ],
      });
    } else {
      prompt.push(...newPromptOrResponse);
    }
    return prompt;
  }

  async buildTextPrompt(text: string, _conversationId?: string): Promise<{ prompt: GeminiPromptContent }> {
    return {
      prompt: [
        {
          role: 'user',
          parts: [
            {
              text,
            },
          ],
        },
      ],
    };
  }
}

function isGenerateContentResult(obj: any): obj is GenerateContentResult {
  return typeof obj?.response?.text === 'function';
}

function getResponseText(result: GenerateContentResult): string | undefined {
  return result.response.text();
}
