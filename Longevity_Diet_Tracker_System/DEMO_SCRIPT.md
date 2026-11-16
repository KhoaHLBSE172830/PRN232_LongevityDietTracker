# Kịch bản demo Longevity Diet Tracker (≈ 6,5 phút)

Ba workflow nối thành một câu chuyện: **WF-01 theo dõi nhịn ăn → WF-02 ghi bữa ăn vượt ngưỡng FMD nhận cảnh báo → WF-03 đặt lịch và nhận lời khuyên từ chuyên gia.** Demo chạy bằng **dữ liệu thật** (đăng nhập tài khoản thật, không bấm "Vào nhanh (Demo)").

## 0. Chuẩn bị (làm trước giờ demo 30 phút)

### 0.1 Khởi động
Bật Docker Desktop, rồi dựng hạ tầng, migrate DB, chạy 5 service + Gateway + FE (xem `README.md`/`TEAM_FIX_NOTES.md` mục "Làm gì sau khi pull"). FE phải trỏ vào Gateway:

```bash
VITE_API_BASE_URL=http://localhost:5048 npm run dev
```

Seed tài khoản và mẫu bữa ăn (chạy lại nhiều lần cũng an toàn):

```bash
node scripts/seed-demo.js
```

### 0.2 Tài khoản (mật khẩu chung `Password123!`)
| Vai trò | Email | Dùng ở |
|---|---|---|
| Hội viên | `minhanh@longevity.test` | WF-01, WF-02, WF-03 (cửa sổ chính) |
| Chuyên gia | `bacsi@longevity.test` (Đặng Minh Tuấn), `nutritionist@longevitytracker.com` / `Nutritionist@123456` (Lê Thị Hoàng Oanh), `bacsi3@longevity.test` (Trần Thanh Tùng) | WF-03: đăng nhập **đúng bác sĩ mà hội viên đã chọn** (cửa sổ ẩn danh) |
| Admin | `admin@longevity.test` | Portal quản trị riêng (xem mục 5b) |

### 0.3 Bố trí màn hình
- **Cửa sổ A (chính):** FE đăng nhập `minhanh`.
- **Cửa sổ B (ẩn danh):** FE đăng nhập `bacsi` (để hai phiên không đè token lên nhau).
- **Tab Mailpit:** http://localhost:8025 (hộp thư giả lập, hiện email hệ thống gửi).
- Người thao tác ≠ người thuyết minh. Chuẩn bị sẵn video dự phòng.

### 0.4 Đưa dữ liệu về trạng thái sạch (mỗi lần demo lại)
```bash
docker exec longevitytest-postgres-1 psql -U postgres -d diet_db -c "TRUNCATE meal_logs, fasting_sessions, fmd_cycles, habit_logs CASCADE;"
docker exec longevitytest-postgres-1 psql -U postgres -d consultation_db -c "TRUNCATE consultation_sessions, advice_notes CASCADE;"
docker exec longevitytest-postgres-1 psql -U postgres -d notification_db -c "TRUNCATE notification_logs;"
curl -X DELETE http://localhost:8025/api/v1/messages
```
Sau đó tải lại trang (F5).

### 0.5 Checklist trước giờ G
- [ ] Trang web mở được, đăng nhập `minhanh` **không có banner vàng "Chế độ demo"**.
- [ ] Tab Mailpit trống.
- [ ] Cửa sổ ẩn danh đã đăng nhập `bacsi`, thấy **portal Chuyên gia** (menu Tổng quan, Lịch hẹn, Hồ sơ bệnh nhân, Kê lời khuyên).
- [ ] Mục Bữa ăn có 4 mẫu bữa ăn gợi ý.
- [ ] (Tùy chọn) mở sẵn **một tab thứ hai** của `minhanh` ở mục Nhịn ăn, chưa bắt đầu phiên, để show ngoại lệ ở WF-01.

---

