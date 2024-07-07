import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { deleteS3Object, generatePresignedUrlForDownloading, putS3Object } from '@handy-common-utils/aws-utils/s3';
import { inParallel, withConcurrency } from '@handy-common-utils/promise-utils';
import fs from 'node:fs/promises';
import path from 'node:path';

import { FileBatchUploader } from '../storage/types';

export function createAwsS3FileBatchUploader(s3Client: S3Client, expirationSeconds: number, parallelism = 3): FileBatchUploader {
  return async (dir: string, fileNames: string[], s3BucketName: string, s3ObjectPathPrefix: string) => {
    const checkResult = await s3Client.send(new HeadBucketCommand({ Bucket: s3BucketName }));
    if (checkResult.$metadata.httpStatusCode === 404) {
      await s3Client.send(new CreateBucketCommand({ Bucket: s3BucketName }));
    }

    const s3ObjectKeys = fileNames.map((fileName) => `${s3ObjectPathPrefix}${fileName}`);

    // Upload each file to the container
    const downloadUrls = await withConcurrency(parallelism, fileNames, async (fileName, i) => {
      const s3ObjectKey = s3ObjectKeys[i];

      // Read the file as a buffer
      const fileBuffer = await fs.readFile(path.join(dir, fileName));

      // Upload the buffer to AWS S3
      await putS3Object(s3Client, s3BucketName, s3ObjectKey, fileBuffer);

      return await generatePresignedUrlForDownloading(s3Client, s3BucketName, s3ObjectKey, expirationSeconds);
    });

    return {
      downloadUrls,
      cleanup: () => inParallel(parallelism, s3ObjectKeys, (s3ObjectKey) => deleteS3Object(s3Client, s3BucketName, s3ObjectKey)),
    };
  };
}
