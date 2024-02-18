/* eslint-disable unicorn/no-array-push-push */
import { AzureKeyCredential, ChatCompletions, ChatRequestAssistantMessage, ChatRequestMessage, ChatRequestSystemMessage, ChatRequestUserMessage, GetChatCompletionsOptions, OpenAIClient } from '@azure/openai';
import { ConsoleLineLogger, consoleWithoutColour, generateRandomString } from '@handy-common-utils/misc-utils';
import os from 'node:os';
import path from 'node:path';

import { FileBatchUploader, lazyCreatedFileBatchUploader } from './storage';
import { VideoFramesExtractor, extractVideoFramesWithFfmpeg } from './video';

/**
 * Option settings for ChatAboutVideo
 */
export interface ChatAboutVideoOptions {
  /**
   * Name/ID of the deployment
   */
  openAiDeploymentName: string;
  /**
   * Temporary directory for storing temporary files.
   * If not specified, them temporary directory of the OS will be used.
   */
  tmpDir: string;

  /**
   * Function for extracting frames from the video.
   * If not specified, a default function using ffmpeg will be used.
   */
  videoFramesExtractor: VideoFramesExtractor;
  /**
   * Intervals between frames to be extracted. The unit is second.
   * Default value is 5.
   */
  videoFramesInterval: number;
  /**
   * Video frame width, default is 200.
   * If both videoFrameWidth and videoFrameHeight are not specified,
   * then the frames will not be resized/scaled.
   */
  videoFrameWidth: number | undefined;
  /**
   * Video frame height, default is undefined which means the scaling
   * will be determined by the videoFrameWidth option.
   * If both videoFrameWidth and videoFrameHeight are not specified,
   * then the frames will not be resized/scaled.
   */
  videoFrameHeight: number | undefined;

  /**
   * Function for uploading files
   */
  fileBatchUploader: FileBatchUploader;
  /**
   * Storage container for storing frame images of the video.
   */
  storageContainerName: string;
  /**
   * Path prefix to be prepended for storing frame images of the video.
   */
  storagePathPrefix: string;

  /**
   * Initial prompts to be added to the chat history before frame images.
   */
  initialPrompts?: ChatRequestMessage[];
  /**
   * Prompts to be added to the chat history right after frame images.
   */
  startPrompts?: ChatRequestMessage[];
}

const DEFAULT_INITIAL_PROMPTS = [
  {
    role: 'system',
    content: 'You are a helpful assistant who can understand video. Based on frames extracted from the video, you are able to understand what is happening in the video. You will be given video frames by the user, then you will follow the instructions from the user. You answers should be objective, concise and accurate.',
  } as ChatRequestSystemMessage,
  {
    role: 'user',
    content: 'I am going to give you the frames extracted from the video, then I will let you know when I am going to give you instructions.',
  } as ChatRequestUserMessage,
];

const DEFAULT_START_PROMPTS = [
  {
    role: 'user',
    content: 'Now you have all the frames in the video. I am going to give you instructions.',
  } as ChatRequestUserMessage,
];

export class ChatAboutVideo {
  protected options: ChatAboutVideoOptions;
  protected client: OpenAIClient;
  constructor(
    options: Partial<ChatAboutVideoOptions> & Required<Pick<ChatAboutVideoOptions, 'openAiDeploymentName'|'storageContainerName'>> & {
      /**
       * Endpoint URL for accessing the deployment in Azure,
       * or undefined for non-Azure OpenAI API.
       */
      openAiEndpoint?: string;
      /**
       * API key for accessing the deployment
       */
      openAiApiKey: string;
      /**
       * Azure Storage connection string.
       * Frame images of the video will be uploaded to blob storage using this connection string.
       */
      azureStorageConnectionString?: string;
      /**
       * Number of seconds for the generated download URL to be valid.
       * Download URLs will be generated for the deployment to access uploaded frame images.
       */
      downloadUrlExpirationSeconds?: number;
    },
    protected log: ConsoleLineLogger = consoleWithoutColour(),
  ) {
    let fileBatchUploader = options.fileBatchUploader;
    if (!fileBatchUploader) {
      if (!options.storageContainerName) {
        throw new Error('Either fileBatchUploader or storageContainerName must be provided');
      }
      // eslint-disable-next-line unicorn/prefer-ternary
      if (options.azureStorageConnectionString) {
        // use Azure
        fileBatchUploader = lazyCreatedFileBatchUploader(
          Promise.all([import('./azure'), import('@azure/storage-blob')])
            .then(([azure, storageBlob]) => azure.createAzureBlobStorageFileBatchUploader(
              storageBlob.BlobServiceClient.fromConnectionString(options.azureStorageConnectionString!),
              options.downloadUrlExpirationSeconds ?? 3600,
            ))); 
      } else {
        // use AWS
        fileBatchUploader = lazyCreatedFileBatchUploader(
          Promise.all([import('./aws'), import('@aws-sdk/client-s3')])
            .then(([aws, clientS3]) => aws.createAwsS3FileBatchUploader(new clientS3.S3Client(), options.downloadUrlExpirationSeconds ?? 3600))); 
      }
    }

    this.options = {
      fileBatchUploader,
      storagePathPrefix: '',
      videoFramesExtractor: extractVideoFramesWithFfmpeg,
      videoFramesInterval: 5,
      videoFrameWidth: 200,
      videoFrameHeight: undefined,
      tmpDir: os.tmpdir(),
      ...options,
    };
    // eslint-disable-next-line unicorn/prefer-ternary
    if (options.openAiEndpoint) {
      this.client = new OpenAIClient(options.openAiEndpoint, new AzureKeyCredential(options.openAiApiKey));
    } else {
      this.client = new OpenAIClient({ key: options.openAiApiKey });
    }
  }

