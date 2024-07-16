import { ConsoleLineLogger, consoleWithoutColour, generateRandomString } from '@handy-common-utils/misc-utils';
import { withRetry } from '@handy-common-utils/promise-utils';

import type { ChatGptApi, ChatGptOptions } from './chat-gpt';
import type { GeminiApi, GeminiOptions } from './gemini';

import { AdditionalCompletionOptions, ChatApi, ClientOfChatApi, OptionsOfChatApi, PromptOfChatApi, ResponseOfChatApi } from './types';

const defaultCompletionOptions: AdditionalCompletionOptions = {
  systemPromptText:
    "You are an AI specialized in analyzing video content. The user will provide frames from a video and ask questions about that video. Your task is to provide objective, concise, and accurate answers based solely on the provided frames. Do not acknowledge or repeat the user's questions, and avoid any explanations. Provide only the necessary information and answer the questions directly.",
  backoffOnThrottling: [1000, 2000, 3000, 5000, 10000, 10000],
};

function isGeminiOptions(options: any): options is GeminiOptions {
  const opts = options as GeminiOptions;
  return opts?.clientSettings?.modelParams != null;
}

function isChatGptOptions(options: any): options is ChatGptOptions {
  const opts = options as ChatGptOptions;
  return !isGeminiOptions(options) && opts?.storage != null;
}

export type ChatAboutVideoWith<T> = ChatAboutVideo<ClientOfChatApi<T>, OptionsOfChatApi<T>, PromptOfChatApi<T>, ResponseOfChatApi<T>>;
export type ChatAboutVideoWithChatGpt = ChatAboutVideoWith<ChatGptApi>;
export type ChatAboutVideoWithGemini = ChatAboutVideoWith<GeminiApi>;

export type ConversationWith<T> = Conversation<ClientOfChatApi<T>, OptionsOfChatApi<T>, PromptOfChatApi<T>, ResponseOfChatApi<T>>;
export type ConversationWithChatGpt = ConversationWith<ChatGptApi>;
export type ConversationWithGemini = ConversationWith<GeminiApi>;

export type SupportedChatApiOptions = ChatGptOptions | GeminiOptions;

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
        this.log.debug(`Using ChatGpt API (endpoint=${effectiveOptions.endpoint}, deployment=${effectiveOptions.completionOptions?.deploymentName})`);
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
   * @param options Overriding options for this conversation
   * @returns The conversation.
   */
  async startConversation(options?: OPTIONS): Promise<Conversation<CLIENT, OPTIONS, PROMPT, RESPONSE>>;

  /**
   * Start a conversation about a video.
   * @param videoFile Path to a video file in local file system.
   * @param options Overriding options for this conversation
   * @returns The conversation.
   */
  async startConversation(videoFile: string, options?: OPTIONS): Promise<Conversation<CLIENT, OPTIONS, PROMPT, RESPONSE>>;

  async startConversation(
    videoFileOrOptions?: string | OPTIONS,
    optionsOrUndefined?: OPTIONS,
  ): Promise<Conversation<CLIENT, OPTIONS, PROMPT, RESPONSE>> {
    const videoFile = typeof videoFileOrOptions === 'string' ? videoFileOrOptions : undefined;
    let options = {
      ...this.options.completionOptions,
      ...(typeof videoFileOrOptions === 'string' ? optionsOrUndefined : videoFileOrOptions),
    } as OPTIONS;

    const cleanupFuncs: Array<() => Promise<any>> = [];
    const conversationId = generateRandomString(24); // equivalent to uuid

    const api = await this.apiPromise;
    let initialPrompt: PROMPT | undefined = undefined;
    if (options.startPromptText) {
      const { prompt } = await api.buildTextPrompt(options.startPromptText, conversationId);
      initialPrompt = await api.appendToPrompt(prompt, initialPrompt);
    }
    if (videoFile) {
      const { prompt, options: additionalOptions, cleanup } = await api.buildVideoPrompt(videoFile, conversationId);
      initialPrompt = await api.appendToPrompt(prompt, initialPrompt);
      options = { ...options, ...additionalOptions };
      if (cleanup) {
        cleanupFuncs.push(cleanup);
      }
    }

    const conversation = new Conversation<CLIENT, OPTIONS, PROMPT, RESPONSE>(
      conversationId,
      api,
      initialPrompt,
      options,
      () => Promise.all(cleanupFuncs.map((cleanup) => cleanup())),
      this.log,
    );
    return conversation;
  }
}

export class Conversation<CLIENT = any, OPTIONS extends AdditionalCompletionOptions = any, PROMPT = any, RESPONSE = any> {
  constructor(
    protected conversationId: string,
    protected api: ChatApi<CLIENT, OPTIONS, PROMPT, RESPONSE>,
    protected prompt: PROMPT | undefined,
    protected options: OPTIONS,
    protected cleanup?: () => Promise<any>,
    protected log: ConsoleLineLogger | undefined = consoleWithoutColour(),
  ) {
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
   * Get the prompt for the current conversation.
   * The prompt is the accumulated messages in the conversation so far.
   * @returns The prompt which is the accumulated messages in the conversation so far.
   */
  getPrompt(): PROMPT | undefined {
    return this.prompt;
  }

  /**
   * Say something in the conversation, and get the response from AI
   * @param message The message to say in the conversation.
   * @param options Options for fine control.
   * @returns The response/completion
   */
  async say(message: string, options?: Partial<OPTIONS>): Promise<string | undefined> {
    const { prompt: newPromptPart } = await this.api.buildTextPrompt(message);
    const updatedPrompt = await this.api.appendToPrompt(newPromptPart, this.prompt);
    const effectiveOptions = { ...this.options, ...options };
    const response = await withRetry(
      () => this.api.generateContent(updatedPrompt, effectiveOptions),
      effectiveOptions.backoffOnThrottling ?? [],
      (error) => this.api.isThrottlingError(error),
    );
    const responseText = await this.api.getResponseText(response);
    this.prompt = await this.api.appendToPrompt(response, updatedPrompt);

    this.log && this.log.debug(`Conversation ${this.conversationId} progressed`, { conversation: this.prompt, effectiveOptions });
    return responseText;
  }

  async end(): Promise<void> {
    if (this.cleanup) {
      await this.cleanup();
      this.log && this.log.debug(`Conversation ${this.conversationId} cleaned up`);
    }
  }
}
