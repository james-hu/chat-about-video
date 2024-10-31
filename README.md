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
- It can automatically retry on receiving throttling (HTTP status code 429) and error (HTTP status code 5xx) responses from the API.
- Options supported by the underlying API are exposed for customisation.
- It can also be used in scenario that no video needs to be involved, that means it can be used for "normal" text chats.

## Usage

### Installation

To use `chat-about-video` in your Node.js application,
add it as a dependency along with other necessary packages based on your usage scenario.
Below are examples for typical setups:

```shell
# ChatGPT on OpenAI or Azure with Azure Blob Storage
npm i chat-about-video @azure/openai @ffmpeg-installer/ffmpeg @azure/storage-blob
# Gemini in Google Cloud
npm i chat-about-video @google/generative-ai @ffmpeg-installer/ffmpeg
# ChatGPT on OpenAI or Azure with AWS S3
npm i chat-about-video @azure/openai @ffmpeg-installer/ffmpeg @handy-common-utils/aws-utils @aws-sdk/s3-request-presigner @aws-sdk/client-s3
```

### Optional dependencies

**ChatGPT**

To use ChatGPT hosted on OpenAI or Azure:

```shell
npm i @azure/openai
```

**Gemini**

To use Gemini hosted on Google Cloud:

```shell
npm i @google/generative-ai
```

**ffmpeg**

If you need ffmpeg for extracting video frame images, ensure it is installed.
You can use a system package manager or an NPM package:

```shell
sudo apt install ffmpeg
# or
npm i @ffmpeg-installer/ffmpeg
```

**Azure Blob Storage**

To use Azure Blob Storage for frame images (not needed for Gemini):

```shell
npm i @azure/storage-blob
```

**AWS S3**

To use AWS S3 for frame images (not needed for Gemini):

```shell
npm i @handy-common-utils/aws-utils @aws-sdk/s3-request-presigner @aws-sdk/client-s3
```

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

`chat-about-video` supports sending Video frames directly to Google's API without a cloud storage.

- Utilize ffmpeg integration provided by this package for frame image extraction or opt for a DIY approach.
- Number of frame images is only limited by Gemini API in Google Cloud.

## Concrete types and low level clients

`ChatAboutVideo` and `Conversation` are generic classes.
Use them without concrete generic type parameters when you want the flexibility to easily switch between ChatGPT and Gemini.

Otherwise, you may want to use concrete type. Below are some examples:

```typescript
// cast to a concrete type
const castToChatGpt = chat as ChatAboutVideoWithChatGpt;

// you can also just leave the ChatAboutVideo instance generic, but narrow down the conversation type
const conversationWithGemini = (await chat.startConversation(...)) as ConversationWithGemini;
const conversationWithChatGpt = await (chat as ChatAboutVideoWithChatGpt).startConversation(...);
```

To access the underlying API wrapper, use the `getApi()` function on the `ChatAboutVideo` instance.
To get the raw API client, use the `getClient()` function on the awaited object returned from `getApi()`.

## Cleaning up

Intermediate files, such as extracted frame images, can be saved locally or in the cloud.
To remove these files when they are no longer needed, remember to call the `end()` function
on the `Conversation` instance when the conversion finishes.

## Customisation

### Frame extraction

If you would like to customise how frame images are extracted and stored, consider these:

- In the options object passed to the constructor of `ChatAboutVideo`, there's a property `extractVideoFrames`.
  This property allows you to customise how frame images are extracted.
  - `format`, `interval`, `limit`, `width`, `height` - These allows you to specify your expectation on the extraction.
  - `deleteFilesWhenConversationEnds` - This flag allows you to specify whether you want extracted frame images
    to be deleted from the local file system when the conversation ends, or not.
  - `framesDirectoryResolver` - You can supply a function for determining where extracted frame image files
    should be stored locally.
  - `extractor` - You can supply a function for doing the extraction.
- In the options object passed to the constructor of `ChatAboutVideo`, there's a property `storage`.
  For ChatGPT, storing frame images in the cloud is recommended. You can use this property to customise
  how frame images are stored in the cloud.
  - `azureStorageConnectionString` - If you would like to use Azure Blob Storage, you need to put
    the connection string in this property. If this property does not have a value, `ChatAboutVideo`
    would assume that you'd like to use AWS S3, and default AWS identity/credential will be picked up from the OS.
  - `storageContainerName`, `storagePathPrefix` - They allows you to specify where those images should be stored.
  - `downloadUrlExpirationSeconds` - For images stored in the cloud, presigned download URLs with expiration
    are generated for ChatGPT to access. This property allows you to control the expiration time.
  - `deleteFilesWhenConversationEnds` - This flag allows you to specify whether you want extracted frame images
    to be deleted from the cloud when the conversation ends, or not.
  - `uploader` - You can supply a function for uploading images into the cloud.

### Settings of the underlying model

In the options object passed to the constructor of `ChatAboutVideo`, there's a property `clientSettings`,
and there's another property `completionSettings`. Settings of the underlying model can be configured
through those two properties.

You can also override settings using the last parameter of `startConversation(...)` function on `ChatAboutVideo`,
or the last parameter of `say(...)` function on `Conversation`.

## Code examples

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

import { ChatAboutVideo, ConversationWithChatGpt } from 'chat-about-video';

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

  const conversation = (await chat.startConversation(process.env.DEMO_VIDEO!)) as ConversationWithChatGpt;

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

import { ChatAboutVideo, ConversationWithChatGpt } from 'chat-about-video';

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

  const conversation = (await chat.startConversation(process.env.DEMO_VIDEO!)) as ConversationWithChatGpt;

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

import { ChatAboutVideo, ConversationWithChatGpt } from 'chat-about-video';

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

  const conversation = (await chat.startConversation(process.env.DEMO_VIDEO!)) as ConversationWithChatGpt;

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

