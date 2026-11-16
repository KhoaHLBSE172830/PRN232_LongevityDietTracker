# TEST CASE END-TO-END & KẾT QUẢ REVIEW CODE NHÁNH `quoc` (đã merge vào `kiet`, commit `e373baa`)

> **Người kiểm tra**: Kiệt. **Ngày**: 16/11/2026.  
> **Cách kiểm tra**: dựng stack thật (Postgres, Redis, RabbitMQ, Mailpit) rồi chạy Notification, DietFasting, JobService, YARP Gateway và frontend; không chỉ đọc code.  
> **Kết quả script tự động `e2e-fmd-notification.js`: 10/16 ca bắt buộc đạt, 6 ca lỗi, 3 ca chỉ ở mức đề xuất (INFO)** (Mục 1). Danh sách lỗi chi tiết: `../../QUOC_REVIEW.md`.
>
> **Phạm vi đã chạy thật:** toàn bộ 19 ca của script (tương ứng các ca B1–B4, C1, C2, C4, C5, D1–D3, E1, E2, F1–F5, H1–H6 ở Mục 3), I1–I9 trên trình duyệt, G1–G7 ở các lượt kiểm chứng trước. **Chưa chạy thử:** B5, C3, C6, D4–D6, E3–E5 (mong đợi suy ra từ code và từ cách sửa đề xuất), I10–I12. Các ca ⚠️ ghi rõ hành vi hiện tại khác mong đợi.

---

## 1. KẾT QUẢ REVIEW (tóm tắt; chi tiết ở `QUOC_REVIEW.md`)

Các điểm được phân loại để không báo oan: **A** = lỗi trong phần Quốc đã làm (trái spec của Quốc/`AGENT.md`), **B** = lỗi có từ trước nhưng thuộc service Quốc phụ trách, **C** = không phải lỗi (đúng spec hoặc đã biết).

### 1.1. Những điểm đã đạt (không cần sửa)
| Hạng mục | Kết quả |
| :--- | :--- |
| `dotnet build` toàn solution | ✅ 0 lỗi, 0 cảnh báo |
| Migration `InitialNotificationDb` mới | ✅ áp dụng sạch, cột `snake_case`, có `event_id` |
| Notification chạy đúng cổng 5004, qua Gateway | ✅ |
| Consumer tự nối lại RabbitMQ, nhận `fmd.alert`, `advice.sent`, `consultation.booked`, `notification.email` | ✅ (S7, S15) |
| Email cảnh báo FMD ra Mailpit, `notification_logs.status = Sent` | ✅ (S7) |
| `POST /api/fmd/start` lấy chủ chu kỳ từ JWT, 409 khi đã có chu kỳ | ✅ (S4, S5) |
| Seed 5 quy tắc FMD (1100 / 725 kcal), `PUT` chỉ Admin | ✅ (S2, S3) |
| Tắt `EmailNotificationsEnabled` thì không gửi mail | ✅ (S9a) |

### 1.2. Cần sửa
| Mã | Mức | Nội dung ngắn | Ca kiểm tra |
| :-: | :---: | :--- | :--- |
| **A1** | 🔴 | Frontend FMD nuốt lỗi HTTP (409/401/400) và báo thành công giả | I9, I10 (trình duyệt) |
| **A2** | 🟠 | Idempotency hỏng khi có hơn 50 bản ghi (gửi lại email trùng) | S11, H2 |
| **A3** | 🟠 | Email không HTML-encode nội dung từ event | S12, H3 |
| **A4** | 🟠 | `GET /api/fmd/user/{id}/active` không kiểm tra chủ sở hữu | S6, C5 |
| **A5** | 🟡 | Seed quy tắc trong `GET` bị đua dữ liệu (9/10 request song song lỗi 500) | S1, B2 |
| **A6** | 🟡 | `GET /api/admin/fmd-rules` ẩn danh, khác bảng spec 2.1 (cần xác nhận ý định) | B5 |
| **A7** | 🟡 | Chưa thấy 3 file `.png` sơ đồ trong repo | (kiểm tra thư mục) |
| **B1** | 🟠 | Đọc/sửa thông báo của người khác (có từ trước) | S13, F5 |
| **B2** | 🟠 | `POST /api/notifications/send` gửi email tới địa chỉ bất kỳ (có từ trước) | S14, H4 |

