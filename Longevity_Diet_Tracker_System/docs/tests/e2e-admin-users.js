// E2E cho API Admin của Identity (Khoa): danh sách người dùng, lọc, khóa/mở khóa, thống kê. Gọi qua Gateway.
// Chạy:  node docs/tests/e2e-admin-users.js [gatewayUrl]   (cần đã chạy scripts/seed-demo.js)
const GW = process.argv[2] || 'http://localhost:5048';
let pass = 0, fail = 0;

async function call(method, path, token, body) {
  const res = await fetch(GW + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* không có body */ }
  return { status: res.status, data: json?.data ?? json?.Data, json };
}
const check = (name, ok, extra = '') => { if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${extra}`); } };

(async () => {
  const admin = (await call('POST', '/api/auth/login', null, { email: 'admin@longevity.test', password: 'Password123!' })).data;
  const reg = await call('POST', '/api/auth/register', null, { email: `adm.${Date.now()}@test.local`, password: 'Password123!', fullName: 'Admin Test Target' });
  const target = reg.data;

  console.log('== Phân quyền ==');
  check('Người thường xem danh sách người dùng = 403', (await call('GET', '/api/users', target.accessToken)).status === 403);
  check('Người thường xem thống kê = 403', (await call('GET', '/api/users/stats', target.accessToken)).status === 403);
  check('Người thường khóa tài khoản = 403', (await call('PUT', `/api/users/${admin.userId}/status`, target.accessToken, { isActive: false })).status === 403);
  check('Không token = 401', (await call('GET', '/api/users')).status === 401);

  console.log('== Danh sách, tìm kiếm, lọc, phân trang ==');
  const all = await call('GET', '/api/users?pageNumber=1&pageSize=2', admin.accessToken);
  check('Admin liệt kê người dùng = 200, đúng kích thước trang', all.status === 200 && all.data?.items?.length === 2 && all.data.pageSize === 2 && all.data.totalCount >= 5, JSON.stringify(all.json)?.slice(0, 160));
  check('Có phân trang (hasNextPage, totalPages)', all.data?.hasNextPage === true && all.data.totalPages >= 3);
  const search = await call('GET', `/api/users?searchTerm=${encodeURIComponent(target.email)}`, admin.accessToken);
  check('Tìm theo email trả đúng 1 người', search.data?.totalCount === 1 && search.data.items[0].id === target.userId);
  const byRole = await call('GET', '/api/users?role=Nutritionist&pageSize=50', admin.accessToken);
  check('Lọc role Nutritionist chỉ trả chuyên gia', byRole.data?.items?.length >= 3 && byRole.data.items.every((u) => u.role === 'Nutritionist'));
  check('pageSize quá lớn bị giới hạn 100', (await call('GET', '/api/users?pageSize=9999', admin.accessToken)).data?.pageSize === 100);
  check('Danh sách không lộ mật khẩu băm', !JSON.stringify(all.json).toLowerCase().includes('passwordhash'));

  console.log('== Khóa / mở khóa ==');
  const lock = await call('PUT', `/api/users/${target.userId}/status`, admin.accessToken, { isActive: false, reason: 'e2e' });
  check('Admin khóa tài khoản = 200', lock.status === 200 && lock.data?.isActive === false, JSON.stringify(lock.json));
  const loginLocked = await call('POST', '/api/auth/login', null, { email: target.email, password: 'Password123!' });
  check('Tài khoản bị khóa không đăng nhập được (403)', loginLocked.status === 403, String(loginLocked.status));
  const lockedList = await call('GET', '/api/users?isActive=false&pageSize=50', admin.accessToken);
  check('Lọc isActive=false thấy tài khoản vừa khóa', lockedList.data?.items?.some((u) => u.id === target.userId));
  const unlock = await call('PUT', `/api/users/${target.userId}/status`, admin.accessToken, { isActive: true });
  check('Admin mở khóa = 200', unlock.status === 200 && unlock.data?.isActive === true);
  check('Sau khi mở khóa đăng nhập lại được', (await call('POST', '/api/auth/login', null, { email: target.email, password: 'Password123!' })).status === 200);
  check('Admin tự khóa mình bị từ chối (400)', (await call('PUT', `/api/users/${admin.userId}/status`, admin.accessToken, { isActive: false })).status === 400);
  check('Khóa người dùng không tồn tại = 404', (await call('PUT', '/api/users/00000000-0000-0000-0000-000000000001/status', admin.accessToken, { isActive: false })).status === 404);

  console.log('== Thống kê ==');
  const stats = await call('GET', '/api/users/stats', admin.accessToken);
  const s = stats.data;
  check('Thống kê trả đủ nhóm số liệu', stats.status === 200 && !!s?.userStats && !!s.roleStats && !!s.registrationTrends && !!s.longevityProfileStats, JSON.stringify(stats.json)?.slice(0, 120));
  check('Tổng = hoạt động + bị khóa; tổng theo vai trò khớp', s?.userStats.totalUsers === s?.userStats.activeUsers + s?.userStats.lockedUsers && s?.userStats.totalUsers === s?.roleStats.regularUsers + s?.roleStats.nutritionists + s?.roleStats.administrators);

  console.log(`\nKết quả: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
