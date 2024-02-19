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
- [chat](#moduleschatmd)
- [index](#modulesindexmd)
- [storage](#modulesstoragemd)
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
| `options` | `Partial`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)\> & `Required`\<`Pick`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd), ``"openAiDeploymentName"`` \| ``"storageContainerName"``\>\> & \{ `azureStorageConnectionString?`: `string` ; `downloadUrlExpirationSeconds?`: `number` ; `openAiApiKey`: `string` ; `openAiEndpoint?`: `string`  } |
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


<a name="interfaceschatchataboutvideooptionsmd"></a>

### Interface: ChatAboutVideoOptions

[chat](#moduleschatmd).ChatAboutVideoOptions

Option settings for ChatAboutVideo

#### Properties

| Property | Description |
| --- | --- |
| **fileBatchUploader**: [`FileBatchUploader`](#filebatchuploader) | Function for uploading files |
| `Optional` **initialPrompts**: `ChatRequestMessage`[] | Initial prompts to be added to the chat history before frame images. |
| **openAiDeploymentName**: `string` | Name/ID of the deployment |
| `Optional` **startPrompts**: `ChatRequestMessage`[] | Prompts to be added to the chat history right after frame images. |
| **storageContainerName**: `string` | Storage container for storing frame images of the video. |
| **storagePathPrefix**: `string` | Path prefix to be prepended for storing frame images of the video. |
| **tmpDir**: `string` | Temporary directory for storing temporary files.<br>If not specified, them temporary directory of the OS will be used. |
| **videoFrameHeight**: `undefined` \| `number` | Video frame height, default is undefined which means the scaling<br>will be determined by the videoFrameWidth option.<br>If both videoFrameWidth and videoFrameHeight are not specified,<br>then the frames will not be resized/scaled. |
| **videoFrameWidth**: `undefined` \| `number` | Video frame width, default is 200.<br>If both videoFrameWidth and videoFrameHeight are not specified,<br>then the frames will not be resized/scaled. |
| **videoFramesExtractor**: [`VideoFramesExtractor`](#videoframesextractor) | Function for extracting frames from the video.<br>If not specified, a default function using ffmpeg will be used. |
| **videoFramesInterval**: `number` | Intervals between frames to be extracted. The unit is second.<br>Default value is 5. |
| **videoFramesLimit**: `number` | Maximum number of frames to be extracted.<br>Default value is 10 which is the current per-request limitation of ChatGPT Vision.<br><br>## Modules |



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