import { ChatAboutVideo, ConversationWithGemini } from 'chat-about-video';

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

  const conversation = (await chat.startConversation(process.env.DEMO_VIDEO!)) as ConversationWithGemini;

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
    });
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
- [azure/client-hack](#modulesazure_client_hackmd)
- [azure/video-retrieval-api-client](#modulesazure_video_retrieval_api_clientmd)
- [chat](#moduleschatmd)
- [chat-gpt](#moduleschat_gptmd)
- [gemini](#modulesgeminimd)
- [index](#modulesindexmd)
- [storage](#modulesstoragemd)
- [storage/types](#modulesstorage_typesmd)
- [types](#modulestypesmd)
- [utils](#modulesutilsmd)
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

### Class: ChatAboutVideo\<CLIENT, OPTIONS, PROMPT, RESPONSE\>

[chat](#moduleschatmd).ChatAboutVideo

#### Type parameters

| Name       | Type                                                                                           |
| :--------- | :--------------------------------------------------------------------------------------------- |
| `CLIENT`   | `any`                                                                                          |
| `OPTIONS`  | extends [`AdditionalCompletionOptions`](#interfacestypesadditionalcompletionoptionsmd) = `any` |
| `PROMPT`   | `any`                                                                                          |
| `RESPONSE` | `any`                                                                                          |

#### Constructors

##### constructor

• **new ChatAboutVideo**\<`CLIENT`, `OPTIONS`, `PROMPT`, `RESPONSE`\>(`options`, `log?`)

###### Type parameters

| Name       | Type                                                                                           |
| :--------- | :--------------------------------------------------------------------------------------------- |
| `CLIENT`   | `any`                                                                                          |
| `OPTIONS`  | extends [`AdditionalCompletionOptions`](#interfacestypesadditionalcompletionoptionsmd) = `any` |
| `PROMPT`   | `any`                                                                                          |
| `RESPONSE` | `any`                                                                                          |

###### Parameters

| Name      | Type                                                                                                                                                                                                                                                                              |
| :-------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options` | [`SupportedChatApiOptions`](#supportedchatapioptions)                                                                                                                                                                                                                             |
| `log`     | `undefined` \| `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |

#### Properties

| Property                                                                                                                                                                                                                                                                                               | Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `Protected` **apiPromise**: `Promise`\<[`ChatApi`](#interfacestypeschatapimd)\<`CLIENT`, `OPTIONS`, `PROMPT`, `RESPONSE`\>\>                                                                                                                                                                           |             |
| `Protected` **log**: `undefined` \| `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |             |
| `Protected` **options**: [`SupportedChatApiOptions`](#supportedchatapioptions)                                                                                                                                                                                                                         |             |

#### Methods

##### getApi

▸ **getApi**(): `Promise`\<[`ChatApi`](#interfacestypeschatapimd)\<`CLIENT`, `OPTIONS`, `PROMPT`, `RESPONSE`\>\>

Get the underlying API instance.

###### Returns

`Promise`\<[`ChatApi`](#interfacestypeschatapimd)\<`CLIENT`, `OPTIONS`, `PROMPT`, `RESPONSE`\>\>

The underlying API instance.

---

##### startConversation

▸ **startConversation**(`options?`): `Promise`\<[`Conversation`](#classeschatconversationmd)\<`CLIENT`, `OPTIONS`, `PROMPT`, `RESPONSE`\>\>

Start a conversation without a video

###### Parameters

| Name       | Type      | Description                              |
| :--------- | :-------- | :--------------------------------------- |
| `options?` | `OPTIONS` | Overriding options for this conversation |

###### Returns

`Promise`\<[`Conversation`](#classeschatconversationmd)\<`CLIENT`, `OPTIONS`, `PROMPT`, `RESPONSE`\>\>

The conversation.

▸ **startConversation**(`videoFile`, `options?`): `Promise`\<[`Conversation`](#classeschatconversationmd)\<`CLIENT`, `OPTIONS`, `PROMPT`, `RESPONSE`\>\>

Start a conversation about a video.

###### Parameters

| Name        | Type      | Description                                |
| :---------- | :-------- | :----------------------------------------- |
| `videoFile` | `string`  | Path to a video file in local file system. |
| `options?`  | `OPTIONS` | Overriding options for this conversation   |

###### Returns

`Promise`\<[`Conversation`](#classeschatconversationmd)\<`CLIENT`, `OPTIONS`, `PROMPT`, `RESPONSE`\>\>

The conversation.

<a name="classeschatconversationmd"></a>

### Class: Conversation\<CLIENT, OPTIONS, PROMPT, RESPONSE\>

[chat](#moduleschatmd).Conversation

#### Type parameters

| Name       | Type                                                                                           |
| :--------- | :--------------------------------------------------------------------------------------------- |
| `CLIENT`   | `any`                                                                                          |
| `OPTIONS`  | extends [`AdditionalCompletionOptions`](#interfacestypesadditionalcompletionoptionsmd) = `any` |
| `PROMPT`   | `any`                                                                                          |
| `RESPONSE` | `any`                                                                                          |

#### Constructors

##### constructor

• **new Conversation**\<`CLIENT`, `OPTIONS`, `PROMPT`, `RESPONSE`\>(`conversationId`, `api`, `prompt`, `options`, `cleanup?`, `log?`)

###### Type parameters

| Name       | Type                                                                                           |
| :--------- | :--------------------------------------------------------------------------------------------- |
| `CLIENT`   | `any`                                                                                          |
| `OPTIONS`  | extends [`AdditionalCompletionOptions`](#interfacestypesadditionalcompletionoptionsmd) = `any` |
| `PROMPT`   | `any`                                                                                          |
| `RESPONSE` | `any`                                                                                          |

###### Parameters

| Name             | Type                                                                                                                                                                                                                                                                              |
| :--------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `conversationId` | `string`                                                                                                                                                                                                                                                                          |
| `api`            | [`ChatApi`](#interfacestypeschatapimd)\<`CLIENT`, `OPTIONS`, `PROMPT`, `RESPONSE`\>                                                                                                                                                                                               |
| `prompt`         | `undefined` \| `PROMPT`                                                                                                                                                                                                                                                           |
| `options`        | `OPTIONS`                                                                                                                                                                                                                                                                         |
| `cleanup?`       | () => `Promise`\<`any`\>                                                                                                                                                                                                                                                          |
| `log`            | `undefined` \| `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |

#### Properties

| Property                                                                                                                                                                                                                                                                                               | Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `Protected` **api**: [`ChatApi`](#interfacestypeschatapimd)\<`CLIENT`, `OPTIONS`, `PROMPT`, `RESPONSE`\>                                                                                                                                                                                               |             |
| `Protected` `Optional` **cleanup**: () => `Promise`\<`any`\>                                                                                                                                                                                                                                           |             |
| `Protected` **conversationId**: `string`                                                                                                                                                                                                                                                               |             |
| `Protected` **log**: `undefined` \| `LineLogger`\<(`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`, (`message?`: `any`, ...`optionalParams`: `any`[]) => `void`\> |             |
| `Protected` **options**: `OPTIONS`                                                                                                                                                                                                                                                                     |             |
| `Protected` **prompt**: `undefined` \| `PROMPT`                                                                                                                                                                                                                                                        |             |

#### Methods

##### end

▸ **end**(): `Promise`\<`void`\>

###### Returns

`Promise`\<`void`\>

---

##### getApi

▸ **getApi**(): [`ChatApi`](#interfacestypeschatapimd)\<`CLIENT`, `OPTIONS`, `PROMPT`, `RESPONSE`\>

Get the underlying API instance.

###### Returns

[`ChatApi`](#interfacestypeschatapimd)\<`CLIENT`, `OPTIONS`, `PROMPT`, `RESPONSE`\>

The underlying API instance.

---

##### getPrompt

▸ **getPrompt**(): `undefined` \| `PROMPT`

Get the prompt for the current conversation.
The prompt is the accumulated messages in the conversation so far.

###### Returns

`undefined` \| `PROMPT`

The prompt which is the accumulated messages in the conversation so far.

---

##### say

▸ **say**(`message`, `options?`): `Promise`\<`undefined` \| `string`\>

Say something in the conversation, and get the response from AI

###### Parameters

| Name       | Type                   | Description                             |
| :--------- | :--------------------- | :-------------------------------------- |
| `message`  | `string`               | The message to say in the conversation. |
| `options?` | `Partial`\<`OPTIONS`\> | Options for fine control.               |

###### Returns

`Promise`\<`undefined` \| `string`\>

The response/completion

<a name="classeschat_gptchatgptapimd"></a>

### Class: ChatGptApi

[chat-gpt](#moduleschat_gptmd).ChatGptApi

#### Implements

- [`ChatApi`](#interfacestypeschatapimd)\<[`ChatGptClient`](#chatgptclient), [`ChatGptCompletionOptions`](#chatgptcompletionoptions), `any`[], [`ChatGptResponse`](#chatgptresponse)\>

#### Constructors

##### constructor

• **new ChatGptApi**(`options`)

###### Parameters

| Name      | Type                                |
| :-------- | :---------------------------------- |
| `options` | [`ChatGptOptions`](#chatgptoptions) |

#### Properties

| Property                                                                                                                                                                                                                                                                                                                                         | Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `Protected` **client**: `OpenAIClient`                                                                                                                                                                                                                                                                                                           |             |
| `Protected` `Optional` **extractVideoFrames**: `Pick`\<[`ExtractVideoFramesOptions`](#interfacestypesextractvideoframesoptionsmd), `"height"`\> & `Required`\<`Omit`\<[`ExtractVideoFramesOptions`](#interfacestypesextractvideoframesoptionsmd), `"height"`\>\>                                                                                 |             |
| `Protected` **options**: [`ChatGptOptions`](#chatgptoptions)                                                                                                                                                                                                                                                                                     |             |
| `Protected` **storage**: `Required`\<`Pick`\<[`StorageOptions`](#interfacestypesstorageoptionsmd), `"uploader"`\>\> & [`StorageOptions`](#interfacestypesstorageoptionsmd)                                                                                                                                                                       |             |
| `Protected` **tmpDir**: `string`                                                                                                                                                                                                                                                                                                                 |             |
| `Protected` `Optional` **videoRetrievalIndex**: `Required`\<`Pick`\<[`VideoRetrievalIndexOptions`](#interfacestypesvideoretrievalindexoptionsmd), `"createIndexIfNotExists"` \| `"deleteDocumentWhenConversationEnds"` \| `"deleteIndexWhenConversationEnds"`\>\> & [`VideoRetrievalIndexOptions`](#interfacestypesvideoretrievalindexoptionsmd) |             |

#### Methods

##### appendToPrompt

▸ **appendToPrompt**(`newPromptOrResponse`, `prompt?`): `Promise`\<`ChatRequestMessageUnion`[]\>

Append a new prompt or response to the form a full prompt.
This function is useful to build a prompt that contains conversation history.

###### Parameters

| Name                  | Type                                             | Description                                                                                                                                                                                      |
| :-------------------- | :----------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `newPromptOrResponse` | `ChatCompletions` \| `ChatRequestMessageUnion`[] | A new prompt to be appended, or previous response to be appended.                                                                                                                                |
| `prompt?`             | `ChatRequestMessageUnion`[]                      | The conversation history which is a prompt containing previous prompts and responses. If it is not provided, the conversation history returned will contain only what is in newPromptOrResponse. |

###### Returns

`Promise`\<`ChatRequestMessageUnion`[]\>

The full prompt which is effectively the conversation history.

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[appendToPrompt](#appendtoprompt)

---

##### buildTextPrompt

▸ **buildTextPrompt**(`text`, `_conversationId?`): `Promise`\<\{ `prompt`: `ChatRequestMessageUnion`[] }\>

Build prompt for sending text content to AI

###### Parameters

| Name               | Type     | Description                            |
| :----------------- | :------- | :------------------------------------- |
| `text`             | `string` | The text content to be sent.           |
| `_conversationId?` | `string` | Unique identifier of the conversation. |

###### Returns

`Promise`\<\{ `prompt`: `ChatRequestMessageUnion`[] }\>

An object containing the prompt.

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[buildTextPrompt](#buildtextprompt)

---

##### buildVideoPrompt

▸ **buildVideoPrompt**(`videoFile`, `conversationId?`): `Promise`\<[`BuildPromptOutput`](#interfacestypesbuildpromptoutputmd)\<`ChatRequestMessageUnion`[], \{ `deploymentName`: `string` } & [`AdditionalCompletionOptions`](#interfacestypesadditionalcompletionoptionsmd) & `GetChatCompletionsOptions`\>\>

Build prompt for sending video content to AI.
Sometimes, to include video in the conversation, additional options and/or clean up is needed.
In such case, options to be passed to generateContent function and/or a clean up call back function
will be returned in the output of this function.

###### Parameters

| Name              | Type     | Description                            |
| :---------------- | :------- | :------------------------------------- |
| `videoFile`       | `string` | Path to the video file.                |
| `conversationId?` | `string` | Unique identifier of the conversation. |

###### Returns

`Promise`\<[`BuildPromptOutput`](#interfacestypesbuildpromptoutputmd)\<`ChatRequestMessageUnion`[], \{ `deploymentName`: `string` } & [`AdditionalCompletionOptions`](#interfacestypesadditionalcompletionoptionsmd) & `GetChatCompletionsOptions`\>\>

An object containing the prompt, optional options, and an optional cleanup function.

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[buildVideoPrompt](#buildvideoprompt)

---

##### buildVideoPromptWithFrames

▸ `Protected` **buildVideoPromptWithFrames**(`videoFile`, `conversationId?`): `Promise`\<[`BuildPromptOutput`](#interfacestypesbuildpromptoutputmd)\<`ChatRequestMessageUnion`[], \{ `deploymentName`: `string` } & [`AdditionalCompletionOptions`](#interfacestypesadditionalcompletionoptionsmd) & `GetChatCompletionsOptions`\>\>

###### Parameters

| Name             | Type     |
| :--------------- | :------- |
| `videoFile`      | `string` |
| `conversationId` | `string` |

###### Returns

`Promise`\<[`BuildPromptOutput`](#interfacestypesbuildpromptoutputmd)\<`ChatRequestMessageUnion`[], \{ `deploymentName`: `string` } & [`AdditionalCompletionOptions`](#interfacestypesadditionalcompletionoptionsmd) & `GetChatCompletionsOptions`\>\>

---

##### buildVideoPromptWithVideoRetrievalIndex

▸ `Protected` **buildVideoPromptWithVideoRetrievalIndex**(`videoFile`, `conversationId?`): `Promise`\<[`BuildPromptOutput`](#interfacestypesbuildpromptoutputmd)\<`ChatRequestMessageUnion`[], \{ `deploymentName`: `string` } & [`AdditionalCompletionOptions`](#interfacestypesadditionalcompletionoptionsmd) & `GetChatCompletionsOptions`\>\>

###### Parameters

| Name             | Type     |
| :--------------- | :------- |
| `videoFile`      | `string` |
| `conversationId` | `string` |

###### Returns

`Promise`\<[`BuildPromptOutput`](#interfacestypesbuildpromptoutputmd)\<`ChatRequestMessageUnion`[], \{ `deploymentName`: `string` } & [`AdditionalCompletionOptions`](#interfacestypesadditionalcompletionoptionsmd) & `GetChatCompletionsOptions`\>\>

---

##### generateContent

▸ **generateContent**(`prompt`, `options`): `Promise`\<`ChatCompletions`\>

Generate content based on the given prompt and options.

###### Parameters

| Name      | Type                                                                                                                                           | Description                                         |
| :-------- | :--------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------- |
| `prompt`  | `ChatRequestMessageUnion`[]                                                                                                                    | The full prompt to generate content.                |
| `options` | \{ `deploymentName`: `string` } & [`AdditionalCompletionOptions`](#interfacestypesadditionalcompletionoptionsmd) & `GetChatCompletionsOptions` | Optional options to control the content generation. |

###### Returns

`Promise`\<`ChatCompletions`\>

The generated content.

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[generateContent](#generatecontent)

---

##### getClient

▸ **getClient**(): `Promise`\<`OpenAIClient`\>

Get the raw client.
This function could be useful for advanced use cases.

###### Returns

`Promise`\<`OpenAIClient`\>

The raw client.

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[getClient](#getclient)

---

##### getResponseText

▸ **getResponseText**(`result`): `Promise`\<`undefined` \| `string`\>

Get the text from the response object

###### Parameters

| Name     | Type              | Description         |
| :------- | :---------------- | :------------------ |
| `result` | `ChatCompletions` | the response object |

###### Returns

`Promise`\<`undefined` \| `string`\>

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[getResponseText](#getresponsetext)

---

##### isServerError

▸ **isServerError**(`error`): `boolean`

Check if the error is a server error.

###### Parameters

| Name    | Type  | Description      |
| :------ | :---- | :--------------- |
| `error` | `any` | any error object |

###### Returns

`boolean`

true if the error is a server error, false otherwise.

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[isServerError](#isservererror)

---

##### isThrottlingError

▸ **isThrottlingError**(`error`): `boolean`

Check if the error is a throttling error.

###### Parameters

| Name    | Type  | Description      |
| :------ | :---- | :--------------- |
| `error` | `any` | any error object |

###### Returns

`boolean`

true if the error is a throttling error, false otherwise.

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[isThrottlingError](#isthrottlingerror)

<a name="classesgeminigeminiapimd"></a>

### Class: GeminiApi

[gemini](#modulesgeminimd).GeminiApi

#### Implements

- [`ChatApi`](#interfacestypeschatapimd)\<[`GeminiClient`](#geminiclient), [`GeminiCompletionOptions`](#geminicompletionoptions), `any`[], [`GeminiResponse`](#geminiresponse)\>

#### Constructors

##### constructor

• **new GeminiApi**(`options`)

###### Parameters

| Name      | Type                              |
| :-------- | :-------------------------------- |
| `options` | [`GeminiOptions`](#geminioptions) |

#### Properties

| Property                                                                                                                                                                                                                                              | Description |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `Protected` **client**: `GenerativeModel`                                                                                                                                                                                                             |             |
| `Protected` **extractVideoFrames**: `Pick`\<[`ExtractVideoFramesOptions`](#interfacestypesextractvideoframesoptionsmd), `"height"`\> & `Required`\<`Omit`\<[`ExtractVideoFramesOptions`](#interfacestypesextractvideoframesoptionsmd), `"height"`\>\> |             |
| `Protected` **options**: [`GeminiOptions`](#geminioptions)                                                                                                                                                                                            |             |
| `Protected` **tmpDir**: `string`                                                                                                                                                                                                                      |             |

#### Methods

##### appendToPrompt

▸ **appendToPrompt**(`newPromptOrResponse`, `prompt?`): `Promise`\<`Content`[]\>

Append a new prompt or response to the form a full prompt.
This function is useful to build a prompt that contains conversation history.

###### Parameters

| Name                  | Type                                   | Description                                                                                                                                                                                      |
| :-------------------- | :------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `newPromptOrResponse` | `Content`[] \| `GenerateContentResult` | A new prompt to be appended, or previous response to be appended.                                                                                                                                |
| `prompt?`             | `Content`[]                            | The conversation history which is a prompt containing previous prompts and responses. If it is not provided, the conversation history returned will contain only what is in newPromptOrResponse. |

###### Returns

`Promise`\<`Content`[]\>

The full prompt which is effectively the conversation history.

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[appendToPrompt](#appendtoprompt)

---

##### buildTextPrompt

▸ **buildTextPrompt**(`text`, `_conversationId?`): `Promise`\<\{ `prompt`: `Content`[] }\>

Build prompt for sending text content to AI

###### Parameters

| Name               | Type     | Description                            |
| :----------------- | :------- | :------------------------------------- |
| `text`             | `string` | The text content to be sent.           |
| `_conversationId?` | `string` | Unique identifier of the conversation. |

###### Returns

`Promise`\<\{ `prompt`: `Content`[] }\>

An object containing the prompt.

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[buildTextPrompt](#buildtextprompt)

---

##### buildVideoPrompt

▸ **buildVideoPrompt**(`videoFile`, `conversationId?`): `Promise`\<[`BuildPromptOutput`](#interfacestypesbuildpromptoutputmd)\<`Content`[], [`GeminiCompletionOptions`](#geminicompletionoptions)\>\>

Build prompt for sending video content to AI.
Sometimes, to include video in the conversation, additional options and/or clean up is needed.
In such case, options to be passed to generateContent function and/or a clean up call back function
will be returned in the output of this function.

###### Parameters

| Name             | Type     | Description                            |
| :--------------- | :------- | :------------------------------------- |
| `videoFile`      | `string` | Path to the video file.                |
| `conversationId` | `string` | Unique identifier of the conversation. |

###### Returns

`Promise`\<[`BuildPromptOutput`](#interfacestypesbuildpromptoutputmd)\<`Content`[], [`GeminiCompletionOptions`](#geminicompletionoptions)\>\>

An object containing the prompt, optional options, and an optional cleanup function.

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[buildVideoPrompt](#buildvideoprompt)

---

##### generateContent

▸ **generateContent**(`prompt`, `options`): `Promise`\<`GenerateContentResult`\>

Generate content based on the given prompt and options.

###### Parameters

| Name      | Type                                                  | Description                                         |
| :-------- | :---------------------------------------------------- | :-------------------------------------------------- |
| `prompt`  | `Content`[]                                           | The full prompt to generate content.                |
| `options` | [`GeminiCompletionOptions`](#geminicompletionoptions) | Optional options to control the content generation. |

###### Returns

`Promise`\<`GenerateContentResult`\>

The generated content.

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[generateContent](#generatecontent)

---

##### getClient

▸ **getClient**(): `Promise`\<`GenerativeModel`\>

Get the raw client.
This function could be useful for advanced use cases.

###### Returns

`Promise`\<`GenerativeModel`\>

The raw client.

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[getClient](#getclient)

---

##### getResponseText

▸ **getResponseText**(`result`): `Promise`\<`undefined` \| `string`\>

Get the text from the response object

###### Parameters

| Name     | Type                    | Description         |
| :------- | :---------------------- | :------------------ |
| `result` | `GenerateContentResult` | the response object |

###### Returns

`Promise`\<`undefined` \| `string`\>

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[getResponseText](#getresponsetext)

---

##### isServerError

▸ **isServerError**(`error`): `boolean`

Check if the error is a server error.

###### Parameters

| Name    | Type  | Description      |
| :------ | :---- | :--------------- |
| `error` | `any` | any error object |

###### Returns

`boolean`

true if the error is a server error, false otherwise.

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[isServerError](#isservererror)

---

##### isThrottlingError

▸ **isThrottlingError**(`error`): `boolean`

Check if the error is a throttling error.

###### Parameters

| Name    | Type  | Description      |
| :------ | :---- | :--------------- |
| `error` | `any` | any error object |

###### Returns

`boolean`

true if the error is a throttling error, false otherwise.

###### Implementation of

[ChatApi](#interfacestypeschatapimd).[isThrottlingError](#isthrottlingerror)

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

<a name="interfacestypesadditionalcompletionoptionsmd"></a>

### Interface: AdditionalCompletionOptions

[types](#modulestypesmd).AdditionalCompletionOptions

#### Properties

| Property                                        | Description                                                                                                                    |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `Optional` **backoffOnServerError**: `number`[] | Array of retry backoff periods (unit: milliseconds) for situations that the server returns 5xx response                        |
| `Optional` **backoffOnThrottling**: `number`[]  | Array of retry backoff periods (unit: milliseconds) for situations that the server returns 429 response                        |
| `Optional` **startPromptText**: `string`        | The user prompt that will be sent before the video content.<br>If not provided, nothing will be sent before the video content. |
| `Optional` **systemPromptText**: `string`       | System prompt text. If not provided, a default prompt will be used.                                                            |

<a name="interfacestypesbuildpromptoutputmd"></a>

### Interface: BuildPromptOutput\<PROMPT, OPTIONS\>

[types](#modulestypesmd).BuildPromptOutput

#### Type parameters

| Name      |
| :-------- |
| `PROMPT`  |
| `OPTIONS` |

#### Properties

| Property                                         | Description |
| ------------------------------------------------ | ----------- |
| `Optional` **cleanup**: () => `Promise`\<`any`\> |             |
| `Optional` **options**: `Partial`\<`OPTIONS`\>   |             |
| **prompt**: `PROMPT`                             |             |

<a name="interfacestypeschatapimd"></a>

### Interface: ChatApi\<CLIENT, OPTIONS, PROMPT, RESPONSE\>

[types](#modulestypesmd).ChatApi

#### Type parameters

| Name       | Type                                                                                   |
| :--------- | :------------------------------------------------------------------------------------- |
| `CLIENT`   | `CLIENT`                                                                               |
| `OPTIONS`  | extends [`AdditionalCompletionOptions`](#interfacestypesadditionalcompletionoptionsmd) |
| `PROMPT`   | `PROMPT`                                                                               |
| `RESPONSE` | `RESPONSE`                                                                             |

#### Implemented by

- [`ChatGptApi`](#classeschat_gptchatgptapimd)
- [`GeminiApi`](#classesgeminigeminiapimd)

#### Methods

##### appendToPrompt

▸ **appendToPrompt**(`newPromptOrResponse`, `prompt?`): `Promise`\<`PROMPT`\>

Append a new prompt or response to the form a full prompt.
This function is useful to build a prompt that contains conversation history.

###### Parameters

| Name                  | Type                   | Description                                                                                                                                                                                      |
| :-------------------- | :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `newPromptOrResponse` | `PROMPT` \| `RESPONSE` | A new prompt to be appended, or previous response to be appended.                                                                                                                                |
| `prompt?`             | `PROMPT`               | The conversation history which is a prompt containing previous prompts and responses. If it is not provided, the conversation history returned will contain only what is in newPromptOrResponse. |

###### Returns

`Promise`\<`PROMPT`\>

The full prompt which is effectively the conversation history.

---

##### buildTextPrompt

▸ **buildTextPrompt**(`text`, `conversationId?`): `Promise`\<\{ `prompt`: `PROMPT` }\>

Build prompt for sending text content to AI

###### Parameters

| Name              | Type     | Description                            |
| :---------------- | :------- | :------------------------------------- |
| `text`            | `string` | The text content to be sent.           |
| `conversationId?` | `string` | Unique identifier of the conversation. |

###### Returns

`Promise`\<\{ `prompt`: `PROMPT` }\>

An object containing the prompt.

---

##### buildVideoPrompt

▸ **buildVideoPrompt**(`videoFile`, `conversationId?`): `Promise`\<[`BuildPromptOutput`](#interfacestypesbuildpromptoutputmd)\<`PROMPT`, `OPTIONS`\>\>

Build prompt for sending video content to AI.
Sometimes, to include video in the conversation, additional options and/or clean up is needed.
In such case, options to be passed to generateContent function and/or a clean up call back function
will be returned in the output of this function.

###### Parameters

| Name              | Type     | Description                            |
| :---------------- | :------- | :------------------------------------- |
| `videoFile`       | `string` | Path to the video file.                |
| `conversationId?` | `string` | Unique identifier of the conversation. |

###### Returns

`Promise`\<[`BuildPromptOutput`](#interfacestypesbuildpromptoutputmd)\<`PROMPT`, `OPTIONS`\>\>

An object containing the prompt, optional options, and an optional cleanup function.

---

##### generateContent

▸ **generateContent**(`prompt`, `options?`): `Promise`\<`RESPONSE`\>

Generate content based on the given prompt and options.

###### Parameters

| Name       | Type      | Description                                         |
| :--------- | :-------- | :-------------------------------------------------- |
| `prompt`   | `PROMPT`  | The full prompt to generate content.                |
| `options?` | `OPTIONS` | Optional options to control the content generation. |

###### Returns

`Promise`\<`RESPONSE`\>

The generated content.

---

##### getClient

▸ **getClient**(): `Promise`\<`CLIENT`\>

Get the raw client.
This function could be useful for advanced use cases.

###### Returns

`Promise`\<`CLIENT`\>

The raw client.

---

##### getResponseText

▸ **getResponseText**(`response`): `Promise`\<`undefined` \| `string`\>

Get the text from the response object

###### Parameters

| Name       | Type       | Description         |
| :--------- | :--------- | :------------------ |
| `response` | `RESPONSE` | the response object |

###### Returns

`Promise`\<`undefined` \| `string`\>

---

##### isServerError

▸ **isServerError**(`error`): `boolean`

Check if the error is a server error.

###### Parameters

| Name    | Type  | Description      |
| :------ | :---- | :--------------- |
| `error` | `any` | any error object |

###### Returns

`boolean`

true if the error is a server error, false otherwise.

---

##### isThrottlingError

▸ **isThrottlingError**(`error`): `boolean`

Check if the error is a throttling error.

###### Parameters

| Name    | Type  | Description      |
| :------ | :---- | :--------------- |
| `error` | `any` | any error object |

###### Returns

`boolean`

true if the error is a throttling error, false otherwise.

<a name="interfacestypeschatapioptionsmd"></a>

### Interface: ChatApiOptions\<CS, CO\>

[types](#modulestypesmd).ChatApiOptions

#### Type parameters

| Name |
| :--- |
| `CS` |
| `CO` |

#### Properties

| Property                                                                                                                | Description                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---- | ---- | ---- | ------- | ------- | ---- | ----- | -------- | --- |
| `Optional` **clientSettings**: `CS`                                                                                     |                                                                                                                            |
| `Optional` **completionOptions**: [`AdditionalCompletionOptions`](#interfacestypesadditionalcompletionoptionsmd) & `CO` |                                                                                                                            |
| **credential**: `Object`                                                                                                | Type declaration<br><br>                                                                                                   | Name | Type | <br> | :------ | :------ | <br> | `key` | `string` |     |
| `Optional` **endpoint**: `string`                                                                                       |                                                                                                                            |
| `Optional` **tmpDir**: `string`                                                                                         | Temporary directory for storing temporary files.<br>If not specified, then the temporary directory of the OS will be used. |

<a name="interfacestypesextractvideoframesoptionsmd"></a>

### Interface: ExtractVideoFramesOptions

[types](#modulestypesmd).ExtractVideoFramesOptions

#### Properties

| Property                                                                                                                    | Description                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Optional` **deleteFilesWhenConversationEnds**: `boolean`                                                                   | Whether files should be deleted when the conversation ends.                                                                                                                                                                             |
| `Optional` **extractor**: [`VideoFramesExtractor`](#videoframesextractor)                                                   | Function for extracting frames from the video.<br>If not specified, a default function using ffmpeg will be used.                                                                                                                       |
| `Optional` **format**: `string`                                                                                             | Image format of the extracted frames.<br>Default value is 'jpg'.                                                                                                                                                                        |
| `Optional` **framesDirectoryResolver**: (`inputFile`: `string`, `tmpDir`: `string`, `conversationId`: `string`) => `string` | Function for determining the directory location for storing extracted frames.<br>If not specified, a default function will be used.<br>The function takes three arguments:                                                              |
| `Optional` **height**: `number`                                                                                             | Video frame height, default is undefined which means the scaling<br>will be determined by the videoFrameWidth option.<br>If both videoFrameWidth and videoFrameHeight are not specified,<br>then the frames will not be resized/scaled. |
| `Optional` **interval**: `number`                                                                                           | Intervals between frames to be extracted. The unit is second.<br>Default value is 5.                                                                                                                                                    |
| `Optional` **limit**: `number`                                                                                              | Maximum number of frames to be extracted.<br>Default value is 10 which is the current per-request limitation of ChatGPT Vision.                                                                                                         |
| `Optional` **width**: `number`                                                                                              | Video frame width, default is 200.<br>If both videoFrameWidth and videoFrameHeight are not specified,<br>then the frames will not be resized/scaled.                                                                                    |

<a name="interfacestypesstorageoptionsmd"></a>

### Interface: StorageOptions

[types](#modulestypesmd).StorageOptions

#### Properties

| Property                                                           | Description                                                                                   |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `Optional` **azureStorageConnectionString**: `string`              |                                                                                               |
| `Optional` **deleteFilesWhenConversationEnds**: `boolean`          | Whether files should be deleted when the conversation ends.                                   |
| `Optional` **downloadUrlExpirationSeconds**: `number`              | Expiration time for the download URL of the frame images in seconds. Default is 3600 seconds. |
| `Optional` **storageContainerName**: `string`                      | Storage container for storing frame images of the video.                                      |
| `Optional` **storagePathPrefix**: `string`                         | Path prefix to be prepended for storing frame images of the video.<br>Default is empty.       |
| `Optional` **uploader**: [`FileBatchUploader`](#filebatchuploader) | Function for uploading files                                                                  |

<a name="interfacestypesvideoretrievalindexoptionsmd"></a>

### Interface: VideoRetrievalIndexOptions

[types](#modulestypesmd).VideoRetrievalIndexOptions

#### Properties

| Property                                                     | Description |
| ------------------------------------------------------------ | ----------- |
| **apiKey**: `string`                                         |             |
| `Optional` **createIndexIfNotExists**: `boolean`             |             |
| `Optional` **deleteDocumentWhenConversationEnds**: `boolean` |             |
| `Optional` **deleteIndexWhenConversationEnds**: `boolean`    |             |
| **endpoint**: `string`                                       |             |
| `Optional` **indexName**: `string`                           | ## Modules  |

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

<a name="modulesazure_client_hackmd"></a>

### Module: azure/client-hack

#### Functions

##### fixClient

▸ **fixClient**(`openAIClient`): `void`

###### Parameters

| Name           | Type  |
| :------------- | :---- |
| `openAIClient` | `any` |

###### Returns

`void`

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

#### Type Aliases

##### ChatAboutVideoWith

Ƭ **ChatAboutVideoWith**\<`T`\>: [`ChatAboutVideo`](#classeschatchataboutvideomd)\<[`ClientOfChatApi`](#clientofchatapi)\<`T`\>, [`OptionsOfChatApi`](#optionsofchatapi)\<`T`\>, [`PromptOfChatApi`](#promptofchatapi)\<`T`\>, [`ResponseOfChatApi`](#responseofchatapi)\<`T`\>\>

###### Type parameters

| Name |
| :--- |
| `T`  |

---

##### ChatAboutVideoWithChatGpt

Ƭ **ChatAboutVideoWithChatGpt**: [`ChatAboutVideoWith`](#chataboutvideowith)\<[`ChatGptApi`](#classeschat_gptchatgptapimd)\>

---

##### ChatAboutVideoWithGemini

Ƭ **ChatAboutVideoWithGemini**: [`ChatAboutVideoWith`](#chataboutvideowith)\<[`GeminiApi`](#classesgeminigeminiapimd)\>

---

##### ConversationWith

Ƭ **ConversationWith**\<`T`\>: [`Conversation`](#classeschatconversationmd)\<[`ClientOfChatApi`](#clientofchatapi)\<`T`\>, [`OptionsOfChatApi`](#optionsofchatapi)\<`T`\>, [`PromptOfChatApi`](#promptofchatapi)\<`T`\>, [`ResponseOfChatApi`](#responseofchatapi)\<`T`\>\>

###### Type parameters

| Name |
| :--- |
| `T`  |

---

##### ConversationWithChatGpt

Ƭ **ConversationWithChatGpt**: [`ConversationWith`](#conversationwith)\<[`ChatGptApi`](#classeschat_gptchatgptapimd)\>

---

##### ConversationWithGemini

Ƭ **ConversationWithGemini**: [`ConversationWith`](#conversationwith)\<[`GeminiApi`](#classesgeminigeminiapimd)\>

---

##### SupportedChatApiOptions

Ƭ **SupportedChatApiOptions**: [`ChatGptOptions`](#chatgptoptions) \| [`GeminiOptions`](#geminioptions)

<a name="moduleschat_gptmd"></a>

### Module: chat-gpt

#### Classes

- [ChatGptApi](#classeschat_gptchatgptapimd)

#### Type Aliases

##### ChatGptClient

Ƭ **ChatGptClient**: `OpenAIClient`

---

##### ChatGptCompletionOptions

Ƭ **ChatGptCompletionOptions**: \{ `deploymentName`: `string` } & [`AdditionalCompletionOptions`](#interfacestypesadditionalcompletionoptionsmd) & `Parameters`\<`OpenAIClient`[``"getChatCompletions"``]\>[``2``]

---

##### ChatGptOptions

Ƭ **ChatGptOptions**: \{ `extractVideoFrames?`: [`ExtractVideoFramesOptions`](#interfacestypesextractvideoframesoptionsmd) ; `storage`: [`StorageOptions`](#interfacestypesstorageoptionsmd) ; `videoRetrievalIndex?`: [`VideoRetrievalIndexOptions`](#interfacestypesvideoretrievalindexoptionsmd) } & [`ChatApiOptions`](#interfacestypeschatapioptionsmd)\<`OpenAIClientOptions`, [`ChatGptCompletionOptions`](#chatgptcompletionoptions)\>

---

##### ChatGptPrompt

Ƭ **ChatGptPrompt**: `Parameters`\<`OpenAIClient`[``"getChatCompletions"``]\>[``1``]

---

##### ChatGptResponse

Ƭ **ChatGptResponse**: `ChatCompletions`

<a name="modulesgeminimd"></a>

### Module: gemini

#### Classes

- [GeminiApi](#classesgeminigeminiapimd)

#### Type Aliases

##### GeminiClient

Ƭ **GeminiClient**: `GenerativeModel`

---

##### GeminiClientOptions

Ƭ **GeminiClientOptions**: `Object`

###### Type declaration

| Name              | Type             |
| :---------------- | :--------------- |
| `modelParams`     | `ModelParams`    |
| `requestOptions?` | `RequestOptions` |

---

##### GeminiCompletionOptions

Ƭ **GeminiCompletionOptions**: [`AdditionalCompletionOptions`](#interfacestypesadditionalcompletionoptionsmd) & `Omit`\<`GenerateContentRequest`, `"contents"`\>

---

##### GeminiOptions

Ƭ **GeminiOptions**: \{ `clientSettings`: [`GeminiClientOptions`](#geminiclientoptions) ; `extractVideoFrames`: [`ExtractVideoFramesOptions`](#interfacestypesextractvideoframesoptionsmd) } & [`ChatApiOptions`](#interfacestypeschatapioptionsmd)\<[`GeminiClientOptions`](#geminiclientoptions), [`GeminiCompletionOptions`](#geminicompletionoptions)\>

---

##### GeminiPrompt

Ƭ **GeminiPrompt**: `GenerateContentRequest`[``"contents"``]

---

##### GeminiResponse

Ƭ **GeminiResponse**: `GenerateContentResult`

<a name="modulesindexmd"></a>

### Module: index

#### References

##### AdditionalCompletionOptions

Re-exports [AdditionalCompletionOptions](#interfacestypesadditionalcompletionoptionsmd)

---

##### BuildPromptOutput

Re-exports [BuildPromptOutput](#interfacestypesbuildpromptoutputmd)

---

##### ChatAboutVideo

Re-exports [ChatAboutVideo](#classeschatchataboutvideomd)

---

##### ChatAboutVideoWith

Re-exports [ChatAboutVideoWith](#chataboutvideowith)

---

##### ChatAboutVideoWithChatGpt

Re-exports [ChatAboutVideoWithChatGpt](#chataboutvideowithchatgpt)

---

##### ChatAboutVideoWithGemini

Re-exports [ChatAboutVideoWithGemini](#chataboutvideowithgemini)

---

##### ChatApi

Re-exports [ChatApi](#interfacestypeschatapimd)

---

##### ChatApiOptions

Re-exports [ChatApiOptions](#interfacestypeschatapioptionsmd)

---

##### ClientOfChatApi

Re-exports [ClientOfChatApi](#clientofchatapi)

---

##### Conversation

Re-exports [Conversation](#classeschatconversationmd)

---

##### ConversationWith

Re-exports [ConversationWith](#conversationwith)

---

##### ConversationWithChatGpt

Re-exports [ConversationWithChatGpt](#conversationwithchatgpt)

---

##### ConversationWithGemini

Re-exports [ConversationWithGemini](#conversationwithgemini)

---

##### ExtractVideoFramesOptions

Re-exports [ExtractVideoFramesOptions](#interfacestypesextractvideoframesoptionsmd)

---

##### FileBatchUploader

Re-exports [FileBatchUploader](#filebatchuploader)

---

##### OptionsOfChatApi

Re-exports [OptionsOfChatApi](#optionsofchatapi)

---

##### PromptOfChatApi

Re-exports [PromptOfChatApi](#promptofchatapi)

---

##### ResponseOfChatApi

Re-exports [ResponseOfChatApi](#responseofchatapi)

---

##### StorageOptions

Re-exports [StorageOptions](#interfacestypesstorageoptionsmd)

---

##### SupportedChatApiOptions

Re-exports [SupportedChatApiOptions](#supportedchatapioptions)

---

##### VideoFramesExtractor

Re-exports [VideoFramesExtractor](#videoframesextractor)

---

##### VideoRetrievalIndexOptions

Re-exports [VideoRetrievalIndexOptions](#interfacestypesvideoretrievalindexoptionsmd)

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

Ƭ **FileBatchUploader**: (`dir`: `string`, `relativePaths`: `string`[], `containerName`: `string`, `blobPathPrefix`: `string`) => `Promise`\<\{ `cleanup`: () => `Promise`\<`any`\> ; `downloadUrls`: `string`[] }\>

###### Type declaration

▸ (`dir`, `relativePaths`, `containerName`, `blobPathPrefix`): `Promise`\<\{ `cleanup`: () => `Promise`\<`any`\> ; `downloadUrls`: `string`[] }\>

Function that uploads files to the cloud storage.

####### Parameters

| Name             | Type       | Description                                                  |
| :--------------- | :--------- | :----------------------------------------------------------- |
| `dir`            | `string`   | The directory path where the files are located.              |
| `relativePaths`  | `string`[] | An array of relative paths of the files to be uploaded.      |
| `containerName`  | `string`   | The name of the container where the files will be uploaded.  |
| `blobPathPrefix` | `string`   | The prefix for the blob paths (file paths) in the container. |

####### Returns

`Promise`\<\{ `cleanup`: () => `Promise`\<`any`\> ; `downloadUrls`: `string`[] }\>

A Promise that resolves with an object containing an array of download URLs for the uploaded files and a cleanup function to remove the uploaded files from the container.

<a name="modulestypesmd"></a>

### Module: types

#### Interfaces

- [AdditionalCompletionOptions](#interfacestypesadditionalcompletionoptionsmd)
- [BuildPromptOutput](#interfacestypesbuildpromptoutputmd)
- [ChatApi](#interfacestypeschatapimd)
- [ChatApiOptions](#interfacestypeschatapioptionsmd)
- [ExtractVideoFramesOptions](#interfacestypesextractvideoframesoptionsmd)
- [StorageOptions](#interfacestypesstorageoptionsmd)
- [VideoRetrievalIndexOptions](#interfacestypesvideoretrievalindexoptionsmd)

#### Type Aliases

##### ClientOfChatApi

Ƭ **ClientOfChatApi**\<`T`\>: `T` extends [`ChatApi`](#interfacestypeschatapimd)\<infer CLIENT, `any`, `any`, `any`\> ? `CLIENT` : `never`

###### Type parameters

| Name |
| :--- |
| `T`  |

---

##### OptionsOfChatApi

Ƭ **OptionsOfChatApi**\<`T`\>: `T` extends [`ChatApi`](#interfacestypeschatapimd)\<`any`, infer OPTIONS, `any`, `any`\> ? `OPTIONS` : `never`

###### Type parameters

| Name |
| :--- |
| `T`  |

---

##### PromptOfChatApi

Ƭ **PromptOfChatApi**\<`T`\>: `T` extends [`ChatApi`](#interfacestypeschatapimd)\<`any`, `any`, infer PROMPT, `any`\> ? `PROMPT` : `never`

###### Type parameters

| Name |
| :--- |
| `T`  |

---

##### ResponseOfChatApi

Ƭ **ResponseOfChatApi**\<`T`\>: `T` extends [`ChatApi`](#interfacestypeschatapimd)\<`any`, `any`, `any`, infer RESPONSE\> ? `RESPONSE` : `never`

###### Type parameters

| Name |
| :--- |
| `T`  |

<a name="modulesutilsmd"></a>

### Module: utils

#### Functions

##### effectiveExtractVideoFramesOptions

▸ **effectiveExtractVideoFramesOptions**(`options?`): `Pick`\<[`ExtractVideoFramesOptions`](#interfacestypesextractvideoframesoptionsmd), `"height"`\> & `Required`\<`Omit`\<[`ExtractVideoFramesOptions`](#interfacestypesextractvideoframesoptionsmd), `"height"`\>\>

Calculate the effective values for ExtractVideoFramesOptions by combining the default values and the values provided

###### Parameters

| Name       | Type                                                                       | Description                                |
| :--------- | :------------------------------------------------------------------------- | :----------------------------------------- |
| `options?` | [`ExtractVideoFramesOptions`](#interfacestypesextractvideoframesoptionsmd) | the options containing the values provided |

###### Returns

`Pick`\<[`ExtractVideoFramesOptions`](#interfacestypesextractvideoframesoptionsmd), `"height"`\> & `Required`\<`Omit`\<[`ExtractVideoFramesOptions`](#interfacestypesextractvideoframesoptionsmd), `"height"`\>\>

The effective values for ExtractVideoFramesOptions

---

##### effectiveStorageOptions

▸ **effectiveStorageOptions**(`options`): `Required`\<`Pick`\<[`StorageOptions`](#interfacestypesstorageoptionsmd), `"uploader"`\>\> & [`StorageOptions`](#interfacestypesstorageoptionsmd)

Calculate the effective values for StorageOptions by combining the default values and the values provided

###### Parameters

| Name      | Type                                                 | Description                                |
| :-------- | :--------------------------------------------------- | :----------------------------------------- |
| `options` | [`StorageOptions`](#interfacestypesstorageoptionsmd) | the options containing the values provided |

###### Returns

`Required`\<`Pick`\<[`StorageOptions`](#interfacestypesstorageoptionsmd), `"uploader"`\>\> & [`StorageOptions`](#interfacestypesstorageoptionsmd)

The effective values for StorageOptions

---

##### effectiveVideoRetrievalIndexOptions

▸ **effectiveVideoRetrievalIndexOptions**(`options`): `Required`\<`Pick`\<[`VideoRetrievalIndexOptions`](#interfacestypesvideoretrievalindexoptionsmd), `"createIndexIfNotExists"` \| `"deleteDocumentWhenConversationEnds"` \| `"deleteIndexWhenConversationEnds"`\>\> & [`VideoRetrievalIndexOptions`](#interfacestypesvideoretrievalindexoptionsmd)

Calculate the effective values for VideoRetrievalIndexOptions by combining the default values and the values provided

###### Parameters

| Name      | Type                                                                         | Description                                |
| :-------- | :--------------------------------------------------------------------------- | :----------------------------------------- |
| `options` | [`VideoRetrievalIndexOptions`](#interfacestypesvideoretrievalindexoptionsmd) | the options containing the values provided |

###### Returns

`Required`\<`Pick`\<[`VideoRetrievalIndexOptions`](#interfacestypesvideoretrievalindexoptionsmd), `"createIndexIfNotExists"` \| `"deleteDocumentWhenConversationEnds"` \| `"deleteIndexWhenConversationEnds"`\>\> & [`VideoRetrievalIndexOptions`](#interfacestypesvideoretrievalindexoptionsmd)

The effective values for VideoRetrievalIndexOptions

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

▸ **extractVideoFramesWithFfmpeg**(`inputFile`, `outputDir`, `intervalSec`, `format?`, `width?`, `height?`, `startSec?`, `endSec?`, `limit?`): `Promise`\<\{ `cleanup`: () => `Promise`\<`any`\> ; `relativePaths`: `string`[] }\>

Function that extracts frame images from a video file.

###### Parameters

| Name          | Type     | Description                                                       |
| :------------ | :------- | :---------------------------------------------------------------- |
| `inputFile`   | `string` | Path to the input video file.                                     |
| `outputDir`   | `string` | Path to the output directory where frame images will be saved.    |
| `intervalSec` | `number` | Interval in seconds between each frame extraction.                |
| `format?`     | `string` | Format of the output frame images (e.g., 'jpg', 'png').           |
| `width?`      | `number` | Width of the output frame images in pixels.                       |
| `height?`     | `number` | Height of the output frame images in pixels.                      |
| `startSec?`   | `number` | Start time of the video segment to extract in seconds, inclusive. |
| `endSec?`     | `number` | End time of the video segment to extract in seconds, exclusive.   |
| `limit?`      | `number` | Maximum number of frames to extract.                              |

###### Returns

`Promise`\<\{ `cleanup`: () => `Promise`\<`any`\> ; `relativePaths`: `string`[] }\>

An object containing an array of relative paths to the extracted frame images and a cleanup function for deleting those files.

<a name="modulesvideo_typesmd"></a>

### Module: video/types

#### Type Aliases

##### VideoFramesExtractor

Ƭ **VideoFramesExtractor**: (`inputFile`: `string`, `outputDir`: `string`, `intervalSec`: `number`, `format?`: `string`, `width?`: `number`, `height?`: `number`, `startSec?`: `number`, `endSec?`: `number`, `limit?`: `number`) => `Promise`\<\{ `cleanup`: () => `Promise`\<`any`\> ; `relativePaths`: `string`[] }\>

###### Type declaration

▸ (`inputFile`, `outputDir`, `intervalSec`, `format?`, `width?`, `height?`, `startSec?`, `endSec?`, `limit?`): `Promise`\<\{ `cleanup`: () => `Promise`\<`any`\> ; `relativePaths`: `string`[] }\>

Function that extracts frame images from a video file.

####### Parameters

| Name          | Type     | Description                                                       |
| :------------ | :------- | :---------------------------------------------------------------- |
| `inputFile`   | `string` | Path to the input video file.                                     |
| `outputDir`   | `string` | Path to the output directory where frame images will be saved.    |
| `intervalSec` | `number` | Interval in seconds between each frame extraction.                |
| `format?`     | `string` | Format of the output frame images (e.g., 'jpg', 'png').           |
| `width?`      | `number` | Width of the output frame images in pixels.                       |
| `height?`     | `number` | Height of the output frame images in pixels.                      |
| `startSec?`   | `number` | Start time of the video segment to extract in seconds, inclusive. |
| `endSec?`     | `number` | End time of the video segment to extract in seconds, exclusive.   |
| `limit?`      | `number` | Maximum number of frames to extract.                              |

####### Returns

`Promise`\<\{ `cleanup`: () => `Promise`\<`any`\> ; `relativePaths`: `string`[] }\>

An object containing an array of relative paths to the extracted frame images and a cleanup function for deleting those files.

<!-- API end -->
