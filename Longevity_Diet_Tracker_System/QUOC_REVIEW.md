# REVIEW CODE NHÁNH `quoc` — NHỮNG ĐIỂM CẦN SỬA (`QUOC_REVIEW.md`)

> **Người review**: Kiệt. **Ngày**: 16/11/2026. **Phạm vi**: commit `b97ff42` và `e373baa` (đã có trong `dev`).  
> **Đối chiếu với**: `QUOC_TASKS.md` (spec Quốc tự đặt ra), `AGENT.md`, `PLAN_ASSIGNMENT.md`.  
> **Cách kiểm tra**: chạy thật cả luồng (Postgres, Redis, RabbitMQ, Mailpit, Gateway, Notification, DietFasting, JobService, frontend), không chỉ đọc code. Kết quả chi tiết và cách chạy lại: `docs/tests/E2E_TEST_CASES.md`.

## 0. Đọc trước: cách phân loại để không báo oan

Mỗi điểm được xếp vào **một trong 3 nhóm**. Chỉ nhóm A là *lỗi thật của phần Quốc làm*.

| Nhóm | Ý nghĩa | Số lượng |
| :---: | :--- | :---: |
| **A** | **Lỗi trong phần Quốc đã làm**, trái với chính spec của Quốc hoặc `AGENT.md`, có bằng chứng khi chạy | **7** |
| **B** | Lỗi **có từ trước** (code gốc, không nằm trong diff của Quốc) nhưng thuộc service Quốc phụ trách | 2 |
| **C** | **Không phải lỗi**: đúng spec của Quốc, hoặc hạn chế đã biết/ngoài phạm vi. Chỉ ghi lại để biết khi demo | 7 |

> Quốc **đã làm đúng** phần lớn việc trong `QUOC_TASKS.md` (xem Mục 1). Danh sách dưới đây là những chỗ còn lại.

---

## 1. Những gì Quốc đã làm đúng (đã kiểm chứng khi chạy)

| Hạng mục trong `QUOC_TASKS.md` | Kết quả |
| :--- | :--- |
| 2.1 Notification chạy cổng 5004 (Kestrel + `launchSettings`) | ✅ nghe đúng `:5004`, gọi qua Gateway được |
| 2.2 Migration `InitialNotificationDb` chuẩn `snake_case`, có `event_id` | ✅ áp dụng sạch trên DB trống, cột và index đúng |
| 2.3 (1) `fmd.alert`, `advice.sent` chuyển sang `Channel = Email` + HTML y tế | ✅ email cảnh báo FMD ra Mailpit, `notification_logs.status = Sent`, có `event_id` |
| 2.3 (2) Binding `consultation.#` + xử lý `consultation.booked` | ✅ có email "Consultation Booking Confirmed" |
| 2.3 (3) Tự retry kết nối RabbitMQ | ✅ (đã bật Notification trước/sau RabbitMQ đều nối được) |
| 3.2 `FmdController`: lấy `UserId` từ JWT khi `POST /fmd/start` | ✅ chủ chu kỳ là user trong token, bỏ qua `userId` trong body |
| 3.2 `FmdService`: chuẩn hóa `StartDate` về UTC | ✅ |
| 3.2 Seed 5 quy tắc khi bảng rỗng | ✅ đúng 1100 / 725 kcal |
| 3.2 `AdvanceActiveCyclesAsync` + nhánh `else if (FmdCycleDailyJob)` | ✅ trigger làm tăng `CurrentDay` đúng như bước 5 của hướng dẫn test |
| `PUT /api/admin/fmd-rules/{day}` chỉ Admin | ✅ role User bị 403 |
| Quy tắc "không sửa logic của Kiệt" (mục 3.2) | ✅ diff chỉ thêm nhánh `else if` vào `FastingScheduleTriggerConsumer`, không động vào `Fasting*`, `shared/`, `features/` của người khác |
| Build toàn solution | ✅ 0 lỗi, 0 cảnh báo |

---

## 2. NHÓM A: LỖI TRONG PHẦN QUỐC ĐÃ LÀM

