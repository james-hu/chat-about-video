import { ConsoleLineLogger, consoleWithoutColour, generateRandomString, merge } from '@handy-common-utils/misc-utils';
import { withRetry } from '@handy-common-utils/promise-utils';
import path from 'node:path';

import type { ChatGptApi, ChatGptOptions } from './chat-gpt';
import type { GeminiApi, GeminiOptions } from './gemini';
import type {
  AdditionalCompletionOptions,
  AudioInput,
  BuildPromptOutput,
  ChatApi,
  ClientOfChatApi,
  ConversationResponse,
  EffectiveExtractVideoFramesOptions,
  ImagesInput,
  OptionsOfChatApi,
  PromptOfChatApi,
  ResponseOfChatApi,
  ToolCallResult,
  UsageMetadata,
  VideoInput,
} from './types';

const defaultCompletionOptions: AdditionalCompletionOptions = {
  systemPromptText:
    "You are an AI specialized in analyzing video content. The user will provide frames from a video and ask questions about that video. Your task is to provide objective, concise, and accurate answers based solely on the provided frames. Do not acknowledge or repeat the user's questions, and avoid any explanations. Provide only the necessary information and answer the questions directly.",
  backoffOnThrottling: [1000, 2000, 3000, 5000, 10000, 10000],
  backoffOnServerError: [2000, 5000, 10000, 20000, 30000],
  backoffOnConnectivityError: [1000, 2000, 5000, 10000],
  backoffOnDownloadError: [500, 800, 1000, 2000],
};

function isGeminiOptions(options: any): options is GeminiOptions {
  const opts = options as GeminiOptions;
  return opts?.clientSettings?.modelParams != null;
}

function isChatGptOptions(options: any): options is ChatGptOptions {
  // const opts = options as ChatGptOptions;
  return !isGeminiOptions(options); //  && opts?.storage != null;
}

export type ChatAboutVideoWith<T> = ChatAboutVideo<ClientOfChatApi<T>, OptionsOfChatApi<T>, PromptOfChatApi<T>, ResponseOfChatApi<T>>;
export type ChatAboutVideoWithChatGpt = ChatAboutVideoWith<ChatGptApi>;
export type ChatAboutVideoWithGemini = ChatAboutVideoWith<GeminiApi>;

export type ConversationWith<T> = Conversation<ClientOfChatApi<T>, OptionsOfChatApi<T>, PromptOfChatApi<T>, ResponseOfChatApi<T>>;
export type ConversationWithChatGpt = ConversationWith<ChatGptApi>;
export type ConversationWithGemini = ConversationWith<GeminiApi>;

export type SupportedChatApiOptions = ChatGptOptions | GeminiOptions;

/**
 * Options for multiple supported chat APIs.
 * Its "base" property is the base options to be used for merging with the active options.
 * Its "active" property specifies the name of the active options.
 * The active options will be merged with the base options, with the active options taking precedence.
 */
export type MultipleSupportedChatApiOptions = {
  /**
   * The name of the active options.
   */
  active: string;
  /**
   * The base options to be used for merging with the active options.
   */
  base?: Partial<SupportedChatApiOptions> | null;
} & Record<string, Partial<SupportedChatApiOptions> | string | null | undefined>;

/**
 * Get the active options from the multiple options.
 * It first finds the active options using the active key, and then merges the base options with the active options.
 * @param options The multiple options. It will not be mutated by this function.
 * @returns The active options which can be passed into the constructor of ChatAboutVideo
 */
export function activeSupportedChatApiOptions(options: MultipleSupportedChatApiOptions): SupportedChatApiOptions {
  const { active, base } = options;
  if (!active) {
    throw new Error('Did you forget to specify the "active" property in the options?');
  }
  const activeOptions = options[active];
  if (!activeOptions) {
    throw new Error(`Did you forget to specify the "${active}" property in the options?`);
  }

  return merge({ immutable: true, array: 'replace' }, base ?? {}, activeOptions) as SupportedChatApiOptions;
}

export class ChatAboutVideo<CLIENT = any, OPTIONS extends AdditionalCompletionOptions = any, PROMPT = any, RESPONSE = any> {
  protected options: SupportedChatApiOptions;
  protected apiPromise: Promise<ChatApi<CLIENT, OPTIONS, PROMPT, RESPONSE>>;

