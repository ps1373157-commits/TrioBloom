import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getPrivateConversationId,
  calculateQuizScore,
  getQuizPersona,
  isUserApproved,
  filterPostsBySticker,
  QUIZ_QUESTIONS
} from './friendship.js';

test('getPrivateConversationId produces deterministic sorted key', () => {
  const id1 = getPrivateConversationId('alice', 'bob');
  const id2 = getPrivateConversationId('bob', 'alice');
  assert.equal(id1, 'private_alice_bob');
  assert.equal(id1, id2);

  const id3 = getPrivateConversationId('priya_123', 'palak_456');
  const id4 = getPrivateConversationId('palak_456', 'priya_123');
  assert.equal(id3, id4);
  assert.equal(id3, 'private_palak_456_priya_123');
});

test('calculateQuizScore computes correct score and persona', () => {
  // All correct answers
  const correctAnswers = QUIZ_QUESTIONS.map(q => q.correctIndex);
  const result = calculateQuizScore(correctAnswers);
  assert.equal(result.score, 5);
  assert.equal(result.total, 5);
  assert.equal(result.percentage, 100);
  assert.equal(result.persona.title, 'Soulmate Petal 🌸');

  // 3 out of 5
  const partial = [0, 3, 1, 999, 999];
  const partialResult = calculateQuizScore(partial);
  assert.equal(partialResult.score, 3);
  assert.equal(partialResult.percentage, 60);
  assert.equal(partialResult.persona.title, 'Sunlit Daisy 🌼');
});

test('isUserApproved approves admin email and approved members', () => {
  assert.equal(isUserApproved(null, 'ps1373157@gmail.com'), true);
  assert.equal(isUserApproved({ isApproved: true, role: 'member' }), true);
  assert.equal(isUserApproved({ isApproved: false, role: 'admin' }), true);
  assert.equal(isUserApproved({ isApproved: false, role: 'member' }), false);
  assert.equal(isUserApproved(null, 'stranger@example.com'), false);
});

test('filterPostsBySticker filters correctly', () => {
  const posts = [
    { id: '1', flowerSticker: '🌸 Bloom Moment' },
    { id: '2', flowerSticker: '🦋 Core Memory' },
    { id: '3', flowerSticker: '🌸 Bloom Moment' }
  ];

  const all = filterPostsBySticker(posts, 'all');
  assert.equal(all.length, 3);

  const bloom = filterPostsBySticker(posts, '🌸 Bloom Moment');
  assert.equal(bloom.length, 2);
  assert.equal(bloom[0].id, '1');
  assert.equal(bloom[1].id, '3');
});
