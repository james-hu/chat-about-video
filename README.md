# chat-about-video

Chat about a video clip (or without the video clip) using the powerful OpenAI ChatGPT (hosted in OpenAI or Microsoft Azure) or Google Gemini (hosted in Google Could).

[![Version](https://img.shields.io/npm/v/chat-about-video.svg)](https://npmjs.org/package/chat-about-video)
[![Downloads/week](https://img.shields.io/npm/dw/chat-about-video.svg)](https://npmjs.org/package/chat-about-video)
[![License](https://img.shields.io/npm/l/chat-about-video.svg)](https://github.com/james-hu/chat-about-video/blob/master/package.json)

`chat-about-video` is an open-source NPM package designed to accelerate the development of conversation applications about video content. Harnessing the capabilities of ChatGPT from Microsoft Azure or OpenAI, as well as Gemini from Google, this package opens up a range of usage scenarios with minimal effort.

Key features:

- ChatGPT models hosted in both Azure and OpenAI are supported.
- Gemini models hosted in Google Cloud are supported.
- Frame images are extracted from the input video, and uploaded for ChatGPT/Gemini to consume.
- It can automatically retry on receiving throttling (HTTP status code 429) responses from the API.
- Options supported by the underlying API are exposed for customisation.
- It can also be used in scenario that no video needs to be involved, that means it can be used for "normal" text chats.

## How the video is provided to ChatGPT or Gemini

### ChatGPT

There are two approaches for feeding video content to ChatGPT. `chat-about-video` supports both of them.

**Frame image extraction:**

- Integrate ChatGPT from Microsoft Azure or OpenAI effortlessly.
- Utilize ffmpeg integration provided by this package for frame image extraction or opt for a DIY approach.
- Store frame images with ease, supporting Azure Blob Storage and AWS S3.
- GPT-4o and GPT-4 Vision Preview hosted in Azure allows analysis of up to 10 frame images.
- GPT-4o and GPT-4 Vision Preview hosted in OpenAI allows analysis of more than 10 frame images.

**Video indexing with Microsoft Azure:**

- Exclusively supported by GPT-4 Vision Preview from Microsoft Azure.
- Ingest videos seamlessly into Microsoft Azure's Video Retrieval Index.
- Automatic extraction of up to 20 frame images using Video Retrieval Indexer.
- Default integration of speech transcription for enhanced comprehension.
- Flexible storage options with support for Azure Blob Storage and AWS S3.

### Gemini

`chat-about-video` supports sending Video frames directly to Google's API without using an intermediate storage.

- Utilize ffmpeg integration provided by this package for frame image extraction or opt for a DIY approach.
- Number of frame images is only limited by Gemini API in Google Cloud.

## Usage

### Installation

Add chat-about-video as a dependency to your Node.js application using the following command:

```shell
npm i chat-about-video
```

### Optional dependencies

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

Or if you prefer AWS S3, install the following dependencies:

```shell
npm i @handy-common-utils/aws-utils @aws-sdk/s3-request-presigner @aws-sdk/client-s3
```

### Example 1: Using GPT-4o or GPT-4 Vision Preview hosted in OpenAI with Azure Blob Storage

```typescript
// This is a demo utilising GPT-4o or Vision preview hosted in OpenAI.
// OpenAI API allows more than 10 (maximum allowed by Azure's OpenAI API) images to be supplied.
// Video frame images are uploaded to Azure Blob Storage and then made available to GPT from there.
//
// This script can be executed with a command line like this from the project root directory:
// export OPENAI_API_KEY=...
// export AZURE_STORAGE_CONNECTION_STRING=...
// export OPENAI_MODEL_NAME=...
// export AZURE_STORAGE_CONTAINER_NAME=...
// ENABLE_DEBUG=true DEMO_VIDEO=~/Downloads/test1.mp4 npx ts-node test/demo1.ts
//

import { consoleWithColour } from '@handy-common-utils/misc-utils';
import chalk from 'chalk';
import readline from 'node:readline';

import { ChatAboutVideo } from '../src';

async function demo() {
  const chat = new ChatAboutVideo(
    {
      credential: {
        key: process.env.OPENAI_API_KEY!,
      },
      storage: {
        azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
        storageContainerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'vision-experiment-input',
        storagePathPrefix: 'video-frames/',
      },
      completionOptions: {
        deploymentName: process.env.OPENAI_MODEL_NAME || 'gpt-4o', // 'gpt-4-vision-preview', // or gpt-4o
      },
      extractVideoFrames: {
        limit: 100,
        interval: 2,
      },
    },
    consoleWithColour({ debug: process.env.ENABLE_DEBUG === 'true' }, chalk),
  );

  const conversation = await chat.startConversation(process.env.DEMO_VIDEO!);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));
  while (true) {
    const question = await prompt(chalk.red('\nUser: '));
    if (!question) {
      continue;
    }
    if (['exit', 'quit', 'q', 'end'].includes(question)) {
      await conversation.end();
      break;
    }
    const answer = await conversation.say(question, { maxTokens: 2000 });
    console.log(chalk.blue('\nAI:' + answer));
  }
  console.log('Demo finished');
  rl.close();
}

demo().catch((error) => console.log(chalk.red(JSON.stringify(error, null, 2))));
```

### Example 2: Using GPT-4 Vision Preview hosted in Azure with Azure Video Retrieval Indexer

```typescript
// This is a demo utilising GPT-4 Vision preview hosted in Azure.
// Azure Video Retrieval Indexer is used for extracting information from the input video.
// Information in Azure Video Retrieval Indexer is supplied to GPT.
//
// This script can be executed with a command line like this from the project root directory:
// export AZURE_OPENAI_API_ENDPOINT=..
// export AZURE_OPENAI_API_KEY=...
// export AZURE_OPENAI_DEPLOYMENT_NAME=...
// export AZURE_STORAGE_CONNECTION_STRING=...
// export AZURE_STORAGE_CONTAINER_NAME=...
// export AZURE_CV_API_KEY=...
// ENABLE_DEBUG=true DEMO_VIDEO=~/Downloads/test1.mp4 npx ts-node test/demo2.ts
//

import { consoleWithColour } from '@handy-common-utils/misc-utils';
import chalk from 'chalk';
import readline from 'node:readline';

import { ChatAboutVideo } from '../src';

async function demo() {
  const chat = new ChatAboutVideo(
    {
      endpoint: process.env.AZURE_OPENAI_API_ENDPOINT!,
      credential: {
        key: process.env.AZURE_OPENAI_API_KEY!,
      },
      storage: {
        azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
        storageContainerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'vision-experiment-input',
        storagePathPrefix: 'video-frames/',
      },
      completionOptions: {
        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt4vision',
      },
      videoRetrievalIndex: {
        endpoint: process.env.AZURE_CV_API_ENDPOINT!,
        apiKey: process.env.AZURE_CV_API_KEY!,
        createIndexIfNotExists: true,
        deleteIndexWhenConversationEnds: true,
      },
    },
    consoleWithColour({ debug: process.env.ENABLE_DEBUG === 'true' }, chalk),
  );

  const conversation = await chat.startConversation(process.env.DEMO_VIDEO!);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));
  while (true) {
    const question = await prompt(chalk.red('\nUser: '));
    if (!question) {
      continue;
    }
    if (['exit', 'quit', 'q', 'end'].includes(question)) {
      await conversation.end();
      break;
    }
    const answer = await conversation.say(question, { maxTokens: 2000 });
    console.log(chalk.blue('\nAI:' + answer));
  }
  console.log('Demo finished');
  rl.close();
}

demo().catch((error) => console.log(chalk.red(JSON.stringify(error, null, 2)), (error as Error).stack));
```

### Example 3: Using GPT-4 Vision Preview hosted in Azure with Azure Blob Storage

```typescript
// This is a demo utilising GPT-4o or Vision preview hosted in Azure.
// Up to 10 (maximum allowed by Azure's OpenAI API) frames are extracted from the input video.
// Video frame images are uploaded to Azure Blob Storage and then made available to GPT from there.
//
// This script can be executed with a command line like this from the project root directory:
// export AZURE_OPENAI_API_ENDPOINT=..
// export AZURE_OPENAI_API_KEY=...
// export AZURE_OPENAI_DEPLOYMENT_NAME=...
// export AZURE_STORAGE_CONNECTION_STRING=...
// export AZURE_STORAGE_CONTAINER_NAME=...
// ENABLE_DEBUG=true DEMO_VIDEO=~/Downloads/test1.mp4 npx ts-node test/demo3.ts

import { consoleWithColour } from '@handy-common-utils/misc-utils';
import chalk from 'chalk';
import readline from 'node:readline';

import { ChatAboutVideo } from '../src';

async function demo() {
  const chat = new ChatAboutVideo(
    {
      endpoint: process.env.AZURE_OPENAI_API_ENDPOINT!,
      credential: {
        key: process.env.AZURE_OPENAI_API_KEY!,
      },
      storage: {
        azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
        storageContainerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'vision-experiment-input',
        storagePathPrefix: 'video-frames/',
      },
      completionOptions: {
        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt4vision',
      },
    },
    consoleWithColour({ debug: process.env.ENABLE_DEBUG === 'true' }, chalk),
  );

  const conversation = await chat.startConversation(process.env.DEMO_VIDEO!);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));
  while (true) {
    const question = await prompt(chalk.red('\nUser: '));
    if (!question) {
      continue;
    }
    if (['exit', 'quit', 'q', 'end'].includes(question)) {
      await conversation.end();
      break;
    }
    const answer = await conversation.say(question, { maxTokens: 2000 });
    console.log(chalk.blue('\nAI:' + answer));
  }
  console.log('Demo finished');
  rl.close();
}

demo().catch((error) => console.log(chalk.red(JSON.stringify(error, null, 2))));
```

### Example 4: Using Gemini hosted in Google Cloud

```typescript
// This is a demo utilising Google Gemini through Google Generative Language API.
// Google Gemini allows more than 10 (maximum allowed by Azure's OpenAI API) frame images to be supplied.
// Video frame images are sent through Google Generative Language API directly.
//
// This script can be executed with a command line like this from the project root directory:
// export GEMINI_API_KEY=...
// ENABLE_DEBUG=true DEMO_VIDEO=~/Downloads/test1.mp4 npx ts-node test/demo4.ts

import { consoleWithColour } from '@handy-common-utils/misc-utils';
import chalk from 'chalk';
import readline from 'node:readline';

import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai';

import { ChatAboutVideo } from '../src';
import { GeminiCompletionOptions } from '../src/gemini';

async function demo() {
  const chat = new ChatAboutVideo(
    {
      credential: {
        key: process.env.GEMINI_API_KEY!,
      },
      clientSettings: {
        modelParams: {
          model: 'gemini-1.5-flash',
        },
      },
      extractVideoFrames: {
        limit: 100,
        interval: 0.5,
      },
    },
    consoleWithColour({ debug: process.env.ENABLE_DEBUG === 'true' }, chalk),
  );

  const conversation = await chat.startConversation(process.env.DEMO_VIDEO!);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));
  while (true) {
    const question = await prompt(chalk.red('\nUser: '));
    if (!question) {
      continue;
    }
    if (['exit', 'quit', 'q', 'end'].includes(question)) {
      await conversation.end();
      break;
    }
    const answer = await conversation.say(question, {
      safetySettings: [{ category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE }],
    } as GeminiCompletionOptions);
    console.log(chalk.blue('\nAI:' + answer));
  }
  console.log('Demo finished');
  rl.close();
}

demo().catch((error) => console.log(chalk.red(JSON.stringify(error, null, 2))));
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

| Name              | Type     | Default value          |
| :---------------- | :------- | :--------------------- |
| `endpointBaseUrl` | `string` | `undefined`            |
| `apiKey`          | `string` | `undefined`            |
| `apiVersion`      | `string` | `'2023-05-01-preview'` |

#### Methods

##### createIndex

▸ **createIndex**(`indexName`, `indexOptions?`): `Promise`\<`void`\>

###### Parameters

| Name           | Type                                                                                    |
| :------------- | :-------------------------------------------------------------------------------------- |
| `indexName`    | `string`                                                                                |
| `indexOptions` | [`CreateIndexOptions`](#interfacesazure_video_retrieval_api_clientcreateindexoptionsmd) |

###### Returns

`Promise`\<`void`\>

---

##### createIndexIfNotExist

▸ **createIndexIfNotExist**(`indexName`, `indexOptions?`): `Promise`\<`void`\>

###### Parameters

| Name            | Type                                                                                    |
| :-------------- | :-------------------------------------------------------------------------------------- |
| `indexName`     | `string`                                                                                |
| `indexOptions?` | [`CreateIndexOptions`](#interfacesazure_video_retrieval_api_clientcreateindexoptionsmd) |

###### Returns

`Promise`\<`void`\>

---

##### createIngestion

▸ **createIngestion**(`indexName`, `ingestionName`, `ingestion`): `Promise`\<`void`\>

###### Parameters

| Name            | Type                                                                                |
| :-------------- | :---------------------------------------------------------------------------------- |
| `indexName`     | `string`                                                                            |
| `ingestionName` | `string`                                                                            |
| `ingestion`     | [`IngestionRequest`](#interfacesazure_video_retrieval_api_clientingestionrequestmd) |

###### Returns

`Promise`\<`void`\>

---

##### deleteDocument

▸ **deleteDocument**(`indexName`, `documentUrl`): `Promise`\<`void`\>

###### Parameters

| Name          | Type     |
| :------------ | :------- |
| `indexName`   | `string` |
| `documentUrl` | `string` |

###### Returns

`Promise`\<`void`\>

---

##### deleteIndex

▸ **deleteIndex**(`indexName`): `Promise`\<`void`\>

###### Parameters

| Name        | Type     |
| :---------- | :------- |
| `indexName` | `string` |

###### Returns

`Promise`\<`void`\>

---

##### getIndex

▸ **getIndex**(`indexName`): `Promise`\<`undefined` \| [`IndexSummary`](#interfacesazure_video_retrieval_api_clientindexsummarymd)\>

###### Parameters

| Name        | Type     |
| :---------- | :------- |
| `indexName` | `string` |

###### Returns

`Promise`\<`undefined` \| [`IndexSummary`](#interfacesazure_video_retrieval_api_clientindexsummarymd)\>

---

##### getIngestion

▸ **getIngestion**(`indexName`, `ingestionName`): `Promise`\<[`IngestionSummary`](#interfacesazure_video_retrieval_api_clientingestionsummarymd)\>

###### Parameters

| Name            | Type     |
| :-------------- | :------- |
| `indexName`     | `string` |
| `ingestionName` | `string` |

###### Returns

`Promise`\<[`IngestionSummary`](#interfacesazure_video_retrieval_api_clientingestionsummarymd)\>

---

##### ingest

▸ **ingest**(`indexName`, `ingestionName`, `ingestion`, `backoff?`): `Promise`\<`void`\>

###### Parameters

| Name            | Type                                                                                |
| :-------------- | :---------------------------------------------------------------------------------- |
| `indexName`     | `string`                                                                            |
| `ingestionName` | `string`                                                                            |
| `ingestion`     | [`IngestionRequest`](#interfacesazure_video_retrieval_api_clientingestionrequestmd) |
| `backoff`       | `number`[]                                                                          |

###### Returns

`Promise`\<`void`\>

---

##### listDocuments

▸ **listDocuments**(`indexName`): `Promise`\<[`DocumentSummary`](#interfacesazure_video_retrieval_api_clientdocumentsummarymd)[]\>

###### Parameters

| Name        | Type     |
| :---------- | :------- |
| `indexName` | `string` |

###### Returns

`Promise`\<[`DocumentSummary`](#interfacesazure_video_retrieval_api_clientdocumentsummarymd)[]\>

---

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

| Name      | Type                                                                                                                                                                                                                                                                              |
| :-------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options` | [`ChatAboutVideoConstructorOptions`](#chataboutvideoconstructoroptions)                                                                                                                                                                                                           |
| `log`     | `undefined` \| `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |

#### Properties

| Property                                                                                                                                                                                                                                                                                               | Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `Protected` **client**: `OpenAIClient`                                                                                                                                                                                                                                                                 |             |
| `Protected` **log**: `undefined` \| `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |             |
| `Protected` **options**: [`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)                                                                                                                                                                                                             |             |

#### Methods

##### prepareVideoFrames

▸ `Protected` **prepareVideoFrames**(`conversationId`, `videoFile`, `extractVideoFramesOptions?`): `Promise`\<`PreparationResult`\>

###### Parameters

| Name                         | Type                                                                                                                                                                                             |
| :--------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conversationId`             | `string`                                                                                                                                                                                         |
| `videoFile`                  | `string`                                                                                                                                                                                         |
| `extractVideoFramesOptions?` | `Partial`\<\{ `extractor`: [`VideoFramesExtractor`](#videoframesextractor) ; `height`: `undefined` \| `number` ; `interval`: `number` ; `limit`: `number` ; `width`: `undefined` \| `number` }\> |

###### Returns

`Promise`\<`PreparationResult`\>

---

##### prepareVideoRetrievalIndex

▸ `Protected` **prepareVideoRetrievalIndex**(`conversationId`, `videoFile`, `videoRetrievalIndexOptions?`): `Promise`\<`PreparationResult`\>

###### Parameters

| Name                          | Type                                                                                                                                                                                                                           |
| :---------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conversationId`              | `string`                                                                                                                                                                                                                       |
| `videoFile`                   | `string`                                                                                                                                                                                                                       |
| `videoRetrievalIndexOptions?` | `Partial`\<\{ `apiKey`: `string` ; `createIndexIfNotExists?`: `boolean` ; `deleteDocumentWhenConversationEnds?`: `boolean` ; `deleteIndexWhenConversationEnds?`: `boolean` ; `endpoint`: `string` ; `indexName?`: `string` }\> |

###### Returns

`Promise`\<`PreparationResult`\>

---

##### startConversation

▸ **startConversation**(`options?`): `Promise`\<[`Conversation`](#classeschatconversationmd)\>

Start a conversation without a video

###### Parameters

| Name       | Type                                                                         | Description                              |
| :--------- | :--------------------------------------------------------------------------- | :--------------------------------------- |
| `options?` | `Pick`\<[`ConversationOptions`](#conversationoptions), `"chatCompletions"`\> | Overriding options for this conversation |

###### Returns

`Promise`\<[`Conversation`](#classeschatconversationmd)\>

The conversation.

▸ **startConversation**(`videoFile`, `options?`): `Promise`\<[`Conversation`](#classeschatconversationmd)\>

Start a conversation about a video.

###### Parameters

| Name                           | Type                                                                                                                                                                                                                           | Description                                |
| :----------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------- |
| `videoFile`                    | `string`                                                                                                                                                                                                                       | Path to a video file in local file system. |
| `options?`                     | `Object`                                                                                                                                                                                                                       | Overriding options for this conversation   |
| `options.chatCompletions?`     | `Partial`\<[`ChatOptions`](#chatoptions)\>                                                                                                                                                                                     | -                                          |
| `options.extractVideoFrames?`  | `Partial`\<\{ `extractor`: [`VideoFramesExtractor`](#videoframesextractor) ; `height`: `undefined` \| `number` ; `interval`: `number` ; `limit`: `number` ; `width`: `undefined` \| `number` }\>                               | -                                          |
| `options.videoRetrievalIndex?` | `Partial`\<\{ `apiKey`: `string` ; `createIndexIfNotExists?`: `boolean` ; `deleteDocumentWhenConversationEnds?`: `boolean` ; `deleteIndexWhenConversationEnds?`: `boolean` ; `endpoint`: `string` ; `indexName?`: `string` }\> | -                                          |

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

| Name             | Type                                                                                                                                                                                                                                                                              |
| :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client`         | `OpenAIClient`                                                                                                                                                                                                                                                                    |
| `deploymentName` | `string`                                                                                                                                                                                                                                                                          |
| `conversationId` | `string`                                                                                                                                                                                                                                                                          |
| `messages`       | `ChatRequestMessage`[]                                                                                                                                                                                                                                                            |
| `options?`       | `GetChatCompletionsOptions`                                                                                                                                                                                                                                                       |
| `cleanup?`       | () => `Promise`\<`void`\>                                                                                                                                                                                                                                                         |
| `log`            | `undefined` \| `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |

#### Properties

| Property                                                                                                                                                                                                                                                                                               | Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `Protected` `Optional` **cleanup**: () => `Promise`\<`void`\>                                                                                                                                                                                                                                          |             |
| `Protected` **client**: `OpenAIClient`                                                                                                                                                                                                                                                                 |             |
| `Protected` **conversationId**: `string`                                                                                                                                                                                                                                                               |             |
| `Protected` **deploymentName**: `string`                                                                                                                                                                                                                                                               |             |
| `Protected` **log**: `undefined` \| `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |             |
| `Protected` **messages**: `ChatRequestMessage`[]                                                                                                                                                                                                                                                       |             |
| `Protected` `Optional` **options**: `GetChatCompletionsOptions`                                                                                                                                                                                                                                        |             |

#### Methods

##### end

▸ **end**(): `Promise`\<`void`\>

###### Returns

`Promise`\<`void`\>

---

##### say

▸ **say**(`message`, `options?`): `Promise`\<`undefined` \| `string`\>

Say something in the conversation, and get the response from AI

###### Parameters

| Name       | Type                          | Description                             |
| :--------- | :---------------------------- | :-------------------------------------- |
| `message`  | `string`                      | The message to say in the conversation. |
| `options?` | [`ChatOptions`](#chatoptions) | Options for fine control.               |

###### Returns

`Promise`\<`undefined` \| `string`\>

The response/completion

## Interfaces

<a name="interfacesazure_video_retrieval_api_clientcreateindexoptionsmd"></a>

### Interface: CreateIndexOptions

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).CreateIndexOptions

#### Properties

| Property                                                                                                                 | Description |
| ------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `Optional` **features**: [`IndexFeature`](#interfacesazure_video_retrieval_api_clientindexfeaturemd)[]                   |             |
| `Optional` **metadataSchema**: [`IndexMetadataSchema`](#interfacesazure_video_retrieval_api_clientindexmetadataschemamd) |             |
| `Optional` **userData**: `object`                                                                                        |             |

<a name="interfacesazure_video_retrieval_api_clientdocumentsummarymd"></a>

### Interface: DocumentSummary

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).DocumentSummary

#### Properties

| Property                             | Description |
| ------------------------------------ | ----------- |
| **createdDateTime**: `string`        |             |
| **documentId**: `string`             |             |
| `Optional` **documentUrl**: `string` |             |
| **lastModifiedDateTime**: `string`   |             |
| `Optional` **metadata**: `object`    |             |
| `Optional` **userData**: `object`    |             |

<a name="interfacesazure_video_retrieval_api_clientindexfeaturemd"></a>

### Interface: IndexFeature

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).IndexFeature

#### Properties

| Property                                               | Description |
| ------------------------------------------------------ | ----------- |
| `Optional` **domain**: `"surveillance"` \| `"generic"` |             |
| `Optional` **modelVersion**: `string`                  |             |
| **name**: `"vision"` \| `"speech"`                     |             |

<a name="interfacesazure_video_retrieval_api_clientindexmetadataschemamd"></a>

### Interface: IndexMetadataSchema

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).IndexMetadataSchema

#### Properties

| Property                                                                                                          | Description |
| ----------------------------------------------------------------------------------------------------------------- | ----------- |
| **fields**: [`IndexMetadataSchemaField`](#interfacesazure_video_retrieval_api_clientindexmetadataschemafieldmd)[] |             |
| `Optional` **language**: `string`                                                                                 |             |

<a name="interfacesazure_video_retrieval_api_clientindexmetadataschemafieldmd"></a>

### Interface: IndexMetadataSchemaField

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).IndexMetadataSchemaField

#### Properties

| Property                             | Description |
| ------------------------------------ | ----------- |
| **filterable**: `boolean`            |             |
| **name**: `string`                   |             |
| **searchable**: `boolean`            |             |
| **type**: `"string"` \| `"datetime"` |             |

<a name="interfacesazure_video_retrieval_api_clientindexsummarymd"></a>

### Interface: IndexSummary

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).IndexSummary

#### Properties

| Property                                                                                               | Description |
| ------------------------------------------------------------------------------------------------------ | ----------- |
| **createdDateTime**: `string`                                                                          |             |
| **eTag**: `string`                                                                                     |             |
| `Optional` **features**: [`IndexFeature`](#interfacesazure_video_retrieval_api_clientindexfeaturemd)[] |             |
| **lastModifiedDateTime**: `string`                                                                     |             |
| **name**: `string`                                                                                     |             |
| `Optional` **userData**: `object`                                                                      |             |

<a name="interfacesazure_video_retrieval_api_clientingestionrequestmd"></a>

### Interface: IngestionRequest

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).IngestionRequest

#### Properties

| Property                                                                                      | Description |
| --------------------------------------------------------------------------------------------- | ----------- |
| `Optional` **filterDefectedFrames**: `boolean`                                                |             |
| `Optional` **generateInsightIntervals**: `boolean`                                            |             |
| `Optional` **includeSpeechTranscript**: `boolean`                                             |             |
| `Optional` **moderation**: `boolean`                                                          |             |
| **videos**: [`VideoIngestion`](#interfacesazure_video_retrieval_api_clientvideoingestionmd)[] |             |

<a name="interfacesazure_video_retrieval_api_clientingestionstatusdetailmd"></a>

### Interface: IngestionStatusDetail

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).IngestionStatusDetail

#### Properties

| Property                      | Description |
| ----------------------------- | ----------- |
| **documentId**: `string`      |             |
| **documentUrl**: `string`     |             |
| **lastUpdatedTime**: `string` |             |
| **succeeded**: `boolean`      |             |

<a name="interfacesazure_video_retrieval_api_clientingestionsummarymd"></a>

### Interface: IngestionSummary

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).IngestionSummary

#### Properties

| Property                                                                                                                          | Description |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `Optional` **batchName**: `string`                                                                                                |             |
| **createdDateTime**: `string`                                                                                                     |             |
| `Optional` **fileStatusDetails**: [`IngestionStatusDetail`](#interfacesazure_video_retrieval_api_clientingestionstatusdetailmd)[] |             |
| **lastModifiedDateTime**: `string`                                                                                                |             |
| **name**: `string`                                                                                                                |             |
| **state**: `"NotStarted"` \| `"Running"` \| `"Completed"` \| `"Failed"` \| `"PartiallySucceeded"`                                 |             |

<a name="interfacesazure_video_retrieval_api_clientvideoingestionmd"></a>

### Interface: VideoIngestion

[azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd).VideoIngestion

#### Properties

| Property                                      | Description |
| --------------------------------------------- | ----------- |
| `Optional` **documentId**: `string`           |             |
| **documentUrl**: `string`                     |             |
| `Optional` **metadata**: `object`             |             |
| **mode**: `"update"` \| `"remove"` \| `"add"` |             |
| `Optional` **userData**: `object`             |             |

<a name="interfaceschatchataboutvideooptionsmd"></a>

### Interface: ChatAboutVideoOptions

[chat](#moduleschatmd).ChatAboutVideoOptions

Option settings for ChatAboutVideo

#### Properties

| Property                                                         | Description                                                                                                            |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ----------- | ------- | ------- | ------- | -------- | -------- | ----------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---- | ------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ---------- | -------- | --------------------------------------------------------------------------------- | -------- | ------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `Optional` **extractVideoFrames**: `Object`                      | Type declaration<br><br>                                                                                               | Name | Type | Description | <br>    | :------ | :------ | :------  | <br>     | `extractor` | [`VideoFramesExtractor`](#videoframesextractor) | Function for extracting frames from the video. If not specified, a default function using ffmpeg will be used. | <br> | `height`                              | `undefined` \| `number` | Video frame height, default is undefined which means the scaling will be determined by the videoFrameWidth option. If both videoFrameWidth and videoFrameHeight are not specified, then the frames will not be resized/scaled. | <br>                               | `interval` | `number` | Intervals between frames to be extracted. The unit is second. Default value is 5. | <br>     | `limit` | `number`     | Maximum number of frames to be extracted. Default value is 10 which is the current per-request limitation of ChatGPT Vision. | <br>               | `width` | `undefined` \| `number` | Video frame width, default is 200. If both videoFrameWidth and videoFrameHeight are not specified, then the frames will not be resized/scaled. |     |
| **fileBatchUploader**: [`FileBatchUploader`](#filebatchuploader) | Function for uploading files                                                                                           |
| `Optional` **initialPrompts**: `ChatRequestMessage`[]            | Initial prompts to be added to the chat history before frame images.                                                   |
| **openAiDeploymentName**: `string`                               | Name/ID of the deployment                                                                                              |
| `Optional` **startPrompts**: `ChatRequestMessage`[]              | Prompts to be added to the chat history right after frame images.                                                      |
| `Optional` **storageContainerName**: `string`                    | Storage container for storing frame images of the video.                                                               |
| **storagePathPrefix**: `string`                                  | Path prefix to be prepended for storing frame images of the video.                                                     |
| **tmpDir**: `string`                                             | Temporary directory for storing temporary files.<br>If not specified, them temporary directory of the OS will be used. |
| `Optional` **videoRetrievalIndex**: `Object`                     | Type declaration<br><br>                                                                                               | Name | Type | <br>        | :------ | :------ | <br>    | `apiKey` | `string` | <br>        | `createIndexIfNotExists?`                       | `boolean`                                                                                                      | <br> | `deleteDocumentWhenConversationEnds?` | `boolean`               | <br>                                                                                                                                                                                                                           | `deleteIndexWhenConversationEnds?` | `boolean`  | <br>     | `endpoint`                                                                        | `string` | <br>    | `indexName?` | `string`                                                                                                                     | <br><br>## Modules |

<a name="modulesawsmd"></a>

### Module: aws

#### Functions

##### createAwsS3FileBatchUploader

▸ **createAwsS3FileBatchUploader**(`s3Client`, `expirationSeconds`, `parallelism?`): [`FileBatchUploader`](#filebatchuploader)

###### Parameters

| Name                | Type       | Default value |
| :------------------ | :--------- | :------------ |
| `s3Client`          | `S3Client` | `undefined`   |
| `expirationSeconds` | `number`   | `undefined`   |
| `parallelism`       | `number`   | `3`           |

###### Returns

[`FileBatchUploader`](#filebatchuploader)

<a name="modulesazuremd"></a>

### Module: azure

#### References

##### CreateIndexOptions

Re-exports [CreateIndexOptions](#interfacesazure_video_retrieval_api_clientcreateindexoptionsmd)

---

##### DocumentSummary

Re-exports [DocumentSummary](#interfacesazure_video_retrieval_api_clientdocumentsummarymd)

---

##### IndexFeature

Re-exports [IndexFeature](#interfacesazure_video_retrieval_api_clientindexfeaturemd)

---

##### IndexMetadataSchema

Re-exports [IndexMetadataSchema](#interfacesazure_video_retrieval_api_clientindexmetadataschemamd)

---

##### IndexMetadataSchemaField

Re-exports [IndexMetadataSchemaField](#interfacesazure_video_retrieval_api_clientindexmetadataschemafieldmd)

---

##### IndexSummary

Re-exports [IndexSummary](#interfacesazure_video_retrieval_api_clientindexsummarymd)

---

##### IngestionRequest

Re-exports [IngestionRequest](#interfacesazure_video_retrieval_api_clientingestionrequestmd)

---

##### IngestionStatusDetail

Re-exports [IngestionStatusDetail](#interfacesazure_video_retrieval_api_clientingestionstatusdetailmd)

---

##### IngestionSummary

Re-exports [IngestionSummary](#interfacesazure_video_retrieval_api_clientingestionsummarymd)

---

##### PaginatedWithNextLink

Re-exports [PaginatedWithNextLink](#paginatedwithnextlink)

---

##### VideoIngestion

Re-exports [VideoIngestion](#interfacesazure_video_retrieval_api_clientvideoingestionmd)

---

##### VideoRetrievalApiClient

Re-exports [VideoRetrievalApiClient](#classesazure_video_retrieval_api_clientvideoretrievalapiclientmd)

#### Functions

##### createAzureBlobStorageFileBatchUploader

▸ **createAzureBlobStorageFileBatchUploader**(`blobServiceClient`, `expirationSeconds`, `parallelism?`): [`FileBatchUploader`](#filebatchuploader)

###### Parameters

| Name                | Type                | Default value |
| :------------------ | :------------------ | :------------ |
| `blobServiceClient` | `BlobServiceClient` | `undefined`   |
| `expirationSeconds` | `number`            | `undefined`   |
| `parallelism`       | `number`            | `3`           |

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
| :--- |
| `T`  |

###### Type declaration

| Name        | Type     |
| :---------- | :------- |
| `nextLink?` | `string` |
| `value`     | `T`[]    |

<a name="moduleschatmd"></a>

### Module: chat

#### Classes

- [ChatAboutVideo](#classeschatchataboutvideomd)
- [Conversation](#classeschatconversationmd)

#### Interfaces

- [ChatAboutVideoOptions](#interfaceschatchataboutvideooptionsmd)

#### Type Aliases

##### ChatAboutVideoConstructorOptions

Ƭ **ChatAboutVideoConstructorOptions**: \{ `azureStorageConnectionString?`: `string` ; `downloadUrlExpirationSeconds?`: `number` ; `openAiApiKey`: `string` ; `openAiEndpoint?`: `string` } & \{ `extractVideoFrames?`: `Partial`\<`Exclude`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)[``"extractVideoFrames"``], `undefined`\>\> ; `videoRetrievalIndex?`: `Partial`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)[``"videoRetrievalIndex"``]\> & `Pick`\<`Exclude`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)[``"videoRetrievalIndex"``], `undefined`\>, `"endpoint"` \| `"apiKey"`\> } & `Partial`\<`Omit`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd), `"videoRetrievalIndex"` \| `"extractVideoFrames"`\>\> & `Required`\<`Pick`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd), `"openAiDeploymentName"`\>\>

---

##### ChatOptions

Ƭ **ChatOptions**: \{ `throttleBackoff?`: `number`[] } & `GetChatCompletionsOptions`

---

##### ConversationOptions

Ƭ **ConversationOptions**: `Object`

###### Type declaration

| Name                   | Type                                                                     |
| :--------------------- | :----------------------------------------------------------------------- |
| `chatCompletions?`     | `Partial`\<[`ChatOptions`](#chatoptions)\>                               |
| `extractVideoFrames?`  | `Partial`\<[`ExtractVideoFramesOptions`](#extractvideoframesoptions)\>   |
| `videoRetrievalIndex?` | `Partial`\<[`VideoRetrievalIndexOptions`](#videoretrievalindexoptions)\> |

---

##### ExtractVideoFramesOptions

Ƭ **ExtractVideoFramesOptions**: `Exclude`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)[``"extractVideoFrames"``], `undefined`\>

---

##### VideoRetrievalIndexOptions

Ƭ **VideoRetrievalIndexOptions**: `Exclude`\<[`ChatAboutVideoOptions`](#interfaceschatchataboutvideooptionsmd)[``"videoRetrievalIndex"``], `undefined`\>

<a name="modulesclient_hackmd"></a>

### Module: client-hack

#### Functions

##### fixClient

▸ **fixClient**(`openAIClient`): `void`

###### Parameters

| Name           | Type  |
| :------------- | :---- |
| `openAIClient` | `any` |

###### Returns

`void`

<a name="modulesindexmd"></a>

### Module: index

#### References

##### ChatAboutVideo

Re-exports [ChatAboutVideo](#classeschatchataboutvideomd)

---

##### ChatAboutVideoConstructorOptions

Re-exports [ChatAboutVideoConstructorOptions](#chataboutvideoconstructoroptions)

---

##### ChatAboutVideoOptions

Re-exports [ChatAboutVideoOptions](#interfaceschatchataboutvideooptionsmd)

---

##### ChatOptions

Re-exports [ChatOptions](#chatoptions)

---

##### Conversation

Re-exports [Conversation](#classeschatconversationmd)

---

##### ConversationOptions

Re-exports [ConversationOptions](#conversationoptions)

---

##### ExtractVideoFramesOptions

Re-exports [ExtractVideoFramesOptions](#extractvideoframesoptions)

---

##### FileBatchUploader

Re-exports [FileBatchUploader](#filebatchuploader)

---

##### VideoFramesExtractor

Re-exports [VideoFramesExtractor](#videoframesextractor)

---

##### VideoRetrievalIndexOptions

Re-exports [VideoRetrievalIndexOptions](#videoretrievalindexoptions)

---

##### extractVideoFramesWithFfmpeg

Re-exports [extractVideoFramesWithFfmpeg](#extractvideoframeswithffmpeg)

---

##### lazyCreatedFileBatchUploader

Re-exports [lazyCreatedFileBatchUploader](#lazycreatedfilebatchuploader)

---

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

| Name      | Type                                                   |
| :-------- | :----------------------------------------------------- |
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

| Name             | Type       |
| :--------------- | :--------- |
| `dir`            | `string`   |
| `fileNames`      | `string`[] |
| `containerName`  | `string`   |
| `blobPathPrefix` | `string`   |

####### Returns

`Promise`\<`string`[]\>

<a name="modulesvideomd"></a>

### Module: video

#### References

##### VideoFramesExtractor

Re-exports [VideoFramesExtractor](#videoframesextractor)

---

##### extractVideoFramesWithFfmpeg

Re-exports [extractVideoFramesWithFfmpeg](#extractvideoframeswithffmpeg)

#### Functions

##### lazyCreatedVideoFramesExtractor

▸ **lazyCreatedVideoFramesExtractor**(`creator`): [`VideoFramesExtractor`](#videoframesextractor)

###### Parameters

| Name      | Type                                                         |
| :-------- | :----------------------------------------------------------- |
| `creator` | `Promise`\<[`VideoFramesExtractor`](#videoframesextractor)\> |

###### Returns

[`VideoFramesExtractor`](#videoframesextractor)

<a name="modulesvideo_ffmpegmd"></a>

### Module: video/ffmpeg

#### Functions

##### extractVideoFramesWithFfmpeg

▸ **extractVideoFramesWithFfmpeg**(`inputFile`, `outputDir`, `intervalSec`, `format?`, `width?`, `height?`, `startSec?`, `endSec?`): `Promise`\<`string`[]\>

###### Parameters

| Name          | Type     |
| :------------ | :------- |
| `inputFile`   | `string` |
| `outputDir`   | `string` |
| `intervalSec` | `number` |
| `format?`     | `string` |
| `width?`      | `number` |
| `height?`     | `number` |
| `startSec?`   | `number` |
| `endSec?`     | `number` |

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

| Name          | Type     |
| :------------ | :------- |
| `inputFile`   | `string` |
| `outputDir`   | `string` |
| `intervalSec` | `number` |
| `format?`     | `string` |
| `width?`      | `number` |
| `height?`     | `number` |
| `startSec?`   | `number` |
| `endSec?`     | `number` |

####### Returns

`Promise`\<`string`[]\>

<!-- API end -->