  constructor(
    options: SupportedChatApiOptions,
    protected log: ConsoleLineLogger | undefined = consoleWithoutColour(),
  ) {
    const effectiveOptions = {
      ...options,
      completionOptions: {
        ...defaultCompletionOptions,
        ...options.completionOptions,
      },
    } as SupportedChatApiOptions;
    this.options = effectiveOptions;
    if (isGeminiOptions(effectiveOptions)) {
      this.log && this.log.debug(`Using Gemini API (model=${effectiveOptions.clientSettings.modelParams.model})`);
      this.apiPromise = import('./gemini').then((gemini) => new gemini.GeminiApi(effectiveOptions) as any);
    } else if (isChatGptOptions(effectiveOptions)) {
      this.log &&
        this.log.debug(
          `Using ChatGpt API (endpoint=${effectiveOptions.endpoint}, apiVersion=${effectiveOptions.clientSettings?.apiVersion}, deployment=${effectiveOptions.clientSettings?.deployment}, model=${effectiveOptions.completionOptions?.model})`,
        );
      this.apiPromise = import('./chat-gpt').then((chatGpt) => new chatGpt.ChatGptApi(effectiveOptions) as any);
    } else {
      throw new Error('Unable to determine which API to use, did you miss something in the options passed to the constructor of ChatAboutVideo?');
    }
  }

  /**
   * Get the underlying API instance.
   * @returns The underlying API instance.
   */
  async getApi(): Promise<ChatApi<CLIENT, OPTIONS, PROMPT, RESPONSE>> {
    return this.apiPromise;
  }

  /**
   * Start a conversation without a video
   * @param log Optional logger for this conversation, if not provided, the logger of ChatAboutVideo instance will be used.
   * @returns The conversation.
   */
  async startConversation(log?: ConsoleLineLogger): Promise<Conversation<CLIENT, OPTIONS, PROMPT, RESPONSE>>;

  /**
   * Start a conversation without a video
   * @param options Overriding options for this conversation
   * @param log Optional logger for this conversation, if not provided, the logger of ChatAboutVideo instance will be used.
   * @returns The conversation.
   */
  async startConversation(options?: OPTIONS, log?: ConsoleLineLogger): Promise<Conversation<CLIENT, OPTIONS, PROMPT, RESPONSE>>;

  /**
   * Start a conversation about a video.
   * @param videoFile Path to a video file in local file system.
   * @param log Optional logger for this conversation, if not provided, the logger of ChatAboutVideo instance will be used.
   * @returns The conversation.
   */
  async startConversation(videoFile: string, log?: ConsoleLineLogger): Promise<Conversation<CLIENT, OPTIONS, PROMPT, RESPONSE>>;

  /**
   * Start a conversation about a video.
   * @param videoFile Path to a video file in local file system.
   * @param options Overriding options for this conversation
   * @param log Optional logger for this conversation, if not provided, the logger of ChatAboutVideo instance will be used.
   * @returns The conversation.
   */
  async startConversation(videoFile: string, options?: OPTIONS, log?: ConsoleLineLogger): Promise<Conversation<CLIENT, OPTIONS, PROMPT, RESPONSE>>;

  /**
   * Start a conversation about a video.
   * @param videos Array of videos, images, or audios to be used in the conversation.
   * For each video/audio, the file path and the prompt before it should be provided.
   * For each group of images, the image file paths and the prompt before the image group should be provided.
   * @param log Optional logger for this conversation, if not provided, the logger of ChatAboutVideo instance will be used.
   * @returns The conversation.
   */
  async startConversation(
    videos: Array<VideoInput | ImagesInput | AudioInput>,
    log?: ConsoleLineLogger,
  ): Promise<Conversation<CLIENT, OPTIONS, PROMPT, RESPONSE>>;

  /**
   * Start a conversation about a video.
   * @param videos Array of videos, images, or audios to be used in the conversation.
   * For each video/audio, the file path and the prompt before it should be provided.
   * For each group of images, the image file paths and the prompt before the image group should be provided.
   * @param options Overriding options for this conversation
   * @param log Optional logger for this conversation, if not provided, the logger of ChatAboutVideo instance will be used.
   * @returns The conversation.
   */
  async startConversation(
    videos: Array<VideoInput | ImagesInput | AudioInput>,
    options?: OPTIONS,
    log?: ConsoleLineLogger,
  ): Promise<Conversation<CLIENT, OPTIONS, PROMPT, RESPONSE>>;