## 1. Mở đầu (30 giây)
**Làm:** đăng nhập `minhanh@longevity.test` ở trang chủ → vào **Tổng quan**.
**Nói:** "Đây là Tổng quan hôm nay, gồm bốn trụ cột: dinh dưỡng, nhịn ăn, FMD, tư vấn, cộng với thói quen. Dữ liệu lấy thật từ năm dịch vụ qua một Gateway."
**Thấy:** không có banner demo; các thẻ đều trống ("Chưa bắt đầu", "Chưa có chu kỳ", "Chưa có lịch").

---

## 2. WF-01 · Nhịn ăn 14:10 (≈ 2 phút) — actor: hội viên

| Bước | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | Menu **Nhịn ăn gián đoạn** → chọn thẻ **14:10** → **Bắt Đầu Phiên 14:10** | Hiện đồng hồ đếm ngược 14 giờ, nhãn "Dữ liệu thật" (màu xanh) |
| 2 | Bấm **Tạm Dừng** | Báo "Đang tạm dừng", đồng hồ đứng |
| 3 | Chờ vài giây, bấm **Tiếp Tục** | Đồng hồ chạy lại; mốc kết thúc dời đúng bằng thời gian đã dừng |
| 4 | (Tùy chọn) nhập ghi chú cảm nhận → **Kết Thúc Phiên Nhịn Ăn** | Báo "Đã hoàn tất phiên 14:10", số giờ thực tế |
| 5 | Kéo xuống | Xuất hiện **Lịch sử gần đây** và ô **Chuỗi hiện tại: 1 ngày** |

**Nói:** "Một phiên nhịn ăn có trạng thái InProgress, có thể tạm dừng, kết thúc là Completed và vào lịch sử, streak tăng."

**Ngoại lệ (BR-01: mỗi người chỉ một phiên đang chạy)**
- *Cách 1 (UI):* ở tab thứ hai đã mở sẵn (chưa tải lại), bấm **Bắt Đầu Phiên** khi phiên ở tab 1 đang chạy → banner đỏ báo đã có phiên đang chạy (409).
- *Cách 2 (nhanh):* chạy `curl` POST `/api/fasting/start` lần hai với cùng token → 409.

**Nếu lỗi:** nhãn vàng "Chế độ mô phỏng" nghĩa là FE chưa nối được backend → kiểm tra Gateway :5048 và biến `VITE_API_BASE_URL`.

> Quay lại **Tổng quan** để cho thấy thẻ Nhịn ăn và chuỗi cập nhật (nếu đã kết thúc phiên thì thẻ về "Chưa bắt đầu" và Streak tăng).

---

## 3. WF-02 · Ghi bữa ăn vượt ngưỡng FMD và nhận cảnh báo (≈ 2 phút) — actor: hội viên + hệ thống

| Bước | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | Menu **Chu kỳ FMD 5 ngày** | Lộ trình 5 ngày: **1100 / 780 / 760 / 760 / 780 kcal** |
| 2 | **Bắt Đầu Chu Kỳ FMD 5 Ngày Mới** | Báo "Đang chạy: Ngày 1/5 (1100 kcal)"; nút Bắt đầu bị khóa, xuất hiện nút **Hủy chu kỳ** |
| 3 | Bấm **Ghi nhận bữa ăn** (thanh trên) → tab **+ Món Ăn Tuỳ Chỉnh** | Form món tùy chỉnh |
| 4 | Tên `Tiệc buffet`, Khối lượng `100`, Calo `1500` → **+ Thêm Món Vào Bữa Ăn** → **Ghi Nhận Vào Nhật Ký** | Bữa ăn được lưu; tổng ngày vượt 1100 kcal |
| 5 | Chờ **≤ 10 giây** (chuông tự làm mới) | Chuông 🔔 hiện huy hiệu đỏ **1** |
| 6 | Bấm chuông | Danh sách thông báo: "FMD Cycle Day 1 Alert – Calorie Limit Exceeded"; huy hiệu biến mất (đã đọc) |
| 7 | Sang tab **Mailpit** | Có email cảnh báo gửi tới `minhanh@longevity.test` |

**Nói:** "Khi ghi bữa ăn, dịch vụ Diet kiểm tra tổng kcal trong ngày so với ngưỡng FMD của ngày đó. Vượt thì phát sự kiện qua RabbitMQ, dịch vụ Notification nhận, lưu thông báo và gửi email. Người dùng nhận 201 ngay, không phải chờ email."

