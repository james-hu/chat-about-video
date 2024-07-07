import { BlobSASPermissions, BlobServiceClient, BlockBlobClient } from '@azure/storage-blob';
import { inParallel, withConcurrency } from '@handy-common-utils/promise-utils';
import fs from 'node:fs/promises';
import path from 'node:path';

import { FileBatchUploader } from '../storage/types';

export * from './video-retrieval-api-client';

async function generateDownloadUrl(blockBlobClient: BlockBlobClient, expirationSeconds: number): Promise<string> {
  const url = await blockBlobClient.generateSasUrl({
    expiresOn: new Date(Date.now() + expirationSeconds * 1000),
    permissions: BlobSASPermissions.parse('r'),
  });
  return url;
}

export function createAzureBlobStorageFileBatchUploader(
  blobServiceClient: BlobServiceClient,
  expirationSeconds: number,
  parallelism = 3,
): FileBatchUploader {
  return async (dir: string, relativePaths: string[], containerName: string, blobPathPrefix: string) => {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    if (!(await containerClient.exists())) {
      await containerClient.create();
    }

    const blobNames = relativePaths.map((relativePath) => `${blobPathPrefix}${relativePath}`);

    // Upload each file to the container
    const downloadUrls = await withConcurrency(parallelism, relativePaths, async (fileName, i) => {
      const blobName = blobNames[i];
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Read the file as a buffer
      const fileContent = await fs.readFile(path.join(dir, fileName));

      // Upload the buffer to Azure Blob Storage
      await blockBlobClient.upload(fileContent, fileContent.length, {
        blobHTTPHeaders: { blobContentType: 'application/octet-stream' },
      });

      return generateDownloadUrl(blockBlobClient, expirationSeconds);
    });

    return {
      downloadUrls,
      cleanup: () =>
        inParallel(parallelism, blobNames, async (blobName) => {
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);
          await blockBlobClient.delete();
        }),
    };
  };
}
