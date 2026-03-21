import test from 'node:test';
import assert from 'node:assert/strict';
import { getSettingsExperienceCopy } from '../../src/lib/uiText.ts';
import { Role } from '../../src/types.ts';

test('returns personal security framing for student settings', () => {
  const copy = getSettingsExperienceCopy('VN', Role.STUDENT);

  assert.equal(copy.page.title, 'Bảo mật tài khoản');
  assert.match(copy.page.note, /mật khẩu/i);
  assert.equal(copy.showSystemSettings, false);
  assert.equal(copy.showManagedPasswords, false);
});

test('returns personal security framing for moderator settings', () => {
  const copy = getSettingsExperienceCopy('EN', Role.MODERATOR);

  assert.equal(copy.page.title, 'Account security');
  assert.match(copy.page.note, /password/i);
  assert.equal(copy.showSystemSettings, false);
  assert.equal(copy.showManagedPasswords, false);
});

test('keeps system settings framing for admin settings', () => {
  const copy = getSettingsExperienceCopy('VN', Role.ADMIN);

  assert.equal(copy.page.title, 'Cài đặt phòng lab');
  assert.equal(copy.showSystemSettings, true);
  assert.equal(copy.showManagedPasswords, true);
});
