import './setup.js';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeJwt, resetStorage } from './setup.js';
import { setAccessToken } from '../src/shared/services/session.js';
import { currentRole, portalFor, tabsFor, defaultTab, canAccessTab, roleLabel, USER_TABS, ADMIN_TABS } from '../src/app/roles.js';
import { ADMIN_MENU } from '../src/app/menus.js';

beforeEach(resetStorage);

test('chưa đăng nhập (demo) coi là hội viên; đọc đúng role từ JWT', () => {
  assert.equal(currentRole(), 'User');
  setAccessToken(fakeJwt({ nameid: 'a1', role: 'Admin' }));
  assert.equal(currentRole(), 'Admin');
});

test('Admin dùng portal quản trị, User và Nutritionist dùng portal hội viên', () => {
  assert.equal(portalFor('Admin'), 'admin');
  assert.equal(portalFor('User'), 'user');
  assert.equal(portalFor('Nutritionist'), 'user');
});

test('mỗi role chỉ vào được tab của portal mình, tab mặc định đúng', () => {
  assert.deepEqual(tabsFor('Admin'), ADMIN_TABS);
  assert.deepEqual(tabsFor('User'), USER_TABS);
  assert.equal(defaultTab('Admin'), 'admin-overview');
  assert.equal(defaultTab('User'), 'overview');
  assert.equal(canAccessTab('Admin', 'meals'), false);
  assert.equal(canAccessTab('User', 'admin-fmd'), false);
  assert.equal(canAccessTab('Nutritionist', 'admin-users'), false);
  assert.equal(canAccessTab('Admin', 'admin-templates'), true);
});

test('menu Admin khớp danh sách tab Admin', () => {
  assert.deepEqual(ADMIN_MENU.map((m) => m.id), ADMIN_TABS);
});

test('nhãn role tiếng Việt', () => {
  assert.equal(roleLabel('Admin'), 'Quản trị viên');
  assert.equal(roleLabel('Nutritionist'), 'Chuyên gia dinh dưỡng');
  assert.equal(roleLabel('khong-biet'), 'Hội viên');
});
