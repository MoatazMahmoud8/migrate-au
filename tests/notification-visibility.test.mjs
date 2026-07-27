import assert from 'node:assert/strict';
import test from 'node:test';

import { isNotificationVisible } from '../utils/notificationVisibility.ts';

test('archived notifications are hidden from the app feed', () => {
  assert.equal(isNotificationVisible({ status: 'archived' }), false);
});

test('published and legacy notifications remain visible', () => {
  assert.equal(isNotificationVisible({ status: 'published' }), true);
  assert.equal(isNotificationVisible({}), true);
});