**Ngoại lệ (BR-04: chỉ chủ dữ liệu)**
- Đăng nhập `bacsi` (cửa sổ B) rồi gọi `GET /api/fmd/user/{id của minhanh}/active` → 403. (Hoặc nói bằng lời: test e2e đã kiểm.)
- Bắt đầu chu kỳ thứ hai khi đang chạy: nút Bắt đầu đã bị khóa (API trả 409).

**Nếu chuông chưa hiện:** chờ thêm 10 giây hoặc F5; kiểm tra RabbitMQ và service Notification (:5004).

**Cho hội đồng xem thêm:** mục **Bữa ăn** → nút **Sửa / thêm món**, **Xóa**, các nút **+ Sáng / Trưa / Tối / Phụ** trên mẫu bữa ăn.

---

## 4. WF-03 · Đặt lịch tư vấn và nhận lời khuyên (≈ 2 phút) — actor: hội viên → chuyên gia → hội viên

**Phần hội viên (cửa sổ A)**

| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Menu **Tư vấn chuyên gia** | Ba bác sĩ có thẻ chuyên môn và dấu "Đã Xác Thực" |
| 2 | Ở **TS. BS Đặng Minh Tuấn** bấm **Đặt Lịch Tư Vấn** | Mở form đặt lịch |
| 3 | Chọn ngày (ngày mai trở đi) | Hiện **8 khung giờ**; khung đã có người đặt bị xám |
| 4 | Chọn một khung giờ, nhập mục tiêu tư vấn → xác nhận | Toast "Đã đặt lịch thành công"; **Lịch Hẹn Của Tôi** hiện trạng thái **Chờ xác nhận**; có nút **Hủy lịch** |
| 5 | Mailpit | Email "Consultation Booking Confirmed" tới hội viên |

**Phần chuyên gia (cửa sổ B, `bacsi@longevity.test`)** — portal Chuyên gia riêng (menu: Tổng quan, Lịch hẹn, Hồ sơ bệnh nhân, Kê lời khuyên)

| Bước | Thao tác | Kết quả |
|---|---|---|
| 6 | **Tổng quan** (tự làm mới sau ≤ 10 giây; chuông có thông báo "Lịch tư vấn mới") | Thẻ "Chờ xác nhận" tăng thêm 1; lịch vừa đặt nằm trong "Lịch hẹn sắp tới" |
| 7 | **Lịch hẹn** → bấm **Xác nhận** ở lịch vừa đặt | Báo "Đã xác nhận lịch ..."; trạng thái → **Đã xác nhận** |
| 8 | **Hồ sơ bệnh nhân** → chọn hội viên | Bảng sức khỏe qua **gRPC**: phiên nhịn ăn, dinh dưỡng trung bình, FMD kèm "Đồng bộ qua gRPC trong N ms" |
| 9 | **Kê lời khuyên** → bấm **Kê lời khuyên** ở buổi đang chờ → điền 3 ô (≥ 5 ký tự), ví dụ: `Tăng chất xơ từ thực vật` / `Thêm đậu và rau xanh mỗi bữa` / `Giữ 14:10 trong tuần đầu` → **Gửi lời khuyên** | Báo "Đã gửi lời khuyên"; buổi chuyển sang **Đã hoàn thành** |

**Quay lại hội viên (cửa sổ A)**
| 10 | Tải lại mục Tư vấn | Phần **Ghi Chú Tư Vấn** hiện lời khuyên; lịch **Đã hoàn thành** |
| 11 | Mailpit | Email lời khuyên tới hội viên |

**Nói:** "Bác sĩ xem được dữ liệu thật của hội viên nhờ gRPC giữa hai dịch vụ, nên lời khuyên có căn cứ. Khi kê lời khuyên, hệ thống phát sự kiện để hội viên nhận email."

