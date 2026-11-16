// E2E đồng bộ đặt lịch: hội viên đặt với MỖI bác sĩ seed thì đúng bác sĩ đó nhìn thấy lịch và được thông báo.
// Chạy:  node docs/tests/e2e-booking-sync.js [gatewayUrl]
// Yêu cầu: hệ thống đang chạy và đã chạy `node scripts/seed-demo.js` (gắn 3 hồ sơ bác sĩ với 3 tài khoản).
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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DOCTORS = [
  { email: 'bacsi@longevity.test', password: 'Password123!', profileId: '11111111-1111-1111-1111-111111111111' },
  { email: 'nutritionist@longevitytracker.com', password: 'Nutritionist@123456', profileId: '22222222-2222-2222-2222-222222222222' },
  { email: 'bacsi3@longevity.test', password: 'Password123!', profileId: '33333333-3333-3333-3333-333333333333' },
];

async function login(email, password) {
  const r = await call('POST', '/api/auth/login', null, { email, password });
  if (r.status !== 200) throw new Error(`Đăng nhập ${email} thất bại: ${JSON.stringify(r.json)}`);
  return r.data;
}

(async () => {
  const email = `sync.${Date.now()}@test.local`;
  const reg = await call('POST', '/api/auth/register', null, { email, password: 'Password123!', fullName: 'Sync Tester' });
  const member = reg.data;
  const docs = [];
  for (const d of DOCTORS) docs.push({ ...d, ...(await login(d.email, d.password)) });

  console.log('== Hồ sơ bác sĩ gắn đúng tài khoản ==');
  const list = (await call('GET', '/api/consultations/nutritionists')).data;
  for (const d of docs) {
    const profile = list.find((n) => n.id === d.profileId);
    check(`Hồ sơ ${d.profileId.slice(0, 8)} gắn với ${d.email}`, profile && String(profile.userId).toLowerCase() === String(d.userId).toLowerCase(), profile?.userId);
  }

  const day = new Date(Date.now() + 7 * 3600e3 + (600 + Math.floor(Math.random() * 300)) * 86400000).toISOString().slice(0, 10);
  const booked = {};
  for (const [i, d] of docs.entries()) {
    console.log(`== Đặt lịch với bác sĩ ${d.profileId.slice(0, 8)} (${d.email}) ==`);
    const av = await call('GET', `/api/consultations/nutritionists/${d.profileId}/availability?date=${day}`);
    const slot = av.data.slots[i];
    const book = await call('POST', '/api/consultations/book', member.accessToken, { nutritionistId: d.profileId, scheduledAtUtc: slot.startUtc, notes: `sync-${i}` });
    check('Hội viên đặt lịch = 201', book.status === 201, JSON.stringify(book.json));
    booked[d.profileId] = book.data?.id;

    const mine = (await call('GET', `/api/consultations/nutritionist/${d.profileId}`, d.accessToken)).data || [];
    check('Đúng bác sĩ đó thấy lịch vừa đặt (trạng thái Chờ xác nhận)', mine.some((s) => s.id === book.data?.id && s.status === 1), `có ${mine.length} lịch`);
    for (const other of docs.filter((x) => x.profileId !== d.profileId)) {
      const r = await call('GET', `/api/consultations/nutritionist/${d.profileId}`, other.accessToken);
      check(`Bác sĩ khác (${other.email}) không xem được lịch này (403)`, r.status === 403, String(r.status));
    }

    let notif = null;
    for (let t = 0; t < 15 && !notif; t++) {
      await sleep(1000);
      const n = (await call('GET', `/api/notifications/user/${d.userId}`, d.accessToken)).data || [];
      notif = n.find((x) => /Lịch tư vấn mới/.test(x.subject));
    }
    check('Bác sĩ nhận thông báo "Lịch tư vấn mới" trong ứng dụng', !!notif, 'không có thông báo');

    const conf = await call('POST', `/api/consultations/${book.data.id}/confirm`, d.accessToken);
    check('Bác sĩ xác nhận lịch = 200', conf.status === 200, JSON.stringify(conf.json));
    const mySessions = (await call('GET', `/api/consultations/user/${member.userId}`, member.accessToken)).data || [];
    check('Hội viên thấy lịch chuyển sang Đã xác nhận', mySessions.some((s) => s.id === book.data.id && s.status === 2));
  }

  console.log(`\nKết quả: ${pass} PASS, ${fail} FAIL`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
