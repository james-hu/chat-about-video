import type { GenerateContentRequest, GenerateContentResult, GenerativeModel, ModelParams, Part, RequestOptions } from '@google/generative-ai';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { withConcurrency } from '@handy-common-utils/promise-utils';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { AdditionalCompletionOptions, BuildPromptOutput, ChatApi, ChatApiOptions, ExtractVideoFramesOptions, ImageInput } from '../types';

import { buildImagesPromptFromVideo, generateTempConversationId } from '../chat';
import { effectiveExtractVideoFramesOptions } from '../utils';

export type GeminiClient = GenerativeModel;
export type GeminiResponse = GenerateContentResult;
export type GeminiPrompt = GenerateContentRequest['contents'];
export type GeminiClientOptions = { modelParams: ModelParams; requestOptions?: RequestOptions };
export type GeminiCompletionOptions = AdditionalCompletionOptions & Omit<GenerateContentRequest, 'contents'>;
export type GeminiOptions = {
  extractVideoFrames: ExtractVideoFramesOptions;
  clientSettings: GeminiClientOptions;
} & ChatApiOptions<GeminiClientOptions, GeminiCompletionOptions>;

export class GeminiApi implements ChatApi<GeminiClient, GeminiCompletionOptions, GeminiPrompt, GeminiResponse> {
  protected client: GeminiClient;
  protected extractVideoFrames: ReturnType<typeof effectiveExtractVideoFramesOptions>;
  protected tmpDir: string;

  constructor(protected options: GeminiOptions) {
    if (options.endpoint != null) {
      options.clientSettings.requestOptions = options.clientSettings.requestOptions ?? {};
      options.clientSettings.requestOptions.baseUrl = options.endpoint;
    }
    if (!this.options.completionOptions) {
      this.options.completionOptions = {};
    }
    if (this.options.completionOptions.systemPromptText) {
      this.options.completionOptions.systemInstruction = this.options.completionOptions.systemPromptText;
    }

    this.extractVideoFrames = effectiveExtractVideoFramesOptions(options.extractVideoFrames);
    this.tmpDir = options.tmpDir ?? os.tmpdir();

    const genAI = new GoogleGenerativeAI(options.credential.key);
    this.client = genAI.getGenerativeModel(options.clientSettings.modelParams, options.clientSettings.requestOptions);
  }

  async getClient(): Promise<GeminiClient> {
    return this.client;
  }

  async generateContent(prompt: GeminiPrompt, options: GeminiCompletionOptions): Promise<GeminiResponse> {
    const effectiveOptions = {
      ...this.options.completionOptions,
      ...options,
    };

    const safetySettings = effectiveOptions.safetySettings;
    // Only need to prevent overwriting when both arrays exist
    if (Array.isArray(options.safetySettings) && Array.isArray(this.options.completionOptions?.safetySettings)) {
      for (const safetySetting of this.options.completionOptions!.safetySettings) {
        if (!safetySettings!.some((s) => String(s.category) === String(safetySetting.category))) {
          safetySettings!.push(safetySetting);
        }
      }
    }

    // Google does not allow unknown properties
    const request: GenerateContentRequest = {
      contents: prompt,
      tools: effectiveOptions.tools,
      toolConfig: effectiveOptions.toolConfig,
      systemInstruction: effectiveOptions.systemInstruction,
      cachedContent: effectiveOptions.cachedContent,
      safetySettings,
      generationConfig: effectiveOptions.generationConfig,
    };

    return this.client.generateContent(request);
  }

  async getResponseText(result: GeminiResponse): Promise<string | undefined> {
    return result.response.text().replace(/\n$/, '').trim();
  }

  isThrottlingError(error: any): boolean {
    return error?.status === 429;
  }

  isServerError(error: any): boolean {
    const status = error?.status;
    return status != null && typeof status === 'number' && status >= 500 && status <= 599;
  }

  isConnectivityError(error: any): boolean {
    return ['Request timed out.', 'Connection error.'].includes(error?.message);
  }

  async appendToPrompt(newPromptOrResponse: GeminiPrompt | GeminiResponse, prompt?: GeminiPrompt): Promise<GeminiPrompt> {
    prompt = prompt ?? [];
    if (isGeminiResponse(newPromptOrResponse)) {
      const responseText = (await this.getResponseText(newPromptOrResponse)) ?? '';
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

  async buildTextPrompt(text: string, _conversationId?: string): Promise<{ prompt: GeminiPrompt }> {
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

  async buildVideoPrompt(
    videoFile: string,
    conversationId = generateTempConversationId(),
  ): Promise<BuildPromptOutput<GeminiPrompt, GeminiCompletionOptions>> {
    return buildImagesPromptFromVideo(this, this.extractVideoFrames!, this.tmpDir, videoFile, conversationId);
  }

  async buildImagesPrompt(imageInputs: ImageInput[], _conversationId: string): Promise<BuildPromptOutput<GeminiPrompt, GeminiCompletionOptions>> {
    const parts2D = await withConcurrency(5, imageInputs, async (imageInput) => {
      const parts: Part[] = [];
      if (imageInput.promptText) {
        parts.push({
          text: imageInput.promptText,
        });
      }
      const imageContent = await fs.readFile(imageInput.imageFile);
      parts.push({
        inlineData: {
          data: imageContent.toString('base64'),
          mimeType: fileExtToMimeType[path.extname(imageInput.imageFile).slice(1)],
        },
      });
      return parts;
    });
    const prompt = [
      {
        role: 'user',
        parts: parts2D.flat(),
      },
    ];
    return {
      prompt,
    };
  }
}

function isGeminiResponse(obj: any): obj is GeminiResponse {
  return typeof obj?.response?.text === 'function';
}

const fileExtToMimeType: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};