  /**
   * Start a conversation about a video.
   * @param videoFile Path to a video file in local file system.
   * @returns The conversation.
   */
  async startConversation(videoFile: string): Promise<Conversation> {
    const conversationId = generateRandomString(24); // equivalent to uuid
    const videoFramesDir = path.join(this.options.tmpDir, conversationId);
    const frameImageFiles = await this.options.videoFramesExtractor(videoFile, videoFramesDir, this.options.videoFramesInterval, undefined, this.options.videoFrameWidth, this.options.videoFrameHeight);
    this.log.debug(`Extracted ${frameImageFiles.length} frames from video`, frameImageFiles);
    if (frameImageFiles.length > 10) {
      const previousLength = frameImageFiles.length;
      // It allows only no more than 10 images
      frameImageFiles.splice(10);
      this.log.debug(`Truncated ${previousLength} frames to 10`);
    }

    const frameImageUrls = await this.options.fileBatchUploader(videoFramesDir, frameImageFiles, this.options.storageContainerName, `${this.options.storagePathPrefix}${conversationId}/`);
    this.log.debug(`Uploaded ${frameImageUrls.length} frames to storage`, frameImageUrls);

    const messages: ChatRequestMessage[] = [];
    messages.push(...(this.options.initialPrompts ?? DEFAULT_INITIAL_PROMPTS));
    messages.push(...frameImageUrls.map((url) => ({
      role: 'user',
      content: [{
        type: 'image_url',
        imageUrl: {
          url,
          detail: 'auto',
        },
      }],
    } as ChatRequestUserMessage)));
    messages.push(...(this.options.startPrompts ?? DEFAULT_START_PROMPTS));

    const result = await this.client.getChatCompletions(this.options.openAiDeploymentName, messages);
    this.log.debug('First result from chat', JSON.stringify(result, null, 2));
    const response = chatResponse(result);
    if (response) {
      messages.push({
        role: 'assistant',
        content: response,
      } as ChatRequestAssistantMessage);
    }

    const conversation = new Conversation(this.client, this.options.openAiDeploymentName, conversationId, messages);
    return conversation;
  }
}

function chatResponse(result: ChatCompletions): string | undefined {
  return result.choices?.[0]?.message?.content || undefined;
}

export class Conversation {
  constructor(
    protected client: OpenAIClient,
    protected deploymentName: string,
    protected conversationId: string,
    protected messages: ChatRequestMessage[],
    protected log: ConsoleLineLogger = consoleWithoutColour(),
  ) { }

  /**
   * Say something in the conversation, and get the response from AI
   * @param message The message to say in the conversation.
   * @param options Options for fine control.
   * @returns The response/completion
   */
  async say(message: string, options?: GetChatCompletionsOptions): Promise<string|undefined> {
    this.messages.push({
      role: 'user',
      content: message,
    } as ChatRequestUserMessage);
    const result = await this.client.getChatCompletions(this.deploymentName, this.messages, options);
    this.messages.push({
      role: 'assistant',
      content: chatResponse(result),
    } as ChatRequestAssistantMessage);
    this.log.debug('Result from chat', JSON.stringify(result, null, 2));
    this.log.debug('Message history', JSON.stringify(this.messages, null, 2));
    const response = chatResponse(result);
    return response;
  }
}