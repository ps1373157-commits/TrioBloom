/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FormattedStorageError {
  code: string;
  userMessage: string;
  isBucketMissing: boolean;
  technicalDetails: string;
}

/**
 * Parses and formats Firebase Storage errors into human-readable, actionable diagnostics
 * while logging exact error codes and messages for developers.
 */
export function parseStorageError(err: any): FormattedStorageError {
  const code = err?.code || (err?.name === 'FirebaseError' ? 'storage/unknown' : 'unknown');
  const rawMessage = err?.message || String(err);
  const serverResponse = err?.serverResponse || '';

  // Diagnostic log for development inspection without triggering unhandled error traps
  console.warn('[TrioBloom Storage Diagnostic]:', {
    code,
    message: rawMessage,
    serverResponse,
    customData: err?.customData
  });

  const isBucketMissing =
    code === 'storage/bucket-not-found' ||
    code === 'storage/project-not-found' ||
    rawMessage.includes('404') ||
    rawMessage.includes('Not Found') ||
    serverResponse.includes('404') ||
    code === 'storage/retry-limit-exceeded';

  let userMessage = 'Failed to upload photo. Please check your internet connection.';

  if (isBucketMissing) {
    userMessage =
      'Firebase Cloud Storage is not activated yet in your Firebase project. To enable photo sharing, open Firebase Console > Build > Storage, and click "Get Started" to initialize your storage bucket.';
  } else if (code === 'storage/unauthorized') {
    userMessage =
      'Permission denied by Storage Rules. Ensure you are signed in as an approved member and storage rules are deployed.';
  } else if (code === 'storage/quota-exceeded') {
    userMessage = 'Firebase Storage daily quota has been exceeded for this project.';
  } else if (code === 'storage/canceled') {
    userMessage = 'Upload was cancelled.';
  } else if (code === 'storage/invalid-format' || code === 'storage/invalid-checksum') {
    userMessage = 'The selected image file format is invalid or corrupted. Please try another image.';
  } else if (rawMessage) {
    userMessage = rawMessage.replace(/^Firebase:\s*/i, '');
  }

  return {
    code,
    userMessage,
    isBucketMissing,
    technicalDetails: `${code}: ${rawMessage}`
  };
}

/**
 * Fast pre-flight check to verify if the Firebase Storage bucket exists.
 * If the bucket returns HTTP 404, throws immediately with 'storage/bucket-not-found'
 * to prevent the Firebase Storage SDK from hanging in a 15-second retry loop.
 */
export async function checkStorageBucketHealth(bucketName?: string): Promise<void> {
  const bucket = bucketName || 'starlit-outpost-kv7sv.firebasestorage.app';
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o`, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.status === 404) {
      const err = new Error(
        'Firebase Cloud Storage is not activated yet in your Firebase project. To enable photo sharing, open Firebase Console > Build > Storage, and click "Get Started" to initialize your storage bucket.'
      );
      (err as any).code = 'storage/bucket-not-found';
      throw err;
    }
  } catch (err: any) {
    if (err?.code === 'storage/bucket-not-found') {
      throw err;
    }
    // If network or abort error occurs, allow the upload to proceed normally
  }
}

