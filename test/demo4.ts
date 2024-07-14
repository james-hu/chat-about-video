// This is a demo utilising Google Gemini through Google Vertex AI API.
// Google Gemini allows more than 10 (maximum allowed by Azure's OpenAI API) frame images to be supplied.
// Video frame images are sent through Google Vertex AI API directly.
//
// This script can be executed with a command line like this from the project root directory:
// export GEMINI_API_KEY=...
// ENABLE_DEBUG=true DEMO_VIDEO=~/Downloads/test1.mp4 npx ts-node test/demo4.ts

import { consoleWithColour } from '@handy-common-utils/misc-utils';
/* eslint-disable node/no-unpublished-import */
import chalk from 'chalk';
import readline from 'node:readline';
// eslint-disable-next-line unicorn/prefer-module
// const whyIsNodeRunning = require('why-is-node-running');

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
  // whyIsNodeRunning();
}

// eslint-disable-next-line unicorn/prefer-top-level-await
demo().catch((error) => console.log(chalk.red(JSON.stringify(error, null, 2))));
