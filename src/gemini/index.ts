import type { GenerateContentRequest, GenerateContentResult, GenerativeModel, ModelParams, RequestOptions } from '@google/generative-ai';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateRandomString } from '@handy-common-utils/misc-utils';
import { withConcurrency } from '@handy-common-utils/promise-utils';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { BuildVideoPromptOutput, ChatAPI, ChatApiOptions, ExtractVideoFramesOptions } from '../types';

import { effectiveExtractVideoFramesOptions } from '../utils';

export type GeminiPromptContent = GenerateContentRequest['contents'];
export type GeminiPromptOptions = Omit<GenerateContentRequest, 'contents'>;
export type GeminiClientOptions = { modelParams: ModelParams; requestOptions: RequestOptions };
export type GeminiApiOptions = {
  extractVideoFrames: ExtractVideoFramesOptions;
} & ChatApiOptions<GeminiClientOptions, GeminiPromptOptions>;

export class GeminiApi implements ChatAPI<GenerativeModel, GeminiPromptOptions, GeminiPromptContent, GenerateContentResult> {
  protected client: GenerativeModel;
  protected extractVideoFrames: ReturnType<typeof effectiveExtractVideoFramesOptions>;
  protected tmpDir: string;

  constructor(protected options: GeminiApiOptions) {
    if (options.endpoint != null) {
      options.clientSettings.requestOptions = options.clientSettings.requestOptions ?? {};
      options.clientSettings.requestOptions.baseUrl = options.endpoint;
    }
    const genAI = new GoogleGenerativeAI(options.credential.key);
    this.client = genAI.getGenerativeModel(options.clientSettings.modelParams, options.clientSettings.requestOptions);
    this.extractVideoFrames = effectiveExtractVideoFramesOptions(options.extractVideoFrames);
    this.tmpDir = options.tmpDir ?? os.tmpdir();
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

  async buildVideoPrompt(
    videoFile: string,
    conversationId = `tmp-${generateRandomString(24)}`,
  ): Promise<BuildVideoPromptOutput<GeminiPromptContent, GeminiPromptOptions>> {
    const extractVideoFrames = this.extractVideoFrames;
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
    };
  }
}

function isGenerateContentResult(obj: any): obj is GenerateContentResult {
  return typeof obj?.response?.text === 'function';
}

function getResponseText(result: GenerateContentResult): string | undefined {
  return result.response.text();
}
