# chat-about-video
Chat about a video clip using Azure OpenAI GPT-4 Turbo with Vision

# API

<!-- API start -->
<a name="readmemd"></a>

## chat-about-video

### Modules

- [chat](#moduleschatmd)
- [index](#modulesindexmd)
- [storage](#modulesstoragemd)
- [storage/azure](#modulesstorage_azuremd)
- [storage/types](#modulesstorage_typesmd)
- [video](#modulesvideomd)
- [video/ffmpeg](#modulesvideo_ffmpegmd)
- [video/types](#modulesvideo_typesmd)

## Classes


<a name="classeschatchataboutvideomd"></a>

### Class: ChatAboutVideo

[chat](#moduleschatmd).ChatAboutVideo

#### Constructors

##### constructor

• **new ChatAboutVideo**(`options`, `log?`)

###### Parameters

| Name | Type |
| :------ | :------ |
| `options` | `Partial`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)\> & `Required`\<`Pick`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd), ``"openAiDeploymentName"`` \| ``"storageContainerName"``\>\> & \{ `azureStorageConnectionString?`: `string` ; `downloadUrlExpirationSeconds?`: `number` ; `openAiApiKey`: `string` ; `openAiEndpoint`: `string`  } |
| `log` | `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |

#### Properties

| Property | Description |
| --- | --- |
| `Protected` **client**: `OpenAIClient` |  |
| `Protected` **log**: `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |  |
| `Protected` **options**: [`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd) |  |


#### Methods

##### startConversation

▸ **startConversation**(`videoFile`): `Promise`\<[`Conversation`](#classeschatconversationmd)\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `videoFile` | `string` |

###### Returns

`Promise`\<[`Conversation`](#classeschatconversationmd)\>


<a name="classeschatconversationmd"></a>

### Class: Conversation

[chat](#moduleschatmd).Conversation

#### Constructors

##### constructor

• **new Conversation**(`client`, `deploymentName`, `conversationId`, `messages`, `log?`)

###### Parameters

| Name | Type |
| :------ | :------ |
| `client` | `OpenAIClient` |
| `deploymentName` | `string` |
| `conversationId` | `string` |
| `messages` | `ChatRequestMessage`[] |
| `log` | `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |

#### Properties

| Property | Description |
| --- | --- |
| `Protected` **client**: `OpenAIClient` |  |
| `Protected` **conversationId**: `string` |  |
| `Protected` **deploymentName**: `string` |  |
| `Protected` **log**: `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |  |
| `Protected` **messages**: `ChatRequestMessage`[] |  |


#### Methods

##### say

▸ **say**(`message`, `options?`): `Promise`\<`undefined` \| `string`\>

###### Parameters

| Name | Type |
| :------ | :------ |
| `message` | `string` |
| `options?` | `GetChatCompletionsOptions` |

###### Returns

`Promise`\<`undefined` \| `string`\>

## Interfaces


<a name="interfaceschatchataboutvideooptionsmd"></a>

### Interface: ChatAboutVideoOptions

[chat](#moduleschatmd).ChatAboutVideoOptions

#### Properties

| Property | Description |
| --- | --- |
| **fileBatchUploader**: [`FileBatchUploader`](#filebatchuploader) |  |
| `Optional` **initialPrompts**: `ChatRequestMessage`[] |  |
| **openAiDeploymentName**: `string` |  |
| `Optional` **startPrompts**: `ChatRequestMessage`[] |  |
| **storageContainerName**: `string` |  |
| **storagePathPrefix**: `string` |  |
| **tmpDir**: `string` |  |
| **videoFrameHeight**: `undefined` \| `number` |  |
| **videoFrameWidth**: `undefined` \| `number` |  |
| **videoFramesExtractor**: [`VideoFramesExtractor`](#videoframesextractor) |  |
| **videoFramesInterval**: `number` | ## Modules |



<a name="moduleschatmd"></a>

### Module: chat

#### Classes

- [ChatAboutVideo](#classeschatchataboutvideomd)
- [Conversation](#classeschatconversationmd)

#### Interfaces

- [ChatAboutVideoOptions](#interfaceschatchataboutvideooptionsmd)


<a name="modulesindexmd"></a>

### Module: index

#### References

##### ChatAboutVideo

Re-exports [ChatAboutVideo](#classeschatchataboutvideomd)

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

##### createAzureBlobStorageFileBatchUploader

Re-exports [createAzureBlobStorageFileBatchUploader](#createazureblobstoragefilebatchuploader)

___

##### extractVideoFramesWithFfmpeg

Re-exports [extractVideoFramesWithFfmpeg](#extractvideoframeswithffmpeg)


<a name="modulesstoragemd"></a>

### Module: storage

#### References

##### FileBatchUploader

Re-exports [FileBatchUploader](#filebatchuploader)

___

##### createAzureBlobStorageFileBatchUploader

Re-exports [createAzureBlobStorageFileBatchUploader](#createazureblobstoragefilebatchuploader)


<a name="modulesstorage_azuremd"></a>

### Module: storage/azure

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