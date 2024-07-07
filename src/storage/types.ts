/**
 * Function that uploads files to the cloud storage.
 *
 * @param dir - The directory path where the files are located.
 * @param relativePaths - An array of relative paths of the files to be uploaded.
 * @param containerName - The name of the container where the files will be uploaded.
 * @param blobPathPrefix - The prefix for the blob paths (file paths) in the container.
 * @returns A Promise that resolves with an object containing an array of download URLs for the uploaded files and a cleanup function to remove the uploaded files from the container.
 */
export type FileBatchUploader = (
  dir: string,
  relativePaths: string[],
  containerName: string,
  blobPathPrefix: string,
) => Promise<{
  downloadUrls: string[];
  cleanup: () => Promise<any>;
}>;
