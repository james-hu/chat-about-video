import path from 'node:path';

import type { ExtractVideoFramesOptions, StorageOptions, VideoRetrievalIndexOptions } from './types';

import { lazyCreatedFileBatchUploader } from './storage';
import { extractVideoFramesWithFfmpeg } from './video';

/**
 * Calculate the effective values for ExtractVideoFramesOptions by combining the default values and the values provided
 * @param options the options containing the values provided
 * @returns The effective values for ExtractVideoFramesOptions
 */
export function effectiveExtractVideoFramesOptions(
  options?: ExtractVideoFramesOptions,
): Pick<ExtractVideoFramesOptions, 'height'> & Required<Omit<ExtractVideoFramesOptions, 'height'>> {
  return {
    extractor: extractVideoFramesWithFfmpeg,
    framesDirectoryResolver: (_inputFile, tmpDir, conversationId) => path.join(tmpDir, conversationId),
    format: 'jpg',
    interval: 5,
    limit: 10,
    width: 200,
    deleteFilesWhenConversationEnds: true,
    ...options,
  };
}

/**
 * Calculate the effective values for StorageOptions by combining the default values and the values provided
 * @param options the options containing the values provided
 * @returns The effective values for StorageOptions
 */
export function effectiveStorageOptions(options: StorageOptions): Required<Pick<StorageOptions, 'uploader'>> & StorageOptions {
  let uploader = options.uploader;
  const downloadUrlExpirationSeconds = options.downloadUrlExpirationSeconds ?? 3600;
  if (!uploader) {
    // eslint-disable-next-line unicorn/prefer-ternary
    if (options.azureStorageConnectionString) {
      // use Azure
      uploader = lazyCreatedFileBatchUploader(
        Promise.all([import('./azure'), import('@azure/storage-blob')]).then(([azure, storageBlob]) =>
          azure.createAzureBlobStorageFileBatchUploader(
            storageBlob.BlobServiceClient.fromConnectionString(options.azureStorageConnectionString!),
            downloadUrlExpirationSeconds,
          ),
        ),
      );
    } else {
      // use AWS
      uploader = lazyCreatedFileBatchUploader(
        Promise.all([import('./aws'), import('@aws-sdk/client-s3')]).then(([aws, clientS3]) =>
          aws.createAwsS3FileBatchUploader(new clientS3.S3Client(), downloadUrlExpirationSeconds),
        ),
      );
    }
  }

  return {
    uploader,
    storagePathPrefix: '',
    deleteFilesWhenConversationEnds: true,
    ...options,
  };
}

/**
 * Calculate the effective values for VideoRetrievalIndexOptions by combining the default values and the values provided
 * @param options the options containing the values provided
 * @returns The effective values for VideoRetrievalIndexOptions
 */
export function effectiveVideoRetrievalIndexOptions(
  options: VideoRetrievalIndexOptions,
): Required<Pick<VideoRetrievalIndexOptions, 'createIndexIfNotExists' | 'deleteDocumentWhenConversationEnds' | 'deleteIndexWhenConversationEnds'>> &
  VideoRetrievalIndexOptions {
  return {
    createIndexIfNotExists: true,
    deleteIndexWhenConversationEnds: true,
    deleteDocumentWhenConversationEnds: true,
    ...options,
  };
}
