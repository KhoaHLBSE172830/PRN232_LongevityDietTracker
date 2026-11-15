// E2E cho phần Vy (Meals) và Quốc (FMD + Notification). Gọi qua Gateway.
// Chạy:  node docs/tests/e2e-meals-fmd-notifications.js [gatewayUrl]
// Yêu cầu: Gateway :5048 (mặc định), Identity, DietFasting, Notification, RabbitMQ, Mailpit; DB đã migrate.
const crypto = require('crypto');
const GW = process.argv[2] || 'http://localhost:5048';
const SECRET = 'super_secret_jwt_key_longevity_diet_tracker_32chars!';
let pass = 0, fail = 0;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const forgeJwt = (claims) => {
  const h = b64({ alg: 'HS256', typ: 'JWT' });
  const p = b64({ iss: 'LongevityIdentityService', aud: 'LongevityDietTrackerClients', exp: Math.floor(Date.now() / 1000) + 3600, ...claims });
  return `${h}.${p}.${crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')}`;
};

async function call(method, path, token, body) {
  const res = await fetch(GW + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* không có body */ }
  return { status: res.status, json, data: json?.data ?? json?.Data };
}
const check = (name, ok, extra = '') => { if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${extra}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function register(tag) {
  const email = `${tag}.${Date.now()}.${Math.floor(Math.random() * 1e4)}@test.local`;
  const r = await call('POST', '/api/auth/register', null, { email, password: 'Password123!', fullName: `Test ${tag}` });
  return { email, id: r.data.userId, token: r.data.accessToken };
}
const food = (name, kcal) => ({ externalFoodId: `t-${name}`, foodName: name, servingSize: 100, servingUnit: 'g', calories: kcal, proteinGrams: 10, carbsGrams: 20, fatGrams: 5, fiberGrams: 3 });
const todayUtc = () => new Date().toISOString().slice(0, 10);

(async () => {
  const adminTok = forgeJwt({ nameid: crypto.randomUUID(), email: 'admin@test.local', role: 'Admin' });
  const a = await register('vy-a'), b = await register('vy-b');

  console.log('== VY: Meals ==');
  const log = await call('POST', '/api/meals', a.token, { userId: b.id, mealType: 1, loggedAt: new Date().toISOString(), foodItems: [food('yen-mach', 300)], notes: 'sáng' });
  check('Ghi bữa ăn = 201', log.status === 201, JSON.stringify(log.json));
  check('Chủ bữa ăn lấy từ JWT, không tin UserId client gửi', log.data?.userId === a.id, `${log.data?.userId} vs ${a.id}`);
  const mealId = log.data?.id;

  const list = await call('GET', `/api/meals/user/${a.id}?date=${todayUtc()}&utcOffsetMinutes=0`, a.token);
  check('Xem bữa ăn của mình = 200, có 1 bữa', list.status === 200 && list.data?.length === 1, JSON.stringify(list.json)?.slice(0, 150));
  check('Xem bữa ăn của người khác = 403', (await call('GET', `/api/meals/user/${a.id}?date=${todayUtc()}&utcOffsetMinutes=0`, b.token)).status === 403);
  check('Admin xem được bữa ăn người khác = 200', (await call('GET', `/api/meals/user/${a.id}?date=${todayUtc()}&utcOffsetMinutes=0`, adminTok)).status === 200);

  const upd = await call('PUT', `/api/meals/${mealId}`, a.token, { mealType: 2, notes: 'trưa', satietyPercentage: 70, foodItems: [food('yen-mach', 300), food('dau-hu', 150)] });
  check('Sửa bữa ăn (thêm món, đổi loại) = 200', upd.status === 200, JSON.stringify(upd.json));
  check('Tổng kcal được tính lại = 450', upd.data?.totalCalories === 450, String(upd.data?.totalCalories));
  const list2 = await call('GET', `/api/meals/user/${a.id}?date=${todayUtc()}&utcOffsetMinutes=0`, a.token);
  check('Đọc lại: vẫn 1 bữa, 2 món, mức no 70%', list2.data?.length === 1 && list2.data[0].foodItems.length === 2 && list2.data[0].satietyPercentage === 70, JSON.stringify(list2.data?.[0])?.slice(0, 200));
  check('Sửa bữa ăn không có món nào = 400', (await call('PUT', `/api/meals/${mealId}`, a.token, { mealType: 1, foodItems: [] })).status === 400);
  check('Người khác sửa bữa ăn = 403', (await call('PUT', `/api/meals/${mealId}`, b.token, { mealType: 1, foodItems: [food('x', 1)] })).status === 403);
  check('Người khác xóa bữa ăn = 403', (await call('DELETE', `/api/meals/${mealId}`, b.token)).status === 403);
  check('Sửa bữa ăn không tồn tại = 404', (await call('PUT', `/api/meals/${crypto.randomUUID()}`, a.token, { mealType: 1, foodItems: [food('x', 1)] })).status === 404);
  check('Chủ xóa bữa ăn = 200', (await call('DELETE', `/api/meals/${mealId}`, a.token)).status === 200);
  check('Sau khi xóa không còn bữa nào', (await call('GET', `/api/meals/user/${a.id}?date=${todayUtc()}&utcOffsetMinutes=0`, a.token)).data?.length === 0);
  check('Xóa lần 2 = 404', (await call('DELETE', `/api/meals/${mealId}`, a.token)).status === 404);

  console.log('== QUỐC: FMD ==');
  const rules = await call('GET', '/api/admin/fmd-rules');
  const kcal = (rules.data || []).sort((x, y) => x.dayNumber - y.dayNumber).map((r) => r.maxCalories).join('/');
  check('Rule FMD mặc định = 1100/780/760/760/780 (Figma)', kcal === '1100/780/760/760/780', kcal);

  const c = await register('quoc-c');
  const start = await call('POST', '/api/fmd/start', c.token, { startDate: new Date().toISOString() });
  check('Bắt đầu chu kỳ = 201', start.status === 201, JSON.stringify(start.json));
  check('Ngày 1 định mức 1100 kcal', start.data?.targetCaloriesToday === 1100, String(start.data?.targetCaloriesToday));
  const cycleId = start.data?.id;
  check('Bắt đầu chu kỳ thứ 2 khi đang chạy = 409', (await call('POST', '/api/fmd/start', c.token, {})).status === 409);
  check('Xem chu kỳ đang chạy của mình = 200', (await call('GET', `/api/fmd/user/${c.id}/active`, c.token)).status === 200);
  check('Xem chu kỳ của người khác = 403', (await call('GET', `/api/fmd/user/${c.id}/active`, a.token)).status === 403);
  check('Xem lịch sử FMD của người khác = 403', (await call('GET', `/api/fmd/user/${c.id}/history`, a.token)).status === 403);

  // Vượt định mức ngày 1 (1100) -> sự kiện RabbitMQ -> Notification
  const big = await call('POST', '/api/meals', c.token, { mealType: 2, loggedAt: new Date().toISOString(), foodItems: [food('buffet', 1500)] });
  check('Bữa ăn vượt 1100 kcal bị đánh dấu exceededThreshold', big.data?.exceededThreshold === true, JSON.stringify(big.data)?.slice(0, 160));

  console.log('== QUỐC: Notification ==');
  let notifs = [];
  for (let i = 0; i < 15 && notifs.length === 0; i++) { await sleep(1000); notifs = (await call('GET', `/api/notifications/user/${c.id}`, c.token)).data || []; }
  check('Cảnh báo vượt kcal tạo thông báo cho người dùng (qua RabbitMQ)', notifs.length >= 1, `count=${notifs.length}`);
  check('Thông báo mới có isRead=false', notifs[0]?.isRead === false, JSON.stringify(notifs[0])?.slice(0, 160));
  const unread = await call('GET', `/api/notifications/user/${c.id}/unread-count`, c.token);
  check('unread-count = số thông báo chưa đọc', unread.data?.unreadCount === notifs.filter((n) => !n.isRead).length && unread.data.unreadCount >= 1, JSON.stringify(unread.json));
  check('Người khác xem thông báo = 403', (await call('GET', `/api/notifications/user/${c.id}`, a.token)).status === 403);
  check('Người khác xem unread-count = 403', (await call('GET', `/api/notifications/user/${c.id}/unread-count`, a.token)).status === 403);
  check('Người khác đánh dấu đã đọc = 403', (await call('POST', `/api/notifications/${notifs[0].id}/read`, a.token)).status === 403);
  const read1 = await call('POST', `/api/notifications/${notifs[0].id}/read`, c.token);
  check('Chủ đánh dấu đã đọc = 200, isRead=true', read1.status === 200 && read1.data?.isRead === true, JSON.stringify(read1.json)?.slice(0, 160));
  check('Đánh dấu thông báo không tồn tại = 404', (await call('POST', `/api/notifications/${crypto.randomUUID()}/read`, c.token)).status === 404);
  const readAll = await call('POST', `/api/notifications/user/${c.id}/read-all`, c.token);
  check('read-all = 200', readAll.status === 200);
  check('Sau read-all unread-count = 0', (await call('GET', `/api/notifications/user/${c.id}/unread-count`, c.token)).data?.unreadCount === 0);
  check('Người thường gửi thông báo thủ công = 403', (await call('POST', '/api/notifications/send', c.token, { userId: c.id, recipient: 'x@y.z', subject: 'hi', body: 'hi' })).status === 403);
  check('Admin gửi thông báo thủ công = 201', (await call('POST', '/api/notifications/send', adminTok, { userId: c.id, recipient: 'x@y.z', subject: 'hi', body: 'hi', channel: 2, eventId: crypto.randomUUID() })).status === 201);
  check('Người khác sửa preferences = 403', (await call('PUT', `/api/notifications/preferences/${c.id}`, a.token, { emailNotificationsEnabled: false, fastingRemindersEnabled: false, nutritionistAdviceAlertsEnabled: false })).status === 403);
  check('Chủ sửa preferences = 200', (await call('PUT', `/api/notifications/preferences/${c.id}`, c.token, { emailNotificationsEnabled: true, fastingRemindersEnabled: false, nutritionistAdviceAlertsEnabled: true })).status === 200);

  console.log('== QUỐC: FMD hủy + lịch sử ==');
  check('Người khác hủy chu kỳ = 403', (await call('POST', `/api/fmd/${cycleId}/cancel`, a.token)).status === 403);
  const cancel = await call('POST', `/api/fmd/${cycleId}/cancel`, c.token);
  check('Chủ hủy chu kỳ = 200, trạng thái Cancelled', cancel.status === 200 && ['Cancelled', 4].includes(cancel.data?.status), JSON.stringify(cancel.json));
  check('Hủy lần 2 = 400', (await call('POST', `/api/fmd/${cycleId}/cancel`, c.token)).status === 400);
  check('Hủy chu kỳ không tồn tại = 404', (await call('POST', `/api/fmd/${crypto.randomUUID()}/cancel`, c.token)).status === 404);
  check('Sau khi hủy không còn chu kỳ đang chạy', (await call('GET', `/api/fmd/user/${c.id}/active`, c.token)).data == null);
  const hist = await call('GET', `/api/fmd/user/${c.id}/history`, c.token);
  check('Lịch sử có 1 chu kỳ (đã hủy)', hist.status === 200 && hist.data?.length === 1, JSON.stringify(hist.json));
  const start2 = await call('POST', '/api/fmd/start', c.token, {});
  check('Bắt đầu chu kỳ mới sau khi hủy = 201 (#2)', start2.status === 201 && start2.data?.cycleNumber === 2, JSON.stringify(start2.json));
  check('Lịch sử có 2 chu kỳ, mới nhất trước', (await call('GET', `/api/fmd/user/${c.id}/history`, c.token)).data?.[0]?.cycleNumber === 2);

  console.log(`\nKết quả: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
