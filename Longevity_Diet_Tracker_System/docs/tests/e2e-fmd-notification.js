/**
 * Kiểm thử end-to-end tự động cho FMD + Notification (phần của Quốc) chạy qua YARP Gateway.
 *
 * Yêu cầu (xem docs/tests/E2E_TEST_CASES.md mục 2):
 *   - docker compose (postgres, redis, rabbitmq, mailpit) đang chạy; diet_db và notification_db đã `dotnet ef database update`
 *   - đang chạy: YarpGateway (https://localhost:7159), DietFasting.API (5002), Notification.API (5004), JobService.API (5005)
 *
 * Chạy:  node docs/tests/e2e-fmd-notification.js
 *
 * Biến môi trường (tùy chọn):
 *   PG_CONTAINER   tên container Postgres        (mặc định: longevity_postgres)
 *   GATEWAY        URL Gateway                   (mặc định: https://localhost:7159)
 *   MAILPIT        URL Mailpit                   (mặc định: http://localhost:8025)
 *   RABBIT_API     URL RabbitMQ management       (mặc định: http://localhost:15672)
 *   JOB_API        URL JobService                (mặc định: http://localhost:5005)
 *   JWT_SECRET     secret ký JWT                 (mặc định: secret trong appsettings.json của các service)
 *
 * LƯU Ý: script tạo dữ liệu thử (2 user giả, 1 chu kỳ FMD, vài chục bản ghi thông báo). Chỉ chạy trên DB local để test.
 * Mỗi ca in PASS / FAIL / INFO. FAIL = lỗi cần sửa (xem QUOC_REVIEW.md nhóm A và B).
 * INFO = đề xuất cải tiến hoặc hành vi đúng theo spec của Quốc (nhóm C), không tính là lỗi.
 */
const c = require("crypto");
const cp = require("child_process");

const PG = process.env.PG_CONTAINER || "longevity_postgres";
const G = process.env.GATEWAY || "https://localhost:7159";
const MP = process.env.MAILPIT || "http://localhost:8025";
const RABBIT = process.env.RABBIT_API || "http://localhost:15672";
const JOB = process.env.JOB_API || "http://localhost:5005";
const SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_longevity_diet_tracker_32chars!";

// Chứng chỉ dev HTTPS của Gateway là tự ký: chỉ nới lỏng khi gọi localhost để chạy test.
if (/^https:\/\/localhost/.test(G)) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const b = o => Buffer.from(JSON.stringify(o)).toString("base64url");
const mk = (id, email, role = "User") => {
  const h = b({ alg: "HS256", typ: "JWT" });
  const p = b({ nameid: id, email, role, iss: "LongevityIdentityService", aud: "LongevityDietTrackerClients", exp: Math.floor(Date.now() / 1000) + 3600 });
  return h + "." + p + "." + c.createHmac("sha256", SECRET).update(h + "." + p).digest("base64url");
};

const A = "e0e7a1b3-4f8a-493e-9b62-7a4c9f1e8201";
const B = "22222222-2222-2222-2222-222222222222";
const TA = mk(A, "a@longevity.app");
const TB = mk(B, "b@longevity.app");
const TAD = mk("99999999-9999-9999-9999-999999999999", "admin@longevity.app", "Admin");

