import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { generatePresignedUrlForDownloading, putS3Object } from '@handy-common-utils/aws-utils/s3';
import { inParallel } from '@handy-common-utils/promise-utils';
import { readFile } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

import { FileBatchUploader } from '../storage/types';

const readFileAsync = promisify(readFile);

export function createAwsS3FileBatchUploader(s3Client: S3Client, expirationSeconds: number, parallelism = 3): FileBatchUploader {
  return async (dir: string, fileNames: string[], s3BucketName: string, s3ObjectPathPrefix: string) => {
    const checkResult = await s3Client.send(new HeadBucketCommand({ Bucket: s3BucketName }));
    if (checkResult.$metadata.httpStatusCode === 404) {
      await s3Client.send(new CreateBucketCommand({ Bucket: s3BucketName }));
    }

    // Upload each file to the container
    const downloadUrls = await inParallel(parallelism, fileNames, async (fileName) => {
      const s3ObjectKey = `${s3ObjectPathPrefix}${fileName}`;

      // Read the file as a buffer
      const fileBuffer = await readFileAsync(path.join(dir, fileName));

      // Upload the buffer to AWS S3
      await putS3Object(s3Client, s3BucketName, s3ObjectKey, fileBuffer);

      return await generatePresignedUrlForDownloading(s3Client, s3BucketName, s3ObjectKey, expirationSeconds);
    }, { abortOnError: true });

    return downloadUrls;
  };
}