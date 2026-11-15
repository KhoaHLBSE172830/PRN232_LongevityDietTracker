/**
 * Kiểm thử end-to-end tự động cho Consultation Service (phần của Khôi) chạy qua YARP Gateway.
 *
 * Yêu cầu (xem KHOI_REVIEW.md mục 5):
 *   - docker compose (postgres, redis, rabbitmq, mailpit) đang chạy; diet_db, notification_db, consultation_db đã `dotnet ef database update`
 *   - đang chạy: YarpGateway (https://localhost:7159), Consultation.API (5003), DietFasting.API (5002/7002), Notification.API (5004)
 *
 * Chạy:  node docs/tests/e2e-consultation.js
 *
 * Biến môi trường (tùy chọn):
 *   PG_CONTAINER, GATEWAY, MAILPIT, RABBIT_API, JWT_SECRET (giống e2e-fmd-notification.js)
 *   RABBIT_CONTAINER  tên container RabbitMQ để dừng/bật ở ca K13   (mặc định: longevity_rabbitmq)
 *   DIET_PID_NAME     tên tiến trình DietFasting (Windows) để dừng ở ca K10 (mặc định: DietFasting.API)
 *   SKIP_DESTRUCTIVE=1  bỏ qua K10 và K13 (hai ca dừng service/container)
 *
 * LƯU Ý: script tạo dữ liệu thử (lịch hẹn, phiếu lời khuyên, email). Chỉ chạy trên DB local.
 * Mỗi ca in PASS / FAIL / INFO. FAIL = lỗi cần sửa (KHOI_REVIEW.md nhóm A). INFO = đề xuất, không tính là lỗi.
 */
const c = require("crypto");
const cp = require("child_process");

const PG = process.env.PG_CONTAINER || "longevity_postgres";
const G = process.env.GATEWAY || "https://localhost:7159";
const MP = process.env.MAILPIT || "http://localhost:8025";
const SECRET = process.env.JWT_SECRET || "super_secret_jwt_key_longevity_diet_tracker_32chars!";
const RABBIT_CONTAINER = process.env.RABBIT_CONTAINER || "longevity_rabbitmq";
const DIET_PROC = process.env.DIET_PID_NAME || "DietFasting.API";

if (/^https:\/\/localhost/.test(G)) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const b = o => Buffer.from(JSON.stringify(o)).toString("base64url");
const mk = (id, email, role = "User") => {
  const h = b({ alg: "HS256", typ: "JWT" });
  const p = b({ nameid: id, email, role, iss: "LongevityIdentityService", aud: "LongevityDietTrackerClients", exp: Math.floor(Date.now() / 1000) + 3600 });
  return h + "." + p + "." + c.createHmac("sha256", SECRET).update(h + "." + p).digest("base64url");
};

const A = "e0e7a1b3-4f8a-493e-9b62-7a4c9f1e8201";   // hội viên A
const B = "22222222-2222-2222-2222-222222222222";   // hội viên B
const DOC1 = "11111111-1111-1111-1111-111111111111"; // hồ sơ bác sĩ #1 (seed)
const DOC2 = "22222222-2222-2222-2222-222222222222"; // hồ sơ bác sĩ #2 (seed)
const DOC1_USER = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"; // UserId của bác sĩ #1 (seed)
const EMPTY = "00000000-0000-0000-0000-000000000000";
const TA = mk(A, "a@longevity.app");
const TB = mk(B, "b@longevity.app");
const TN = mk(DOC1_USER, "doc1@longevity.app", "Nutritionist");
const TAD = mk("99999999-9999-9999-9999-999999999999", "admin@longevity.app", "Admin");
const DOC2_USER = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";                        // UserId của bác sĩ #2 (seed)
const TN2 = mk(DOC2_USER, "doc2@longevity.app", "Nutritionist");                // bác sĩ #2 (có hồ sơ)
const TNX = mk("dddddddd-dddd-dddd-dddd-dddddddddddd", "ghost@longevity.app", "Nutritionist"); // role Nutritionist nhưng KHÔNG có hồ sơ

