/* eslint-disable unicorn/prefer-top-level-await */
/* eslint-disable unicorn/catch-error-name */
/* eslint-disable node/no-unpublished-require */
/* eslint-disable node/no-missing-require */
/* eslint-disable unicorn/prefer-module */
const readline = require('node:readline');
const chalk = require('chalk');

const { ChatAboutVideo } = require('../dist/chat');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = (question) => new Promise((resolve) => rl.question(question, resolve));

(async function () {
  const chat = new ChatAboutVideo({
    openAiEndpoint: process.env.AZURE_OPENAI_API_ENDPOINT,
    openAiApiKey: process.env.AZURE_OPENAI_API_KEY,
    azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    openAiDeploymentName: 'gpt4vision',
    storageContainerName: 'vision-experiment-input',
    storagePathPrefix: 'video-frames/',
  });
  const conversation = await chat.startConversation(process.env.DEMO_VIDEO);
  
  while(true) {
    const question = await prompt(chalk.red('\nUser: '));
    if (!question) {
      continue;
    }
    const answer = await conversation.say(question);
    console.log(chalk.blue('\nAI:' + answer));
  }  
})().catch((reason) => console.log(chalk.red(JSON.stringify(reason, null, 2))));