### A1. 🔴 Frontend FMD nuốt lỗi HTTP và báo "thành công" giả
- **Đối chiếu spec**: `QUOC_TASKS.md` 4.1 chỉ cho phép mock fallback *"khi chưa bật Backend hoặc chưa có JWT Token"*. Hướng dẫn test bước 3 còn yêu cầu *"Nhận đúng 409 Conflict"* khi gọi lần 2. Code đang dùng fallback cho **mọi** lỗi, kể cả 409/401/400.
- **Chỗ lỗi**: `features/fmd/fmdApi.js`, hàm `startCycle` (khối `catch` trả chu kỳ demo `fmd-demo-cycle-01`) và `updatePreferences` (`catch` trả lại giá trị vừa bật).
- **Bằng chứng**: có token thật, bấm "Bắt Đầu Chu Kỳ FMD 5 Ngày Mới" **hai lần**. Log mạng: POST thứ nhất **201**, POST thứ hai **409**. Giao diện vẫn hiện "✅ Đã kích hoạt Chu kỳ FMD #1" ở cả hai lần; DB chỉ có 1 chu kỳ.
- **Hậu quả**: người dùng tin rằng chu kỳ mới đã chạy trong khi server từ chối. Tương tự, tắt/bật tùy chọn thông báo khi server lỗi vẫn hiện như đã lưu.
- **Cách sửa**:
  ```js
  // Chỉ coi là "backend chưa bật" khi lỗi mạng hoặc Gateway trả 502/503/504
  const isOffline = (err) => !err.response || [502, 503, 504].includes(err.response.status);
  const serverMessage = (err) => err.response?.data?.message ?? err.response?.data?.Message ?? err.message;

  // trong startCycle / updatePreferences:
  } catch (err) {
    if (!hasValidToken() || isOffline(err)) return demoFallback();   // giữ đúng ý "không lỗi trắng trang"
    throw new Error(serverMessage(err));                              // 409, 401, 400... thì báo lỗi thật
  }
  ```
  `FmdView.handleStartCycle` và `handleTogglePreference` cần `try/catch` và hiện banner lỗi (đang chỉ có `try/finally`). Tham khảo `features/fasting/fastingApi.js` và `FastingView.jsx` (cùng chính sách).
- **Kiểm tra lại**: ca I9 trong `docs/tests/E2E_TEST_CASES.md`.

### A2. 🟠 Chống gửi trùng (idempotency) hỏng khi có hơn 50 bản ghi
- **Đối chiếu spec**: `QUOC_TASKS.md` mục 3.1 (Warning 5) và Definition of Done: *"kiểm tra Idempotency (`EventId`)"*. `AGENT.md` Warning 5.
- **Chỗ lỗi**: `NotificationService.SendAndLogNotificationAsync`. Khi `HasEventBeenProcessedAsync` = true, code tìm bản ghi cũ trong **50 log mới nhất của user**; nếu không thấy thì **chạy tiếp, tạo log mới và gửi lại email**. Đổi giới hạn từ `1` lên `50` chỉ dời ngưỡng.
- **Bằng chứng** (script `S11`): gửi `eventId = dup-event-1`, gửi thêm 55 thông báo khác, rồi gửi lại `dup-event-1` → có **2 dòng** `event_id = dup-event-1` trong `notification_logs` và email thứ hai được gửi.
- **Hậu quả**: event bị phát lại (RabbitMQ at-least-once) sẽ gửi trùng email khi user có nhiều thông báo. Cũng làm yếu cơ chế chống trùng nhắc nhở nhịn ăn (Id event cố định theo phiên).
- **Cách sửa**:
  1. Đã xử lý rồi thì **dừng ngay**, tra bản ghi theo `event_id` (thêm `GetByEventIdAsync` vào `INotificationLogRepository`) thay vì quét 50 dòng.
  2. Chống đua giữa 2 consumer: index unique một phần `HasIndex(n => n.EventId).IsUnique().HasFilter("event_id IS NOT NULL")`, bắt lỗi trùng khóa và coi như đã xử lý (cần sinh lại migration `InitialNotificationDb`).
- **Kiểm tra lại**: script `S11`, ca H2.