const sleep = ms => new Promise(r => setTimeout(r, ms));
const req = async (method, url, body, token) => {
  const t0 = Date.now();
  const r = await fetch(url.startsWith("http") ? url : G + url, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = {};
  try { j = await r.json(); } catch { /* body rỗng */ }
  return { s: r.status, j, ms: Date.now() - t0 };
};
const data = r => r.j.data ?? r.j.Data;
const psql = (db, q) => cp.execSync(`docker exec ${PG} psql -U postgres -d ${db} -tAc "${q.replace(/"/g, '\\"')}"`).toString().trim();
const mails = async () => (await fetch(MP + "/api/v1/messages")).json();
const clearMails = () => fetch(MP + "/api/v1/messages", { method: "DELETE" });
const future = (days = 2) => new Date(Date.now() + days * 86400e3).toISOString();

const results = [];
const check = (id, name, pass, detail = "", soft = false) => {
  results.push({ id, pass, soft });
  const label = pass ? "PASS" : soft ? "INFO" : "FAIL";
  console.log(label.padEnd(5), id.padEnd(5), name, detail);
};

(async () => {
  // ---- K0. Dữ liệu cơ bản
  const list = await req("GET", "/api/consultations/nutritionists");
  check("K0", "danh sách 3 bác sĩ từ DB (seed)", list.s === 200 && (data(list) || []).length === 3, `(HTTP ${list.s}, ${(data(list) || []).length} bác sĩ)`);

  // ---- K1. Xác thực: không token
  const anon = {
    "POST book": await req("POST", "/api/consultations/book", { userId: A, nutritionistId: DOC1, scheduledAtUtc: future(), notes: "anon" }),
    "GET user/{A}": await req("GET", "/api/consultations/user/" + A),
    "GET user/{A}/advices": await req("GET", "/api/consultations/user/" + A + "/advices"),
    "GET nutritionist/{id}": await req("GET", "/api/consultations/nutritionist/" + DOC1),
    "GET review-user/{A}": await req("GET", "/api/consultations/review-user/" + A),
  };
  const open = Object.entries(anon).filter(([, r]) => r.s < 400).map(([k, r]) => `${k}=${r.s}`);
  check("K1", "endpoint nghiệp vụ yêu cầu đăng nhập (không token => 401)", open.length === 0, `(không cần token: ${open.join(", ") || "không có"})`);

  // ---- K2. Phân quyền theo vai trò (bảng spec: bác sĩ/Admin)
  const asUser = {
    "GET review-user": await req("GET", "/api/consultations/review-user/" + B, null, TA),
    "GET nutritionist/{id}": await req("GET", "/api/consultations/nutritionist/" + DOC1, null, TA),
  };
  const bad2 = Object.entries(asUser).filter(([, r]) => r.s !== 403).map(([k, r]) => `${k}=${r.s}`);
  check("K2", "role User không gọi được review-user và nutritionist/{id} (mong đợi 403)", bad2.length === 0, `(sai: ${bad2.join(", ") || "không có"})`);

  // ---- K3. Chủ sở hữu
  const own = [
    await req("GET", "/api/consultations/user/" + A, null, TB),
    await req("GET", "/api/consultations/user/" + A + "/advices", null, TB),
  ];
  check("K3", "user B không xem được lịch hẹn và phiếu lời khuyên của user A (mong đợi 403)", own.every(r => r.s === 403), `(HTTP ${own.map(r => r.s).join(", ")})`);

  // ---- K4/K5. Đặt lịch
  await clearMails();
  const booked = await req("POST", "/api/consultations/book", { userId: A, nutritionistId: DOC1, scheduledAtUtc: future(), notes: "Tu van 16:8" }, TA);
  const session = data(booked);
  check("K4a", "đặt lịch thành công (201, trạng thái Pending=1)", booked.s === 201 && session?.status === 1, `(HTTP ${booked.s}, status=${session?.status})`);
  const forged = await req("POST", "/api/consultations/book", { userId: A, nutritionistId: DOC1, scheduledAtUtc: future(3), notes: "gia mao" }, TB);
  check("K4b", "token của B không đặt lịch được thay user A (mong đợi 403 hoặc chủ lịch = B)", forged.s === 403 || data(forged)?.userId === B, `(HTTP ${forged.s}, userId lưu=${data(forged)?.userId?.slice(0, 8)})`);
  const past = await req("POST", "/api/consultations/book", { userId: A, nutritionistId: DOC1, scheduledAtUtc: "2020-01-01T09:00:00Z", notes: "qua khu" }, TA);
  check("K5a", "không đặt lịch vào thời điểm đã qua (mong đợi 400)", past.s === 400, `(HTTP ${past.s})`);
  const noZ = await req("POST", "/api/consultations/book", { userId: A, nutritionistId: DOC1, scheduledAtUtc: future().replace("Z", ""), notes: "khong Z" }, TA);
  check("K5b", "giờ hẹn không có chữ Z không gây lỗi 500", noZ.s < 500, `(HTTP ${noZ.s})`);
  const ghost = await req("POST", "/api/consultations/book", { userId: A, nutritionistId: EMPTY, scheduledAtUtc: future(), notes: "x" }, TA);
  check("K5c", "bác sĩ không tồn tại trả 404", ghost.s === 404, `(HTTP ${ghost.s})`);
  await sleep(3000);
  let m = await mails();
  check("K6", "đặt lịch sinh email xác nhận (consultation.booked)", (m.messages || []).some(x => /Booking/i.test(x.Subject)), `(${(m.messages || []).map(x => x.Subject).join(" | ")})`);

  // ---- K7. Payload do giao diện gửi (thiếu userId, nutritionistId)
  const uiAdvice = await req("POST", "/api/consultations/advice",
    { consultationSessionId: session.id, adviceSummary: "Tang chat xo", dietaryRecommendations: "Rau cu qua", fastingRecommendations: "16/8 moi ngay" }, TN);
  await sleep(500);
  const mine = data(await req("GET", "/api/consultations/user/" + A + "/advices", null, TA)) || [];
  const storedUser = psql("consultation_db", `select user_id from advice_notes where consultation_session_id='${session.id}'`);
  const seen = mine.some(x => x.consultationSessionId === session.id);
  check("K7", "phiếu lời khuyên gửi từ giao diện hiện ra ở danh sách của hội viên", uiAdvice.s === 201 && seen, `(HTTP ${uiAdvice.s}, UserId lưu trong DB=${storedUser}, hội viên thấy phiếu này: ${seen})`);

  // ---- K8. Phiếu lời khuyên đúng payload + email
  const s2 = data(await req("POST", "/api/consultations/book", { userId: A, nutritionistId: DOC1, scheduledAtUtc: future(4), notes: "lan 2" }, TA));
  await clearMails();
  const good = { consultationSessionId: s2.id, userId: A, nutritionistId: DOC1, adviceSummary: "Tang rau tim", dietaryRecommendations: "Dau den va hat", fastingRecommendations: "16/8 moi ngay" };
  const adv = await req("POST", "/api/consultations/advice", good, TN);
  await sleep(3500); m = await mails();
  check("K8a", "gửi phiếu đúng payload: 201 và phiên chuyển Completed", adv.s === 201 && psql("consultation_db", `select status from consultation_sessions where id='${s2.id}'`) === "3", `(HTTP ${adv.s})`);
  check("K8b", "phiếu lời khuyên sinh email cho bệnh nhân (advice.sent)", (m.messages || []).some(x => /Advice/i.test(x.Subject)), `(${(m.messages || []).map(x => x.Subject).join(" | ")})`);
  const again = await req("POST", "/api/consultations/advice", good, TN);
  check("K8c", "gửi phiếu lần 2 cho cùng phiên trả 409 (không 500)", again.s === 409, `(HTTP ${again.s})`);

  // ---- K9. Ràng buộc nghiệp vụ của phiếu lời khuyên
  // Mỗi ca dùng một lịch hẹn riêng để kết quả không bị ảnh hưởng bởi phiếu đã tạo ở ca trước.
  const freshSession = async (days, note) => data(await req("POST", "/api/consultations/book", { userId: A, nutritionistId: DOC1, scheduledAtUtc: future(days), notes: note }, TA));
  const s3 = await freshSession(5, "K9a");
  const mismatch = await req("POST", "/api/consultations/advice", { consultationSessionId: s3.id, userId: B, nutritionistId: DOC2, adviceSummary: "sai nguoi", dietaryRecommendations: "rau cu qua nhieu", fastingRecommendations: "16/8 moi ngay" }, TN);
  check("K9a", "phiếu phải đúng bệnh nhân và bác sĩ của phiên (mong đợi 400/403)", mismatch.s === 400 || mismatch.s === 403, `(HTTP ${mismatch.s})`);
  const s4 = await freshSession(6, "K9b");
  const otherDoc = await req("POST", "/api/consultations/advice", { consultationSessionId: s4.id, userId: A, nutritionistId: DOC1, adviceSummary: "bac si khac", dietaryRecommendations: "rau cu qua nhieu", fastingRecommendations: "16/8 moi ngay" }, mk("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "doc2@longevity.app", "Nutritionist"));
  check("K9b", "bác sĩ khác không kê đơn thay cho phiên của bác sĩ #1 (mong đợi 403)", otherDoc.s === 403, `(HTTP ${otherDoc.s})`);
  const s5 = await freshSession(7, "K9c");
  const empty = await req("POST", "/api/consultations/advice", { consultationSessionId: s5.id, userId: A, nutritionistId: DOC1, adviceSummary: "", dietaryRecommendations: "", fastingRecommendations: "" }, TN);
  check("K9c", "phiếu rỗng bị từ chối (mong đợi 400)", empty.s === 400, `(HTTP ${empty.s})`);
  const verifiedOff = psql("consultation_db", `update nutritionist_profiles set is_verified=false where id='${DOC2}' returning id`);
  const unv = await req("POST", "/api/consultations/book", { userId: A, nutritionistId: DOC2, scheduledAtUtc: future(), notes: "chua duyet" }, TA);
  psql("consultation_db", `update nutritionist_profiles set is_verified=true where id='${DOC2}'`);
  check("K9d", "không đặt lịch với bác sĩ chưa được xác minh (mong đợi 400)", unv.s === 400, `(HTTP ${unv.s}, đã đặt tắt xác minh: ${verifiedOff ? "có" : "không"})`);

  // ---- K9e. Token có role Nutritionist nhưng không gắn với hồ sơ bác sĩ nào
  const s6 = await freshSession(8, "K9e");
  const ghostDoc = await req("POST", "/api/consultations/advice", { consultationSessionId: s6.id, adviceSummary: "khong co ho so", dietaryRecommendations: "rau cu qua", fastingRecommendations: "16/8 hang ngay" }, TNX);
  check("K9e", "tài khoản role Nutritionist nhưng không có hồ sơ bác sĩ không kê đơn được (mong đợi 403)", ghostDoc.s === 403, `(HTTP ${ghostDoc.s})`);

  // ---- K15. Bác sĩ chỉ xem lịch/bệnh nhân của chính mình
  const peek = await req("GET", "/api/consultations/nutritionist/" + DOC1, null, TN2);
  check("K15", "bác sĩ #2 không xem được danh sách bệnh nhân của bác sĩ #1 (mong đợi 403)", peek.s === 403, `(HTTP ${peek.s})`);

  // ---- K16. Bác sĩ xem lịch hẹn của hội viên bất kỳ (đề xuất)
  const anyUser = await req("GET", "/api/consultations/user/" + B, null, TN);
  check("K16", "[đề xuất] bác sĩ chỉ xem lịch hẹn của hội viên đã đặt lịch với mình", anyUser.s !== 200 || (data(anyUser) || []).every(x => x.nutritionistId === DOC1), `(HTTP ${anyUser.s}, ${(data(anyUser) || []).length} lịch, gồm cả lịch với bác sĩ khác: ${(data(anyUser) || []).some(x => x.nutritionistId !== DOC1)})`, true);

  // ---- K17. Giờ hẹn có múi giờ khác UTC được quy đổi đúng
  const tz = await req("POST", "/api/consultations/book", { userId: A, nutritionistId: DOC1, scheduledAtUtc: "2027-03-10T09:00:00+07:00", notes: "K17" }, TA);
  const stored = data(tz)?.scheduledAtUtc;
  check("K17", "giờ hẹn 09:00+07:00 được lưu là 02:00 UTC", tz.s === 201 && /^2027-03-10T02:00:00/.test(stored || ""), `(HTTP ${tz.s}, lưu=${stored})`);

  // ---- K12. Đồng thời: nhiều request đặt lịch cùng lúc
  await sleep(4000); await clearMails();   // chờ email của các ca trước (consumer chạy bất đồng bộ) rồi mới xóa hộp thư
  const before = Number(psql("consultation_db", `select count(*) from consultation_sessions where user_id='${B}'`));
  const rs = await Promise.all(Array.from({ length: 20 }, (_, i) => req("POST", "/api/consultations/book", { userId: B, nutritionistId: DOC1, scheduledAtUtc: future(10 + i), notes: "dong thoi " + i }, TB)));
  await sleep(6000); m = await mails();
  const okCount = rs.filter(x => x.s === 201).length;
  const bookedMails = (m.messages || []).filter(x => /Booking/i.test(x.Subject)).length;
  check("K12", "20 lịch đặt đồng thời: đủ 20 bản ghi và đủ 20 email", okCount === 20 && bookedMails === 20, `(201=${okCount}, email=${bookedMails}, hàng mới=${Number(psql("consultation_db", `select count(*) from consultation_sessions where user_id='${B}'`)) - before})`);

  // ---- K14. Trùng giờ (đề xuất)
  const slot = future(30);
  const d1 = await req("POST", "/api/consultations/book", { userId: A, nutritionistId: DOC1, scheduledAtUtc: slot, notes: "slot" }, TA);
  const d2 = await req("POST", "/api/consultations/book", { userId: B, nutritionistId: DOC1, scheduledAtUtc: slot, notes: "slot" }, TB);
  check("K14", "[đề xuất] hai hội viên không đặt trùng giờ với cùng một bác sĩ", !(d1.s === 201 && d2.s === 201), `(HTTP ${d1.s}, ${d2.s})`, true);

  // ---- K10. gRPC: dữ liệu thật và dữ liệu bịa khi DietFasting không phản hồi
  const FAKE = "totalCompletedFasts=24,totalFastedHours=384";
  const sig = r => { const d = data(r); return d ? `totalCompletedFasts=${d.fastingSummary?.totalCompletedFasts},totalFastedHours=${d.fastingSummary?.totalFastedHours}` : "(không có dữ liệu)"; };
  const real = await req("GET", "/api/consultations/review-user/" + B, null, TAD);
  check("K10a", "review-user trả số liệu thật từ DietFasting (user chưa nhịn lần nào => 0)", real.s === 200 && data(real)?.fastingSummary?.totalCompletedFasts === 0, `(HTTP ${real.s}, ${sig(real)})`);

  // ---- K10c/K10d. review-user chỉ cho bác sĩ có phiên với bệnh nhân đó (AGENT.md 4.3)
  const noSession = await req("GET", "/api/consultations/review-user/" + "44444444-4444-4444-4444-444444444444", null, TN);
  check("K10c", "review-user cho hội viên chưa có lịch tư vấn nào bị từ chối (mong đợi 403)", noSession.s === 403, `(HTTP ${noSession.s})`);
  const onlyDoc1 = data(await req("POST", "/api/consultations/book", { userId: "55555555-5555-5555-5555-555555555555", nutritionistId: DOC1, scheduledAtUtc: future(60), notes: "K10d" }, mk("55555555-5555-5555-5555-555555555555", "patient5@longevity.app")));
  const wrongDoc = await req("GET", "/api/consultations/review-user/" + "55555555-5555-5555-5555-555555555555", null, TN2);
  check("K10d", "bác sĩ #2 không xem được dữ liệu của bệnh nhân chỉ có lịch với bác sĩ #1 (mong đợi 403)", !!onlyDoc1 && wrongDoc.s === 403, `(HTTP ${wrongDoc.s})`);

  if (!process.env.SKIP_DESTRUCTIVE) {
    try { cp.execSync(`powershell.exe -NoProfile -Command "Get-Process -Name ${DIET_PROC} -ErrorAction SilentlyContinue | Stop-Process -Force"`); } catch { /* bỏ qua */ }
    await sleep(2500);
    const down = await req("GET", "/api/consultations/review-user/" + B, null, TAD);
    const fabricated = down.s === 200 && sig(down) === FAKE;
    check("K10b", "DietFasting không phản hồi => KHÔNG trả số liệu bịa (mong đợi lỗi 5xx hoặc cờ 'không có dữ liệu')", !fabricated, `(HTTP ${down.s}, ${sig(down)})`);

    // ---- K13. RabbitMQ tắt: độ trễ của API
    try { cp.execSync(`docker stop ${RABBIT_CONTAINER}`, { stdio: "ignore" }); } catch { /* bỏ qua */ }
    await sleep(1500);
    const slow = await req("POST", "/api/consultations/book", { userId: A, nutritionistId: DOC1, scheduledAtUtc: future(40), notes: "rabbit tat" }, TA);
    check("K13", "RabbitMQ tắt: đặt lịch vẫn thành công và không bị treo (< 8 giây)", slow.s === 201 && slow.ms < 8000, `(HTTP ${slow.s}, ${slow.ms}ms)`);
    const slow2 = await req("POST", "/api/consultations/book", { userId: A, nutritionistId: DOC1, scheduledAtUtc: future(41), notes: "rabbit tat lan 2" }, TA);
    check("K13b", "[đề xuất] lần đặt lịch thứ hai khi broker vẫn tắt không phải chờ kết nối lại (cooldown)", slow2.s === 201 && slow2.ms < 1500, `(HTTP ${slow2.s}, ${slow2.ms}ms)`, true);
    try { cp.execSync(`docker start ${RABBIT_CONTAINER}`, { stdio: "ignore" }); } catch { /* bỏ qua */ }
  } else {
    console.log("(bỏ qua K10b và K13 vì SKIP_DESTRUCTIVE=1)");
  }

  const hard = results.filter(x => !x.soft);
  const failedHard = hard.filter(x => !x.pass).map(x => x.id);
  const infoOnly = results.filter(x => x.soft && !x.pass).map(x => x.id);
  console.log(`\nTỔNG: ${hard.length - failedHard.length}/${hard.length} ca bắt buộc đạt. Lỗi: ${failedHard.join(", ") || "(không có)"}. Đề xuất chưa áp dụng (INFO): ${infoOnly.join(", ") || "(không có)"}.`);
  process.exitCode = failedHard.length === 0 ? 0 : 1;
})().catch(e => { console.error("LỖI SCRIPT:", e); process.exitCode = 2; });
