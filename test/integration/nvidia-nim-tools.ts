// This is a demo utilizing NVIDIA NIM via its OpenAI-compatible API.
//
// This script can be executed with a command line like this from the project root directory:
// export NVIDIA_NIM_API_KEY=...
// ENABLE_DEBUG=true npx ts-node test/integration/nvidia-nim-tools.ts

import { consoleWithColour, consoleWithoutColour } from '@handy-common-utils/misc-utils';
/* eslint-disable node/no-unpublished-import */
import chalk from 'chalk';
import readline from 'node:readline';

import { ChatAboutVideo, ConversationWithChatGpt, ToolCallResult } from '../../src';

async function demo() {
  const chat = new ChatAboutVideo(
    {
      endpoint: process.env.NVIDIA_NIM_API_ENDPOINT || 'https://integrate.api.nvidia.com/v1',
      credential: {
        key: process.env.NVIDIA_NIM_API_KEY!,
      },
      completionOptions: {
        model: process.env.NVIDIA_NIM_MODEL || 'qwen/qwen3.5-397b-a17b',
      },
    },
    consoleWithColour({ debug: process.env.ENABLE_DEBUG === 'true' }, chalk),
  );

  const conversation = (await chat.startConversation(consoleWithoutColour({ debug: false, quiet: false }))) as ConversationWithChatGpt;

  const tools: any[] = [
    {
      type: 'function',
      function: {
        name: 'get_current_time',
        description: 'Get the current local time',
        parameters: {
          type: 'object',
          properties: {},
        },
      },
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

    let response = await conversation.say(question, { tools, max_tokens: 2000 });
    while (typeof response !== 'string' && response?.toolCalls) {
      const toolResults: ToolCallResult[] = [];
      for (const call of response.toolCalls) {
        console.log(chalk.yellow(`AI requests tool: ${call.name}(${JSON.stringify(call.arguments)})`));

        const result = call.name === 'get_current_time' ? { currentTime: new Date().toLocaleString() } : { error: 'Unknown tool' };

        toolResults.push({
          name: call.name,
          result,
          toolCallId: call.id,
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
