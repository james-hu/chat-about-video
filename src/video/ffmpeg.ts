/* eslint-disable max-params */
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

import { VideoFramesExtractor } from './index';

const execute = promisify(execFile);

export const extractVideoFrames: VideoFramesExtractor = async (inputFile, outputDir, intervalSec, format = 'jpg', width?, height?, startSec = 0, endSec?) => {
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

  for (let i = startSec; i <= (endSec ?? Number.POSITIVE_INFINITY); i += intervalSec) {
    const { stderr } = await execute(ffmpeg.path, [
      ...args1,
      `${i}`,
      ...args2,
      path.join(outputDir, `${String(i).padStart(6, '0')}.${format}`),
    ]);
    if (stderr && stderr.includes('Output file is empty, nothing was encoded')) {
      break;
    }
  }
};
