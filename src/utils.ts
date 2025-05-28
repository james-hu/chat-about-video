import path from 'node:path';

import type { EffectiveExtractVideoFramesOptions, ExtractVideoFramesOptions, StorageOptions } from './types';

import { lazyCreatedFileBatchUploader } from './storage';
import { extractVideoFramesWithFfmpeg } from './video';

/**
 * Calculate the effective values for ExtractVideoFramesOptions by combining the default values and the values provided
 * @param options the options containing the values provided
 * @returns The effective values for ExtractVideoFramesOptions
 */
export function effectiveExtractVideoFramesOptions(options?: ExtractVideoFramesOptions): EffectiveExtractVideoFramesOptions {
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
 * Find the common parent path of the given paths.
 * If there is no common parent path, then the root path of the current process will be returned.
 * @param paths Input paths to find the common parent path for. It can be absolute or relative paths.
 * @returns The common parent path and the relative paths from the common parent.
 */
export function findCommonParentPath(paths: string[]): {
  commonParent: string;
  relativePaths: string[];
} {
  const rootPath = path.parse(process.cwd()).root;

  if (paths.length === 0) {
    return { commonParent: rootPath, relativePaths: [] };
  }

  // Handles both absolute and relative input
  const absolutePaths = paths.map((p) => path.resolve(p));

  const splitPaths = absolutePaths.map((p) => path.parse(p).dir.split(path.sep));
  const commonParts: string[] = [];

  for (let i = 0; ; i++) {
    const currentPart = splitPaths[0][i];
    if (currentPart === undefined) break;

    if (splitPaths.every((parts) => parts[i] === currentPart)) {
      commonParts.push(currentPart);
    } else {
      break;
    }
  }

  const commonParent = commonParts.length > 0 ? commonParts.join(path.sep) || rootPath : rootPath;

  const relativePaths = absolutePaths.map((p) => path.relative(commonParent, p));

  return { commonParent, relativePaths };
}
