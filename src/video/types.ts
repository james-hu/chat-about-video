export type VideoFramesExtractor = (
  inputFile: string,
  outputDir: string,
  intervalSec: number,
  format?: string,
  width?: number,
  height?: number,
  startSec?: number,
  endSec?: number,
  limit?: number,
) => Promise<string[]>;