  async startConversation(
    arg1?: string | Array<VideoInput | ImagesInput | AudioInput> | OPTIONS | ConsoleLineLogger,
    arg2?: OPTIONS | ConsoleLineLogger,
    arg3?: ConsoleLineLogger,
  ): Promise<Conversation<CLIENT, OPTIONS, PROMPT, RESPONSE>> {
    const videoFile = typeof arg1 === 'string' ? arg1 : undefined;
    const videosOrImages = Array.isArray(arg1) ? arg1 : undefined;

    let passedInLog: ConsoleLineLogger | undefined;
    let passedInOptions: OPTIONS | undefined;
    if (videoFile || videosOrImages) {
      // (media, options, log) or (media, log)
      if (isConsoleLineLogger(arg2)) {
        // (media, log)
        passedInOptions = undefined;
        passedInLog = arg2;
      } else {
        // (media, options, log)
        passedInOptions = arg2;
        passedInLog = arg3;
      }
    } else {
      // (options, log) or (log)
      const arg1OfType2 = arg1 as typeof arg2;
      const arg2OfType3 = arg2 as typeof arg3;
      if (isConsoleLineLogger(arg1OfType2)) {
        // (log)
        passedInOptions = undefined;
        passedInLog = arg1OfType2;
      } else {
        // (options, log)
        passedInOptions = arg1OfType2;
        passedInLog = arg2OfType3;
      }
    }

    let options = {
      ...this.options.completionOptions,
      ...passedInOptions,
    } as OPTIONS;

    const cleanupFuncs: Array<() => Promise<any>> = [];
    const conversationId = generateRandomString(24); // equivalent to uuid

    const api = await this.apiPromise;
    let initialPrompt: PROMPT | undefined = undefined;

    if (options.startPromptText) {
      const { prompt } = await api.buildTextPrompt(options.startPromptText, conversationId);
      initialPrompt = await api.appendToPrompt(prompt, initialPrompt);
    }

    // A single video
    if (videoFile) {
      const { prompt, options: additionalOptions, cleanup } = await api.buildVideoPrompt(videoFile, conversationId);
      initialPrompt = await api.appendToPrompt(prompt, initialPrompt);
      options = { ...options, ...additionalOptions };
      if (cleanup) {
        cleanupFuncs.push(cleanup);
      }
    }

    // Multiple videos or groups of images
    if (videosOrImages) {
      for (const media of videosOrImages) {
        if (media.promptText) {
          const { prompt: promptBefore } = await api.buildTextPrompt(media.promptText, conversationId);
          initialPrompt = await api.appendToPrompt(promptBefore, initialPrompt);
        }

        const video = media as VideoInput;
        const images = media as ImagesInput;
        const audio = media as AudioInput;
        if (video.videoFile) {
          const { prompt, options: additionalOptions, cleanup } = await api.buildVideoPrompt(video.videoFile, conversationId);
          initialPrompt = await api.appendToPrompt(prompt, initialPrompt);
          options = { ...options, ...additionalOptions };
          if (cleanup) {
            cleanupFuncs.push(cleanup);
          }
        }
        if (images.images) {
          const { prompt, options: additionalOptions, cleanup } = await api.buildImagesPrompt(images.images, conversationId);
          initialPrompt = await api.appendToPrompt(prompt, initialPrompt);
          options = { ...options, ...additionalOptions };
          if (cleanup) {
            cleanupFuncs.push(cleanup);
          }
        }
        if (audio.audioFile) {
          const { prompt, options: additionalOptions, cleanup } = await api.buildAudioPrompt(audio.audioFile, conversationId);
          initialPrompt = await api.appendToPrompt(prompt, initialPrompt);
          options = { ...options, ...additionalOptions };
          if (cleanup) {
            cleanupFuncs.push(cleanup);
          }
        }
      }
    }

    const conversation = new Conversation<CLIENT, OPTIONS, PROMPT, RESPONSE>(
      conversationId,
      api,
      initialPrompt,
      options,
      () => Promise.all(cleanupFuncs.map((cleanup) => cleanup())),
      passedInLog ?? this.log,
    );
    return conversation;
  }
}

/**
 * Add up usage.
 * @param totalUsage Existing usage that will be updated.
 * @param incrementalUsage New usage to add. If it is undefined, then there will be no change to totalUsage.
 * @returns nothing, the totalUsage is updated in place.
 */