### 1.3. Không phải lỗi (script in `INFO`, không tính là lỗi)
| Mã | Nội dung | Ca |
| :-: | :--- | :--- |
| C1 | Mỗi trigger FMD tăng 1 ngày: **đúng spec** của Quốc (khi demo chỉ bấm 1 lần) | S8, E2 |
| C2 | Tắt email vẫn ghi `Sent`: đúng spec 2.3 (4), đề xuất thêm `Skipped` | S9b, F3 |
| C3 | Cờ `FastingRemindersEnabled`/`NutritionistAdviceAlertsEnabled` chưa dùng: ngoài spec | S10, F4 |
| C4 | Email nhận cứng `user@example.com`: hạn chế đã biết | — |
| C5 | `NACK requeue=false` làm mất message khi lỗi tạm thời: đã biết | — |
| C6 | Hướng dẫn test của Quốc cần Identity (chưa chạy được, phần Khoa) | — |
| C7 | Ô chưa tick trong `QUOC_TASKS.md`: chỉ là tiến độ | — |

**Kết quả lần chạy hiện tại: 10/16 ca bắt buộc đạt; 6 ca lỗi (S1, S6, S11, S12, S13, S14); 3 ca INFO (S8, S9b, S10).**

**Thứ tự sửa trước demo:** A1, A3, A4, A2, rồi A5, A6, A7; B1, B2 nếu còn thời gian.

---

## 2. CHUẨN BỊ MÔI TRƯỜNG (làm một lần)

> ⚠️ Cổng `5432` và `6379` có thể đã bị container dự án khác chiếm. Kiểm tra bằng `docker ps`. Nếu bị chiếm, đổi cổng host trong `docker-compose.yml` và đặt biến môi trường `ConnectionStrings__DietDb`, `ConnectionStrings__NotificationDb`, `ConnectionStrings__JobDb`, `ConnectionStrings__Redis` khi chạy từng service.

```bash
cd Longevity_Diet_Tracker_System
git checkout kiet && git pull
dotnet build Longevity_Diet_Tracker_System.sln        # mong đợi: 0 lỗi, 0 cảnh báo

docker compose up -d                                  # Postgres, Redis, RabbitMQ, Mailpit
docker compose ps                                     # tất cả "running"
```

**Tạo lại database (bắt buộc vì lịch sử migration đã đổi):**
```bash
dotnet ef database drop   --project src/Services/DietFasting/DietFasting.Infrastructure   --startup-project src/Services/DietFasting/DietFasting.API   --force
dotnet ef database update --project src/Services/DietFasting/DietFasting.Infrastructure   --startup-project src/Services/DietFasting/DietFasting.API
dotnet ef database drop   --project src/Services/Notification/Notification.Infrastructure --startup-project src/Services/Notification/Notification.API --force
dotnet ef database update --project src/Services/Notification/Notification.Infrastructure --startup-project src/Services/Notification/Notification.API
```
> `job_db` do Hangfire tự tạo schema. `identity_db`, `consultation_db` chưa dùng trong luồng này (migration còn lỗi tên cột, xem `PLAN_ASSIGNMENT.md` Mục 11.1).

**Bật các service (mỗi lệnh một terminal; bật RabbitMQ trước):**
```bash
dotnet run --project src/Services/Notification/Notification.API          # 5004
dotnet run --project src/Services/DietFasting/DietFasting.API            # 5002 (REST) / 7002 (gRPC)
dotnet run --project src/Services/JobService/JobService.API              # 5005
dotnet run --project src/ApiGateways/YarpGateway --launch-profile https  # https://localhost:7159
cd src/Clients/web-app && npm install && npm run dev                     # http://localhost:5173
```

