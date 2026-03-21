import test from 'node:test';
import assert from 'node:assert/strict';
import { getJobDetailExperience } from '../../src/lib/uiText.ts';
import { Role } from '../../src/types.ts';

test('hides unfinished payment and message tabs for students', () => {
  const copy = getJobDetailExperience('VN', Role.STUDENT);

  assert.deepEqual(copy.visibleTabs, ['overview', 'timeline', 'files']);
  assert.equal(copy.showPaymentPanel, false);
  assert.equal(copy.showMessagesPanel, false);
});

test('keeps the same safe job detail tabs for staff until the flows are real', () => {
  const copy = getJobDetailExperience('VN', Role.ADMIN);

  assert.deepEqual(copy.visibleTabs, ['overview', 'timeline', 'files']);
  assert.equal(copy.showPaymentPanel, false);
  assert.equal(copy.showMessagesPanel, false);
});
