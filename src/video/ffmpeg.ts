/* eslint-disable max-params */
import { inParallel } from '@handy-common-utils/promise-utils';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
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

export const extractVideoFramesWithFfmpeg: VideoFramesExtractor = async (
  inputFile,
  outputDir,
  intervalSec,
  format = 'jpg',
  width?,
  height?,
  startSec = 0,
  endSec?,
  limit?,
) => {
  const args1: string[] = ['-y', '-accurate_seek', '-ss'];
  const args2: string[] = [
    '-i',
    inputFile,
    '-frames:v',
    '1',
    ...(width || height ? ['-vf', `scale=${width ?? (height ? '-1' : 'iw')}:${height ?? (width ? '-1' : 'ih')}`] : []),
  ];

  const relativePaths: string[] = [];

  await fs.mkdir(outputDir, { recursive: true });
  for (let i = startSec; (endSec == null || i < endSec) && (limit == null || relativePaths.length <= limit); i += intervalSec) {
    const fileName = `${i.toFixed(3).padStart(10, '0')}.${format}`;
    const { stderr } = await execFileAsync(ffmpegPath, [...args1, `${i}`, ...args2, path.join(outputDir, fileName)]);
    if (stderr && stderr.includes('Output file is empty, nothing was encoded')) {
      break;
    }
    relativePaths.push(fileName);
  }

  return {
    relativePaths,
    // Try to clean up but ignore errors
    cleanup: () => inParallel(5, relativePaths, (relativePath) => fs.unlink(path.join(outputDir, relativePath))),
  };
};