**Ngoại lệ (BR-03: không đặt trùng khung giờ)**
- UI: khung giờ đã được đặt bị xám, không chọn được. Muốn thấy lỗi 409: mở form đặt lịch ở **hai tab** cùng lúc, đặt ở tab 1, rồi chọn đúng khung đó ở tab 2 → báo khung giờ đã có người đặt.
- Hội viên không tự xác nhận lịch được (API trả 403): chỉ bác sĩ phụ trách hoặc Admin.
- (Tùy chọn) bấm **Hủy lịch** để cho thấy khung giờ được trả lại.

**Nếu lỗi:** gRPC không hiện → kiểm tra DietFasting gRPC cổng 7002. Không thấy portal chuyên gia hoặc báo "chưa được gắn với hồ sơ chuyên gia" → tài khoản chưa có role Nutritionist hoặc chưa gắn hồ sơ (chạy `node scripts/seed-demo.js`).

---

## 5b. (Tùy chọn, 1 phút) Portal Quản trị — actor: Admin
Đăng nhập `admin@longevity.test` (cửa sổ ẩn danh thứ ba hoặc đăng xuất rồi vào lại). Menu **chỉ có 5 mục quản trị**, không có mục hội viên.
| Mục | Thao tác | Kết quả |
|---|---|---|
| Tổng quan quản trị | Nhìn thẻ số liệu và **Trạng thái dịch vụ** | 4 dịch vụ "Hoạt động" kèm độ trễ; bảng phân quyền User/Nutritionist/Admin |
| Quy tắc FMD | Đổi ngày 1 từ 1100 sang 1090 → **Lưu**; bấm **Đặt theo thiết kế** → **Lưu** | Có banner lệch thiết kế rồi biến mất |
| Mẫu bữa ăn | Điền form → **Tạo mẫu** | Danh sách mẫu tăng thêm một; hội viên thấy mẫu ở mục Bữa ăn |
| Phân quyền | Dán mã người dùng, chọn role → **Đổi vai trò** | Báo thành công (hiệu lực khi người đó đăng nhập lại) |
**Nói:** "Admin có giao diện riêng để cấu hình luật nghiệp vụ mà không phải sửa code hay DB." Người thường không thấy các mục này và gọi API sẽ nhận 403.

## 5. Kết thúc (30 giây)
Trở lại **Tổng quan** (các thẻ đã có dữ liệu thật) rồi mở slide Conclusion: **vấn đề đã giải, sản phẩm chạy thật, kết quả kiểm chứng (137 kiểm tra API, 17 test FE)**.

## 6. Phương án dự phòng
| Sự cố | Cách xử lý nhanh |
|---|---|
| Một service không lên | Mở `/tmp/*.log` hoặc cửa sổ chạy service; khởi động lại service đó, dữ liệu vẫn còn |
| Chuông không hiện thông báo | F5; mở Mailpit chứng minh email đã gửi; hoặc chạy `node docs/tests/e2e-meals-fmd-notifications.js` |
| Cả hệ thống hỏng | Chiếu video dự phòng; chạy `node docs/tests/e2e-jobs-email.js` nếu còn backend để chứng minh luồng |
| FE hiện banner vàng "Chế độ demo" | Đang không nối được backend hoặc lỡ bấm "Vào nhanh"; đăng xuất, kiểm tra Gateway rồi đăng nhập lại |

## 7. Câu hỏi hội đồng hay hỏi
- **"Dữ liệu là thật hay mock?"** Thật, lưu Postgres, mỗi dịch vụ một database. Chế độ demo (banner vàng) chỉ là phương án dự phòng khi backend sập.
- **"Email có gửi thật không?"** Gửi qua SMTP; môi trường phát triển dùng Mailpit để bắt thư (đã kiểm bằng script `e2e-jobs-email.js`).
- **"Nhắc nhịn ăn tự động chạy thế nào?"** Hangfire (Job Service) quét mỗi 15 phút, phát sự kiện qua RabbitMQ; có chống gửi trùng. Có thể bấm tay `POST :5005/jobs/trigger/fasting-check` để minh họa.
- **"FMD tự sang ngày mới thế nào?"** Job Hangfire chạy 00:00 UTC hằng ngày; có thể kích tay `POST :5005/jobs/trigger/fmd-check`.
- **"Còn thiếu gì?"** Xem slide Limitations và `TEAM_FIX_NOTES.md`.
