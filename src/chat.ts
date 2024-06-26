/* eslint-disable unicorn/prefer-string-replace-all */
/* eslint-disable unicorn/no-array-push-push */
import { AzureKeyCredential, ChatCompletions, ChatMessageContentItem, ChatRequestAssistantMessage, ChatRequestMessage, ChatRequestSystemMessage, ChatRequestUserMessage, GetChatCompletionsOptions, OpenAIClient, OpenAIKeyCredential } from '@azure/openai';
import { ConsoleLineLogger, consoleWithoutColour, generateRandomString } from '@handy-common-utils/misc-utils';
import { withRetry } from '@handy-common-utils/promise-utils';
import os from 'node:os';
import path from 'node:path';

import { fixClient } from './client-hack';
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

  videoRetrievalIndex?: {
    endpoint: string;
    apiKey: string;
    indexName?: string;
    createIndexIfNotExists?: boolean;
    deleteIndexWhenConversationEnds?: boolean;
    deleteDocumentWhenConversationEnds?: boolean;
  };

  extractVideoFrames?: {
    /**
     * Function for extracting frames from the video.
     * If not specified, a default function using ffmpeg will be used.
     */
    extractor: VideoFramesExtractor;
    /**
     * Intervals between frames to be extracted. The unit is second.
     * Default value is 5.
     */
    interval: number;
    /**
     * Maximum number of frames to be extracted.
     * Default value is 10 which is the current per-request limitation of ChatGPT Vision.
     */
    limit: number;
    /**
     * Video frame width, default is 200.
     * If both videoFrameWidth and videoFrameHeight are not specified,
     * then the frames will not be resized/scaled.
     */
    width: number | undefined;
    /**
     * Video frame height, default is undefined which means the scaling
     * will be determined by the videoFrameWidth option.
     * If both videoFrameWidth and videoFrameHeight are not specified,
     * then the frames will not be resized/scaled.
     */
    height: number | undefined;
  }

  /**
   * Function for uploading files
   */
  fileBatchUploader: FileBatchUploader;
  /**
   * Storage container for storing frame images of the video.
   */
  storageContainerName?: string;
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

export type ExtractVideoFramesOptions = Exclude<ChatAboutVideoOptions['extractVideoFrames'], undefined>;
export type VideoRetrievalIndexOptions = Exclude<ChatAboutVideoOptions['videoRetrievalIndex'], undefined>;
export type ChatOptions = {
  /**
   * Array of retry backoff periods (unit: milliseconds) for situations that the server returns 429 response
   */
  throttleBackoff?: number[];
} & GetChatCompletionsOptions;
export type ConversationOptions = {
  chatCompletions?: Partial<ChatOptions>;
  extractVideoFrames?: Partial<ExtractVideoFramesOptions>;
  videoRetrievalIndex?: Partial<VideoRetrievalIndexOptions>;
};

const DEFAULT_INITIAL_PROMPTS = [
  {
    role: 'system',
    content: 'You are an AI specialized in analyzing video content. The user will provide frames from a video and ask questions about the content. Your task is to provide objective, concise, and accurate answers based solely on the provided frames. Do not acknowledge or repeat the user\'s questions, and avoid any explanations. Provide only the necessary information and answer the questions directly.',
  } as ChatRequestSystemMessage,
  {
    role: 'user',
    content: 'I am going to give you frames extracted from the video, then I will let you know when I am going to give you instructions.',
  } as ChatRequestUserMessage,
];

const DEFAULT_START_PROMPTS = [
  {
    role: 'user',
    content: 'Now I have given you all the frames in the video. I am going to give you instructions.',
  } as ChatRequestUserMessage,
];

export type ChatAboutVideoConstructorOptions = {
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
} & {
  videoRetrievalIndex?: Partial<ChatAboutVideoOptions['videoRetrievalIndex']> & Pick<Exclude<ChatAboutVideoOptions['videoRetrievalIndex'], undefined>, 'endpoint' | 'apiKey'>;
  extractVideoFrames?: Partial<Exclude<ChatAboutVideoOptions['extractVideoFrames'], undefined>>;
} & Partial<Omit<ChatAboutVideoOptions, 'videoRetrievalIndex' | 'extractVideoFrames'>> & Required<Pick<ChatAboutVideoOptions, 'openAiDeploymentName'>>

interface PreparationResult {
  messages: ChatRequestMessage[],
  options?: ChatOptions,
  cleanup?: () => Promise<void>;
}

