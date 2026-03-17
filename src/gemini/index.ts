import type {
  GenerateContentRequest,
  GenerateContentResult,
  GenerativeModel,
  ModelParams,
  Part,
  RequestOptions,
  ResponseSchema,
} from '@google/generative-ai';

import { GoogleGenerativeAI } from '@google/generative-ai';
import { withConcurrency } from '@handy-common-utils/promise-utils';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type {
  AdditionalCompletionOptions,
  BuildPromptOutput,
  ChatApi,
  ChatApiOptions,
  ExtractVideoFramesOptions,
  ImageInput,
  ToolCall,
  ToolCallResult,
  UsageMetadata,
} from '../types';

import { buildImagesPromptFromVideo, generateTempConversationId } from '../chat';
import { effectiveExtractVideoFramesOptions } from '../utils';

export type GeminiClient = GenerativeModel;
export type GeminiResponse = GenerateContentResult;
export type GeminiPrompt = GenerateContentRequest['contents'];
export type GeminiClientOptions = { modelParams: ModelParams; requestOptions?: RequestOptions };
export type GeminiCompletionOptions = AdditionalCompletionOptions & Omit<GenerateContentRequest, 'contents'>;
export type GeminiOptions = {
  extractVideoFrames?: ExtractVideoFramesOptions;
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
    let generationConfig = effectiveOptions.generationConfig;

    let responseMimeType: string | undefined = undefined;
    let responseSchema: ResponseSchema | undefined = undefined;
    if (effectiveOptions.jsonResponse === true) {
      responseMimeType = 'application/json';
    } else if ((effectiveOptions.jsonResponse as any)?.schema) {
      responseMimeType = 'application/json';
      responseSchema = (effectiveOptions.jsonResponse as { schema: ResponseSchema }).schema;
    }
    if (responseMimeType) {
      generationConfig = { ...generationConfig, responseMimeType, responseSchema };
    }

    const safetySettings = effectiveOptions.safetySettings;
    // Only need to prevent overwriting when both arrays exist
    if (Array.isArray(options.safetySettings) && Array.isArray(this.options.completionOptions?.safetySettings)) {
      for (const safetySetting of this.options.completionOptions!.safetySettings) {
        if (!safetySettings!.some((s) => String(s.category) === String(safetySetting.category))) {
          safetySettings!.push(safetySetting);
        }
      }
    }

    let tools = effectiveOptions.tools;
    if (isChatGptStyleTools(tools)) {
      tools = convertChatGptToolsToGemini(tools!);
    }

    // Google does not allow unknown properties
    const request: GenerateContentRequest = {
      contents: prompt,
      tools,
      toolConfig: effectiveOptions.toolConfig,
      systemInstruction: effectiveOptions.systemInstruction,
      cachedContent: effectiveOptions.cachedContent,
      safetySettings,
      generationConfig,
    };

    return this.client.generateContent(request);
  }

  async getResponseText(result: GeminiResponse): Promise<string> {
    return result.response.text().replace(/\n$/, '').trim();
  }

  async getUsageMetadata(result: GeminiResponse): Promise<UsageMetadata | undefined> {
    const usage = result.response.usageMetadata;
    if (usage) {
      return {
        totalTokens: usage.totalTokenCount,
        promptTokens: usage.promptTokenCount,
        completionTokens: usage.candidatesTokenCount,
      };
    }
    return undefined;
  }

  async getToolCalls(result: GeminiResponse): Promise<ToolCall[] | undefined> {
    const functionCalls = result.response.functionCalls();
    if (!functionCalls || functionCalls.length === 0) {
      return undefined;
    }
    return functionCalls.map(
      (functionCall) =>
        ({
          name: functionCall.name,
          arguments: functionCall.args,
        }) as ToolCall,
    );
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

  isDownloadError(_error: any): boolean {
    // To be updated
    return false;
  }

  async appendToPrompt(newPromptOrResponse: GeminiPrompt | GeminiResponse, prompt?: GeminiPrompt): Promise<GeminiPrompt> {
    prompt = prompt ?? [];
    if (isGeminiResponse(newPromptOrResponse)) {
      const content = newPromptOrResponse.response.candidates?.[0]?.content;
      if (content) {
        prompt.push(content);
      }
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

  async buildToolCallResultsPrompt(
    toolResults: ToolCallResult[],
    _conversationId?: string,
  ): Promise<BuildPromptOutput<GeminiPrompt, GeminiCompletionOptions>> {
    const prompt: GeminiPrompt = [
      {
        role: 'user',
        parts: toolResults.map((tr) => ({
          functionResponse: {
            name: tr.name,
            response: tr.result,
          },
        })),
      },
    ];
    return {
      prompt,
    };
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

  async buildAudioPrompt(audioFile: string, _conversationId?: string): Promise<BuildPromptOutput<GeminiPrompt, GeminiCompletionOptions>> {
    const audioContent = await fs.readFile(audioFile);
    const extension = path.extname(audioFile).toLowerCase().slice(1);
    const mimeType = fileExtToMimeType[extension];

    if (!mimeType || !mimeType.startsWith('audio/')) {
      throw new Error(`Unsupported audio format for Gemini: ${extension}`);
    }

    const prompt: GeminiPrompt = [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: audioContent.toString('base64'),
              mimeType: mimeType,
            },
          },
        ],
      },
    ];

    return { prompt };
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
  mp3: 'audio/mp3',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  flac: 'audio/flac',
};

function isChatGptStyleTools(tools: any[] | undefined): boolean {
  return Array.isArray(tools) && tools.length > 0 && tools.every((t) => t.type === 'function' && t.function);
}

function convertChatGptToolsToGemini(tools: any[]): any[] {
  const result = [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        parameters: normalizeSchema(t.function.parameters),
      })),
    },
  ];
  // console.log(JSON.stringify(result, null, 2));
  return result;
}

function normalizeSchema(schema: any): any {
  if (Array.isArray(schema)) {
    return schema.map((s) => normalizeSchema(s));
  }
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  const result = { ...schema };

  if (typeof result.type === 'string') {
    result.type = result.type.toUpperCase();
  } else if (Array.isArray(result.type)) {
    if (result.type.length === 2 && result.type.includes('null')) {
      // type: ["string", "null"] => type: "STRING", nullable: true
      result.type = result.type.find((t: string) => t !== 'null')?.toUpperCase();
      result.nullable = true;
    } else {
      result.type = result.type.map((t: string) => t.toUpperCase());
    }
  }

  if (result.additionalProperties === false) {
    // not supported
    delete result.additionalProperties;
  }
  if ('exclusiveMinimum' in result) {
    // only support minimum
    delete result.exclusiveMinimum;
  }

  if (result.anyOf) {
    result.anyOf = result.anyOf.map((s: any) => normalizeSchema(s));
  }

  if (result.properties && typeof result.properties === 'object') {
    result.properties = Object.fromEntries(Object.entries(result.properties).map(([key, value]) => [key, normalizeSchema(value)]));
  }
  if (result.items && typeof result.items === 'object') {
    result.items = normalizeSchema(result.items);
  }
  return result;
}