**Kiểm tra nhanh khi khởi động (log phải có):**
- Notification: `RabbitMQ Notification Consumer listening on queue: notification_events_queue`
- DietFasting: `Now listening on: http://localhost:5002` và `:7002`, `Fasting trigger consumer listening on queue diet_fasting_trigger_queue`
- JobService: `Now listening on: http://localhost:5005`, `/hangfire` mở được

**Lấy JWT để test** (Identity chưa dùng được, xem Mục 12.4 `PLAN_ASSIGNMENT.md`; tạo token bằng secret trong `appsettings.json`):
```bash
node -e 'const c=require("crypto"),b=o=>Buffer.from(JSON.stringify(o)).toString("base64url");const h=b({alg:"HS256",typ:"JWT"}),p=b({nameid:process.argv[1],email:process.argv[2],role:process.argv[3]||"User",iss:"LongevityIdentityService",aud:"LongevityDietTrackerClients",exp:Math.floor(Date.now()/1000)+3600});console.log(h+"."+p+"."+c.createHmac("sha256","super_secret_jwt_key_longevity_diet_tracker_32chars!").update(h+"."+p).digest("base64url"))' e0e7a1b3-4f8a-493e-9b62-7a4c9f1e8201 a@longevity.app User
```
Đổi đối số 3 thành `Admin` / `Nutritionist` để có token vai trò khác. Gọi API với header `Authorization: Bearer <token>`.

---

## 3. TEST CASE THỦ CÔNG (đi từ đầu đến cuối)

Ký hiệu: **Mong đợi** là hành vi đúng. Dòng có ⚠️ là ca hiện đang **không đạt** (tham chiếu mã lỗi ở Mục 1.2). User A = `e0e7a1b3-...8201`, User B = `22222222-...2222`.

### A. Hạ tầng & migration
| ID | Bước | Mong đợi |
| :-: | :--- | :--- |
| A1 | `\d fasting_sessions` trong `diet_db` | Cột `snake_case`; `status`, `fasting_type` là `varchar(50)`; có `notification_email`; có index `ux_fasting_sessions_user_active` (UNIQUE, WHERE `status = 'InProgress'`) |
| A2 | `\dt` trong `diet_db` | Có đủ 6 bảng gồm `fmd_rules` |
| A3 | `\d notification_logs` trong `notification_db` | Cột `snake_case`, có `event_id`, `ix_notification_logs_event_id` |
| A4 | Mở `http://localhost:5005/hangfire` | Dashboard mở được; `GET /jobs/recurring` trả 3 job |
| A5 | Mở RabbitMQ UI `http://localhost:15672` (guest/guest) | Có exchange `longevity_events_exchange` (topic) và queue `notification_events_queue`, `diet_fasting_trigger_queue` |

### B. FMD Rules (qua Gateway `https://localhost:7159`)
| ID | Bước | Mong đợi |
| :-: | :--- | :--- |
| B1 | `GET /api/admin/fmd-rules` (bảng rỗng, một request) | 200, đủ 5 ngày: ngày 1 = 1100, ngày 2–5 = 725 |
| B2 | ⚠️ **A5**: xóa dữ liệu `fmd_rules` rồi gọi 10 request `GET` song song | Tất cả 200, bảng đúng 5 dòng *(hiện: 9 request lỗi 500)* |
| B3 | `PUT /api/admin/fmd-rules/1` bằng token **User** | 403 |
| B4 | `PUT /api/admin/fmd-rules/1` bằng token **Admin**, body `{maxCalories:1100, targetProteinPercent:11, targetFatPercent:46, targetCarbPercent:43, description:"..."}` | 200, giá trị được cập nhật |
| B5 | ⚠️ **A6**: `GET /api/admin/fmd-rules` không token | Mong đợi 401 *(hiện: 200)* |

