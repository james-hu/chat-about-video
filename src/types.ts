import { FileBatchUploader } from './storage/types';
import { VideoFramesExtractor } from './video/types';

export interface ImageInput {
  /**
   * The prompt text before the image.
   * This is optional, and could be used to provide the timestamp or other information about the image.
   */
  promptText?: string;
  /**
   * Path to an image file in local file system.
   */
  imageFile: string;
}

export interface VideoInput {
  /**
   * The prompt before the video.
   */
  promptText: string;
  /**
   * Path to a video file in local file system.
   */
  videoFile: string;
}

export interface ImagesInput {
  /**
   * The prompt before the images.
   */
  promptText: string;
  images: Array<ImageInput>;
}

export interface AdditionalCompletionOptions {
  /**
   * System prompt text. If not provided, a default prompt will be used.
   */
  systemPromptText?: string;
  /**
   * The user prompt that will be sent before the video content.
   * If not provided, nothing will be sent before the video content.
   */
  startPromptText?: string;
  /**
   * Array of retry backoff periods (unit: milliseconds) for situations that the server returns 429 response
   */
  backoffOnThrottling?: number[];
  /**
   * Array of retry backoff periods (unit: milliseconds) for situations that the server returns 5xx response
   */
  backoffOnServerError?: number[];
}

export interface ChatApiOptions<CS, CO> {
  credential: {
    key: string;
  };
  endpoint?: string;
  clientSettings?: CS;
  completionOptions?: AdditionalCompletionOptions & CO;
  /**
   * Temporary directory for storing temporary files.
   * If not specified, then the temporary directory of the OS will be used.
   */
  tmpDir?: string;
}

export interface BuildPromptOutput<PROMPT, OPTIONS> {
  prompt: PROMPT;
  options?: Partial<OPTIONS>;
  cleanup?: () => Promise<any>;
}

export type ClientOfChatApi<T> = T extends ChatApi<infer CLIENT, any, any, any> ? CLIENT : never;
export type OptionsOfChatApi<T> = T extends ChatApi<any, infer OPTIONS, any, any> ? OPTIONS : never;
export type PromptOfChatApi<T> = T extends ChatApi<any, any, infer PROMPT, any> ? PROMPT : never;
export type ResponseOfChatApi<T> = T extends ChatApi<any, any, any, infer RESPONSE> ? RESPONSE : never;

export interface ChatApi<CLIENT, OPTIONS extends AdditionalCompletionOptions, PROMPT, RESPONSE> {
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
   * Get the text from the response object
   * @param response the response object
   */
  getResponseText(response: RESPONSE): Promise<string | undefined>;

  /**
   * Check if the error is a throttling error.
   * @param error any error object
   * @returns true if the error is a throttling error, false otherwise.
   */
  isThrottlingError(error: any): boolean;

  /**
   * Check if the error is a server error.
   * @param error any error object
   * @returns true if the error is a server error, false otherwise.
   */
  isServerError(error: any): boolean;

  /**
   * Build prompt for sending video content to AI.
   * Sometimes, to include video in the conversation, additional options and/or clean up is needed.
   * In such case, options to be passed to generateContent function and/or a clean up callback function
   * can be returned from this function.
   * @param videoFile Path to the video file.
   * @param conversationId Unique identifier of the conversation.
   * @returns An object containing the prompt, optional options, and an optional cleanup function.
   */
  buildVideoPrompt(videoFile: string, conversationId?: string): Promise<BuildPromptOutput<PROMPT, OPTIONS>>;

  /**
   * Build prompt for sending images content to AI.
   * Sometimes, to include images in the conversation, additional options and/or clean up is needed.
   * In such case, options to be passed to generateContent function and/or a clean up callback function
   * can be returned from this function.
   * @param imageInputs Array of image inputs.
   * @param conversationId Unique identifier of the conversation.
   * @returns An object containing the prompt, optional options, and an optional cleanup function.
   */
  buildImagesPrompt(imageInputs: ImageInput[], conversationId?: string): Promise<BuildPromptOutput<PROMPT, OPTIONS>>;

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

export interface ExtractVideoFramesOptions {
  /**
   * Function for extracting frames from the video.
   * If not specified, a default function using ffmpeg will be used.
   */
  extractor?: VideoFramesExtractor;
  /**
   * Function for determining the directory location for storing extracted frames.
   * If not specified, a default function will be used.
   * The function takes three arguments:
   * @param inputFile The input video file
   * @param tmpDir The temporary directory "tmpDir" that can be specified through ChatApiOptions
   * @param conversationId Conversation ID generated by ChatAboutVideo
   * @returns The directory that extracted frame image files will be stored in.
   */
  framesDirectoryResolver?: (inputFile: string, tmpDir: string, conversationId: string) => string;
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
  /**
   * Whether files should be deleted when the conversation ends.
   */
  deleteFilesWhenConversationEnds?: boolean;
}

export type EffectiveExtractVideoFramesOptions = Pick<ExtractVideoFramesOptions, 'height'> & Required<Omit<ExtractVideoFramesOptions, 'height'>>;

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
  /**
   * Whether files should be deleted when the conversation ends.
   */
  deleteFilesWhenConversationEnds?: boolean;

  azureStorageConnectionString?: string;
}
