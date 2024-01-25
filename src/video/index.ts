// Don't import ./ffmpeg because we don't want it to be a dependency of this package


export type VideoFramesExtractor = (inputFile: string, outputDir: string, intervalSec: number, format?: string, width?: number, height?: number, startSec?: number, endSec?: number) => Promise<void>;