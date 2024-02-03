/* eslint-disable unicorn/no-array-push-push */
import { AzureKeyCredential, ChatCompletions, ChatRequestAssistantMessage, ChatRequestMessage, ChatRequestSystemMessage, ChatRequestUserMessage, OpenAIClient } from '@azure/openai';
import { BlobServiceClient } from '@azure/storage-blob';
import { nanoid } from 'nanoid/';
import os from 'node:os';
import path from 'node:path';

import { FileBatchUploader, createAzureBlobStorageFileBatchUploader } from './storage';
import { VideoFramesExtractor, extractVideoFramesWithFfmpeg } from './video';

export interface ChatAboutVideoOptions {
  openAiDeploymentName: string;
  tmpDir: string;

  videoFramesExtractor: VideoFramesExtractor;
  videoFramesInterval: number;
  videoFrameWidth: number | undefined;
  videoFrameHeight: number | undefined;

  fileBatchUploader: FileBatchUploader;
  storageContainerName: string;
  storagePathPrefix: string;

}

export type Log = typeof console.log;

export class ChatAboutVideo {
  protected options: ChatAboutVideoOptions;
  protected client: OpenAIClient;
  constructor(
    options: Partial<ChatAboutVideoOptions> & Required<Pick<ChatAboutVideoOptions, 'openAiDeploymentName'|'storageContainerName'>> & {
      openAiEndpoint: string;
      openAiApiKey: string;
      azureStorageConnectionString?: string;
      downloadUrlExpirationSeconds?: number;
    },
    protected log: Log = console.log,
  ) {
    let fileBatchUploader = options.fileBatchUploader;
    if (!fileBatchUploader && options.azureStorageConnectionString && options.storageContainerName) {
      fileBatchUploader = createAzureBlobStorageFileBatchUploader(BlobServiceClient.fromConnectionString(options.azureStorageConnectionString), options.downloadUrlExpirationSeconds ?? 3600); 
    } else {
      throw new Error('Either fileBatchUploader or (azureStorageConnectionString and storageContainerName)must be provided');
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
    this.client = new OpenAIClient(options.openAiEndpoint, new AzureKeyCredential(options.openAiApiKey));
  }

  async startConversation(videoFile: string): Promise<Conversation> {
    const conversationId = nanoid();
    const videoFramesDir = path.join(this.options.tmpDir, conversationId);
    const frameImageFiles = await this.options.videoFramesExtractor(videoFile, videoFramesDir, this.options.videoFramesInterval, undefined, this.options.videoFrameWidth, this.options.videoFrameHeight);
    this.log && this.log(`Extracted ${frameImageFiles.length} frames from video`, frameImageFiles);
    if (frameImageFiles.length > 10) {
      const previousLength = frameImageFiles.length;
      // It allows only no more than 10 images
      frameImageFiles.splice(10);
      this.log && this.log(`Truncated ${previousLength} frames to 10`);
    }

    const frameImageUrls = await this.options.fileBatchUploader(videoFramesDir, frameImageFiles, this.options.storageContainerName, `${this.options.storagePathPrefix}${conversationId}/`);
    this.log && this.log(`Uploaded ${frameImageUrls.length} frames to storage`, frameImageUrls);

    const messages: ChatRequestMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant who can understand video. Based on video frames extracted from the video, you are able to understand what is happening in the video. You will be given video frames by the user, then you will follow the instructions from the user. You answers should be objective, concise and accurate.',
      } as ChatRequestSystemMessage,
      {
        role: 'user',
        content: 'I am going to give you the frames extracted from the video, then I will let you know when I am going to give you instructions.',
      } as ChatRequestUserMessage,
    ];
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
    messages.push({
      role: 'user',
      content: 'Now you have all the frames in the video. I am going to give you instructions.',
    } as ChatRequestUserMessage);

    const result = await this.client.getChatCompletions(this.options.openAiDeploymentName, messages, {
      maxTokens: 4000,
    });
    this.log && this.log('First result from chat', JSON.stringify(result, null, 2));
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
    protected log: Log = console.log,
  ) { }

  async say(message: string): Promise<string|undefined> {
    this.messages.push({
      role: 'user',
      content: message,
    } as ChatRequestUserMessage);
    const result = await this.client.getChatCompletions(this.deploymentName, this.messages, {
      maxTokens: 4000,
    });
    this.messages.push({
      role: 'assistant',
      content: chatResponse(result),
    } as ChatRequestAssistantMessage);
    this.log && this.log('Result from chat', JSON.stringify(result, null, 2));
    this.log && this.log('Messages', JSON.stringify(this.messages, null, 2));
    const response = chatResponse(result);
    return response;
  }
}