### C. Chu kỳ FMD
| ID | Bước | Mong đợi |
| :-: | :--- | :--- |
| C1 | Token A: `POST /api/fmd/start` body `{"userId":"<id của B>","startDate":"<now ISO>"}` | 201, `userId` trong kết quả là **A** (lấy từ JWT), `currentDay=1`, `status=Active`, `targetCaloriesToday=1100` |
| C2 | Gọi lại C1 | 409 |
| C3 | Token A: `POST /api/fmd/start` với `startDate` không có chữ `Z` | 201, không lỗi 500 |
| C4 | Token A: `GET /api/fmd/user/{A}/active` | 200, đúng chu kỳ |
| C5 | ⚠️ **A4**: Token **B**: `GET /api/fmd/user/{A}/active` | Mong đợi 403 *(hiện: 200)* |
| C6 | Token không có claim `nameid`: `POST /api/fmd/start` | mong đợi 401 *(chưa chạy thử; Identity luôn cấp claim này nên ít gặp)* |

### D. Bữa ăn vượt ngưỡng → RabbitMQ → Notification → Mailpit (Workflow 2)
| ID | Bước | Mong đợi |
| :-: | :--- | :--- |
| D1 | Xóa hộp thư Mailpit (`http://localhost:8025`). Token A: `POST /api/meals` với 1 món 1200 kcal (`isHaraHachiBuCompliant:false`, `satietyPercentage:100`) khi A đang ở FMD ngày 1 | 201; `exceededThreshold=true`; `thresholdViolationNotes` chứa "Day 1 FMD Calorie Limit Exceeded" |
| D2 | Mở Mailpit sau 2–4 giây | Có email **"FMD Cycle Day 1 Alert - Calorie Limit Exceeded"**, khung đỏ, có nội dung cảnh báo |
| D3 | Token A: `GET /api/notifications/user/{A}` | Có bản ghi `status=Sent`, `eventId` khác null |
| D4 | Meal 800 kcal (dưới ngưỡng) trong ngày FMD 1 | `exceededThreshold=false`, **không** có email mới |
| D5 | Meal 1200 kcal khi **không** có chu kỳ FMD | Không cảnh báo, không email |
| D6 | Tắt RabbitMQ (`docker stop <container>`), log bữa 1200 kcal | API vẫn 201 (cảnh báo là best-effort); log DietFasting có `Could not publish` |

### E. Chuyển ngày FMD bằng Hangfire
| ID | Bước | Mong đợi |
| :-: | :--- | :--- |
| E1 | `POST http://localhost:5005/jobs/trigger/fmd-check` | 200; sau ~2 giây log DietFasting: `Trigger ... (FmdCycleDailyJob): N active FMD cycle(s) ...` |
| E2 | ℹ️ **C1 (đề xuất, không phải lỗi)**: chu kỳ vừa tạo, gọi E1 hai lần liên tiếp, rồi `GET .../active` | `currentDay` vẫn **1** vì chưa sang ngày lịch mới *(hiện: 1 → 2 → 3)* |
| E3 | ℹ️ **C1 (đề xuất, không phải lỗi)**: sửa `start_date` của chu kỳ lùi về 2 ngày trước (SQL), gọi E1 | `currentDay = 3`; gọi E1 thêm lần nữa vẫn **3** |
| E4 | ℹ️ **C1 (đề xuất, không phải lỗi)**: sửa `start_date` lùi 6 ngày, gọi E1 | `status = Completed` *(hiện: chỉ cộng thêm 1 ngày)* |
| E5 | `POST http://localhost:5005/jobs/trigger/weekly-summary` | Log DietFasting: "received but no handler is registered" (chủ đích) |

