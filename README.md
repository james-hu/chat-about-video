# chat-about-video
Chat about a video clip using Azure OpenAI GPT-4 Turbo with Vision

Example usage:

```shell
sudo apt install ffmpeg # or npm i @ffmpeg-installer/ffmpeg
npm i chat-about-video
```

```javascript
import readline from 'node:readline';
import { ChatAboutVideo } from 'chat-about-video';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));

async function demo() {
  const chat = new ChatAboutVideo({
    openAiEndpoint: process.env.AZURE_OPENAI_API_ENDPOINT!,
    openAiApiKey: process.env.AZURE_OPENAI_API_KEY!,
    azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
    openAiDeploymentName: 'gpt4vision',
    storageContainerName: 'vision-experiment-input',
    storagePathPrefix: 'video-frames/',
  });

  const conversation = await chat.startConversation(process.env.DEMO_VIDEO!);
  
  while(true) {
    const question = await prompt('\nUser: ');
    if (!question) {
      continue;
    }
    const answer = await conversation.say(question, { maxTokens: 2000 });
    console.log('\nAI:' + answer);
  }
}

demo().catch((error) => console.log(JSON.stringify(error, null, 2)));

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
| `log` | `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |

#### Properties

| Property | Description |
| --- | --- |
| `Protected` **client**: `OpenAIClient` |  |
| `Protected` **log**: `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |  |
| `Protected` **options**: [`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd) |  |


#### Methods

##### prepareVideoFrames

▸ `Protected` **prepareVideoFrames**(`conversationId`, `videoFile`): `Promise`\<`PreparationResult`\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `conversationId` | `string` |
| `videoFile` | `string` |

###### Returns

`Promise`\<`PreparationResult`\>

___

##### prepareVideoRetrievalIndex

▸ `Protected` **prepareVideoRetrievalIndex**(`conversationId`, `videoFile`): `Promise`\<`PreparationResult`\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `conversationId` | `string` |
| `videoFile` | `string` |

###### Returns

`Promise`\<`PreparationResult`\>

___

##### startConversation

▸ **startConversation**(`videoFile`): `Promise`\<[`Conversation`](#classeschatconversationmd)\>

Start a conversation about a video.

###### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `videoFile` | `string` | Path to a video file in local file system. |

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
| `log` | `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |

#### Properties

| Property | Description |
| --- | --- |
| `Protected` `Optional` **cleanup**: () => `Promise`\<`void`\> |  |
| `Protected` **client**: `OpenAIClient` |  |
| `Protected` **conversationId**: `string` |  |
| `Protected` **deploymentName**: `string` |  |
| `Protected` **log**: `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |  |
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
| `options?` | `GetChatCompletionsOptions` | Options for fine control. |

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
| **state**: ``"notStarted"`` \| ``"running"`` \| ``"failed"`` \| ``"completed"`` \| ``"partiallySucceeded"`` |  |



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
| **storageContainerName**: `string` | Storage container for storing frame images of the video. |
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

Ƭ **ChatAboutVideoConstructorOptions**: `Partial`\<`Omit`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd), ``"videoRetrievalIndex"`` \| ``"extractVideoFrames"``\>\> & `Required`\<`Pick`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd), ``"openAiDeploymentName"`` \| ``"storageContainerName"``\>\> & \{ `extractVideoFrames?`: `Partial`\<`Exclude`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)[``"extractVideoFrames"``], `undefined`\>\> ; `videoRetrievalIndex?`: `Partial`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)[``"videoRetrievalIndex"``]\> & `Pick`\<`Exclude`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)[``"videoRetrievalIndex"``], `undefined`\>, ``"endpoint"`` \| ``"apiKey"``\>  } & \{ `azureStorageConnectionString?`: `string` ; `downloadUrlExpirationSeconds?`: `number` ; `openAiApiKey`: `string` ; `openAiEndpoint?`: `string`  }


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

##### Conversation

Re-exports [Conversation](#classeschatconversationmd)

___

##### FileBatchUploader

Re-exports [FileBatchUploader](#filebatchuploader)

___

##### VideoFramesExtractor

Re-exports [VideoFramesExtractor](#videoframesextractor)

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