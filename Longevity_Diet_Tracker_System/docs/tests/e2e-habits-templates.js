// E2E cho: thói quen (Kiệt), mẫu bữa ăn + ngày theo múi giờ khi kiểm ngưỡng FMD (Vy). Gọi qua Gateway.
// Chạy:  node docs/tests/e2e-habits-templates.js [gatewayUrl]
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
async function register(tag) {
  const email = `${tag}.${Date.now()}.${Math.floor(Math.random() * 1e4)}@test.local`;
  const r = await call('POST', '/api/auth/register', null, { email, password: 'Password123!', fullName: `Test ${tag}` });
  return { id: r.data.userId, token: r.data.accessToken };
}
const food = (name, kcal) => ({ externalFoodId: `t-${name}`, foodName: name, servingSize: 100, servingUnit: 'g', calories: kcal, proteinGrams: 5, carbsGrams: 5, fatGrams: 5, fiberGrams: 1 });

(async () => {
  const adminTok = forgeJwt({ nameid: crypto.randomUUID(), email: 'admin@test.local', role: 'Admin' });
  const a = await register('habit-a'), b = await register('habit-b');
  const day = '2026-11-16';

  console.log('== KIỆT: Habits ==');
  const d0 = await call('GET', `/api/habits/user/${a.id}?date=${day}`, a.token);
  check('Ngày chưa có dữ liệu = 0/0 kèm mục tiêu 2000ml/30 phút', d0.status === 200 && d0.data?.waterMl === 0 && d0.data?.movementMinutes === 0 && d0.data?.waterGoalMl === 2000 && d0.data?.movementGoalMinutes === 30, JSON.stringify(d0.json));
  const a1 = await call('POST', `/api/habits/user/${a.id}/add?date=${day}`, a.token, { waterMl: 250 });
  check('Cộng 250ml nước = 250', a1.status === 200 && a1.data?.waterMl === 250, JSON.stringify(a1.json));
  const a2 = await call('POST', `/api/habits/user/${a.id}/add?date=${day}`, a.token, { waterMl: 250, movementMinutes: 10 });
  check('Cộng tiếp: nước 500, vận động 10', a2.data?.waterMl === 500 && a2.data?.movementMinutes === 10, JSON.stringify(a2.data));
  const a3 = await call('POST', `/api/habits/user/${a.id}/add?date=${day}`, a.token, { waterMl: -9999, movementMinutes: -1 });
  check('Trừ quá mức không xuống dưới 0', a3.data?.waterMl === 0 && a3.data?.movementMinutes === 9, JSON.stringify(a3.data));
  const s1 = await call('PUT', `/api/habits/user/${a.id}?date=${day}`, a.token, { waterMl: 1500 });
  check('Đặt tuyệt đối nước 1500, giữ nguyên vận động', s1.status === 200 && s1.data?.waterMl === 1500 && s1.data?.movementMinutes === 9, JSON.stringify(s1.data));
  check('Đặt giá trị âm bị từ chối 400', (await call('PUT', `/api/habits/user/${a.id}?date=${day}`, a.token, { waterMl: -1 })).status === 400);
  check('Đặt nước vượt tối đa bị từ chối 400', (await call('PUT', `/api/habits/user/${a.id}?date=${day}`, a.token, { waterMl: 20000 })).status === 400);
  const other = await call('GET', `/api/habits/user/${a.id}?date=2026-11-15`, a.token);
  check('Ngày khác độc lập (0)', other.data?.waterMl === 0);
  const range = await call('GET', `/api/habits/user/${a.id}/range?from=2026-11-10&to=2026-11-16`, a.token);
  check('Range 7 ngày trả đủ 7 dòng, ngày 16 có 1500ml', range.status === 200 && range.data?.length === 7 && range.data[6].waterMl === 1500, JSON.stringify(range.json)?.slice(0, 150));
  check('Range quá dài bị từ chối 400', (await call('GET', `/api/habits/user/${a.id}/range?from=2026-01-01&to=2026-11-16`, a.token)).status === 400);
  check('Xem thói quen người khác = 403', (await call('GET', `/api/habits/user/${a.id}?date=${day}`, b.token)).status === 403);
  check('Sửa thói quen người khác = 403', (await call('POST', `/api/habits/user/${a.id}/add`, b.token, { waterMl: 250 })).status === 403);
  check('Admin xem được thói quen người khác = 200', (await call('GET', `/api/habits/user/${a.id}?date=${day}`, adminTok)).status === 200);
  check('Không có token = 401', (await call('GET', `/api/habits/user/${a.id}?date=${day}`)).status === 401);

  console.log('== VY: Mẫu bữa ăn ==');
  const tmpl = { name: 'Cháo đậu xanh', description: 'Bữa sáng nhẹ', associatedFastingType: 2, fmdDayNumber: null, totalCalories: 320, totalProteinGrams: 14, totalCarbsGrams: 50, totalFatGrams: 6, totalFiberGrams: 8 };
  check('Người thường tạo mẫu = 403', (await call('POST', '/api/mealtemplates', a.token, tmpl)).status === 403);
  const created = await call('POST', '/api/mealtemplates', adminTok, tmpl);
  check('Admin tạo mẫu = 201', created.status === 201, JSON.stringify(created.json));
  const tid = created.data?.id;
  const apply = await call('POST', `/api/mealtemplates/${tid}/apply`, a.token, { mealType: 1, utcOffsetMinutes: 420 });
  check('Áp dụng mẫu thành bữa ăn = 201', apply.status === 201, JSON.stringify(apply.json));
  check('Bữa ăn có 1 món tên mẫu và 320 kcal, chủ là người gọi', apply.data?.foodItems?.length === 1 && apply.data.foodItems[0].foodName === 'Cháo đậu xanh' && apply.data.totalCalories === 320 && apply.data.userId === a.id, JSON.stringify(apply.data)?.slice(0, 200));
  check('Áp dụng mẫu không tồn tại = 404', (await call('POST', `/api/mealtemplates/${crypto.randomUUID()}/apply`, a.token, { mealType: 1 })).status === 404);
  check('Danh sách mẫu có mẫu vừa tạo', ((await call('GET', '/api/mealtemplates', a.token)).data || []).some((t) => t.id === tid));

  console.log('== VY: Ngày theo múi giờ khi kiểm ngưỡng FMD ==');
  const c = await register('tz-c');
  check('Bắt đầu FMD = 201', (await call('POST', '/api/fmd/start', c.token, {})).status === 201);
  const D = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10); // một ngày UTC trong quá khứ
  const at = (h) => `${D}T${String(h).padStart(2, '0')}:00:00Z`;
  const A = await call('POST', '/api/meals', c.token, { mealType: 1, loggedAt: at(10), foodItems: [food('a', 700)], utcOffsetMinutes: 420 });
  check('Bữa A (10:00Z = 17:00 VN) 700 kcal: chưa vượt', A.data?.exceededThreshold === false, JSON.stringify(A.data)?.slice(0, 120));
  const B = await call('POST', '/api/meals', c.token, { mealType: 3, loggedAt: at(20), foodItems: [food('b', 700)], utcOffsetMinutes: 420 });
  check('Bữa B (20:00Z = 03:00 VN hôm sau) 700 kcal: KHÔNG cộng dồn với A theo giờ VN → chưa vượt', B.data?.exceededThreshold === false, JSON.stringify(B.data)?.slice(0, 120));
  const C = await call('POST', '/api/meals', c.token, { mealType: 2, loggedAt: at(12), foodItems: [food('c', 500)], utcOffsetMinutes: 420 });
  check('Bữa C (12:00Z = 19:00 VN cùng ngày VN với A) 500 kcal: 700+500 > 1100 → vượt', C.data?.exceededThreshold === true, JSON.stringify(C.data)?.slice(0, 120));
  const E = await call('POST', '/api/meals', c.token, { mealType: 4, loggedAt: at(21), foodItems: [food('e', 500)] });
  check('Không gửi utcOffset (=0): bữa E 21:00Z cộng dồn B cùng ngày UTC (700+500) → vượt', E.data?.exceededThreshold === true, JSON.stringify(E.data)?.slice(0, 120));

  console.log(`\nKết quả: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
