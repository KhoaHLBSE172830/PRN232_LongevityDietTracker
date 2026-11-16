// Seed dữ liệu demo: 3 tài khoản (hội viên, admin, bác sĩ), gán hồ sơ bác sĩ, tạo mẫu bữa ăn.
// Chạy sau khi backend đã lên:  node scripts/seed-demo.js [gatewayUrl] [postgresContainer] [pgPort]
// Mặc định: Gateway http://localhost:5048, container Postgres "longevitytest-postgres-1".
// Cần Docker để chạy lệnh psql đặt role (Identity chưa có seed Admin).
const { execFileSync } = require('child_process');

const GW = process.argv[2] || 'http://localhost:5048';
const PG = process.argv[3] || 'longevitytest-postgres-1';
const PASSWORD = 'Password123!';
const ACCOUNTS = [
  { email: 'minhanh@longevity.test', name: 'Minh Anh', role: 0 },
  { email: 'admin@longevity.test', name: 'Quản trị viên', role: 2 },
  { email: 'bacsi@longevity.test', name: 'BS. Demo', role: 1 },
];
const NUTRITIONIST_PROFILE_ID = '11111111-1111-1111-1111-111111111111';

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

const psql = (db, sql) => execFileSync('docker', ['exec', PG, 'psql', '-U', 'postgres', '-d', db, '-c', sql], { encoding: 'utf8' });

async function login(email) {
  const r = await call('POST', '/api/auth/login', null, { email, password: PASSWORD });
  if (r.status !== 200) throw new Error(`Đăng nhập ${email} thất bại: ${JSON.stringify(r.json)}`);
  return r.data;
}

(async () => {
  const ids = {};
  for (const a of ACCOUNTS) {
    const reg = await call('POST', '/api/auth/register', null, { email: a.email, password: PASSWORD, fullName: a.name });
    if (reg.status === 201) console.log(`Đã tạo ${a.email}`);
    else console.log(`${a.email}: ${reg.status === 409 || reg.status === 400 ? 'đã tồn tại' : 'lỗi ' + reg.status}`);
    ids[a.email] = (await login(a.email)).userId;
    psql('identity_db', `UPDATE users SET role = ${a.role} WHERE id = '${ids[a.email]}';`);
  }

  // Gán hồ sơ bác sĩ đầu tiên (seed) cho tài khoản bác sĩ để đăng nhập được vai trò bác sĩ.
  psql('consultation_db', `UPDATE nutritionist_profiles SET user_id = '${ids['bacsi@longevity.test']}' WHERE id = '${NUTRITIONIST_PROFILE_ID}';`);
  console.log('Đã gán hồ sơ TS. BS Đặng Minh Tuấn cho bacsi@longevity.test');

  // Mẫu bữa ăn (Admin tạo; đăng nhập lại để token có role Admin).
  const admin = await login('admin@longevity.test');
  const existing = (await call('GET', '/api/mealtemplates', admin.accessToken)).data || [];
  const templates = [
    { name: 'Cháo đậu xanh rau củ', description: 'Bữa sáng nhẹ, nhiều chất xơ', associatedFastingType: 2, totalCalories: 320, totalProteinGrams: 14, totalCarbsGrams: 50, totalFatGrams: 6, totalFiberGrams: 8 },
    { name: 'Salad đậu gà Địa Trung Hải', description: 'Bữa trưa thực vật, dầu ô-liu ép lạnh', associatedFastingType: 2, totalCalories: 410, totalProteinGrams: 22, totalCarbsGrams: 45, totalFatGrams: 14, totalFiberGrams: 11 },
    { name: 'Cá hồi áp chảo, khoai lang tím', description: 'Bữa tối thanh nhẹ trước khi mặt trời lặn', associatedFastingType: 3, totalCalories: 480, totalProteinGrams: 32, totalCarbsGrams: 40, totalFatGrams: 18, totalFiberGrams: 7 },
    { name: 'Súp rau củ FMD ngày 2', description: 'Bữa FMD ít năng lượng', associatedFastingType: 6, fmdDayNumber: 2, totalCalories: 250, totalProteinGrams: 6, totalCarbsGrams: 38, totalFatGrams: 9, totalFiberGrams: 9 },
  ];
  for (const t of templates) {
    if (existing.some((e) => e.name === t.name)) continue;
    const r = await call('POST', '/api/mealtemplates', admin.accessToken, t);
    console.log(`Mẫu "${t.name}": ${r.status === 201 ? 'đã tạo' : 'lỗi ' + r.status}`);
  }

  console.log('\nTài khoản demo (mật khẩu chung: ' + PASSWORD + '):');
  for (const a of ACCOUNTS) console.log(`  ${a.email}  (${['Hội viên', 'Chuyên gia', 'Admin'][a.role]})`);
})().catch((e) => { console.error(e.message); process.exit(1); });
