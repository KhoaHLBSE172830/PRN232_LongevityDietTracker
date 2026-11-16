import './setup.js';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeJwt, resetStorage } from './setup.js';
import { apiClient } from '../src/shared/services/apiClient.js';
import { authApi, AuthError } from '../src/features/auth/authApi.js';
import { getSession } from '../src/shared/services/session.js';

const respondWith = (fn) => {
  apiClient.defaults.adapter = async (config) => fn(config);
};
const httpError = (status, data) => Object.assign(new Error('http'), { response: { status, data } });
const ok = (config, data) => ({ data, status: 200, statusText: 'OK', headers: {}, config });

beforeEach(resetStorage);

test('đăng nhập thành công lưu token và trả người dùng từ JWT', async () => {
  const token = fakeJwt({ nameid: 'u1', email: 'a@b.c', role: 'User' });
  respondWith((config) => ok(config, { data: { accessToken: token, fullName: 'An' } }));
  const r = await authApi.login({ email: 'a@b.c', password: 'x' });
  assert.equal(r.demo, false);
  assert.equal(r.user.id, 'u1');
  assert.equal(getSession().userId, 'u1');
});

test('sai mật khẩu (400/401) ném AuthError, không rơi về demo', async () => {
  respondWith(() => {
    throw httpError(400, { Message: 'Invalid email or password.' });
  });
  await assert.rejects(authApi.login({ email: 'a@b.c', password: 'sai' }), (e) => e instanceof AuthError && e.status === 400);
  assert.equal(getSession(), null);
});

test('backend không phản hồi hoặc 5xx: vào chế độ demo, không có token', async () => {
  respondWith(() => {
    throw new Error('connect ECONNREFUSED');
  });
  assert.equal((await authApi.login({ email: 'a@b.c', password: 'x' })).demo, true);
  respondWith(() => {
    throw httpError(500, {});
  });
  assert.equal((await authApi.login({ email: 'a@b.c', password: 'x' })).demo, true);
  assert.equal(getSession(), null);
});

test('đăng ký không bao giờ gửi role lên máy chủ', async () => {
  const seen = [];
  const token = fakeJwt({ nameid: 'u9', email: 'n@b.c' });
  respondWith((config) => {
    seen.push(JSON.parse(config.data));
    return ok(config, { data: { accessToken: token } });
  });
  await authApi.register({ email: 'n@b.c', password: 'x', fullName: 'N', role: 'Admin' });
  assert.equal('role' in seen[0], false);
});