### F. Tùy chọn thông báo
| ID | Bước | Mong đợi |
| :-: | :--- | :--- |
| F1 | Token A: `GET /api/notifications/preferences/{A}` lần đầu | 200, cả 3 cờ đều `true` (tự tạo mặc định) |
| F2 | Token A: `PUT` `{emailNotificationsEnabled:false,...}` rồi tạo cảnh báo FMD (D1) | Không có email mới ở Mailpit |
| F3 | ℹ️ **C2 (đề xuất, không phải lỗi)**: ở F2 xem `GET /api/notifications/user/{A}` | Bản ghi mới không được ghi `Sent` (mong đợi `Skipped`) *(hiện: `Sent`)* |
| F4 | ℹ️ **C3 (ngoài spec, đề xuất)**: bật email, tắt riêng `fastingRemindersEnabled`; tạo phiên nhịn ăn sắp hết (G1) và trigger fasting-check | **Không** có email nhắc nhở *(hiện: vẫn gửi)* |
| F5 | ⚠️ **B1**: Token **B**: `GET /api/notifications/user/{A}`, `GET/PUT /api/notifications/preferences/{A}` | Mong đợi 403 *(hiện: 200 cả ba)* |

### G. Nhắc nhở nhịn ăn (phần của Kiệt, kiểm tra hồi quy)
| ID | Bước | Mong đợi |
| :-: | :--- | :--- |
| G1 | Token A (có claim `email`): `POST /api/fasting/start` `{"fastingType":2,"durationHours":0.5,"startTimeUtc":"<now-20 phút>"}` | 201; DB `fasting_sessions.notification_email` = email trong token |
| G2 | `POST http://localhost:5005/jobs/trigger/fasting-check` | Sau ~2 giây có email "Phiên nhịn ăn 16:8 sắp kết thúc" ở Mailpit |
| G3 | Trigger lần nữa | **Không** có email mới (đã commit key Redis `fasting:reminder:{id}`) |
| G4 | Dừng Notification.API; tạo phiên mới sắp hết; trigger | Log: `could not be delivered; it will be retried`; không có key Redis mới. Bật Notification rồi trigger lại thì email được gửi |
| G5 | 10 request `POST /api/fasting/start` song song cho cùng một user | Đúng 1 cái 201, 9 cái 409; DB chỉ có 1 dòng `InProgress` |
| G6 | gRPC `GetUserFastingSummary` (grpcurl, cổng 7002) với `user_id` hợp lệ / sai | OK / `InvalidArgument` |
| G7 | Đặt `Grpc:RequireAuth=true`: không token / role User / role Nutritionist | `Unauthenticated` / `PermissionDenied` / OK |

### H. Idempotency & nội dung email
| ID | Bước | Mong đợi |
| :-: | :--- | :--- |
| H1 | `POST /api/notifications/send` hai lần cùng `eventId` | Chỉ **1** dòng `event_id` trong `notification_logs`, 1 email |
| H2 | ⚠️ **A2**: như H1 nhưng giữa hai lần gửi thêm 55 thông báo khác cho cùng user | Vẫn **1** dòng, 1 email *(hiện: 2 dòng, mail gửi lại)* |
| H3 | ⚠️ **A3**: publish `fmd.alert` với `Message = "<img src=x onerror=alert(1)>"` (RabbitMQ UI > Exchanges > Publish) | Email hiển thị chữ `<img ...>` dạng văn bản, không có thẻ HTML thật *(hiện: thẻ thô)* |
| H4 | ⚠️ **B2**: Token **User** gọi `POST /api/notifications/send` tới `victim@example.org` | Mong đợi 403 *(hiện: 201 và email được gửi)* |
| H5 | Publish `consultation.booked` | Email "Consultation Booking Confirmed" |
| H6 | Publish `advice.sent` | Email "New Nutritionist Consultation Advice Received" |

### I. Frontend (`http://localhost:5173`)
Điều kiện: trong Console trình duyệt `localStorage.setItem('accessToken','<JWT>')` rồi tải lại. (Đăng nhập thật chưa chạy: phần của Khoa.)

