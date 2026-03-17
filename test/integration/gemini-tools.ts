/* eslint-disable unicorn/prefer-module */
// This is a demo utilising Google Gemini tool calling.
// Google Gemini allows many frame images to be supplied because of its huge context length.
//
// This script can be executed with a command line like this from the project root directory:
// export GEMINI_API_KEY=...
// ENABLE_DEBUG=true npx ts-node test/integration/gemini-tools.ts

import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { consoleWithColour } from '@handy-common-utils/misc-utils';
/* eslint-disable node/no-unpublished-import */
import chalk from 'chalk';
import path from 'node:path';
import readline from 'node:readline';

import { ChatAboutVideo, ConversationResponse, ConversationWithGemini, ToolCallResult } from '../../src';

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
      extractVideoFrames: {
        limit: 100,
        interval: 0.5,
      },
      completionOptions: {
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HATE_SPEECH' as any,
            threshold: 'BLOCK_NONE' as any,
          },
        ],
      },
    },
    consoleWithColour({ debug: process.env.ENABLE_DEBUG === 'true' }, chalk),
  );

  const conversation = (await chat.startConversation(
    path.resolve(__dirname, '../sample-media-files/engine-start.h264.aac.mp4'),
  )) as ConversationWithGemini;

  const tools: any[] = [
    {
      functionDeclarations: [
        {
          name: 'get_current_time',
          description: 'Get the current local time',
          parameters: {
            type: 'OBJECT',
            properties: {},
          },
        },
      ],
    },
  ];

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

    let response = await conversation.say<ConversationResponse>(question, {
      tools,
      safetySettings: [{ category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE }],
    });

    while (typeof response !== 'string' && response?.toolCalls) {
      const toolResults: ToolCallResult[] = [];
      for (const call of response.toolCalls) {
        console.log(chalk.yellow(`AI requests tool: ${call.name}(${JSON.stringify(call.arguments)})`));

        const result = call.name === 'get_current_time' ? { currentTime: new Date().toLocaleString() } : { error: 'Unknown tool' };

        toolResults.push({
          name: call.name,
          result,
        });
      }
      response = await conversation.submitToolCallResults(toolResults);
    }

    console.log(chalk.blue('\nAI: ' + response));
  }
  console.log('Demo finished');
  rl.close();
}

// eslint-disable-next-line unicorn/prefer-top-level-await
demo().catch((error) => console.log(chalk.red(JSON.stringify(error, null, 2)), error));
