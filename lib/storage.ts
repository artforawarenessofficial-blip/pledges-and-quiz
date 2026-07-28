import { Storage, type Bucket } from '@google-cloud/storage';

let cachedBucket: Bucket | null = null;

/**
 * Lazily creates the GCS bucket handle on first use.
 *
 * Instantiating at module load throws "A bucket name is needed" during
 * `next build` (page-data collection) and at cold start before env vars are
 * wired. Deferring to call time keeps the module import side-effect free.
 */
function getBucket(): Bucket {
  if (cachedBucket) return cachedBucket;

  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('GCS_BUCKET_NAME is not set');
  }

  const storage = new Storage({
    projectId: process.env.GCS_PROJECT_ID,
    credentials: JSON.parse(process.env.GCS_CREDENTIALS || '{}'),
  });

  cachedBucket = storage.bucket(bucketName);
  return cachedBucket;
}

/**
 * Uploads a file buffer to GCS and returns its public URL.
 * The bucket is expected to serve objects publicly (or via uniform access +
 * public IAM); we do not set per-object ACLs so it works with uniform
 * bucket-level access.
 */
export async function uploadFile(file: Buffer, filename: string, contentType: string): Promise<string> {
  const bucket = getBucket();
  await bucket.file(filename).save(file, { contentType });
  return `https://storage.googleapis.com/${bucket.name}/${filename}`;
}

export async function deleteFile(filename: string): Promise<void> {
  await getBucket().file(filename).delete({ ignoreNotFound: true });
}