### A3. 🟠 Email không HTML-encode nội dung lấy từ event
- **Đối chiếu**: template HTML do Quốc thêm ở 2.3; nội dung `{fmdEvent.Message}`, `{adviceEvent.AdviceSummary}` được nhúng thẳng.
- **Bằng chứng** (script `S12`): publish `fmd.alert` có `Message = "<img src=x onerror=alert(1)>"`, email trong Mailpit chứa nguyên thẻ `<img src=x ...>`.
- **Hậu quả**: `AdviceSummary` do bác sĩ nhập, nên người nhập có thể chèn HTML/link vào email gửi bệnh nhân.
- **Cách sửa**: `using System.Net;` rồi `WebUtility.HtmlEncode(fmdEvent.Message)`, `WebUtility.HtmlEncode(adviceEvent.AdviceSummary)`, tương tự mọi giá trị chuỗi nhúng vào HTML (kể cả `Subject` nếu hiển thị trong HTML).
- **Kiểm tra lại**: script `S12`, ca H3.

### A4. 🟠 `GET /api/fmd/user/{userId}/active` không kiểm tra chủ sở hữu
- **Đối chiếu spec**: `QUOC_TASKS.md` 3.2: *"…đồng thời **kiểm tra quyền sở hữu dữ liệu** theo `AGENT.md` 4.3"*. Mới làm cho `POST /start`, chưa làm cho `GET`.
- **Bằng chứng** (script `S6`): user B (token B) gọi `GET /api/fmd/user/{A}/active` → **200** kèm chu kỳ của A.
- **Cách sửa** (giống `FastingController`):
  ```csharp
  if (userId != CurrentUserId) throw new ForbiddenException("You can only view your own FMD cycle.");
  ```
- **Kiểm tra lại**: script `S6`, ca C5.

### A5. 🟡 Seed quy tắc FMD trong `GET` bị đua dữ liệu (đã bám đúng spec, nhưng cài đặt chưa an toàn)
- **Đối chiếu spec**: 3.2 yêu cầu seed khi gọi `GetAllRulesAsync()` nên **giữ nguyên ý định này**; vấn đề nằm ở cách cài đặt.
- **Bằng chứng** (script `S1`): bảng `fmd_rules` rỗng, 10 request `GET` song song → **9 request lỗi 500** (log: vi phạm unique `ix_fmd_rules_day_number`, SQLSTATE 23505). Bảng cuối cùng vẫn đúng 5 dòng.
- **Mức ảnh hưởng thật**: chỉ xảy ra khi bảng còn rỗng và có nhiều request đồng thời (ví dụ React StrictMode gọi `useEffect` hai lần ở chế độ dev). Frontend rơi về quy tắc mặc định nên người dùng gần như không thấy; nhưng API trả 500 là không ổn.
- **Cách sửa (vẫn seed-on-read)**: để Infrastructure lo việc chống đua, ví dụ thêm `Task SeedDefaultsAsync(IEnumerable<FmdRule>)` vào `IFmdRuleRepository`, cài bằng `INSERT ... ON CONFLICT (day_number) DO NOTHING` (hoặc bắt `DbUpdateException` rồi đọc lại). `FmdRuleService` chỉ gọi hàm này rồi đọc danh sách. (Application không nhận `DbUpdateException`, đúng Warning 1.)
- **Kiểm tra lại**: script `S1`, ca B2.

### A6. 🟡 `GET /api/admin/fmd-rules` cho truy cập ẩn danh, khác bảng đặc tả của Quốc
- **Đối chiếu**: bảng 2.1 trong `QUOC_TASKS.md` ghi *"Header: Bearer Token (Role = Admin)"*; `AGENT.md` 4.3 yêu cầu mọi endpoint kiểm tra claims. Code đang `[AllowAnonymous]` cho `GET`.
- **Có thể là chủ đích** (để frontend đọc quy tắc khi chưa đăng nhập; frontend vốn đã có `DEFAULT_FMD_RULES`). Cần **xác nhận ý định** rồi chọn một trong hai: (a) giữ ẩn danh và cập nhật bảng 2.1 + ghi chú lý do; (b) đổi thành `[Authorize]` (mọi người đã đăng nhập đọc được).
- **Kiểm tra lại**: ca B5.

