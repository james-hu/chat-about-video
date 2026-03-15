// This is a demo utilising Google Gemini to analyze audio files.
//
// This script can be executed with a command line like this from the project root directory:
// export GEMINI_API_KEY=...
// npx ts-node test/integration/gemini-audio.ts

import { consoleWithColour } from '@handy-common-utils/misc-utils';
/* eslint-disable node/no-unpublished-import */
import chalk from 'chalk';
import path from 'node:path';
import readline from 'node:readline';

import { ChatAboutVideo, ConversationWithGemini } from '../../src';

// eslint-disable-next-line unicorn/prefer-module
const sampleAudioFile = path.resolve(__dirname, '../sample-media-files/engine-start.mp3');

async function demo() {
  const chat = new ChatAboutVideo(
    {
      credential: {
        key: process.env.GEMINI_API_KEY!,
      },
      clientSettings: {
        modelParams: {
          model: 'gemini-2.5-flash',
        },
      },
    },
    consoleWithColour({ debug: process.env.ENABLE_DEBUG === 'true' }, chalk),
  );

  const conversation = (await chat.startConversation([
    {
      promptText: 'Listen to the following audio:',
      audioFile: sampleAudioFile,
    },
  ])) as ConversationWithGemini;

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const prompt = (question: string) => new Promise<string>((resolve) => rl.question(question, resolve));

  console.log(chalk.green(`\nChatting about audio file: ${sampleAudioFile}`));
  console.log(chalk.grey("Ask questions about the audio (e.g., 'What kind of sound is this?')"));

  while (true) {
    const question = await prompt(chalk.red('\nUser: '));
    if (!question) {
      continue;
    }
    if (['exit', 'quit', 'q', 'end'].includes(question.toLowerCase())) {
      await conversation.end();
      break;
    }
    const answer = await conversation.say(question);
    console.log(chalk.blue('\nAI: ' + answer));
  }
  console.log('Demo finished');
  rl.close();
}

// eslint-disable-next-line unicorn/prefer-top-level-await
demo().catch((error) => console.log(chalk.red(JSON.stringify(error, null, 2))));
