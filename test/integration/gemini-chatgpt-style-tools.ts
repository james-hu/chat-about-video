// This is a test verifying that ChatGPT style tool calling works with Gemini.
//
// This script can be executed with a command line like this from the project root directory:
// export GEMINI_API_KEY=...
// ENABLE_DEBUG=true DEMO_VIDEO=~/Downloads/test1.mp4 npx ts-node test/integration/gemini-chatgpt-style-tools.ts

import { consoleWithColour } from '@handy-common-utils/misc-utils';
/* eslint-disable node/no-unpublished-import */
import chalk from 'chalk';
import readline from 'node:readline';

import { ChatAboutVideo, ConversationWithGemini, ToolCallResult } from '../../src';

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

  const conversation = (await chat.startConversation(process.env.DEMO_VIDEO!)) as ConversationWithGemini;

  // ChatGPT style tools
  const tools: any[] = [
    {
      type: 'function',
      function: {
        name: 'get_weather_forecast',
        description: 'Get the current weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The city and state, e.g. San Francisco, CA',
            },
          },
          required: ['location'],
        },
      },
    },
  ];

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(chalk.cyan('Testing ChatGPT style tools with Gemini...'));

  const question = 'What is the weather in San Francisco?';
  console.log(chalk.red('\nUser: ') + question);

  let response = await conversation.say(question, {
    tools,
  });

  if (typeof response !== 'string' && response?.toolCalls) {
    const toolResults: ToolCallResult[] = [];
    for (const call of response.toolCalls) {
      console.log(chalk.yellow(`AI requests tool: ${call.name}(${JSON.stringify(call.arguments)})`));

      const result = call.name === 'get_weather_forecast' ? { forecast: 'Sunny', temperature: '25C' } : { error: 'Unknown tool' };

      toolResults.push({
        name: call.name,
        result,
      });
    }
    response = await conversation.submitToolCallResults(toolResults);
  }

  console.log(chalk.blue('\nAI: ' + response));

  await conversation.end();
  console.log('Demo finished');
  rl.close();
}

// eslint-disable-next-line unicorn/prefer-top-level-await
demo().catch((error) => console.log(chalk.red(JSON.stringify(error, null, 2))));