### A7. 🟡 Chưa thấy 3 file `.png` của sơ đồ C3/C4 trong repo
- **Đối chiếu**: `QUOC_TASKS.md` mục 5.1–5.3 đánh `[x]` kèm `C3_Notification.png`, `C4_Notification.png`, `C4_DietFasting.png`; `PLAN_ASSIGNMENT.md` Mục 9.4 yêu cầu `.mmd` + `.png` ≥ 1600px.
- **Hiện trạng**: `docs/diagrams/` trong `dev` chỉ có 3 file `.mmd` (commit `b97ff42` chỉ thêm `.mmd`; `.gitignore` không chặn `.png`). Có thể file ảnh còn ở máy Quốc nhưng chưa `git add`.
- **Chưa kiểm chứng**: cú pháp Mermaid của 3 file `.mmd` chưa được render thử (cần mermaid.live), nên chưa kết luận sơ đồ hiển thị được.
- **Cách sửa**: xuất PNG từ mermaid.live, `git add` cả 3 file ảnh, commit.

---

## 3. NHÓM B: LỖI CÓ TỪ TRƯỚC (không nằm trong diff của Quốc, nhưng thuộc `Notification` do Quốc phụ trách)

> Hai điểm này **không do commit của Quốc gây ra** và không nằm trong checklist của `QUOC_TASKS.md`; ghi lại vì chúng vi phạm `AGENT.md` 4.3 và Quốc là người sở hữu service. Không bắt buộc sửa trước demo, nhưng nên xử lý nếu còn thời gian.

### B1. 🟠 Ai cũng đọc/sửa được thông báo và tùy chọn của người khác
- `NotificationsController` chỉ có `[Authorize]`, không so `userId` trên route với JWT.
- **Bằng chứng** (script `S13`): token B gọi `GET /api/notifications/user/{A}`, `GET /api/notifications/preferences/{A}`, `PUT /api/notifications/preferences/{A}` → cả ba **200**. B tắt được toàn bộ thông báo của A.
- **Cách sửa**: so `userId` với claim `nameid`, khác thì 403 (cho Admin ngoại lệ nếu cần).

### B2. 🟠 `POST /api/notifications/send` cho mọi user đã đăng nhập gửi email tới địa chỉ bất kỳ
- Endpoint là yêu cầu nghiệp vụ trong Bảng 6 (`Recipient`, `Subject`, `Body` do client gửi), nhưng không giới hạn người gọi.
- **Bằng chứng** (script `S14`): user thường gửi tới `victim@example.org` với link tùy ý → **201** và email được gửi.
- **Cách sửa**: chỉ cho role `Admin` (hoặc dịch vụ nội bộ) gọi; user thường chỉ xem lịch sử/tùy chọn của chính mình. Nếu cần giữ để demo thì chỉ gửi tới địa chỉ lấy từ JWT của người gọi.

---

## 4. NHÓM C: KHÔNG PHẢI LỖI (đúng spec hoặc đã biết). Chỉ cần biết khi demo

