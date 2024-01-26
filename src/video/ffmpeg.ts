/* eslint-disable max-params */
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { VideoFramesExtractor } from './types';

const execFileAsync = promisify(execFile);

let ffmpegPath = 'ffmpeg';
try {
  // eslint-disable-next-line unicorn/prefer-module
  const ffmpeg = require('@ffmpeg-installer/ffmpeg');
  ffmpegPath = ffmpeg.path;
} catch {
  // ignore error and expect ffmpeg is on system PATH
}

export const extractVideoFramesWithFfmpeg: VideoFramesExtractor = async (inputFile, outputDir, intervalSec, format = 'jpg', width?, height?, startSec = 0, endSec?) => {
  const args1: string[] = [
    '-y',
    '-accurate_seek',
    '-ss',
  ];
  const args2: string[] = [
    '-i',
    inputFile,
    '-frames:v',
    '1',
    ...(width || height ? ['-vf', `scale=${width ?? 'iw'}:${height ?? 'ih'}`] : []),
  ];

  const result: string[] = [];

  for (let i = startSec; i <= (endSec ?? Number.POSITIVE_INFINITY); i += intervalSec) {
    const fileName = `${String(i).padStart(6, '0')}.${format}`;
    const { stderr } = await execFileAsync(ffmpegPath, [
      ...args1,
      `${i}`,
      ...args2,
      path.join(outputDir, fileName),
    ]);
    if (stderr && stderr.includes('Output file is empty, nothing was encoded')) {
      break;
    }
    result.push(fileName);
  }

  return result;
};
