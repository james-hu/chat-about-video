import type { GenerateContentRequest, GenerateContentResult, GenerativeModel, ModelParams, RequestOptions } from '@google/generative-ai';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateRandomString } from '@handy-common-utils/misc-utils';
import { withConcurrency } from '@handy-common-utils/promise-utils';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { AdditionalCompletionOptions, BuildPromptOutput, ChatApi, ChatApiOptions, ExtractVideoFramesOptions } from '../types';

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
    // Google does not allow unknown properties
    delete effectiveOptions.systemPromptText;
    delete effectiveOptions.startPromptText;
    delete effectiveOptions.backoffOnThrottling;

    console.log(3, this.options, { contents: prompt, ...effectiveOptions });
    return this.client.generateContent({ contents: prompt, ...effectiveOptions });
  }

  async getResponseText(result: GeminiResponse): Promise<string | undefined> {
    return result.response.text();
  }

  isThrottlingError(error: any): boolean {
    return error?.status === 429;
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
    conversationId = `tmp-${generateRandomString(24)}`,
  ): Promise<BuildPromptOutput<GeminiPrompt, GeminiCompletionOptions>> {
    const extractVideoFrames = this.extractVideoFrames;
    const videoFramesDir = extractVideoFrames.frameDirectoryResolver(videoFile, this.tmpDir, conversationId);
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
    const prompt = [
      {
        role: 'user',
        parts: await withConcurrency(5, frameImageFiles, async (imageFile) => {
          const imageContent = await fs.readFile(path.join(videoFramesDir, imageFile));
          return {
            inlineData: {
              data: imageContent.toString('base64'),
              mimeType: `image/${extractVideoFrames.format}`,
            },
          };
        }),
      },
    ];
    return {
      prompt,
      cleanup: async () => {
        if (this.extractVideoFrames.deleteFilesWhenConversationEnds) {
          await cleanupExtractedFrames();
        }
      },
    };
  }
}

function isGeminiResponse(obj: any): obj is GeminiResponse {
  return typeof obj?.response?.text === 'function';
}
