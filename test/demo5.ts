// This is a demo that extracts frame images from two video files using ffmpeg and creates a conversation with those two groups of images.
// Video frame images are uploaded to Azure Blob Storage and then made available to GPT from there.
//
// This script can be executed with a command line like this from the project root directory:
// export OPENAI_API_KEY=...
// export AZURE_STORAGE_CONNECTION_STRING=...
// export AZURE_STORAGE_CONTAINER_NAME=...
// export OPENAI_MODEL_NAME=...
// ENABLE_DEBUG=true DEMO_VIDEO_1=~/Downloads/test1.mp4 DEMO_VIDEO_2=~/Downloads/test2.mp4 npx ts-node test/demo5.ts
//

import { consoleWithColour } from '@handy-common-utils/misc-utils';
import chalk from 'chalk';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';

import { ChatAboutVideo, ConversationWithChatGpt } from '../src';
import { extractVideoFramesWithFfmpeg } from '../src/video/ffmpeg';

async function demo() {
  const tmpDir = os.tmpdir();
  const video1 = process.env.DEMO_VIDEO_1!;
  const video2 = process.env.DEMO_VIDEO_2!;
  const outputDir1 = path.join(tmpDir, 'video1-frames');
  const outputDir2 = path.join(tmpDir, 'video2-frames');

  console.log(chalk.green('Extracting frames from the first video...'));
  const { relativePaths: frames1, cleanup: cleanupFrames1 } = await extractVideoFramesWithFfmpeg(video1, outputDir1, 1, 'jpg', 200);

  console.log(chalk.green('Extracting frames from the second video...'));
  const { relativePaths: frames2, cleanup: cleanupFrames2 } = await extractVideoFramesWithFfmpeg(video2, outputDir2, 3, 'jpg', 200);

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
    },
    consoleWithColour({ debug: process.env.ENABLE_DEBUG === 'true' }, chalk),
  );

  const conversation = (await chat.startConversation([
    {
      promptText: 'Frame images from sample 1:',
      images: frames1.map((frame, i) => ({ imageFile: path.join(outputDir1, frame), promptText: `Frame CodeRed-${i + 1}` })),
    },
    {
      promptText: 'Frame images from sample 2, also known as the "good example":',
      images: frames2.map((frame) => ({ imageFile: path.join(outputDir2, frame) })),
    },
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
    console.log(chalk.blue('\nAI: ' + answer));
  }
  console.log('Demo finished');

  rl.close();

  console.log(chalk.green('Cleaning up extracted frames...'));
  await cleanupFrames1();
  await cleanupFrames2();
}

// eslint-disable-next-line unicorn/prefer-top-level-await
demo().catch((error) => console.log(chalk.red(JSON.stringify(error, null, 2))));