export function accumulateUsage(totalUsage: UsageMetadata, incrementalUsage: UsageMetadata | undefined) {
  if (!incrementalUsage) {
    return totalUsage;
  }
  totalUsage.totalTokens += incrementalUsage.totalTokens;
  if (incrementalUsage.promptTokens != null) {
    totalUsage.promptTokens = (totalUsage.promptTokens ?? 0) + incrementalUsage.promptTokens;
  }
  if (incrementalUsage.completionTokens != null) {
    totalUsage.completionTokens = (totalUsage.completionTokens ?? 0) + incrementalUsage.completionTokens;
  }
}

/**
 * Reference-counted cleanup shared by a conversation and every conversation forked from it.
 * The underlying cleanup runs when the last living conversation in the family calls {@link Conversation.end}.
 */
class SharedCleanup {
  /**
   * Number of active conversation instances in the fork family currently referencing these shared resources.
   * Starts at 1 for the initial conversation, increments on {@link retain} when a conversation is forked,
   * and decrements on {@link release} when a conversation ends.
   * When `pending` drops to 0, all conversations in the family have called {@link Conversation.end}, triggering
   * the underlying resource `cleanup` function.
   */
  private pending = 1;

  constructor(private readonly cleanup: (() => Promise<any>) | undefined) {}

  /**
   * Register another conversation that uses these resources.
   * @returns nothing
   * @throws When the resources have already been cleaned up.
   */
  retain(): void {
    if (this.pending <= 0) {
      throw new Error('Cannot fork a conversation whose resources have already been cleaned up');
    }
    this.pending += 1;
  }

  /**
   * Release one conversation's claim on these resources.
   * @returns `true` when this release ran the underlying cleanup.
   */
  async release(): Promise<boolean> {
    if (this.pending <= 0) {
      return false;
    }
    this.pending -= 1;
    if (this.pending > 0) {
      return false;
    }
    if (this.cleanup) {
      await this.cleanup();
      return true;
    }
    return false;
  }
}

export class Conversation<CLIENT = any, OPTIONS extends AdditionalCompletionOptions = any, PROMPT = any, RESPONSE = any> {
  protected usage: UsageMetadata | undefined;
  protected sharedCleanup: SharedCleanup;
  protected ended = false;
  /**
   * Prompt length when this conversation was constructed, before any successful turn.
   * Rewind past every checkpoint restores the prompt to this length.
   */
  protected initialPromptLength: number;
  /**
   * Prompt length after each successful {@link Conversation.say} or {@link Conversation.submitToolCallResults}.
   *
   * Note on `PROMPT` type assumption:
   * The turn-checkpoint and {@link rewind} mechanisms assume that `PROMPT` is an Array of message objects (as implemented
   * by standard providers such as Gemini and ChatGPT). Array lengths are recorded as checkpoint markers. If `PROMPT` is not an
   * Array (or is undefined), checkpoint recording and restoring safely degrade to no-ops.
   */
  protected checkpoints: number[] = [];

  constructor(
    protected conversationId: string,
    protected api: ChatApi<CLIENT, OPTIONS, PROMPT, RESPONSE>,
    protected prompt: PROMPT | undefined,
    protected options: OPTIONS,
    cleanup?: () => Promise<any>,
    protected log: ConsoleLineLogger | undefined = consoleWithoutColour(),
  ) {
    this.sharedCleanup = new SharedCleanup(cleanup);
    this.initialPromptLength = Array.isArray(prompt) ? prompt.length : 0;
    this.log && this.log.debug(`Conversation ${this.conversationId} started`, { conversation: this.prompt, options });
  }

  /**
   * Get the underlying API instance.
   * @returns The underlying API instance.
   */
  getApi(): ChatApi<CLIENT, OPTIONS, PROMPT, RESPONSE> {
    return this.api;
  }

  /**
   * Get usage statistics of the conversation.
   * Please note that the usage statistics would be undefined before the first `say` call.
   * It could also be undefined if the underlying API does not support usage statistics.
   * The usage statistics may not cover those failed requests due to content filtering or other reasons.
   * Therefore, it could be less than the billable usage.
   * @returns The usage statistics of the conversation. Or undefined if not available.
   */
  getUsage(): UsageMetadata | undefined {
    return this.usage;
  }

