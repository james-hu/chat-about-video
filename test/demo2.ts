// This is a demo utilising GPT-4o or Vision preview hosted in OpenAI.
// OpenAI API allows more than 10 (maximum allowed by Azure's OpenAI API) images to be supplied.
// Video frame images are uploaded to Azure Blob Storage and then made available to GPT from there.
//
// This demo shows how multiple videos can be used in a single conversation.
//
// This script can be executed with a command line like this from the project root directory:
// export OPENAI_API_KEY=...
// export AZURE_STORAGE_CONNECTION_STRING=...
// export OPENAI_MODEL_NAME=...
// export AZURE_STORAGE_CONTAINER_NAME=...
// ENABLE_DEBUG=true DEMO_VIDEO_1=~/Downloads/test1.mp4 DEMO_VIDEO_2=~/Downloads/test2.mp4 npx ts-node test/demo2.ts
//

import { consoleWithColour } from '@handy-common-utils/misc-utils';
import chalk from 'chalk';
import readline from 'node:readline';

import { ChatAboutVideo, ConversationWithChatGpt } from '../src';

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
        model: process.env.OPENAI_MODEL_NAME || 'gpt-4o',
      },
      extractVideoFrames: {
        limit: 100,
        interval: 2,
      },
    },
    consoleWithColour({ debug: process.env.ENABLE_DEBUG === 'true' }, chalk),
  );

  const conversation = (await chat.startConversation([
    { videoFile: process.env.DEMO_VIDEO_1!, prompt: 'This is the first video:' },
    { videoFile: process.env.DEMO_VIDEO_2!, prompt: 'This is the second video:' },
    { videoFile: process.env.DEMO_VIDEO_1!, prompt: 'This is the third video:' },
  ])) as ConversationWithChatGpt;

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
    const answer = await conversation.say(question, { max_tokens: 2000 });
    console.log(chalk.blue('\nAI:' + answer));
  }
  console.log('Demo finished');
  rl.close();
}

// eslint-disable-next-line unicorn/prefer-top-level-await
demo().catch((error) => console.log(chalk.red(JSON.stringify(error, null, 2))));
