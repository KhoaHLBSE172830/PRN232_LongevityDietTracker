import './setup.js';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeJwt, resetStorage } from './setup.js';
import { decodeJwt, getSession, setAccessToken, isLoggedIn } from '../src/shared/services/session.js';

beforeEach(resetStorage);

test('decodeJwt đọc được payload, trả null khi token hỏng', () => {
  assert.equal(decodeJwt(fakeJwt({ nameid: 'u1' })).nameid, 'u1');
  assert.equal(decodeJwt('khong-phai-jwt'), null);
});

test('getSession: JWT hợp lệ trả userId, email, role', () => {
  setAccessToken(fakeJwt({ nameid: 'u1', email: 'a@b.c', role: 'Nutritionist' }));
  const s = getSession();
  assert.equal(s.userId, 'u1');
  assert.equal(s.email, 'a@b.c');
  assert.equal(s.role, 'Nutritionist');
  assert.equal(isLoggedIn(), true);
});

test('getSession: hiểu claim kiểu URI của .NET', () => {
  setAccessToken(
    fakeJwt({
      'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier': 'u2',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'Admin',
    })
  );
  assert.deepEqual([getSession().userId, getSession().role], ['u2', 'Admin']);
});

test('getSession: token hết hạn, token demo, thiếu userId đều coi là chưa đăng nhập', () => {
  setAccessToken(fakeJwt({ nameid: 'u1', exp: Math.floor(Date.now() / 1000) - 10 }));
  assert.equal(getSession(), null);
  setAccessToken('demo-jwt-token');
  assert.equal(getSession(), null);
  setAccessToken(fakeJwt({ email: 'x@y.z' }));
  assert.equal(getSession(), null);
});

test('role mặc định là User khi token không có role', () => {
  setAccessToken(fakeJwt({ nameid: 'u3' }));
  assert.equal(getSession().role, 'User');
});