  /**
   * Get the prompt for the current conversation.
   * The prompt is the accumulated messages in the conversation so far.
   * @returns The prompt which is the accumulated messages in the conversation so far.
   */
  getPrompt(): PROMPT | undefined {
    return this.prompt;
  }

  /**
   * Say something in the conversation, and get the response from AI
   * @template RT The type of the response. It can be a string | undefined, or ConversationResponse, or the combination of them.
   *              You need to choose the correct type based on whether tool call could be returned.
   * @param message The message to say in the conversation.
   * @param options Options for fine control.
   * @returns The response text if there's no tool call, or a ConversationResponse object if there's tool call.
   */
  async say<RT extends string | ConversationResponse = string>(message: string, options?: Partial<OPTIONS>): Promise<RT> {
    const committedLength = this.promptLength();
    try {
      const { prompt: newPromptPart } = await this.api.buildTextPrompt(message);
      const updatedPrompt = await this.api.appendToPrompt(newPromptPart, this.prompt);
      const effectiveOptions = { ...this.options, ...options } as OPTIONS;
      return (await this.progressConversation(updatedPrompt, effectiveOptions)) as RT;
    } catch (error) {
      this.restorePromptLength(committedLength);
      throw error;
    }
  }

  /**
   * Submit tool call results to the conversation, and get the response from AI.
   * @template RT The type of the response. It can be a string or ConversationResponse, or the combination of them.
   *              You need to choose the correct type based on whether tool call could be returned.
   * @param toolResults Array of tool call results.
   * @param options Options for fine control
   * @returns The response text if there's no further tool call, or a ConversationResponse object if there's further tool call.
   */
  async submitToolCallResults<RT extends string | ConversationResponse = string>(
    toolResults: ToolCallResult[],
    options?: Partial<OPTIONS>,
  ): Promise<RT>;

  /**
   * Submit tool call results to the conversation, and get the response from AI.
   * @template RT The type of the response. It can be a string or ConversationResponse, or the combination of them.
   *              You need to choose the correct type based on whether tool call could be returned.
   * @param toolResults Array of tool call results.
   * @param additionalMessage Optional message to append to the prompt
   * @param options Options for fine control
   * @returns The response text if there's no further tool call, or a ConversationResponse object if there's further tool call.
   */
  async submitToolCallResults<RT extends string | ConversationResponse = string>(
    toolResults: ToolCallResult[],
    additionalMessage?: string,
    options?: Partial<OPTIONS>,
  ): Promise<RT>;

  /**
   * Submit tool call results to the conversation, and get the response from AI.
   * @template RT The type of the response. It can be a string or ConversationResponse, or the combination of them.
   *              You need to choose the correct type based on whether tool call could be returned.
   * @param toolResults Array of tool call results.
   * @param additionalMessageOrOptions Optional message to append to the prompt, or options for fine control.
   * @param options Options for fine control (if additionalMessageOrOptions is a string).
   * @returns The response text if there's no further tool call, or a ConversationResponse object if there's further tool call.
   */
  async submitToolCallResults<RT extends string | ConversationResponse = string>(
    toolResults: ToolCallResult[],
    additionalMessageOrOptions?: string | Partial<OPTIONS>,
    options?: Partial<OPTIONS>,
  ): Promise<RT> {
    let additionalMessage: string | undefined;
    let opts: Partial<OPTIONS> | undefined;
    if (typeof additionalMessageOrOptions === 'string' || (additionalMessageOrOptions == null && typeof options === 'object')) {
      additionalMessage = additionalMessageOrOptions;
      opts = options;
    } else {
      additionalMessage = undefined;
      opts = additionalMessageOrOptions;
    }
    const committedLength = this.promptLength();
    let callCleanup: (() => Promise<any>) | undefined;
    try {
      const { prompt: toolResultsPrompt, cleanup } = await this.api.buildToolCallResultsPrompt(toolResults, this.conversationId);
      callCleanup = cleanup;
      let updatedPrompt = await this.api.appendToPrompt(toolResultsPrompt, this.prompt);
      if (additionalMessage) {
        const { prompt: additionalPrompt } = await this.api.buildTextPrompt(additionalMessage);
        updatedPrompt = await this.api.appendToPrompt(additionalPrompt, updatedPrompt);
      }
      const effectiveOptions = { ...this.options, ...opts } as OPTIONS;
      return (await this.progressConversation(updatedPrompt, effectiveOptions)) as RT;
    } catch (error) {
      this.restorePromptLength(committedLength);
      throw error;
    } finally {
      if (callCleanup) {
        await callCleanup();
      }
    }
  }

