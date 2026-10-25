import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImageFile } from './imageHelper.js';

test('validateImageFile accepts valid JPEG, PNG, and WebP files under 10MB', () => {
  const mockJpeg = {
    name: 'memory.jpg',
    type: 'image/jpeg',
    size: 2 * 1024 * 1024
  } as File;

  const resultJpeg = validateImageFile(mockJpeg);
  assert.equal(resultJpeg.valid, true);
  assert.equal(resultJpeg.error, undefined);

  const mockPng = {
    name: 'bloom.png',
    type: 'image/png',
    size: 4 * 1024 * 1024
  } as File;

  const resultPng = validateImageFile(mockPng);
  assert.equal(resultPng.valid, true);

  const mockWebp = {
    name: 'flower.webp',
    type: 'image/webp',
    size: 1 * 1024 * 1024
  } as File;

  const resultWebp = validateImageFile(mockWebp);
  assert.equal(resultWebp.valid, true);
});

test('validateImageFile rejects files larger than 10MB', () => {
  const mockHuge = {
    name: 'huge.jpg',
    type: 'image/jpeg',
    size: 11 * 1024 * 1024
  } as File;

  const result = validateImageFile(mockHuge);
  assert.equal(result.valid, false);
  assert.match(result.error || '', /under 10MB/);
});

test('validateImageFile rejects unsupported MIME types', () => {
  const mockPdf = {
    name: 'document.pdf',
    type: 'application/pdf',
    size: 500 * 1024
  } as File;

  const resultPdf = validateImageFile(mockPdf);
  assert.equal(resultPdf.valid, false);
  assert.match(resultPdf.error || '', /valid image file/);

  const mockText = {
    name: 'notes.txt',
    type: 'text/plain',
    size: 1024
  } as File;

  const resultText = validateImageFile(mockText);
  assert.equal(resultText.valid, false);
});

test('validateImageFile handles null or missing file', () => {
  const result = validateImageFile(null as any);
  assert.equal(result.valid, false);
  assert.equal(result.error, 'No file selected.');
});
