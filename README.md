# chat-about-video

Chat about a video clip using the powerful OpenAI GPT-4 Vision or GPT-4o.

[![Version](https://img.shields.io/npm/v/chat-about-video.svg)](https://npmjs.org/package/chat-about-video)
[![Downloads/week](https://img.shields.io/npm/dw/chat-about-video.svg)](https://npmjs.org/package/chat-about-video)
[![License](https://img.shields.io/npm/l/chat-about-video.svg)](https://github.com/james-hu/chat-about-video/blob/master/package.json)


`chat-about-video` is an open-source NPM package designed to accelerate the development of conversation applications about video content. Harnessing the capabilities of OpenAI GPT-4 Vision or GPT-4o services from Microsoft Azure or OpenAI, this package opens up a range of usage scenarios with minimal effort.

Key features:

- ChatGPT models hosted in both Azure and OpenAI are supported.
- Frame images are extracted from the input video, and uploaded for ChatGPT to consume.
- It can automatically retry on receiving throttling (HTTP status code 429) responses from the API.
- Options supported by the underlying API are exposed for customisation.
- It can also be used in scenario that no video needs to be involved, that means it can used as just a "normal" chat client.

## Usage scenarios

There are two approaches for feeding video content into GPT-4 Vision. `chat-about-video` supports both of them.

__Frame image extraction:__

- Integrate GPT-4 Vision or GPT-4o from Microsoft Azure or OpenAI effortlessly.
- Utilize ffmpeg integration provided by this package for frame image extraction or opt for a DIY approach.
- Store frame images with ease, supporting Azure Blob Storage and AWS S3.
- GPT-4 Vision hosted in Azure allows analysis of up to 10 frame images.
- GPT-4 Vision or GPT-4o hosted in OpenAI allows analysis of more than 10 frame images.

__Video indexing with Microsoft Azure:__

- Exclusively supported by GPT-4 Vision from Microsoft Azure.
- Ingest videos seamlessly into Microsoft Azure's Video Retrieval Index.
- Automatic extraction of up to 20 frame images using Video Retrieval Indexer.
- Default integration of speech transcription for enhanced comprehension.
- Flexible storage options with support for Azure Blob Storage and AWS S3.


## Usage

### Installation

Add chat-about-video as a dependency to your Node.js application using the following command:

```shell
npm i chat-about-video
```
### Dependencies

If you intend to utilize ffmpeg for extracting video frame images, ensure it is installed on your system. You can install it using either a system package manager or a helper NPM package:

```shell
sudo apt install ffmpeg
# or
npm i @ffmpeg-installer/ffmpeg
```

If you plan to use Azure Blob Storage, include the following dependency:

```shell
npm i @azure/storage-blob
```

For using AWS S3, install the following dependencies:

```shell
npm i @handy-common-utils/aws-utils @aws-sdk/s3-request-presigner @aws-sdk/client-s3
```

### Usage in code

To integrate `chat-about-video` into your Node.js application, follow these simple steps:

1. Instantiate the `ChatAboutVideo` class by creating an instance. The constructor allows you to pass in configuration options.
  - Most configuration options come with sensible default values, but you can specify your own for further customization.
  - The second constructor argument is a logger. If not specified, a default logging will be created for logging to the console.
    If logging is not needed, you can pass in `undefined`. 
2. Use the `startConversation(videoFilePath, optionalOptions)` function to initiate a conversation about a video clip. This function returns a `Conversation` object. The video file or its frame images are sent to Azure Blob Storage or AWS S3 during this step.
  - If no video needs to be involved in the conversation, just use `startConversation(optionalOptions)`.
3. Interact with GPT by using the `say(question, { maxTokens: 2000 })` function within the conversation. You can pass in a question, and will receive an answer.
  - Message history is automatically kept during the conversation, providing context for a more coherent dialogue.
  - The second parameter of the `say(...)` function allows you to specify your own for further customization.
  - Instead of passing options such like `maxTokens` in every call to `say(...)`, you can specify those options when calling the constructor of `ChatAboutVideo`.
4. Wrap up the conversation using the `end()` function. This ensures proper clean-up and resource management.

### Examples

Below is an example chat application, which

- uses GPT deployment (in this example, it is named 'gpt4vision') hosted in Microsoft Azure;
- uses ffmpeg to extract video frame images;
- stores video frame images in Azure Blob Storage;
  - container name: 'vision-experiment-input'
  - object path prefix: 'video-frames/'
- reads credentials from environment variables
- reads input video file path from environment variable 'DEMO_VIDEO'

```javascript
import readline from 'node:readline';
import { ChatAboutVideo } from 'chat-about-video';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));

async function demo() {
  const chat = new ChatAboutVideo({
    openAiEndpoint: process.env.AZURE_OPENAI_API_ENDPOINT!, // This line is not needed if you are using GTP provided by OpenAI rather than by Microsoft Azure.
    openAiApiKey: process.env.OPENAI_API_KEY!, // This is the API key.
    azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!, // This line is not needed if you'd like to use AWS S3.
    openAiDeploymentName: 'gpt4vision', // For GPT provided by OpenAI, this is the model name. For GPT provided by Microsoft Azure, this is the deployment name.
    storageContainerName: 'vision-experiment-input', // Blob container name in Azure or S3 bucket name in AWS
    storagePathPrefix: 'video-frames/',
  });

  const conversation = await chat.startConversation(process.env.DEMO_VIDEO!);
  
  while(true) {
    const question = await prompt('\nUser: ');
    if (!question) {
      continue;
    }
    if (['exit', 'quit'].includes(question.toLowerCase().trim())) {
      break;
    }
    const answer = await conversation.say(question, { maxTokens: 2000 });
    console.log('\nAI:' + answer);
  }
}

demo().catch((error) => console.error(error));
```

Below is an example showing how to create an instance of `ChatAboutVideo` that

- uses GPT provided by OpenAI;
- uses ffmpeg to extract video frame images;
- stores video frame images in AWS S3;
  - bucket name: 'my-s3-bucket'
  - object path prefix: 'video-frames/'
- reads API key from environment variable 'OPENAI_API_KEY'

```javascript
  const chat = new ChatAboutVideo({
    openAiApiKey: process.env.OPENAI_API_KEY!,
    openAiDeploymentName: 'gpt-4-vision-preview', // or 'gpt-4o'
    storageContainerName: 'my-s3-bucket',
    storagePathPrefix: 'video-frames/',
    extractVideoFrames: {
      limit: 30,    // override default value 10
      interval: 2,  // override default value 5
    },
  });
```

Below is an example showing how to create an instance of `ChatAboutVideo` that

- uses GPT deployment (in this example, it is named 'gpt4vision') hosted in Microsoft Azure;
- uses Microsoft Video Retrieval Index to extract frames and analyse the video
  - A randomly named index is created automatically.
  - The index is also deleted automatically when the conversation ends.
- stores video file in Azure Blob Storage;
  - container name: 'vision-experiment-input'
  - object path prefix: 'videos/'
- reads credentials from environment variables

```javascript
  const chat = new ChatAboutVideo({
    openAiEndpoint: process.env.AZURE_OPENAI_API_ENDPOINT!,
    openAiApiKey: process.env.AZURE_OPENAI_API_KEY!,
    azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
    openAiDeploymentName: 'gpt4vision',
    storageContainerName: 'vision-experiment-input',
    storagePathPrefix: 'videos/',
    videoRetrievalIndex: {
      endpoint: process.env.AZURE_CV_API_ENDPOINT!,
      apiKey: process.env.AZURE_CV_API_KEY!,
      createIndexIfNotExists: true,
      deleteIndexWhenConversationEnds: true,
    },
  });
```

# API

<!-- API start -->
<a name="readmemd"></a>

## chat-about-video

### Modules

- [aws](#modulesawsmd)
- [azure](#modulesazuremd)
- [azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd)
- [chat](#moduleschatmd)
- [client-hack](#modulesclient_hackmd)
- [index](#modulesindexmd)
- [storage](#modulesstoragemd)
- [storage/types](#modulesstorage_typesmd)
- [video](#modulesvideomd)
- [video/ffmpeg](#modulesvideo_ffmpegmd)
- [video/types](#modulesvideo_typesmd)

## Classes


<a name="classesazure_video_retrieval_api_clientvideoretrievalapiclientmd"></a>

### Class: VideoRetrievalApiClient

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).VideoRetrievalApiClient

#### Constructors

##### constructor

• **new VideoRetrievalApiClient**(`endpointBaseUrl`, `apiKey`, `apiVersion?`)

###### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `endpointBaseUrl` | `string` | `undefined` |
| `apiKey` | `string` | `undefined` |
| `apiVersion` | `string` | `'2023-05-01-preview'` |

#### Methods

##### createIndex

▸ **createIndex**(`indexName`, `indexOptions?`): `Promise`\<`void`\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `indexName` | `string` |
| `indexOptions` | [`CreateIndexOptions`](#interfacesazure_video_retrieval_api_clientcreateindexoptionsmd) |

###### Returns

`Promise`\<`void`\>

___

##### createIndexIfNotExist

▸ **createIndexIfNotExist**(`indexName`, `indexOptions?`): `Promise`\<`void`\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `indexName` | `string` |
| `indexOptions?` | [`CreateIndexOptions`](#interfacesazure_video_retrieval_api_clientcreateindexoptionsmd) |

###### Returns

`Promise`\<`void`\>

___

##### createIngestion

▸ **createIngestion**(`indexName`, `ingestionName`, `ingestion`): `Promise`\<`void`\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `indexName` | `string` |
| `ingestionName` | `string` |
| `ingestion` | [`IngestionRequest`](#interfacesazure_video_retrieval_api_clientingestionrequestmd) |

###### Returns

`Promise`\<`void`\>

___

##### deleteDocument

▸ **deleteDocument**(`indexName`, `documentUrl`): `Promise`\<`void`\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `indexName` | `string` |
| `documentUrl` | `string` |

###### Returns

`Promise`\<`void`\>

___

##### deleteIndex

▸ **deleteIndex**(`indexName`): `Promise`\<`void`\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `indexName` | `string` |

###### Returns

`Promise`\<`void`\>

___

##### getIndex

▸ **getIndex**(`indexName`): `Promise`\<`undefined` \| [`IndexSummary`](#interfacesazure_video_retrieval_api_clientindexsummarymd)\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `indexName` | `string` |

###### Returns

`Promise`\<`undefined` \| [`IndexSummary`](#interfacesazure_video_retrieval_api_clientindexsummarymd)\>

___

##### getIngestion

▸ **getIngestion**(`indexName`, `ingestionName`): `Promise`\<[`IngestionSummary`](#interfacesazure_video_retrieval_api_clientingestionsummarymd)\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `indexName` | `string` |
| `ingestionName` | `string` |

###### Returns

`Promise`\<[`IngestionSummary`](#interfacesazure_video_retrieval_api_clientingestionsummarymd)\>

___

##### ingest

▸ **ingest**(`indexName`, `ingestionName`, `ingestion`, `backoff?`): `Promise`\<`void`\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `indexName` | `string` |
| `ingestionName` | `string` |
| `ingestion` | [`IngestionRequest`](#interfacesazure_video_retrieval_api_clientingestionrequestmd) |
| `backoff` | `number`[] |

###### Returns

`Promise`\<`void`\>

___

##### listDocuments

▸ **listDocuments**(`indexName`): `Promise`\<[`DocumentSummary`](#interfacesazure_video_retrieval_api_clientdocumentsummarymd)[]\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `indexName` | `string` |

###### Returns

`Promise`\<[`DocumentSummary`](#interfacesazure_video_retrieval_api_clientdocumentsummarymd)[]\>

___

##### listIndexes

▸ **listIndexes**(): `Promise`\<[`IndexSummary`](#interfacesazure_video_retrieval_api_clientindexsummarymd)[]\>

###### Returns

`Promise`\<[`IndexSummary`](#interfacesazure_video_retrieval_api_clientindexsummarymd)[]\>


<a name="classeschatchataboutvideomd"></a>

### Class: ChatAboutVideo

[chat](#moduleschatmd).ChatAboutVideo

#### Constructors

##### constructor

• **new ChatAboutVideo**(`options`, `log?`)

###### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`ChatAboutVideoConstructorOptions`](#chataboutvideoconstructoroptions) |
| `log` | `undefined` \| `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |

#### Properties

| Property | Description |
| --- | --- |
| `Protected` **client**: `OpenAIClient` |  |
| `Protected` **log**: `undefined` \| `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |  |
| `Protected` **options**: [`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd) |  |


#### Methods

##### prepareVideoFrames

▸ `Protected` **prepareVideoFrames**(`conversationId`, `videoFile`, `extractVideoFramesOptions?`): `Promise`\<`PreparationResult`\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `conversationId` | `string` |
| `videoFile` | `string` |
| `extractVideoFramesOptions?` | `Partial`\<\{ `extractor`: [`VideoFramesExtractor`](#videoframesextractor) ; `height`: `undefined` \| `number` ; `interval`: `number` ; `limit`: `number` ; `width`: `undefined` \| `number`  }\> |

###### Returns

`Promise`\<`PreparationResult`\>

___

##### prepareVideoRetrievalIndex

▸ `Protected` **prepareVideoRetrievalIndex**(`conversationId`, `videoFile`, `videoRetrievalIndexOptions?`): `Promise`\<`PreparationResult`\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `conversationId` | `string` |
| `videoFile` | `string` |
| `videoRetrievalIndexOptions?` | `Partial`\<\{ `apiKey`: `string` ; `createIndexIfNotExists?`: `boolean` ; `deleteDocumentWhenConversationEnds?`: `boolean` ; `deleteIndexWhenConversationEnds?`: `boolean` ; `endpoint`: `string` ; `indexName?`: `string`  }\> |

###### Returns

`Promise`\<`PreparationResult`\>

___

##### startConversation

▸ **startConversation**(`options?`): `Promise`\<[`Conversation`](#classeschatconversationmd)\>

Start a conversation without a video

###### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `options?` | `Pick`\<[`ConversationOptions`](#conversationoptions), ``"chatCompletions"``\> | Overriding options for this conversation |

###### Returns

`Promise`\<[`Conversation`](#classeschatconversationmd)\>

The conversation.

▸ **startConversation**(`videoFile`, `options?`): `Promise`\<[`Conversation`](#classeschatconversationmd)\>

Start a conversation about a video.

###### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `videoFile` | `string` | Path to a video file in local file system. |
| `options?` | `Object` | Overriding options for this conversation |
| `options.chatCompletions?` | `Partial`\<[`ChatOptions`](#chatoptions)\> | - |
| `options.extractVideoFrames?` | `Partial`\<\{ `extractor`: [`VideoFramesExtractor`](#videoframesextractor) ; `height`: `undefined` \| `number` ; `interval`: `number` ; `limit`: `number` ; `width`: `undefined` \| `number`  }\> | - |
| `options.videoRetrievalIndex?` | `Partial`\<\{ `apiKey`: `string` ; `createIndexIfNotExists?`: `boolean` ; `deleteDocumentWhenConversationEnds?`: `boolean` ; `deleteIndexWhenConversationEnds?`: `boolean` ; `endpoint`: `string` ; `indexName?`: `string`  }\> | - |

###### Returns

`Promise`\<[`Conversation`](#classeschatconversationmd)\>

The conversation.


<a name="classeschatconversationmd"></a>

### Class: Conversation

[chat](#moduleschatmd).Conversation

#### Constructors

##### constructor

• **new Conversation**(`client`, `deploymentName`, `conversationId`, `messages`, `options?`, `cleanup?`, `log?`)

###### Parameters

| Name | Type |
| :------ | :------ |
| `client` | `OpenAIClient` |
| `deploymentName` | `string` |
| `conversationId` | `string` |
| `messages` | `ChatRequestMessage`[] |
| `options?` | `GetChatCompletionsOptions` |
| `cleanup?` | () => `Promise`\<`void`\> |
| `log` | `undefined` \| `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |

#### Properties

| Property | Description |
| --- | --- |
| `Protected` `Optional` **cleanup**: () => `Promise`\<`void`\> |  |
| `Protected` **client**: `OpenAIClient` |  |
| `Protected` **conversationId**: `string` |  |
| `Protected` **deploymentName**: `string` |  |
| `Protected` **log**: `undefined` \| `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |  |
| `Protected` **messages**: `ChatRequestMessage`[] |  |
| `Protected` `Optional` **options**: `GetChatCompletionsOptions` |  |


#### Methods

##### end

▸ **end**(): `Promise`\<`void`\>

###### Returns

`Promise`\<`void`\>

___

##### say

▸ **say**(`message`, `options?`): `Promise`\<`undefined` \| `string`\>

Say something in the conversation, and get the response from AI

###### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `message` | `string` | The message to say in the conversation. |
| `options?` | [`ChatOptions`](#chatoptions) | Options for fine control. |

###### Returns

`Promise`\<`undefined` \| `string`\>

The response/completion

## Interfaces


<a name="interfacesazure_video_retrieval_api_clientcreateindexoptionsmd"></a>

### Interface: CreateIndexOptions

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).CreateIndexOptions

#### Properties

| Property | Description |
| --- | --- |
| `Optional` **features**: [`IndexFeature`](#interfacesazure_video_retrieval_api_clientindexfeaturemd)[] |  |
| `Optional` **metadataSchema**: [`IndexMetadataSchema`](#interfacesazure_video_retrieval_api_clientindexmetadataschemamd) |  |
| `Optional` **userData**: `object` |  |



<a name="interfacesazure_video_retrieval_api_clientdocumentsummarymd"></a>

### Interface: DocumentSummary

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).DocumentSummary

#### Properties

| Property | Description |
| --- | --- |
| **createdDateTime**: `string` |  |
| **documentId**: `string` |  |
| `Optional` **documentUrl**: `string` |  |
| **lastModifiedDateTime**: `string` |  |
| `Optional` **metadata**: `object` |  |
| `Optional` **userData**: `object` |  |



<a name="interfacesazure_video_retrieval_api_clientindexfeaturemd"></a>

### Interface: IndexFeature

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).IndexFeature

#### Properties

| Property | Description |
| --- | --- |
| `Optional` **domain**: ``"surveillance"`` \| ``"generic"`` |  |
| `Optional` **modelVersion**: `string` |  |
| **name**: ``"vision"`` \| ``"speech"`` |  |



<a name="interfacesazure_video_retrieval_api_clientindexmetadataschemamd"></a>

### Interface: IndexMetadataSchema

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).IndexMetadataSchema

#### Properties

| Property | Description |
| --- | --- |
| **fields**: [`IndexMetadataSchemaField`](#interfacesazure_video_retrieval_api_clientindexmetadataschemafieldmd)[] |  |
| `Optional` **language**: `string` |  |



<a name="interfacesazure_video_retrieval_api_clientindexmetadataschemafieldmd"></a>

### Interface: IndexMetadataSchemaField

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).IndexMetadataSchemaField

#### Properties

| Property | Description |
| --- | --- |
| **filterable**: `boolean` |  |
| **name**: `string` |  |
| **searchable**: `boolean` |  |
| **type**: ``"string"`` \| ``"datetime"`` |  |



<a name="interfacesazure_video_retrieval_api_clientindexsummarymd"></a>

### Interface: IndexSummary

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).IndexSummary

#### Properties

| Property | Description |
| --- | --- |
| **createdDateTime**: `string` |  |
| **eTag**: `string` |  |
| `Optional` **features**: [`IndexFeature`](#interfacesazure_video_retrieval_api_clientindexfeaturemd)[] |  |
| **lastModifiedDateTime**: `string` |  |
| **name**: `string` |  |
| `Optional` **userData**: `object` |  |



<a name="interfacesazure_video_retrieval_api_clientingestionrequestmd"></a>

### Interface: IngestionRequest

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).IngestionRequest

#### Properties

| Property | Description |
| --- | --- |
| `Optional` **filterDefectedFrames**: `boolean` |  |
| `Optional` **generateInsightIntervals**: `boolean` |  |
| `Optional` **includeSpeechTranscript**: `boolean` |  |
| `Optional` **moderation**: `boolean` |  |
| **videos**: [`VideoIngestion`](#interfacesazure_video_retrieval_api_clientvideoingestionmd)[] |  |



<a name="interfacesazure_video_retrieval_api_clientingestionstatusdetailmd"></a>

### Interface: IngestionStatusDetail

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).IngestionStatusDetail

#### Properties

| Property | Description |
| --- | --- |
| **documentId**: `string` |  |
| **documentUrl**: `string` |  |
| **lastUpdatedTime**: `string` |  |
| **succeeded**: `boolean` |  |



<a name="interfacesazure_video_retrieval_api_clientingestionsummarymd"></a>

### Interface: IngestionSummary

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).IngestionSummary

#### Properties

| Property | Description |
| --- | --- |
| `Optional` **batchName**: `string` |  |
| **createdDateTime**: `string` |  |
| `Optional` **fileStatusDetails**: [`IngestionStatusDetail`](#interfacesazure_video_retrieval_api_clientingestionstatusdetailmd)[] |  |
| **lastModifiedDateTime**: `string` |  |
| **name**: `string` |  |
| **state**: ``"NotStarted"`` \| ``"Running"`` \| ``"Completed"`` \| ``"Failed"`` \| ``"PartiallySucceeded"`` |  |



<a name="interfacesazure_video_retrieval_api_clientvideoingestionmd"></a>

### Interface: VideoIngestion

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).VideoIngestion

#### Properties

| Property | Description |
| --- | --- |
| `Optional` **documentId**: `string` |  |
| **documentUrl**: `string` |  |
| `Optional` **metadata**: `object` |  |
| **mode**: ``"update"`` \| ``"remove"`` \| ``"add"`` |  |
| `Optional` **userData**: `object` |  |



<a name="interfaceschatchataboutvideooptionsmd"></a>

### Interface: ChatAboutVideoOptions

[chat](#moduleschatmd).ChatAboutVideoOptions

Option settings for ChatAboutVideo

#### Properties

| Property | Description |
| --- | --- |
| `Optional` **extractVideoFrames**: `Object` | Type declaration<br><br>| Name | Type | Description |<br>| :------ | :------ | :------ |<br>| `extractor` | [`VideoFramesExtractor`](#videoframesextractor) | Function for extracting frames from the video. If not specified, a default function using ffmpeg will be used. |<br>| `height` | `undefined` \| `number` | Video frame height, default is undefined which means the scaling will be determined by the videoFrameWidth option. If both videoFrameWidth and videoFrameHeight are not specified, then the frames will not be resized/scaled. |<br>| `interval` | `number` | Intervals between frames to be extracted. The unit is second. Default value is 5. |<br>| `limit` | `number` | Maximum number of frames to be extracted. Default value is 10 which is the current per-request limitation of ChatGPT Vision. |<br>| `width` | `undefined` \| `number` | Video frame width, default is 200. If both videoFrameWidth and videoFrameHeight are not specified, then the frames will not be resized/scaled. | |
| **fileBatchUploader**: [`FileBatchUploader`](#filebatchuploader) | Function for uploading files |
| `Optional` **initialPrompts**: `ChatRequestMessage`[] | Initial prompts to be added to the chat history before frame images. |
| **openAiDeploymentName**: `string` | Name/ID of the deployment |
| `Optional` **startPrompts**: `ChatRequestMessage`[] | Prompts to be added to the chat history right after frame images. |
| `Optional` **storageContainerName**: `string` | Storage container for storing frame images of the video. |
| **storagePathPrefix**: `string` | Path prefix to be prepended for storing frame images of the video. |
| **tmpDir**: `string` | Temporary directory for storing temporary files.<br>If not specified, them temporary directory of the OS will be used. |
| `Optional` **videoRetrievalIndex**: `Object` | Type declaration<br><br>| Name | Type |<br>| :------ | :------ |<br>| `apiKey` | `string` |<br>| `createIndexIfNotExists?` | `boolean` |<br>| `deleteDocumentWhenConversationEnds?` | `boolean` |<br>| `deleteIndexWhenConversationEnds?` | `boolean` |<br>| `endpoint` | `string` |<br>| `indexName?` | `string` |<br><br>## Modules |



<a name="modulesawsmd"></a>

### Module: aws

#### Functions

##### createAwsS3FileBatchUploader

▸ **createAwsS3FileBatchUploader**(`s3Client`, `expirationSeconds`, `parallelism?`): [`FileBatchUploader`](#filebatchuploader)

###### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `s3Client` | `S3Client` | `undefined` |
| `expirationSeconds` | `number` | `undefined` |
| `parallelism` | `number` | `3` |

###### Returns

[`FileBatchUploader`](#filebatchuploader)


<a name="modulesazuremd"></a>

### Module: azure

#### References

##### CreateIndexOptions

Re-exports [CreateIndexOptions](#interfacesazure_video_retrieval_api_clientcreateindexoptionsmd)

___

##### DocumentSummary

Re-exports [DocumentSummary](#interfacesazure_video_retrieval_api_clientdocumentsummarymd)

___

##### IndexFeature

Re-exports [IndexFeature](#interfacesazure_video_retrieval_api_clientindexfeaturemd)

___

##### IndexMetadataSchema

Re-exports [IndexMetadataSchema](#interfacesazure_video_retrieval_api_clientindexmetadataschemamd)

___

##### IndexMetadataSchemaField

Re-exports [IndexMetadataSchemaField](#interfacesazure_video_retrieval_api_clientindexmetadataschemafieldmd)

___

##### IndexSummary

Re-exports [IndexSummary](#interfacesazure_video_retrieval_api_clientindexsummarymd)

___

##### IngestionRequest

Re-exports [IngestionRequest](#interfacesazure_video_retrieval_api_clientingestionrequestmd)

___

##### IngestionStatusDetail

Re-exports [IngestionStatusDetail](#interfacesazure_video_retrieval_api_clientingestionstatusdetailmd)

___

##### IngestionSummary

Re-exports [IngestionSummary](#interfacesazure_video_retrieval_api_clientingestionsummarymd)

___

##### PaginatedWithNextLink

Re-exports [PaginatedWithNextLink](#paginatedwithnextlink)

___

##### VideoIngestion

Re-exports [VideoIngestion](#interfacesazure_video_retrieval_api_clientvideoingestionmd)

___

##### VideoRetrievalApiClient

Re-exports [VideoRetrievalApiClient](#classesazure_video_retrieval_api_clientvideoretrievalapiclientmd)

#### Functions

##### createAzureBlobStorageFileBatchUploader

▸ **createAzureBlobStorageFileBatchUploader**(`blobServiceClient`, `expirationSeconds`, `parallelism?`): [`FileBatchUploader`](#filebatchuploader)

###### Parameters

| Name | Type | Default value |
| :------ | :------ | :------ |
| `blobServiceClient` | `BlobServiceClient` | `undefined` |
| `expirationSeconds` | `number` | `undefined` |
| `parallelism` | `number` | `3` |

###### Returns

[`FileBatchUploader`](#filebatchuploader)


<a name="modulesazure_video_retrieval_api_clientmd"></a>

### Module: azure/video-retrieval-api-client

#### Classes

- [VideoRetrievalApiClient](#classesazure_video_retrieval_api_clientvideoretrievalapiclientmd)

#### Interfaces

- [CreateIndexOptions](#interfacesazure_video_retrieval_api_clientcreateindexoptionsmd)
- [DocumentSummary](#interfacesazure_video_retrieval_api_clientdocumentsummarymd)
- [IndexFeature](#interfacesazure_video_retrieval_api_clientindexfeaturemd)
- [IndexMetadataSchema](#interfacesazure_video_retrieval_api_clientindexmetadataschemamd)
- [IndexMetadataSchemaField](#interfacesazure_video_retrieval_api_clientindexmetadataschemafieldmd)
- [IndexSummary](#interfacesazure_video_retrieval_api_clientindexsummarymd)
- [IngestionRequest](#interfacesazure_video_retrieval_api_clientingestionrequestmd)
- [IngestionStatusDetail](#interfacesazure_video_retrieval_api_clientingestionstatusdetailmd)
- [IngestionSummary](#interfacesazure_video_retrieval_api_clientingestionsummarymd)
- [VideoIngestion](#interfacesazure_video_retrieval_api_clientvideoingestionmd)

#### Type Aliases

##### PaginatedWithNextLink

Ƭ **PaginatedWithNextLink**\<`T`\>: `Object`

###### Type parameters

| Name |
| :------ |
| `T` |

###### Type declaration

| Name | Type |
| :------ | :------ |
| `nextLink?` | `string` |
| `value` | `T`[] |


<a name="moduleschatmd"></a>

### Module: chat

#### Classes

- [ChatAboutVideo](#classeschatchataboutvideomd)
- [Conversation](#classeschatconversationmd)

#### Interfaces

- [ChatAboutVideoOptions](#interfaceschatchataboutvideooptionsmd)

#### Type Aliases

##### ChatAboutVideoConstructorOptions

Ƭ **ChatAboutVideoConstructorOptions**: \{ `azureStorageConnectionString?`: `string` ; `downloadUrlExpirationSeconds?`: `number` ; `openAiApiKey`: `string` ; `openAiEndpoint?`: `string`  } & \{ `extractVideoFrames?`: `Partial`\<`Exclude`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)[``"extractVideoFrames"``], `undefined`\>\> ; `videoRetrievalIndex?`: `Partial`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)[``"videoRetrievalIndex"``]\> & `Pick`\<`Exclude`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)[``"videoRetrievalIndex"``], `undefined`\>, ``"endpoint"`` \| ``"apiKey"``\>  } & `Partial`\<`Omit`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd), ``"videoRetrievalIndex"`` \| ``"extractVideoFrames"``\>\> & `Required`\<`Pick`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd), ``"openAiDeploymentName"``\>\>

___

##### ChatOptions

Ƭ **ChatOptions**: \{ `throttleBackoff?`: `number`[]  } & `GetChatCompletionsOptions`

___

##### ConversationOptions

Ƭ **ConversationOptions**: `Object`

###### Type declaration

| Name | Type |
| :------ | :------ |
| `chatCompletions?` | `Partial`\<[`ChatOptions`](#chatoptions)\> |
| `extractVideoFrames?` | `Partial`\<[`ExtractVideoFramesOptions`](#extractvideoframesoptions)\> |
| `videoRetrievalIndex?` | `Partial`\<[`VideoRetrievalIndexOptions`](#videoretrievalindexoptions)\> |

___

##### ExtractVideoFramesOptions

Ƭ **ExtractVideoFramesOptions**: `Exclude`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)[``"extractVideoFrames"``], `undefined`\>

___

##### VideoRetrievalIndexOptions

Ƭ **VideoRetrievalIndexOptions**: `Exclude`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)[``"videoRetrievalIndex"``], `undefined`\>


<a name="modulesclient_hackmd"></a>

### Module: client-hack

#### Functions

##### fixClient

▸ **fixClient**(`openAIClient`): `void`

###### Parameters

| Name | Type |
| :------ | :------ |
| `openAIClient` | `any` |

###### Returns

`void`


<a name="modulesindexmd"></a>

### Module: index

#### References

##### ChatAboutVideo

Re-exports [ChatAboutVideo](#classeschatchataboutvideomd)

___

##### ChatAboutVideoConstructorOptions

Re-exports [ChatAboutVideoConstructorOptions](#chataboutvideoconstructoroptions)

___

##### ChatAboutVideoOptions

Re-exports [ChatAboutVideoOptions](#interfaceschatchataboutvideooptionsmd)

___

##### ChatOptions

Re-exports [ChatOptions](#chatoptions)

___

##### Conversation

Re-exports [Conversation](#classeschatconversationmd)

___

##### ConversationOptions

Re-exports [ConversationOptions](#conversationoptions)

___

##### ExtractVideoFramesOptions

Re-exports [ExtractVideoFramesOptions](#extractvideoframesoptions)

___

##### FileBatchUploader

Re-exports [FileBatchUploader](#filebatchuploader)

___

##### VideoFramesExtractor

Re-exports [VideoFramesExtractor](#videoframesextractor)

___

##### VideoRetrievalIndexOptions

Re-exports [VideoRetrievalIndexOptions](#videoretrievalindexoptions)

___

##### extractVideoFramesWithFfmpeg

Re-exports [extractVideoFramesWithFfmpeg](#extractvideoframeswithffmpeg)

___

##### lazyCreatedFileBatchUploader

Re-exports [lazyCreatedFileBatchUploader](#lazycreatedfilebatchuploader)

___

##### lazyCreatedVideoFramesExtractor

Re-exports [lazyCreatedVideoFramesExtractor](#lazycreatedvideoframesextractor)


<a name="modulesstoragemd"></a>

### Module: storage

#### References

##### FileBatchUploader

Re-exports [FileBatchUploader](#filebatchuploader)

#### Functions

##### lazyCreatedFileBatchUploader

▸ **lazyCreatedFileBatchUploader**(`creator`): [`FileBatchUploader`](#filebatchuploader)

###### Parameters

| Name | Type |
| :------ | :------ |
| `creator` | `Promise`\<[`FileBatchUploader`](#filebatchuploader)\> |

###### Returns

[`FileBatchUploader`](#filebatchuploader)


<a name="modulesstorage_typesmd"></a>

### Module: storage/types

#### Type Aliases

##### FileBatchUploader

Ƭ **FileBatchUploader**: (`dir`: `string`, `fileNames`: `string`[], `containerName`: `string`, `blobPathPrefix`: `string`) => `Promise`\<`string`[]\>

###### Type declaration

▸ (`dir`, `fileNames`, `containerName`, `blobPathPrefix`): `Promise`\<`string`[]\>

####### Parameters

| Name | Type |
| :------ | :------ |
| `dir` | `string` |
| `fileNames` | `string`[] |
| `containerName` | `string` |
| `blobPathPrefix` | `string` |

####### Returns

`Promise`\<`string`[]\>


<a name="modulesvideomd"></a>

### Module: video

#### References

##### VideoFramesExtractor

Re-exports [VideoFramesExtractor](#videoframesextractor)

___

##### extractVideoFramesWithFfmpeg

Re-exports [extractVideoFramesWithFfmpeg](#extractvideoframeswithffmpeg)

#### Functions

##### lazyCreatedVideoFramesExtractor

▸ **lazyCreatedVideoFramesExtractor**(`creator`): [`VideoFramesExtractor`](#videoframesextractor)

###### Parameters

| Name | Type |
| :------ | :------ |
| `creator` | `Promise`\<[`VideoFramesExtractor`](#videoframesextractor)\> |

###### Returns

[`VideoFramesExtractor`](#videoframesextractor)


<a name="modulesvideo_ffmpegmd"></a>

### Module: video/ffmpeg

#### Functions

##### extractVideoFramesWithFfmpeg

▸ **extractVideoFramesWithFfmpeg**(`inputFile`, `outputDir`, `intervalSec`, `format?`, `width?`, `height?`, `startSec?`, `endSec?`): `Promise`\<`string`[]\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `inputFile` | `string` |
| `outputDir` | `string` |
| `intervalSec` | `number` |
| `format?` | `string` |
| `width?` | `number` |
| `height?` | `number` |
| `startSec?` | `number` |
| `endSec?` | `number` |

###### Returns

`Promise`\<`string`[]\>


<a name="modulesvideo_typesmd"></a>

### Module: video/types

#### Type Aliases

##### VideoFramesExtractor

Ƭ **VideoFramesExtractor**: (`inputFile`: `string`, `outputDir`: `string`, `intervalSec`: `number`, `format?`: `string`, `width?`: `number`, `height?`: `number`, `startSec?`: `number`, `endSec?`: `number`) => `Promise`\<`string`[]\>

###### Type declaration

▸ (`inputFile`, `outputDir`, `intervalSec`, `format?`, `width?`, `height?`, `startSec?`, `endSec?`): `Promise`\<`string`[]\>

####### Parameters

| Name | Type |
| :------ | :------ |
| `inputFile` | `string` |
| `outputDir` | `string` |
| `intervalSec` | `number` |
| `format?` | `string` |
| `width?` | `number` |
| `height?` | `number` |
| `startSec?` | `number` |
| `endSec?` | `number` |

####### Returns

`Promise`\<`string`[]\>
<!-- API end -->