  protected async progressConversation(updatedPrompt: PROMPT, effectiveOptions: OPTIONS): Promise<string | undefined | ConversationResponse> {
    const response = await withRetry(
      () =>
        withRetry(
          () =>
            withRetry(
              () =>
                withRetry(
                  () => this.api.generateContent(updatedPrompt, effectiveOptions),
                  effectiveOptions.backoffOnThrottling ?? [],
                  (error) => this.api.isThrottlingError(error),
                ),
              effectiveOptions.backoffOnServerError ?? [],
              (error) => this.api.isServerError(error),
            ),
          effectiveOptions.backoffOnConnectivityError ?? [],
          (error) => this.api.isConnectivityError(error),
        ),
      effectiveOptions.backoffOnDownloadError ?? [],
      (error) => this.api.isDownloadError(error),
    );
    const incrementalUsage = await this.api.getUsageMetadata(response);
    if (incrementalUsage) {
      if (this.usage) {
        accumulateUsage(this.usage, incrementalUsage);
      } else {
        this.usage = { ...incrementalUsage };
      }
    }

    this.prompt = await this.api.appendToPrompt(response, updatedPrompt);

    this.log &&
      this.log.debug(`Conversation ${this.conversationId} progressed`, {
        conversation: this.prompt,
        effectiveOptions,
        totalUsage: this.usage,
        incrementalUsage,
      });

    const toolCalls = await this.api.getToolCalls(response);
    const responseText = await this.api.getResponseText(response);
    this.recordCheckpoint();

    return toolCalls && toolCalls.length > 0 ? { toolCalls, responseText } : responseText;
  }

  /**
   * Create a new conversation with a deep copy of this conversation's prompt and checkpoints.
   * The fork starts with no usage of its own. Later turns and {@link rewind} calls on either
   * conversation do not affect the other.
   *
   * Pass `steps` to fork from an earlier checkpoint. That is a {@link fork} followed by {@link rewind}
   * on the new conversation only.
   *
   * Cleanup of shared resources (extracted frames, uploaded images) runs only after every
   * conversation in the family has called {@link end}.
   *
   * @param steps Optional number of successful turns to remove from the fork, with the same meaning as {@link rewind}.
   *              Omitted, zero, and negative values fork at the current prompt.
   * @returns The forked conversation.
   * @throws When this conversation or its family resources have already been ended / cleaned up.
   */
  fork(steps?: number): Conversation<CLIENT, OPTIONS, PROMPT, RESPONSE> {
    if (this.ended) {
      throw new Error('Cannot fork a conversation that has already ended');
    }
    this.sharedCleanup.retain();
    let forked: Conversation<CLIENT, OPTIONS, PROMPT, RESPONSE>;
    try {
      forked = new Conversation(
        generateTempConversationId(),
        this.api,
        this.prompt == null ? undefined : structuredClone(this.prompt),
        { ...this.options },
        undefined,
        this.log,
      );
    } catch (error) {
      void this.sharedCleanup.release();
      throw error;
    }
    forked.sharedCleanup = this.sharedCleanup;
    forked.initialPromptLength = this.initialPromptLength;
    forked.checkpoints = [...this.checkpoints];
    if (steps != null) {
      forked.rewind(steps);
    }
    return forked;
  }

  /**
   * Remove the last successful turns from the prompt.
   * One turn is one successful {@link say} or {@link submitToolCallResults}.
   * Usage already recorded on this conversation is left as it is.
   *
   * Note: Rewind assumes `this.prompt` is an Array of message objects (as used by Gemini and ChatGPT APIs).
   * If `PROMPT` is not an Array (or is undefined), `rewind` becomes a no-op because no checkpoints are recorded.
   *
   * @param steps Number of successful turns to remove. Values past the number of successful turns
   *              remove every turn and restore the prompt to the length it had when this conversation
   *              was created. Zero and negative values do nothing.
   * @returns nothing
   */
  rewind(steps: number): void {
    if (!Number.isFinite(steps) || steps <= 0 || this.checkpoints.length === 0) {
      return;
    }
    const drop = Math.min(Math.floor(steps), this.checkpoints.length);
    this.checkpoints.splice(this.checkpoints.length - drop, drop);
    const length = this.checkpoints.at(-1) ?? this.initialPromptLength;
    this.restorePromptLength(length);
  }