export class ChatAboutVideo {
  protected options: ChatAboutVideoOptions;
  protected client: OpenAIClient;
  constructor(
    options: ChatAboutVideoConstructorOptions,
    protected log: ConsoleLineLogger | undefined = consoleWithoutColour(),
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
      tmpDir: os.tmpdir(),
      ...options,
      extractVideoFrames: (options.extractVideoFrames || !options.videoRetrievalIndex) ? {
        extractor: extractVideoFramesWithFfmpeg,
        interval: 5,
        limit: 10,
        width: 200,
        height: undefined,
        ...options.extractVideoFrames,
      } : undefined,
      videoRetrievalIndex: options.videoRetrievalIndex ? {
        createIndexIfNotExists: true,
        deleteDocumentWhenConversationEnds: true,
        deleteIndexWhenConversationEnds: false,
        ...options.videoRetrievalIndex,
      } : undefined,
    };
    // eslint-disable-next-line unicorn/prefer-ternary
    if (options.openAiEndpoint) {
      this.client = new OpenAIClient(options.openAiEndpoint, new AzureKeyCredential(options.openAiApiKey));
    } else {
      this.client = new OpenAIClient(new OpenAIKeyCredential(options.openAiApiKey));
    }
    fixClient(this.client);
  }

  /**
   * Start a conversation without a video
   * @param options Overriding options for this conversation
   * @returns The conversation.
   */
  async startConversation(options?: Pick<ConversationOptions, 'chatCompletions'>): Promise<Conversation>

  /**
   * Start a conversation about a video.
   * @param videoFile Path to a video file in local file system.
   * @param options Overriding options for this conversation
   * @returns The conversation.
   */
  async startConversation(videoFile: string, options?: {
    chatCompletions?: Partial<ChatOptions>;
    extractVideoFrames?: Partial<ExtractVideoFramesOptions>;
    videoRetrievalIndex?: Partial<VideoRetrievalIndexOptions>;
  }): Promise<Conversation>

  async startConversation(
    videoFileOrOptions?: string | Pick<ConversationOptions, 'chatCompletions'>,
    optionsOrUndefined?: ConversationOptions,
  ): Promise<Conversation> {
    const videoFile = typeof videoFileOrOptions === 'string' ? videoFileOrOptions : undefined;
    const options: typeof optionsOrUndefined = typeof videoFileOrOptions === 'string' ? optionsOrUndefined: videoFileOrOptions;

    const conversationId = generateRandomString(24); // equivalent to uuid
    const messages: ChatRequestMessage[] = [];
    messages.push(...(this.options.initialPrompts ?? DEFAULT_INITIAL_PROMPTS));

    let preparationResult: PreparationResult|undefined;
    if (videoFile) {
      preparationResult = this.options.extractVideoFrames ?
        await this.prepareVideoFrames(conversationId, videoFile, options?.extractVideoFrames) : await this.prepareVideoRetrievalIndex(conversationId, videoFile, options?.videoRetrievalIndex);
      messages.push(...preparationResult.messages);
    }

    messages.push(...(this.options.startPrompts ?? DEFAULT_START_PROMPTS));

    const conversation = new Conversation(this.client, this.options.openAiDeploymentName, conversationId, messages, { ...preparationResult?.options, ...options?.chatCompletions }, preparationResult?.cleanup, this.log);
    return conversation;
  }

  protected async prepareVideoFrames(conversationId: string, videoFile: string, extractVideoFramesOptions?: Partial<ExtractVideoFramesOptions>): Promise<PreparationResult> {
    const extractVideoFrames = {
      ...this.options.extractVideoFrames!,
      ...extractVideoFramesOptions,
    };
    const videoFramesDir = path.join(this.options.tmpDir, conversationId);
    const frameImageFiles = await extractVideoFrames.extractor(videoFile, videoFramesDir, extractVideoFrames.interval, undefined, extractVideoFrames.width, extractVideoFrames.height);
    this.log && this.log.debug(`Extracted ${frameImageFiles.length} frames from video`, frameImageFiles);
    const maxNumFrames = extractVideoFrames.limit;
    if (frameImageFiles.length > maxNumFrames) {
      const previousLength = frameImageFiles.length;
      frameImageFiles.splice(maxNumFrames);
      this.log && this.log.debug(`Truncated ${previousLength} frames to ${maxNumFrames}`);
    }

    const frameImageUrls = await this.options.fileBatchUploader(videoFramesDir, frameImageFiles, this.options.storageContainerName!, `${this.options.storagePathPrefix}${conversationId}/`);
    this.log && this.log.debug(`Uploaded ${frameImageUrls.length} frames to storage`, frameImageUrls);

    const messages: ChatRequestMessage[] = [];
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
    return {
      messages,
    };
  }

  protected async prepareVideoRetrievalIndex(conversationId: string, videoFile: string, videoRetrievalIndexOptions?: Partial<VideoRetrievalIndexOptions>): Promise<PreparationResult> {
    const [videoUrl] = await this.options.fileBatchUploader(path.dirname(videoFile), [path.basename(videoFile)], this.options.storageContainerName!, `${this.options.storagePathPrefix}${conversationId}/`);

    const videoRetrievalIndex = {
      ...this.options.videoRetrievalIndex!,
      ...videoRetrievalIndexOptions,
    };
    const { endpoint, apiKey, indexName: specifiedIndexName, createIndexIfNotExists: createIndexIfNotExist, deleteDocumentWhenConversationEnds: deleteDocumentAfterConversation, deleteIndexWhenConversationEnds: deleteIndexAfterConversation } = videoRetrievalIndex;
    const indexName = specifiedIndexName ?? conversationId.toLowerCase().replace(/[^\dA-Za-z]/g, '-');
    const ingestionName = conversationId;
    const documentId = conversationId;
    const documentUrl = videoUrl;
  
    const { VideoRetrievalApiClient } = await import('./azure');
    const videoRetrievalIndexClient = new VideoRetrievalApiClient(endpoint, apiKey);
    
    if (createIndexIfNotExist) {
      await videoRetrievalIndexClient.createIndexIfNotExist(indexName);
    }


    await videoRetrievalIndexClient.ingest(indexName, ingestionName, {
      moderation: false,
      generateInsightIntervals: true,
      filterDefectedFrames: true,
      includeSpeechTranscript: true,
      videos: [
        {
          mode: 'add',
          documentId,
          documentUrl,
        },
      ],
    });
    this.log && this.log.debug(`Indexed video in index ${indexName}`);

    const messages: ChatRequestMessage[] = [];
    messages.push({
      role: 'user',
      content: [
        {
          type: 'acv_document_id',
          acv_document_id: documentId,
        } as unknown as ChatMessageContentItem,
      ],
    } as ChatRequestUserMessage);
    return {
      messages,
      options: {
        azureExtensionOptions: {
          enhancements: {
            video: {
              enabled: true,
            },
          } as any,
          extensions: [
            {
              type: 'AzureComputerVisionVideoIndex',
              parameters: {
                endpoint: endpoint,
                computer_vision_api_key: apiKey,
                index_name: indexName,
                video_urls: [videoUrl],
              },
            } as any,
          ],
        },
      },
      cleanup: async () => {
        if (deleteIndexAfterConversation) {
          await videoRetrievalIndexClient.deleteIndex(indexName);
        } else if (deleteDocumentAfterConversation) {
          await videoRetrievalIndexClient.deleteDocument(indexName, documentUrl);
        }
      },
    };
  }
}

