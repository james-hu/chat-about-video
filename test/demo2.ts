// This script can be executed with a command line like this from the project root directory:
// export AZURE_OPENAI_API_ENDPOINT=..
// export AZURE_OPENAI_API_KEY=...
// export AZURE_STORAGE_CONNECTION_STRING=...
// export AZURE_CV_API_KEY=...
// export AZURE_OPENAI_DEPLOYMENT_NAME=...
// export AZURE_STORAGE_CONTAINER_NAME=...
// ENABLE_DEBUG=true DEMO_VIDEO=~/Downloads/test1.mp4 npx ts-node test/demo2.ts
//

import { consoleWithColour } from '@handy-common-utils/misc-utils';
/* eslint-disable node/no-unpublished-import */
import chalk from 'chalk';
import readline from 'node:readline';

import { ChatAboutVideo } from '../src';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));

async function demo() {
  const chat = new ChatAboutVideo({
    openAiEndpoint: process.env.AZURE_OPENAI_API_ENDPOINT!,
    openAiApiKey: process.env.AZURE_OPENAI_API_KEY!,
    azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
    openAiDeploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt4vision',
    storageContainerName: process.env.AZURE_STORAGE_CONTAINER_NAME || 'vision-experiment-input',
    storagePathPrefix: 'video-frames/',
    videoRetrievalIndex: {
      endpoint: process.env.AZURE_CV_API_ENDPOINT!,
      apiKey: process.env.AZURE_CV_API_KEY!,
      createIndexIfNotExists: true,
      deleteIndexWhenConversationEnds: true,
    },
  }, consoleWithColour({ debug: process.env.ENABLE_DEBUG === 'true' }, chalk));

  const conversation = await chat.startConversation(process.env.DEMO_VIDEO!);
  
  while(true) {
    const question = await prompt(chalk.red('\nUser: '));
    if (!question) {
      continue;
    }
    const answer = await conversation.say(question, { maxTokens: 2000 });
    console.log(chalk.blue('\nAI:' + answer));
  }
}

// eslint-disable-next-line unicorn/prefer-top-level-await
demo().catch((error) => console.log(chalk.red(JSON.stringify(error, null, 2)), (error as Error).stack));