  /**
   * End this conversation.
   * Shared resources are deleted when this is the last living conversation in the fork family.
   * Calling `end` again on the same instance does nothing.
   * @returns nothing
   */
  async end(): Promise<void> {
    if (this.ended) {
      return;
    }
    this.ended = true;
    const cleanedUp = await this.sharedCleanup.release();
    if (cleanedUp) {
      this.log && this.log.debug(`Conversation ${this.conversationId} cleaned up`, { totalUsage: this.usage });
    }
  }

  protected promptLength(): number {
    return Array.isArray(this.prompt) ? this.prompt.length : 0;
  }

  /**
   * Record a checkpoint marker of the current prompt length after a successful turn.
   * Assumes `this.prompt` is an Array of message objects.
   * If `this.prompt` is not an Array (or is undefined), recording is safely skipped (no-op).
   * @returns nothing
   */
  protected recordCheckpoint(): void {
    if (Array.isArray(this.prompt)) {
      this.checkpoints.push(this.prompt.length);
    }
  }

  /**
   * Shrink the prompt back to `length`.
   * Assumes `this.prompt` is an Array of message objects (as used by Gemini and ChatGPT APIs).
   * If `this.prompt` is not an Array (or is undefined), shrinking is safely skipped (no-op), ensuring a failed restore cannot mask the error that caused it.
   * Note: If `PROMPT` is not an Array and an API call fails mid-turn, automatic prompt restoration on error will be a no-op, leaving `this.prompt` in its partially-appended state.
   * @param length Prompt length to restore.
   * @returns nothing
   */
  protected restorePromptLength(length: number): void {
    if (!Array.isArray(this.prompt) || length < 0 || length > this.prompt.length) {
      return;
    }
    this.prompt.length = length;
  }
}

/**
 * Convenient function to generate a temporary conversation ID.
 * @returns A temporary conversation ID.
 */
export function generateTempConversationId(): string {
  return `tmp-${generateRandomString(24)}`;
}

/**
 * Build prompt for sending frame images of a video content to AI.
 * This function is usually used for implementing the `buildVideoPrompt` function of ChatApi by utilising already implemented `buildImagesPrompt` function.
 * It extracts frame images from the video and builds a prompt containing those images for the conversation.
 * @param api The API instance.
 * @param extractVideoFrames The options for extracting video frames.
 * @param tmpDir The temporary directory to store the extracted frames.
 * @param videoFile Path to a video file in local file system.
 * @param conversationId The conversation ID.
 * @returns The prompt and options for the conversation.
 */
export async function buildImagesPromptFromVideo<CLIENT, OPTIONS extends AdditionalCompletionOptions, PROMPT, RESPONSE>(
  api: ChatApi<CLIENT, OPTIONS, PROMPT, RESPONSE>,
  extractVideoFrames: EffectiveExtractVideoFramesOptions,
  tmpDir: string,
  videoFile: string,
  conversationId = generateTempConversationId(),
): Promise<BuildPromptOutput<PROMPT, OPTIONS>> {
  const videoFramesDir = extractVideoFrames.framesDirectoryResolver(videoFile, tmpDir, conversationId);
  const { relativePaths, cleanup: cleanupExtractedFrames } = await extractVideoFrames.extractor(
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

  const output = await api.buildImagesPrompt(
    relativePaths.map((relativePath) => ({
      imageFile: path.join(videoFramesDir, relativePath),
    })),
    conversationId,
  );

  return {
    ...output,
    cleanup: async () => {
      const tasks: Promise<any>[] = [];
      if (extractVideoFrames.deleteFilesWhenConversationEnds) {
        tasks.push(cleanupExtractedFrames());
      }
      if (output.cleanup) {
        tasks.push(output.cleanup());
      }
      await Promise.all(tasks);
    },
  };
}

function isConsoleLineLogger(logger: any): logger is ConsoleLineLogger {
  return (
    logger &&
    typeof logger.debug === 'function' &&
    typeof logger.info === 'function' &&
    typeof logger.warn === 'function' &&
    typeof logger.error === 'function'
  );
}