function chatResponse(result: ChatCompletions): string | undefined {
  return result?.choices?.[0]?.message?.content || undefined;
}

export class Conversation {
  constructor(
    protected client: OpenAIClient,
    protected deploymentName: string,
    protected conversationId: string,
    protected messages: ChatRequestMessage[],
    protected options?: GetChatCompletionsOptions,
    protected cleanup?: () => Promise<void>,
    protected log: ConsoleLineLogger|undefined = consoleWithoutColour(),
  ) { }

  /**
   * Say something in the conversation, and get the response from AI
   * @param message The message to say in the conversation.
   * @param options Options for fine control.
   * @returns The response/completion
   */
  async say(message: string, options?: ChatOptions): Promise<string|undefined> {
    const newMessage: ChatRequestUserMessage = {
      role: 'user',
      content: message,
    };

    const effectiveOptions = { ...this.options, ...options };
    const messagesToSend = [...this.messages, newMessage];
    const result = await withRetry(() => this.client.getChatCompletions(this.deploymentName, messagesToSend, effectiveOptions), effectiveOptions.throttleBackoff ?? [], (error) => {
      const code = String(error?.code);
      return code === 'TooManyRequests' || code === '429';
    });
    this.log && this.log.debug('Result from chat', JSON.stringify(result, null, 2));

    const response = chatResponse(result);
    this.messages.push(
      newMessage,
      {
        role: 'assistant',
        content: response,
      } as ChatRequestAssistantMessage);
    this.log && this.log.debug('Updated message history', JSON.stringify(this.messages, null, 2));
    return response;
  }

  async end(): Promise<void> {
    if (this.cleanup) {
      await this.cleanup();
    }
  }
}