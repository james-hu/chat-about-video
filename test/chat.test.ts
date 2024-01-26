import { describe, it } from '@jest/globals';
import readline from 'node:readline';

import { ChatAboutVideo } from '../src';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const prompt = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));


describe('ChatAboutVideo', () => {
  describe('End-to-end demo', () => {
    it('demo', async () => {
      const chat = new ChatAboutVideo({
        openAiEndpoint: 'https://james-ai-experiments.openai.azure.com/',
        openAiApiKey: process.env.AZURE_OPENAI_API_KEY!,
        azureStorageConnectionString: process.env.AZURE_STORAGE_CONNECTION_STRING!,
        openAiDeploymentName: 'vision-experiment',
        storageContainerName: 'vision-experiment-input',
        storagePathPrefix: 'video-frames/',
      });
      const conversation = await chat.startConversation(process.env.DEMO_VIDEO!);

      while(true) {
        const question = await prompt('\nUser: ');
        if (!question) {
          continue;
        }
        const answer = await conversation.say(question);
        console.log('\nAI:', answer);
      }
    }, 3600);
  });
});
