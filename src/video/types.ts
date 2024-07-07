/**
 * Function that extracts frame images from a video file.
 *
 * @param inputFile - Path to the input video file.
 * @param outputDir - Path to the output directory where frame images will be saved.
 * @param intervalSec - Interval in seconds between each frame extraction.
 * @param format - Format of the output frame images (e.g., 'jpg', 'png').
 * @param width - Width of the output frame images in pixels.
 * @param height - Height of the output frame images in pixels.
 * @param startSec - Start time of the video segment to extract in seconds, inclusive.
 * @param endSec - End time of the video segment to extract in seconds, exclusive.
 * @param limit - Maximum number of frames to extract.
 * @returns An object containing an array of relative paths to the extracted frame images and a cleanup function for deleting those files.
 */
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
) => Promise<{
  relativePaths: string[];
  cleanup: () => Promise<any>;
}>;
