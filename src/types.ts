import { FileBatchUploader } from './storage/types';
import { VideoFramesExtractor } from './video/types';

export interface ChatApiOptions<CS, CO> {
  credential: {
    key: string;
  };
  endpoint?: string;
  deploymentName: string;
  clientSettings: CS;
  completionOptions?: {
    /**
     * System prompt text. If not provided, a default prompt will be used.
     */
    systemPromptText?: string;
    /**
     * The user prompt that will be sent before the video content.
     * If not provided, nothing will be sent before the video content.
     */
    startPromptText?: string;
  } & CO;
  /**
   * Temporary directory for storing temporary files.
   * If not specified, then the temporary directory of the OS will be used.
   */
  tmpDir?: string;
}

export interface BuildVideoPromptOutput<PROMPT, OPTIONS> {
  prompt: PROMPT;
  options?: OPTIONS;
  cleanup?: () => Promise<void>;
}
export interface ChatAPI<CLIENT, OPTIONS, PROMPT, RESPONSE> {
  /**
   * Get the raw client.
   * This function could be useful for advanced use cases.
   * @returns The raw client.
   */
  getClient(): Promise<CLIENT>;
  /**
   * Append a new prompt or response to the form a full prompt.
   * This function is useful to build a prompt that contains conversation history.
   * @param newPromptOrResponse A new prompt to be appended, or previous response to be appended.
   * @param prompt The conversation history which is a prompt containing previous prompts and responses.
   *               If it is not provided, the conversation history returned will contain only what is in newPromptOrResponse.
   * @returns The full prompt which is effectively the conversation history.
   */
  appendToPrompt(newPromptOrResponse: PROMPT | RESPONSE, prompt?: PROMPT): Promise<PROMPT>;
  /**
   * Generate content based on the given prompt and options.
   * @param prompt The full prompt to generate content.
   * @param options Optional options to control the content generation.
   * @returns The generated content.
   */
  generateContent(prompt: PROMPT, options?: OPTIONS): Promise<RESPONSE>;

  /**
   * Build prompt for sending video content to AI.
   * Sometimes, to include video in the conversation, additional options and/or clean up is needed.
   * In such case, options to be passed to generateContent function and/or a clean up call back function
   * will be returned in the output of this function.
   * @param videoFile Path to the video file.
   * @param conversationId Unique identifier of the conversation.
   * @returns An object containing the prompt, optional options, and an optional cleanup function.
   */
  buildVideoPrompt(videoFile: string, conversationId?: string): Promise<BuildVideoPromptOutput<PROMPT, OPTIONS>>;

  /**
   * Build prompt for sending text content to AI
   * @param text The text content to be sent.
   * @param conversationId Unique identifier of the conversation.
   * @returns An object containing the prompt.
   */
  buildTextPrompt(
    text: string,
    conversationId?: string,
  ): Promise<{
    prompt: PROMPT;
  }>;
}

export interface VideoRetrievalIndexOptions {
  endpoint: string;
  apiKey: string;
  indexName?: string;
  createIndexIfNotExists?: boolean;
  deleteIndexWhenConversationEnds?: boolean;
  deleteDocumentWhenConversationEnds?: boolean;
}

export interface ExtractVideoFramesOptions {
  /**
   * Function for extracting frames from the video.
   * If not specified, a default function using ffmpeg will be used.
   */
  extractor?: VideoFramesExtractor;
  /**
   * Image format of the extracted frames.
   * Default value is 'jpg'.
   */
  format?: string;
  /**
   * Intervals between frames to be extracted. The unit is second.
   * Default value is 5.
   */
  interval?: number;
  /**
   * Maximum number of frames to be extracted.
   * Default value is 10 which is the current per-request limitation of ChatGPT Vision.
   */
  limit?: number;
  /**
   * Video frame width, default is 200.
   * If both videoFrameWidth and videoFrameHeight are not specified,
   * then the frames will not be resized/scaled.
   */
  width?: number;
  /**
   * Video frame height, default is undefined which means the scaling
   * will be determined by the videoFrameWidth option.
   * If both videoFrameWidth and videoFrameHeight are not specified,
   * then the frames will not be resized/scaled.
   */
  height?: number;
}

export interface StorageOptions {
  /**
   * Function for uploading files
   */
  uploader?: FileBatchUploader;
  /**
   * Storage container for storing frame images of the video.
   */
  storageContainerName?: string;
  /**
   * Path prefix to be prepended for storing frame images of the video.
   * Default is empty.
   */
  storagePathPrefix?: string;
  /**
   * Expiration time for the download URL of the frame images in seconds. Default is 3600 seconds.
   */
  downloadUrlExpirationSeconds?: number;

  azureStorageConnectionString?: string;
}
