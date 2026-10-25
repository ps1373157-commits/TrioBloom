import test from 'node:test';
import assert from 'node:assert/strict';
import { parseStorageError } from './storageErrorHelper.js';

test('parseStorageError identifies bucket-not-found error', () => {
  const err = {
    code: 'storage/bucket-not-found',
    message: 'Firebase: Error (storage/bucket-not-found).'
  };
  const parsed = parseStorageError(err);
  assert.equal(parsed.isBucketMissing, true);
  assert.match(parsed.userMessage, /Firebase Console/);
});

test('parseStorageError identifies 404 Not Found error', () => {
  const err = {
    code: 'storage/unknown',
    message: 'Firebase: Error (storage/unknown). 404 Not Found.'
  };
  const parsed = parseStorageError(err);
  assert.equal(parsed.isBucketMissing, true);
  assert.match(parsed.userMessage, /Get Started/);
});

test('parseStorageError identifies retry-limit-exceeded caused by unreachable bucket', () => {
  const err = {
    code: 'storage/retry-limit-exceeded',
    message: 'Max retry time exceeded'
  };
  const parsed = parseStorageError(err);
  assert.equal(parsed.isBucketMissing, true);
});

test('parseStorageError identifies unauthorized storage permission error', () => {
  const err = {
    code: 'storage/unauthorized',
    message: 'User does not have permission'
  };
  const parsed = parseStorageError(err);
  assert.equal(parsed.isBucketMissing, false);
  assert.match(parsed.userMessage, /Permission denied/);
});

test('parseStorageError handles cancellation gracefully', () => {
  const err = {
    code: 'storage/canceled',
    message: 'Upload was canceled'
  };
  const parsed = parseStorageError(err);
  assert.equal(parsed.isBucketMissing, false);
  assert.equal(parsed.userMessage, 'Upload was cancelled.');
});

test('checkStorageBucketHealth detects uninitialized bucket', async () => {
  const { checkStorageBucketHealth } = await import('./storageErrorHelper.js');
  await assert.rejects(
    async () => {
      await checkStorageBucketHealth('starlit-outpost-kv7sv.firebasestorage.app');
    },
    (err: any) => {
      assert.equal(err.code, 'storage/bucket-not-found');
      assert.match(err.message, /Firebase Cloud Storage is not activated/);
      return true;
    }
  );
});
