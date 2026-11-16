// E2E cho các API mới (Khoa: Identity, Kiệt: Fasting, Khôi: Consultation). Gọi thẳng từng service, không qua Gateway.
// Chạy:  node docs/tests/e2e-new-apis.js
// Yêu cầu: Identity :5001, DietFasting :5002, Consultation :5003 (DB đã migrate), Node 18+.
const crypto = require('crypto');

const ID = 'http://localhost:5001', DIET = 'http://localhost:5002', CONS = 'http://localhost:5003';
const SECRET = 'super_secret_jwt_key_longevity_diet_tracker_32chars!';
let pass = 0, fail = 0;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function forgeJwt(claims) {
  const h = b64({ alg: 'HS256', typ: 'JWT' });
  const p = b64({ iss: 'LongevityIdentityService', aud: 'LongevityDietTrackerClients', exp: Math.floor(Date.now() / 1000) + 3600, ...claims });
  const sig = crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

async function call(method, url, token, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* không có body */ }
  return { status: res.status, json, data: json?.data ?? json?.Data };
}

function check(name, ok, extra = '') {
  if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${extra}`); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function register(tag, extra = {}) {
  const email = `${tag}.${Date.now()}.${Math.floor(Math.random() * 1e4)}@test.local`;
  const r = await call('POST', `${ID}/api/auth/register`, null, { email, password: 'Password123!', fullName: `Test ${tag}`, ...extra });
  return { email, ...r };
}

(async () => {
  console.log('== KHOA: Identity ==');
  const a = await register('alice', { role: 'Admin' }); // cố tình gửi role Admin
  check('Đăng ký trả 201', a.status === 201, JSON.stringify(a.json));
  check('Role bị ép về User dù client gửi Admin', a.data?.role === 'User', String(a.data?.role));
  const b = await register('bob');
  const aliceId = a.data.userId, bobId = b.data.userId;
  const aliceTok = a.data.accessToken, bobTok = b.data.accessToken;

  const login = await call('POST', `${ID}/api/auth/login`, null, { email: a.email, password: 'Password123!' });
  check('Đăng nhập đúng trả 200 + accessToken', login.status === 200 && !!login.data?.accessToken);
  const badLogin = await call('POST', `${ID}/api/auth/login`, null, { email: a.email, password: 'sai-mat-khau' });
  check("Sai mật khẩu bị từ chối (400/401)", [400, 401].includes(badLogin.status), String(badLogin.status));

  check('Xem hồ sơ của chính mình = 200', (await call('GET', `${ID}/api/users/${aliceId}/profile`, aliceTok)).status === 200);
  check('Xem hồ sơ người khác = 403', (await call('GET', `${ID}/api/users/${bobId}/profile`, aliceTok)).status === 403);
  check('Sửa hồ sơ người khác = 403', (await call('PUT', `${ID}/api/users/${bobId}/profile`, aliceTok, { userId: bobId })).status === 403);

  const prof = { userId: aliceId, dietaryPreference: 'plant-slant', dailyCalorieTarget: 1900, proteinPercent: 20, carbsPercent: 50, fatPercent: 30, preferredFastingType: '16:8', waterReminderEnabled: true, eveningReminderEnabled: false };
  const put = await call('PUT', `${ID}/api/users/${aliceId}/profile`, aliceTok, prof);
  check('Lưu hồ sơ với field mới = 200', put.status === 200, JSON.stringify(put.json));
  const got = (await call('GET', `${ID}/api/users/${aliceId}/profile`, aliceTok)).data;
  check('Đọc lại đúng kcal/macro/fasting/nhắc nước', got?.dailyCalorieTarget === 1900 && got?.proteinPercent === 20 && got?.preferredFastingType === '16:8' && got?.waterReminderEnabled === true, JSON.stringify(got));
  check('Macro tổng != 100 bị từ chối 400', (await call('PUT', `${ID}/api/users/${aliceId}/profile`, aliceTok, { ...prof, fatPercent: 40 })).status === 400);
  check('Kcal ngoài 800–5000 bị từ chối 400', (await call('PUT', `${ID}/api/users/${aliceId}/profile`, aliceTok, { ...prof, dailyCalorieTarget: 100 })).status === 400);

  const adminTok = forgeJwt({ nameid: crypto.randomUUID(), email: 'admin@test.local', role: 'Admin' });
  check('User thường đổi role = 403', (await call('PUT', `${ID}/api/users/${bobId}/role`, bobTok, { role: 'Admin' })).status === 403);
  const setRole = await call('PUT', `${ID}/api/users/${bobId}/role`, adminTok, { role: 'Nutritionist' });
  check('Admin đổi role = 200', setRole.status === 200, JSON.stringify(setRole.json));
  const relog = await call('POST', `${ID}/api/auth/login`, null, { email: b.email, password: 'Password123!' });
  check('Đăng nhập lại nhận role Nutritionist', relog.data?.role === 'Nutritionist', String(relog.data?.role));

  console.log('== KIỆT: Fasting ==');
  const u = await register('fast');
  const tok = u.data.accessToken, uid = u.data.userId;
  const start = await call('POST', `${DIET}/api/fasting/start`, tok, { fastingType: 7, durationHours: 14 });
  check('Bắt đầu phiên 14:10 (FastingType=7) = 201', start.status === 201, JSON.stringify(start.json));
  const sid = start.data?.id;
  check('Phiên trả về loại Intermittent14_10', String(start.data?.fastingType).includes('14') || start.data?.fastingType === 7, String(start.data?.fastingType));

  const pause = await call('POST', `${DIET}/api/fasting/${sid}/pause`, tok);
  check('Pause = 200 và isPaused=true', pause.status === 200 && pause.data?.isPaused === true, JSON.stringify(pause.json));
  const target0 = new Date(start.data.targetEndTimeUtc).getTime();
  check('Pause lần 2 bị từ chối 400', (await call('POST', `${DIET}/api/fasting/${sid}/pause`, tok)).status === 400);
  await sleep(3000);
  const resume = await call('POST', `${DIET}/api/fasting/${sid}/resume`, tok);
  const shift = (new Date(resume.data?.targetEndTimeUtc).getTime() - target0) / 1000;
  check('Resume dời mốc kết thúc ≈ thời gian đã tạm dừng (≈3s)', resume.status === 200 && shift >= 2.5 && shift <= 6, `shift=${shift}s`);
  check('Resume khi không tạm dừng bị từ chối 400', (await call('POST', `${DIET}/api/fasting/${sid}/resume`, tok)).status === 400);
  check('Phiên đang chạy chưa nằm trong lịch sử', (await call('GET', `${DIET}/api/fasting/user/${uid}/history`, tok)).data?.length === 0);

  const end = await call('POST', `${DIET}/api/fasting/${sid}/end`, tok, { moodNotes: 'ok' });
  check('Kết thúc phiên = 200', end.status === 200, JSON.stringify(end.json));
  const hist = await call('GET', `${DIET}/api/fasting/user/${uid}/history`, tok);
  check('Lịch sử có 1 phiên', hist.status === 200 && hist.data?.length === 1, JSON.stringify(hist.json));
  const stats = await call('GET', `${DIET}/api/fasting/user/${uid}/stats`, tok);
  check('Stats: streak hiện tại = 1, đã hoàn tất = 1', stats.data?.currentStreakDays === 1 && stats.data?.completedSessions === 1, JSON.stringify(stats.data));

  const s2 = await call('POST', `${DIET}/api/fasting/start`, tok, { fastingType: 2, durationHours: 16 });
  await call('POST', `${DIET}/api/fasting/${s2.data.id}/pause`, tok);
  const cancel = await call('POST', `${DIET}/api/fasting/${s2.data.id}/cancel`, tok, { reason: 'test' });
  check('Hủy phiên đang tạm dừng = 200', cancel.status === 200, JSON.stringify(cancel.json));
  const hist2 = await call('GET', `${DIET}/api/fasting/user/${uid}/history`, tok);
  check('Lịch sử có 2 phiên (Completed + Cancelled)', hist2.data?.length === 2);
  check('Stats không tính phiên bị hủy', (await call('GET', `${DIET}/api/fasting/user/${uid}/stats`, tok)).data?.completedSessions === 1);
  check('Xem lịch sử người khác = 403', (await call('GET', `${DIET}/api/fasting/user/${aliceId}/history`, tok)).status === 403);
  check('Phiên cũ không còn chặn bắt đầu phiên mới', (await call('POST', `${DIET}/api/fasting/start`, tok, { fastingType: 1, durationHours: 12 })).status === 201);

  console.log('== KHÔI: Consultation ==');
  const nuts = await call('GET', `${CONS}/api/consultations/nutritionists`);
  const nut = nuts.data?.[0];
  check('Danh sách bác sĩ có tags', Array.isArray(nut?.tags) && nut.tags.length > 0, JSON.stringify(nut));

  const tomorrowVn = new Date(Date.now() + 7 * 3600e3 + (10 + Math.floor(Math.random() * 300)) * 24 * 3600e3).toISOString().slice(0, 10);
  const av = await call('GET', `${CONS}/api/consultations/nutritionists/${nut.id}/availability?date=${tomorrowVn}`);
  check('Availability trả 8 khung giờ, đều trống', av.status === 200 && av.data?.slots?.length === 8 && av.data.slots.every((s) => s.isAvailable), JSON.stringify(av.json)?.slice(0, 200));
  const slot = av.data.slots[0];

  const m1 = await register('member1'), m2 = await register('member2');
  const book1 = await call('POST', `${CONS}/api/consultations/book`, m1.data.accessToken, { nutritionistId: nut.id, scheduledAtUtc: slot.startUtc, notes: 'test' });
  check('Đặt lịch khung đầu = 201', book1.status === 201, JSON.stringify(book1.json));
  const book2 = await call('POST', `${CONS}/api/consultations/book`, m2.data.accessToken, { nutritionistId: nut.id, scheduledAtUtc: slot.startUtc, notes: 'trùng' });
  check('Đặt trùng khung giờ = 409', book2.status === 409, String(book2.status));
  const av2 = await call('GET', `${CONS}/api/consultations/nutritionists/${nut.id}/availability?date=${tomorrowVn}`);
  check('Khung đã đặt hiển thị không còn trống', av2.data?.slots?.[0]?.isAvailable === false);

  const sessId = book1.data.id;
  check('Hội viên không được xác nhận lịch = 403', (await call('POST', `${CONS}/api/consultations/${sessId}/confirm`, m1.data.accessToken)).status === 403);
  const conf = await call('POST', `${CONS}/api/consultations/${sessId}/confirm`, adminTok);
  check('Admin xác nhận lịch = 200, trạng thái Confirmed', conf.status === 200 && ['Confirmed', 2].includes(conf.data?.status), JSON.stringify(conf.json));
  check('Xác nhận lần 2 = 409', (await call('POST', `${CONS}/api/consultations/${sessId}/confirm`, adminTok)).status === 409);
  check('Người khác hủy lịch = 403', (await call('POST', `${CONS}/api/consultations/${sessId}/cancel`, m2.data.accessToken, {})).status === 403);
  const can = await call('POST', `${CONS}/api/consultations/${sessId}/cancel`, m1.data.accessToken, { reason: 'bận' });
  check('Chủ lịch hủy = 200, trạng thái Cancelled', can.status === 200 && ['Cancelled', 4].includes(can.data?.status), JSON.stringify(can.json));
  check('Hủy lần 2 = 409', (await call('POST', `${CONS}/api/consultations/${sessId}/cancel`, m1.data.accessToken, {})).status === 409);
  const av3 = await call('GET', `${CONS}/api/consultations/nutritionists/${nut.id}/availability?date=${tomorrowVn}`);
  check('Sau khi hủy, khung giờ trống lại', av3.data?.slots?.[0]?.isAvailable === true);
  check('Người khác đặt lại được khung vừa trống', (await call('POST', `${CONS}/api/consultations/book`, m2.data.accessToken, { nutritionistId: nut.id, scheduledAtUtc: slot.startUtc })).status === 201);

  console.log(`\nKết quả: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
