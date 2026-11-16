// E2E cho JobService (Hangfire) + email thật qua Mailpit. Gọi trực tiếp từng service.
// Chạy:  node docs/tests/e2e-jobs-email.js
// Yêu cầu: Identity :5001, DietFasting :5002, Notification :5004, JobService :5005, RabbitMQ, Mailpit (:1025 SMTP, :8025 API).
const crypto = require('crypto');
const SECRET = 'super_secret_jwt_key_longevity_diet_tracker_32chars!';
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function forgeJwt(claims) {
  const h = b64({ alg: 'HS256', typ: 'JWT' });
  const p = b64({ iss: 'LongevityIdentityService', aud: 'LongevityDietTrackerClients', exp: Math.floor(Date.now() / 1000) + 3600, ...claims });
  return `${h}.${p}.${crypto.createHmac('sha256', SECRET).update(`${h}.${p}`).digest('base64url')}`;
}
const CONS = 'http://localhost:5003';
const ID = 'http://localhost:5001', DIET = 'http://localhost:5002', JOB = 'http://localhost:5005', MAIL = 'http://localhost:8025';
let pass = 0, fail = 0;

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
const check = (name, ok, extra = '') => { if (ok) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${extra}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, tries = 25, ms = 1000) {
  for (let i = 0; i < tries; i++) {
    const v = await fn();
    if (v) return v;
    await sleep(ms);
  }
  return null;
}
async function mailTo(email) {
  const r = await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent('to:' + email)}`);
  const j = await r.json();
  return j.messages || [];
}

(async () => {
  console.log('== JobService (Hangfire) ==');
  const root = await call('GET', `${JOB}/`);
  check('JobService đang chạy', root.status === 200, JSON.stringify(root.json));
  const rec = await call('GET', `${JOB}/jobs/recurring`);
  const ids = (rec.data || []).map((j) => j.id);
  check('Đã đăng ký 3 recurring job (fasting 15 phút, FMD hằng ngày, báo cáo tuần)', rec.status === 200 && ids.length >= 3, JSON.stringify(ids));

  const email = `job.${Date.now()}@test.local`;
  const reg = await call('POST', `${ID}/api/auth/register`, null, { email, password: 'Password123!', fullName: 'Job Tester' });
  const tok = reg.data.accessToken, uid = reg.data.userId;

  console.log('== Nhắc nhịn ăn: JobService → RabbitMQ → DietFasting → Notification → Mailpit ==');
  // Phiên 0.5 giờ bắt đầu cách đây 20 phút => còn 10 phút, nằm trong cửa sổ nhắc 15 phút.
  const start = await call('POST', `${DIET}/api/fasting/start`, tok, { fastingType: 1, durationHours: 0.5, startTimeUtc: new Date(Date.now() - 20 * 60000).toISOString() });
  check('Bắt đầu phiên 30 phút (đã chạy 20 phút) = 201', start.status === 201, JSON.stringify(start.json));
  const trig = await call('POST', `${JOB}/jobs/trigger/fasting-check`);
  check('Kích hoạt fasting-check trong Hangfire = 200', trig.status === 200 && !!trig.data?.hangfireJobId, JSON.stringify(trig.json));
  const msg = await waitFor(async () => (await mailTo(email))[0]);
  check('Mailpit nhận email nhắc nhịn ăn gửi tới đúng địa chỉ', !!msg, 'không có email sau 25 giây');
  check('Tiêu đề email nói phiên sắp kết thúc hoặc đã đạt mục tiêu', !!msg && /nhịn ăn/i.test(msg.Subject), msg?.Subject);
  const trig2 = await call('POST', `${JOB}/jobs/trigger/fasting-check`);
  await sleep(4000);
  const count = (await mailTo(email)).length;
  check('Kích hoạt lần 2 không gửi trùng (chống trùng bằng Redis/EventId)', trig2.status === 200 && count === 1, `count=${count}`);

  console.log('== Cảnh báo vượt kcal FMD → email ==');
  const u2email = `fmd.${Date.now()}@test.local`;
  const reg2 = await call('POST', `${ID}/api/auth/register`, null, { email: u2email, password: 'Password123!', fullName: 'Fmd Tester' });
  const t2 = reg2.data.accessToken;
  await call('POST', `${DIET}/api/fmd/start`, t2, {});
  const big = await call('POST', `${DIET}/api/meals`, t2, { mealType: 2, loggedAt: new Date().toISOString(), foodItems: [{ externalFoodId: 'x', foodName: 'Buffet', servingSize: 100, servingUnit: 'g', calories: 1500, proteinGrams: 1, carbsGrams: 1, fatGrams: 1, fiberGrams: 1 }] });
  check('Bữa 1500 kcal bị đánh dấu vượt ngưỡng', big.data?.exceededThreshold === true);
  const alertLogs = await waitFor(async () => {
    const n = (await call('GET', `http://localhost:5004/api/notifications/user/${reg2.data.userId}`, t2)).data || [];
    return n.length ? n : null;
  });
  check('Có thông báo cảnh báo FMD trong hộp thư ứng dụng', !!alertLogs, 'không có thông báo');
  const alertMail = await waitFor(async () => (await mailTo(u2email))[0], 15, 1000);
  check('Email cảnh báo FMD gửi tới đúng địa chỉ của người dùng (không còn user@example.com)', !!alertMail && /FMD/.test(alertMail.Subject), alertMail?.Subject);

  console.log('== Tư vấn: email đặt lịch và email lời khuyên tới hội viên ==');
  const m3email = `cons.${Date.now()}@test.local`;
  const reg3 = await call('POST', `${ID}/api/auth/register`, null, { email: m3email, password: 'Password123!', fullName: 'Cons Tester' });
  const t3 = reg3.data.accessToken;
  const nuts = await call('GET', `${CONS}/api/consultations/nutritionists`);
  const nut = nuts.data[0];
  const day = new Date(Date.now() + 7 * 3600e3 + (400 + Math.floor(Math.random() * 300)) * 86400000).toISOString().slice(0, 10);
  const av = await call('GET', `${CONS}/api/consultations/nutritionists/${nut.id}/availability?date=${day}`);
  const slot = av.data.slots[1];
  const book = await call('POST', `${CONS}/api/consultations/book`, t3, { nutritionistId: nut.id, scheduledAtUtc: slot.startUtc, notes: 'email test' });
  check('Đặt lịch tư vấn = 201', book.status === 201, JSON.stringify(book.json));
  const bookMail = await waitFor(async () => (await mailTo(m3email)).find((m) => /Booking/i.test(m.Subject)), 15, 1000);
  check('Email xác nhận đặt lịch gửi tới đúng hội viên', !!bookMail, 'không có email đặt lịch');
  const doctorTok = forgeJwt({ nameid: nut.userId, email: 'doctor@test.local', role: 'Nutritionist' });
  const advice = await call('POST', `${CONS}/api/consultations/advice`, doctorTok, { consultationSessionId: book.data.id, adviceSummary: 'Tăng chất xơ từ thực vật', dietaryRecommendations: 'Thêm đậu và rau xanh', fastingRecommendations: 'Giữ 14:10 trong tuần đầu' });
  check('Bác sĩ kê lời khuyên = 201', advice.status === 201 || advice.status === 200, JSON.stringify(advice.json));
  const adviceMail = await waitFor(async () => (await mailTo(m3email)).find((m) => /Advice/i.test(m.Subject)), 15, 1000);
  check('Email lời khuyên gửi tới đúng hội viên', !!adviceMail, 'không có email lời khuyên');

  console.log('== Chuyển ngày FMD hằng ngày: JobService → DietFasting ==');
  const before = (await call('GET', `${DIET}/api/fmd/user/${reg2.data.userId}/active`, t2)).data;
  const fmdTrig = await call('POST', `${JOB}/jobs/trigger/fmd-check`);
  check('Kích hoạt fmd-check trong Hangfire = 200', fmdTrig.status === 200, JSON.stringify(fmdTrig.json));
  const after = await waitFor(async () => {
    const a = (await call('GET', `${DIET}/api/fmd/user/${reg2.data.userId}/active`, t2)).data;
    return a && a.currentDay > before.currentDay ? a : null;
  });
  check('Chu kỳ FMD sang ngày kế tiếp sau khi job chạy', !!after && after.currentDay === before.currentDay + 1, `before=${before?.currentDay} after=${after?.currentDay}`);

  console.log(`\nKết quả: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
