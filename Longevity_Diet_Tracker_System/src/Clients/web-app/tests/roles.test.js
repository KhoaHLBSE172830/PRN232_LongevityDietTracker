import './setup.js';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeJwt, resetStorage } from './setup.js';
import { setAccessToken } from '../src/shared/services/session.js';
import { currentRole, portalFor, tabsFor, defaultTab, canAccessTab, roleLabel, USER_TABS, ADMIN_TABS, DOCTOR_TABS } from '../src/app/roles.js';
import { ADMIN_MENU, DOCTOR_MENU } from '../src/app/menus.js';

beforeEach(resetStorage);

test('chưa đăng nhập (demo) coi là hội viên; đọc đúng role từ JWT', () => {
  assert.equal(currentRole(), 'User');
  setAccessToken(fakeJwt({ nameid: 'a1', role: 'Admin' }));
  assert.equal(currentRole(), 'Admin');
});

test('mỗi role một portal: Admin quản trị, Nutritionist chuyên gia, còn lại hội viên', () => {
  assert.equal(portalFor('Admin'), 'admin');
  assert.equal(portalFor('Nutritionist'), 'doctor');
  assert.equal(portalFor('User'), 'user');
  assert.equal(portalFor(undefined), 'user');
});

test('mỗi role chỉ vào được tab của portal mình, tab mặc định đúng', () => {
  assert.deepEqual(tabsFor('Admin'), ADMIN_TABS);
  assert.deepEqual(tabsFor('User'), USER_TABS);
  assert.equal(defaultTab('Admin'), 'admin-overview');
  assert.equal(defaultTab('User'), 'overview');
  assert.equal(canAccessTab('Admin', 'meals'), false);
  assert.equal(canAccessTab('User', 'admin-fmd'), false);
  assert.equal(canAccessTab('Nutritionist', 'admin-users'), false);
  assert.equal(canAccessTab('Nutritionist', 'meals'), false);
  assert.equal(canAccessTab('User', 'doctor-patients'), false);
  assert.equal(canAccessTab('Admin', 'doctor-advice'), false);
  assert.equal(canAccessTab('Nutritionist', 'doctor-advice'), true);
  assert.deepEqual(tabsFor('Nutritionist'), DOCTOR_TABS);
  assert.equal(defaultTab('Nutritionist'), 'doctor-overview');
  assert.equal(canAccessTab('Admin', 'admin-templates'), true);
});

test('menu khớp danh sách tab của từng portal', () => {
  assert.deepEqual(ADMIN_MENU.map((m) => m.id), ADMIN_TABS);
  assert.deepEqual(DOCTOR_MENU.map((m) => m.id), DOCTOR_TABS);
});

test('nhãn role tiếng Việt', () => {
  assert.equal(roleLabel('Admin'), 'Quản trị viên');
  assert.equal(roleLabel('Nutritionist'), 'Chuyên gia dinh dưỡng');
  assert.equal(roleLabel('khong-biet'), 'Hội viên');
});
