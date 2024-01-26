export type FileBatchUploader = (dir: string, fileNames: string[], containerName: string, blobPathPrefix: string) => Promise<string[]>
