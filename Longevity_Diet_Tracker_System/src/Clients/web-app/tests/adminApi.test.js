import './setup.js';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resetStorage } from './setup.js';
import { apiClient } from '../src/shared/services/apiClient.js';
import { adminApi, AdminApiError, DESIGN_FMD_KCAL } from '../src/features/admin/adminApi.js';

const ok = (config, data) => ({ data, status: 200, statusText: 'OK', headers: {}, config });
const httpError = (status, data) => Object.assign(new Error('http'), { response: { status, data } });
const respondWith = (fn) => {
  apiClient.defaults.adapter = async (config) => fn(config);
};

beforeEach(resetStorage);

test('đổi role gọi đúng endpoint và gửi role dạng chuỗi', async () => {
  let seen;
  respondWith((config) => {
    seen = config;
    return ok(config, { data: { userId: 'u1', role: 'Nutritionist' } });
  });
  await adminApi.setUserRole('u1', 'Nutritionist');
  assert.equal(seen.method, 'put');
  assert.equal(seen.url, '/api/users/u1/role');
  assert.deepEqual(JSON.parse(seen.data), { role: 'Nutritionist' });
});

test('sửa quy tắc FMD gọi PUT /api/admin/fmd-rules/{ngày}', async () => {
  let seen;
  respondWith((config) => {
    seen = config;
    return ok(config, { data: {} });
  });
  await adminApi.updateFmdRule(3, { maxCalories: 760 });
  assert.equal(seen.method, 'put');
  assert.equal(seen.url, '/api/admin/fmd-rules/3');
});

test('403 thành thông báo thiếu quyền Admin, 401 thành hết phiên', async () => {
  respondWith(() => {
    throw httpError(403, {});
  });
  await assert.rejects(adminApi.createTemplate({}), (e) => e instanceof AdminApiError && e.status === 403 && /quyền Admin/.test(e.message));
  respondWith(() => {
    throw httpError(401, {});
  });
  await assert.rejects(adminApi.getTemplates(), (e) => e.status === 401 && /hết hạn/.test(e.message));
});

test('lỗi mạng được đánh dấu network; lỗi kiểm tra dữ liệu lấy thông điệp đầu tiên', async () => {
  respondWith(() => {
    throw new Error('ECONNREFUSED');
  });
  await assert.rejects(adminApi.getFmdRules(), (e) => e.network === true);
  respondWith(() => {
    throw httpError(400, { data: { 'request.name': ['Tên quá ngắn'] }, message: 'invalid' });
  });
  await assert.rejects(adminApi.createTemplate({}), (e) => e.message === 'Tên quá ngắn');
});

test('thiết kế FMD 1100/780/760/760/780', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((d) => DESIGN_FMD_KCAL[d]), [1100, 780, 760, 760, 780]);
});

test('danh sách người dùng gửi bộ lọc dạng query và bỏ giá trị rỗng', async () => {
  let seen;
  respondWith((config) => {
    seen = config;
    return ok(config, { data: { items: [], totalCount: 0 } });
  });
  await adminApi.listUsers({ pageNumber: 2, pageSize: 10, searchTerm: '', role: 'Nutritionist', isActive: false });
  assert.equal(seen.url, '/api/users');
  assert.deepEqual(seen.params, { pageNumber: 2, pageSize: 10, role: 'Nutritionist', isActive: false });
});

test('khóa tài khoản gọi PUT /api/users/{id}/status kèm lý do', async () => {
  let seen;
  respondWith((config) => {
    seen = config;
    return ok(config, { data: { isActive: false } });
  });
  await adminApi.setUserStatus('u9', false, 'Vi phạm');
  assert.equal(seen.method, 'put');
  assert.equal(seen.url, '/api/users/u9/status');
  assert.deepEqual(JSON.parse(seen.data), { isActive: false, reason: 'Vi phạm' });
});

test('tự khóa mình bị backend từ chối (400) hiện đúng thông điệp', async () => {
  respondWith(() => {
    throw httpError(400, { Message: 'Bạn không thể tự khóa tài khoản quản trị của chính mình.' });
  });
  await assert.rejects(adminApi.setUserStatus('me', false), (e) => e.status === 400 && /tự khóa/.test(e.message));
});
