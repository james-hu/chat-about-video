import { FileBatchUploader } from './types';

export * from './types';

export function lazyCreatedFileBatchUploader(creator: Promise<FileBatchUploader>): FileBatchUploader {
  return async (dir: string, fileNames: string[], containerName: string, blobPathPrefix: string) => {
    const uploader = await creator;
    return uploader(dir, fileNames, containerName, blobPathPrefix);
  };
}