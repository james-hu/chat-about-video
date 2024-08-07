/* eslint-disable max-params */
import { VideoFramesExtractor } from './types';

export * from './ffmpeg';
export * from './types';

export function lazyCreatedVideoFramesExtractor(creator: Promise<VideoFramesExtractor>): VideoFramesExtractor {
  return async (
    inputFile: string,
    outputDir: string,
    intervalSec: number,
    format?: string,
    width?: number,
    height?: number,
    startSec?: number,
    endSec?: number,
    limit?: number,
  ) => {
    const extractor = await creator;
    return extractor(inputFile, outputDir, intervalSec, format, width, height, startSec, endSec, limit);
  };
}
