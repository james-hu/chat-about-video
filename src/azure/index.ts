import { BlobSASPermissions, BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { withConcurrency } from '@handy-common-utils/promise-utils';
import { readFile } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { FileBatchUploader } from '../storage/types';

export * from './video-retrieval-api-client';

const readFileAsync = promisify(readFile);

async function generateDownloadUrl(blockBlobClient: BlockBlobClient, expirationSeconds: number): Promise<string> {
  const url = await blockBlobClient.generateSasUrl({
    expiresOn: new Date(Date.now() + expirationSeconds * 1000),
    permissions: BlobSASPermissions.parse('r'),
  });
  return url;
}

export function createAzureBlobStorageFileBatchUploader(blobServiceClient: BlobServiceClient, expirationSeconds: number, parallelism = 3): FileBatchUploader {
  return async (dir: string, fileNames: string[], containerName: string, blobPathPrefix: string) => {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    if (!(await containerClient.exists())) {
      await containerClient.create();
    }

    // Upload each file to the container
    const downloadUrls = await withConcurrency(parallelism, fileNames, async (fileName) => {
      const blobName = `${blobPathPrefix}${fileName}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Read the file as a buffer
      const fileBuffer = await readFileAsync(path.join(dir, fileName));

      // Upload the buffer to Azure Blob Storage
      await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
        blobHTTPHeaders: { blobContentType: 'application/octet-stream' },
      });

      return generateDownloadUrl(blockBlobClient, expirationSeconds);
    });

    return downloadUrls;
  };
}