| # | Nội dung | Vì sao không tính là lỗi | Lưu ý |
| :-: | :--- | :--- | :--- |
| C1 | Mỗi lần `POST /jobs/trigger/fmd-check` làm **mọi** chu kỳ `Active` tăng 1 ngày (chu kỳ vừa tạo cũng nhảy ngày 1 → 2 → 3) | **Đúng spec**: hướng dẫn test bước 5 của Quốc ghi "tăng `CurrentDay` lên `2`" sau một lần trigger | **Khi demo chỉ bấm 1 lần.** Bấm 2 lần sẽ sang ngày 3. Về lâu dài, job chạy 00:00 UTC sẽ khiến chu kỳ bắt đầu lúc 22:00 sang "ngày 2" chỉ sau 2 giờ, và trigger bị phát lại sẽ cộng thêm ngày; muốn đúng nên tính `CurrentDay` theo số ngày lịch từ `StartDate` (idempotent). Đây là cải tiến, không bắt buộc |
| C2 | Tắt `EmailNotificationsEnabled` thì không gửi mail nhưng lịch sử vẫn ghi `Sent` | **Đúng spec** 2.3 (4): kiểm tra cờ này và ghi lịch sử | Có thể thêm trạng thái `Skipped` cho đúng sự thật. Đề xuất, không bắt buộc |
| C3 | Cờ `FastingRemindersEnabled` và `NutritionistAdviceAlertsEnabled` chưa có tác dụng (tắt nhắc nhở nhịn ăn vẫn nhận email nhắc) | **Ngoài spec**: `QUOC_TASKS.md` chỉ yêu cầu `EmailNotificationsEnabled` | Mục 10.7 `PLAN_ASSIGNMENT.md` có nhắc việc này; Quốc đã làm cờ tổng. Mở rộng theo loại event nếu còn thời gian |
| C4 | Email nhận của `fmd.alert`, `advice.sent`, `consultation.booked` vẫn là `user@example.com` cứng | Hạn chế đã biết, ngoài spec (cần event mang email hoặc bảng liên hệ) | Mailpit vẫn nhận được mọi địa chỉ, demo không ảnh hưởng. Kiệt đã lấy email từ JWT cho nhắc nhở nhịn ăn |
| C5 | Consumer dùng `NACK requeue=false`: lỗi tạm thời (DB chớp tắt) làm mất message | Hạn chế đã biết từ code gốc, đã ghi ở `PLAN_ASSIGNMENT.md` mục 10.7 | Có thể thêm retry hoặc dead-letter queue sau |
| C6 | Hướng dẫn test của Quốc bước 1 dùng Identity `http://localhost:5001` để lấy token | Không phải lỗi của Quốc: Identity (phần Khoa) chạy cổng 5251 và migration lệch tên cột nên chưa dùng được | Test bằng JWT tự tạo (cách làm ở `docs/tests/E2E_TEST_CASES.md` mục 2) |
| C7 | `QUOC_TASKS.md` mục 3.1 và các ô trong Definition of Done chưa được tick | Chỉ là theo dõi tiến độ | Tick khi xong |

---

## 5. THỨ TỰ SỬA ĐỀ XUẤT (trước buổi demo)

| Ưu tiên | Việc | Vì sao | Công sức |
| :---: | :--- | :--- | :---: |
| 1 | **A1** frontend FMD báo lỗi thật | Nhìn thấy ngay trên giao diện khi giảng viên bấm nút hai lần | nhỏ |
| 2 | **A3** HTML-encode | Một dòng mỗi giá trị, tránh chèn HTML vào email | rất nhỏ |
| 3 | **A4** kiểm tra chủ sở hữu `GET /fmd/.../active` | Spec của chính Quốc hứa; vài dòng | rất nhỏ |
| 4 | **A2** idempotency theo `event_id` | Lỗi logic ảnh hưởng độ tin cậy chống gửi trùng | vừa (kèm migration Notification) |
| 5 | **A5** seed an toàn, **A6** xác nhận ý định, **A7** thêm PNG | Dọn dẹp | nhỏ |
| 6 | **B1**, **B2** phân quyền Notification | Bảo mật, có từ trước | vừa |

**Khi demo:** bấm trigger FMD **một lần**, không bấm nút "Bắt đầu chu kỳ" hai lần (nếu chưa sửa A1).

---

## 6. CÁCH KIỂM TRA LẠI SAU KHI SỬA

```bash
node docs/tests/e2e-fmd-notification.js
```
Script in `PASS` / `FAIL` / `INFO` cho từng ca. Bảng ánh xạ:

| Mã review | Ca script | Ca thủ công (`E2E_TEST_CASES.md`) | Mong đợi sau khi sửa |
| :-: | :-: | :-: | :--- |
| A1 | (kiểm tra trên trình duyệt) | I9, I10 | Lần bấm thứ hai hiện lỗi "đã có chu kỳ FMD đang chạy" |
| A2 | `S11` | H2 | PASS |
| A3 | `S12` | H3 | PASS |
| A4 | `S6` | C5 | PASS |
| A5 | `S1` | B2 | PASS |
| A6 | (không có) | B5 | Theo quyết định ở A6 |
| B1 | `S13` | F5 | PASS |
| B2 | `S14` | H4 | PASS |
| C1, C2, C3 | `S8`, `S9b`, `S10` | E2, F3, F4 | In `INFO` (không tính là lỗi) |