const sleep = ms => new Promise(r => setTimeout(r, ms));
const req = async (method, url, body, token) => {
  const r = await fetch(url.startsWith("http") ? url : G + url, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = {};
  try { j = await r.json(); } catch { /* body rỗng */ }
  return { s: r.status, j };
};
const data = r => r.j.data ?? r.j.Data;
const psql = (db, q) => cp.execSync(`docker exec ${PG} psql -U postgres -d ${db} -tAc "${q}"`).toString().trim();
const mails = async () => (await fetch(MP + "/api/v1/messages")).json();
const clearMails = () => fetch(MP + "/api/v1/messages", { method: "DELETE" });
const publish = (routingKey, payload) => fetch(`${RABBIT}/api/exchanges/%2F/longevity_events_exchange/publish`, {
  method: "POST",
  headers: { Authorization: "Basic " + Buffer.from("guest:guest").toString("base64"), "content-type": "application/json" },
  body: JSON.stringify({ properties: {}, routing_key: routingKey, payload: JSON.stringify(payload), payload_encoding: "string" }),
});

// soft = true: ca mang tính đề xuất / hành vi đúng theo spec của Quốc (xem QUOC_REVIEW.md nhóm C).
// Không đạt thì in INFO và KHÔNG tính vào số ca lỗi.
const results = [];
const check = (id, name, pass, detail = "", soft = false) => {
  results.push({ id, pass, soft });
  const label = pass ? "PASS" : soft ? "INFO" : "FAIL";
  console.log(label.padEnd(5), id.padEnd(5), name, detail);
};

(async () => {
  // ---- B. FMD rules
  const parallel = await Promise.all(Array.from({ length: 10 }, () => req("GET", "/api/admin/fmd-rules")));
  const failed = parallel.filter(x => x.s !== 200).length;
  const ruleRows = psql("diet_db", "select count(*) from fmd_rules");
  check("S1", "10 GET fmd-rules song song trên bảng rỗng đều thành công", failed === 0, `(non-200=${failed}, rows=${ruleRows})`);
  const rules = data(await req("GET", "/api/admin/fmd-rules")) || [];
  check("S2", "5 quy tắc: ngày 1 = 1100, ngày 2-5 = 725", rules.length === 5 && rules[0]?.maxCalories === 1100 && rules.slice(1).every(x => x.maxCalories === 725), `(${rules.map(x => x.maxCalories).join(",")})`);
  const ruleBody = { maxCalories: 1100, targetProteinPercent: 11, targetFatPercent: 46, targetCarbPercent: 43, description: "Ngay 1" };
  check("S3a", "PUT rule bằng role User bị cấm (403)", (await req("PUT", "/api/admin/fmd-rules/1", ruleBody, TA)).s === 403);
  const putAdmin = await req("PUT", "/api/admin/fmd-rules/1", ruleBody, TAD);
  check("S3b", "PUT rule bằng role Admin thành công", putAdmin.s === 200, `(HTTP ${putAdmin.s})`);

  // ---- C. Chu kỳ FMD
  const started = await req("POST", "/api/fmd/start", { userId: B, startDate: new Date().toISOString() }, TA);
  check("S4", "start FMD: chủ chu kỳ lấy từ JWT, không từ body", started.s === 201 && data(started).userId === A, `(HTTP ${started.s})`);
  check("S5", "start FMD lần 2 trả 409", (await req("POST", "/api/fmd/start", { startDate: new Date().toISOString() }, TA)).s === 409);
  const idor = await req("GET", "/api/fmd/user/" + A + "/active", null, TB);
  check("S6", "user B không đọc được chu kỳ FMD của user A (mong đợi 403)", idor.s === 403, `(HTTP ${idor.s})`);

  // ---- D. Bữa ăn vượt ngưỡng -> email cảnh báo
  await clearMails();
  const meal = await req("POST", "/api/meals", {
    userId: A, mealType: 2, loggedAt: new Date().toISOString(), isHaraHachiBuCompliant: false, satietyPercentage: 100,
    foodItems: [{ externalFoodId: "t1", foodName: "Bua trua vuot nguong", servingSize: 1, servingUnit: "phan", calories: 1200, proteinGrams: 40, carbsGrams: 150, fatGrams: 45, fiberGrams: 10 }],
  }, TA);
  await sleep(4000);
  let m = await mails();
  check("S7a", "bữa 1200 kcal bị gắn exceededThreshold", meal.s === 201 && data(meal).exceededThreshold === true, `(HTTP ${meal.s})`);
  check("S7b", "email cảnh báo FMD xuất hiện trong Mailpit", (m.messages || []).some(x => /FMD Cycle Day 1 Alert/.test(x.Subject)), `(${(m.messages || []).map(x => x.Subject).join(" | ")})`);
  check("S7c", "notification_logs có bản ghi Sent kèm event_id", Number(psql("notification_db", "select count(*) from notification_logs where status='Sent' and event_id is not null")) >= 1);

  // ---- E. Hangfire chuyển ngày FMD
  const currentDay = async () => (data(await req("GET", "/api/fmd/user/" + A + "/active", null, TA)) || {}).currentDay;
  const d0 = await currentDay();
  await fetch(JOB + "/jobs/trigger/fmd-check", { method: "POST" }); await sleep(4000);
  const d1 = await currentDay();
  await fetch(JOB + "/jobs/trigger/fmd-check", { method: "POST" }); await sleep(4000);
  const d2 = await currentDay();
  // Theo spec của Quốc (QUOC_TASKS.md bước 5): mỗi trigger tăng 1 ngày. Chỉ là đề xuất cải tiến (C1).
  check("S8", "[đề xuất C1] chu kỳ vừa bắt đầu vẫn ở ngày 1 sau 2 lần trigger (tính ngày theo lịch)", d1 === 1 && d2 === 1, `(ngày: ${d0} -> ${d1} -> ${d2})`, true);

  // ---- F. Tùy chọn thông báo
  const prefs = (email, fasting, advice) => ({ emailNotificationsEnabled: email, fastingRemindersEnabled: fasting, nutritionistAdviceAlertsEnabled: advice });
  await req("PUT", "/api/notifications/preferences/" + A, prefs(false, true, true), TA);
  await clearMails();
  await publish("fmd.alert", { FmdCycleId: c.randomUUID(), UserId: A, DayNumber: 2, Message: "pref test", Id: c.randomUUID(), OccurredOnUtc: new Date().toISOString() });
  await sleep(3000);
  m = await mails();
  const lastStatus = psql("notification_db", "select status from notification_logs where user_id='" + A + "' order by created_at desc limit 1");
  check("S9a", "tắt email => không gửi mail", (m.total || 0) === 0, `(mails=${m.total})`);
  check("S9b", "[đề xuất C2] tắt email => lịch sử KHÔNG ghi 'Sent'", lastStatus !== "Sent", `(status='${lastStatus}')`, true);

  await req("PUT", "/api/notifications/preferences/" + A, prefs(true, false, true), TA);
  await clearMails();
  await req("POST", "/api/fasting/start", { fastingType: 2, startTimeUtc: new Date(Date.now() - 20 * 60000).toISOString(), durationHours: 0.5 }, TA);
  await fetch(JOB + "/jobs/trigger/fasting-check", { method: "POST" }); await sleep(5000);
  m = await mails();
  check("S10", "[đề xuất C3] FastingRemindersEnabled=false => không gửi email nhắc nhịn ăn", !(m.messages || []).some(x => /nhịn ăn/i.test(x.Subject)), `(${(m.messages || []).map(x => x.Subject).join(" | ")})`, true);
  await req("PUT", "/api/notifications/preferences/" + A, prefs(true, true, true), TA);

  // ---- G. Idempotency
  await clearMails();
  const send = (eventId, label) => req("POST", "/api/notifications/send", { userId: B, recipient: "b@longevity.app", subject: "idem " + label, body: "x", channel: 1, eventId }, TB);
  await send("dup-event-1", "first");
  for (let i = 0; i < 55; i++) await send("filler-" + i, "f" + i);
  await send("dup-event-1", "replay");
  await sleep(1500);
  const dupRows = psql("notification_db", "select count(*) from notification_logs where event_id='dup-event-1'");
  check("S11", "cùng EventId gửi lại sau 55 bản ghi mới vẫn bị bỏ qua", dupRows === "1", `(số dòng event_id=dup-event-1: ${dupRows})`);

  // ---- H. Bảo mật nội dung / phân quyền
  await clearMails();
  await publish("fmd.alert", { FmdCycleId: c.randomUUID(), UserId: B, DayNumber: 1, Message: "<img src=x onerror=alert(1)>", Id: c.randomUUID(), OccurredOnUtc: new Date().toISOString() });
  await sleep(3000);
  m = await mails();
  const html = m.messages?.[0] ? (await (await fetch(MP + "/api/v1/message/" + m.messages[0].ID)).json()).HTML : "";
  check("S12", "nội dung từ event được HTML-encode trong email", m.total > 0 && !/<img src=x/.test(html), `(thẻ thô còn trong email: ${/<img src=x/.test(html)})`);

  const h1 = await req("GET", "/api/notifications/user/" + A, null, TB);
  const h2 = await req("GET", "/api/notifications/preferences/" + A, null, TB);
  const h3 = await req("PUT", "/api/notifications/preferences/" + A, prefs(false, false, false), TB);
  check("S13", "user B không đọc/sửa được thông báo của user A (mong đợi 403)", [h1.s, h2.s, h3.s].every(x => x === 403), `(lịch sử=${h1.s}, prefs GET=${h2.s}, prefs PUT=${h3.s})`);

  await clearMails();
  const relay = await req("POST", "/api/notifications/send", { userId: B, recipient: "victim@example.org", subject: "Phishing test", body: "<a href='http://evil'>click</a>", channel: 1 }, TB);
  await sleep(1500);
  m = await mails();
  const delivered = (m.messages || []).some(x => x.Subject === "Phishing test");
  check("S14", "user thường không gửi được email tùy ý tới địa chỉ bất kỳ (mong đợi 403)", relay.s === 403 && !delivered, `(HTTP ${relay.s}, đã gửi=${delivered})`);

  // ---- I. Consultation
  await clearMails();
  await publish("consultation.booked", { ConsultationId: c.randomUUID(), UserId: B, NutritionistId: c.randomUUID(), ScheduledAt: new Date(Date.now() + 86400e3).toISOString(), Id: c.randomUUID(), OccurredOnUtc: new Date().toISOString() });
  await sleep(3000);
  m = await mails();
  check("S15", "consultation.booked sinh email xác nhận", (m.messages || []).some(x => /Booking/i.test(x.Subject)), `(${(m.messages || []).map(x => x.Subject).join(" | ")})`);

  const hard = results.filter(x => !x.soft);
  const failedHard = hard.filter(x => !x.pass).map(x => x.id);
  const infoOnly = results.filter(x => x.soft && !x.pass).map(x => x.id);
  console.log(`\nTỔNG: ${hard.length - failedHard.length}/${hard.length} ca bắt buộc đạt. Lỗi: ${failedHard.join(", ") || "(không có)"}. Đề xuất chưa áp dụng (INFO): ${infoOnly.join(", ") || "(không có)"}.`);
  process.exitCode = failedHard.length === 0 ? 0 : 1;
})().catch(e => { console.error("LỖI SCRIPT:", e); process.exitCode = 2; });