| ID | Bước | Mong đợi |
| :-: | :--- | :--- |
| I1 | Vào ứng dụng → tab **Nhịn ăn gián đoạn** → chọn 16:8 → Bắt đầu | Nhãn "Dữ liệu thật"; đồng hồ đếm ngược; DB có dòng `InProgress` |
| I2 | Tải lại trang | Đồng hồ tiếp tục đúng theo giờ server |
| I3 | Kết thúc kèm ghi chú | Hiện tóm tắt; `mood_notes` được lưu; DB `status=Completed` |
| I4 | Bắt đầu rồi Hủy (có bước xác nhận) | `status=Cancelled` |
| I5 | Tạo phiên bằng API, bấm Bắt đầu trên giao diện | Banner đỏ báo 409 |
| I6 | Token sai chữ ký | "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn." |
| I7 | Tắt DietFasting (Gateway vẫn chạy) | Nhãn "Chế độ mô phỏng (mất kết nối)" |
| I8 | Tab **Chu kỳ FMD 5 ngày**: bấm "Bắt Đầu Chu Kỳ FMD 5 Ngày Mới" | Hiện "Đang chạy: Ngày 1/5 (1100 kcal)", lộ trình highlight ngày 1 |
| I9 | ⚠️ **A1**: bấm nút lần nữa khi đã có chu kỳ | Mong đợi báo lỗi "đã có chu kỳ FMD đang chạy" *(hiện: vẫn hiện "✅ Đã kích hoạt", mạng trả 409)* |
| I10 | Tab FMD: bật/tắt tùy chọn thông báo | Giá trị lưu lại sau khi tải lại trang; nếu server lỗi phải báo lỗi *(hiện: giả vờ đã lưu)* |
| I11 | Tab FMD: hộp thư thông báo | Hiện các bản ghi từ `GET /api/notifications/user/{id}` (cảnh báo FMD, nhắc nhở) |
| I12 | Chưa có token | Các tab chạy ở chế độ mô phỏng, không trắng trang |

---

## 4. KỊCH BẢN DEMO LIỀN MẠCH (5 phút, dùng khi báo cáo)
1. `docker compose ps` → tất cả chạy. Mở Mailpit, Hangfire dashboard, RabbitMQ UI.
2. Tab **Chu kỳ FMD**: bấm "Bắt đầu chu kỳ FMD" → Ngày 1/5 (1100 kcal).
3. Log bữa 1200 kcal (Swagger hoặc tab Dinh dưỡng) → bấm vào Mailpit: email cảnh báo đỏ xuất hiện sau vài giây; mở tab FMD thấy thông báo trong hộp thư.
4. Tab **Nhịn ăn**: chọn 16:8 → Bắt đầu → đồng hồ chạy. Dùng SQL đẩy `target_end_time_utc` về 10 phút tới, bấm `POST /jobs/trigger/fasting-check` ở Swagger JobService → email nhắc nhở ở Mailpit.
5. Hangfire dashboard: thấy job vừa chạy `Succeeded`; RabbitMQ UI: thấy message đi qua exchange.
> Trước khi demo nên sửa A1 (bấm hai lần nút FMD hiện thành công giả). Khi demo chỉ bấm trigger FMD **một lần** (C1: mỗi lần bấm là một ngày).

---

## 5. CHẠY TỰ ĐỘNG
```bash
node docs/tests/e2e-fmd-notification.js
```
Chạy được sau khi làm xong Mục 2 (cần Gateway, DietFasting, Notification, JobService, Mailpit, RabbitMQ). Script in `PASS` / `FAIL` / `INFO` cho 19 ca (S1–S15 tương ứng các ca B, C, D, E, F, H ở trên); chỉ `FAIL` làm mã thoát khác 0, `INFO` là đề xuất không tính là lỗi. **Hiện tại: 10/16 ca bắt buộc đạt; lỗi: S1 (A5), S6 (A4), S11 (A2), S12 (A3), S13 (B1), S14 (B2); INFO: S8 (C1), S9b (C2), S10 (C3).** Sau khi sửa, chạy lại để xác nhận (kỳ vọng 16/16, INFO có thể còn).

> Script tạo dữ liệu thử (user giả, chu kỳ FMD, ~60 bản ghi thông báo). Chỉ chạy trên DB local; muốn chạy lại từ đầu sạch hãy tạo lại `diet_db` và `notification_db` (Mục 2).
