// This is a demo utilising ChatGPT hosted in Azure.
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
/* eslint-disable node/no-unpublished-import */
import chalk from 'chalk';
import readline from 'node:readline';
// eslint-disable-next-line unicorn/prefer-module
// const whyIsNodeRunning = require('why-is-node-running');

import { ChatAboutVideo, ConversationWithChatGpt } from '../src';

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
      clientSettings: {
        // deployment is required by Azure
        deployment: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt4vision',
        // apiVersion is required by Azure
        apiVersion: '2024-10-21',
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
    const answer = await conversation.say(question, { max_tokens: 2000 });
    console.log(chalk.blue('\nAI:' + answer));
  }
  console.log('Demo finished');
  rl.close();
}

// eslint-disable-next-line unicorn/prefer-top-level-await
demo().catch((error) => console.log(chalk.red(JSON.stringify(error, null, 2))));
