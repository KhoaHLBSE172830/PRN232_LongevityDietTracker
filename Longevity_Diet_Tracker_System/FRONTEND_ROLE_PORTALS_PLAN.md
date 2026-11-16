# Kế hoạch giao diện theo vai trò: Chuyên gia (Nutritionist) và Admin

> Lập ngày 16/11/2026. Trạng thái: **KẾ HOẠCH, chưa code**. Căn cứ: bảng phân quyền của nhóm (ảnh), mã FE hiện có (`src/Clients/web-app`), các API backend đã có.

## 1. Vấn đề hiện tại

Web app chỉ có **một giao diện dùng chung** (6 mục: Tổng quan, Bữa ăn, Nhịn ăn, FMD, Tư vấn, Hồ sơ). Role chỉ được đọc ở hai nơi: Hồ sơ hiển thị tên role, và tab "Cổng Bác Sĩ & gRPC" trong mục Tư vấn. Vì vậy đăng nhập Admin trông y hệt hội viên, dù API đã phân quyền đúng. Các quyền Admin (sửa rule FMD, tạo mẫu bữa ăn, đổi role) **chưa có màn hình nào**.

## 2. Đối chiếu bảng phân quyền với mã hiện tại

| Chức năng (bảng) | User | Nutri | Admin | Mã hiện tại | Ghi chú cần xử lý |
|---|:-:|:-:|:-:|---|---|
| Đăng ký | ✓ | ✗ | ✗ | `POST /api/auth/register`, luôn role User | Khớp |
| Ghi bữa ăn, nhịn ăn, FMD, đặt lịch | ✓ | ✗ | ✗ | Backend chỉ yêu cầu đăng nhập, **không chặn** Nutri/Admin | Bảng muốn tách hẳn. Đề xuất: tách ở **giao diện** (portal riêng), giữ backend cho Admin quyền đọc để hỗ trợ |
| Đặt lịch tư vấn | ✓ | ✗ | ✗ | Endpoint thật là `POST /api/consultations/book` (bảng ghi `/sessions`) | **Sửa tên endpoint trong tài liệu** |
| Xem hồ sơ bệnh nhân (gRPC) | ✗ | ✓ | ✓ | `GET /api/consultations/review-user/{id}`, Nutri chỉ xem hội viên đã đặt lịch với mình | Khớp, đã có UI trong tab bác sĩ |
| Kê lời khuyên | ✗ | ✓ | ✓ | `POST /api/consultations/advice` | Khớp, đã có UI |
| Quản trị rule FMD | ✗ | ✗ | ✓ | `PUT /api/admin/fmd-rules/{day}` | **Chưa có UI** |
| Quản trị mẫu bữa ăn | ✗ | ✗ | ✓ | `POST /api/mealtemplates` | **Chưa có UI** (chưa có sửa/xóa mẫu ở API) |
| Đổi role | ✗ | ✗ | ✓ | `PUT /api/users/{id}/role` | **Chưa có UI**; chưa có API liệt kê người dùng |

## 3. Quyết định kiến trúc (đề xuất, cần team xác nhận)

1. **Ba portal tách biệt theo role**, chọn ngay sau đăng nhập từ claim role của JWT:
   - `User` → portal hội viên (giữ nguyên toàn bộ FE hiện có).
   - `Nutritionist` → portal chuyên gia (mới).
   - `Admin` → portal quản trị (mới).
2. Portal Nutri/Admin **không hiện** các mục của hội viên (đúng bảng). Admin vẫn xem được dữ liệu người dùng qua API khi hỗ trợ.
3. **Chặn ở cả hai lớp:** giao diện ẩn mục không có quyền; backend vẫn là lớp bảo vệ thật (đã có `[Authorize(Roles=...)]` và kiểm quyền chủ dữ liệu). Không dựa vào FE để bảo mật.
4. Tái sử dụng tối đa: khung `App.jsx`, `Sidebar`, `Navbar`, `ui.jsx` (Card, Banner, ProgressRing), `apiClient`, `session.js`, `consultationApi.js`, `fmdApi.js`, các class Tailwind đang dùng. Màu: hội viên xanh lá, chuyên gia tím (đã dùng ở Tư vấn), Admin xanh đậm/xám để phân biệt ngay.

## 4. Cấu trúc FE dự kiến

```
src/
  app/
    roles.js              // roleOf(session), PORTAL_BY_ROLE, MENU_BY_ROLE
    RoleGuard.jsx         // chặn tab không đủ quyền, hiện "Không có quyền" (403)
  shared/components/
    Sidebar.jsx           // nhận danh sách menu theo role (hiện cứng 6 mục)
    Navbar.jsx            // nút "Ghi nhận bữa ăn" và streak chỉ cho hội viên; badge role cho Nutri/Admin
  features/
    doctor/               // portal chuyên gia (tách từ ConsultationView, thêm trang mới)
      DoctorDashboard.jsx
      DoctorSchedule.jsx
      PatientRecord.jsx
      AdviceManager.jsx
      DoctorProfile.jsx
      doctorApi.js
    admin/                // portal quản trị
      AdminDashboard.jsx
      FmdRulesAdmin.jsx
      MealTemplatesAdmin.jsx
      UsersRolesAdmin.jsx
      NutritionistsAdmin.jsx
      SystemMonitor.jsx
      adminApi.js
```

`App.jsx` chọn portal theo role; `Sidebar` nhận `menuItems` theo role thay vì mảng cố định; `tests/` thêm kiểm tra ánh xạ role → menu và guard.

## 5. Portal Chuyên gia (Nutritionist)

| Mục menu | Nội dung | API dùng (đã có) | Cần thêm ở BE |
|---|---|---|---|
| Tổng quan | Lịch hẹn hôm nay và sắp tới, số lịch chờ xác nhận, số phiếu đã kê | `GET /api/consultations/nutritionist/{id}` | Không |
| Lịch hẹn | Danh sách theo trạng thái (Chờ, Đã xác nhận, Hoàn thành, Hủy), lọc theo ngày; **Xác nhận**, **Hủy** | `confirm`, `cancel`, danh sách ở trên | Không |
| Hồ sơ bệnh nhân | Danh sách hội viên từng đặt lịch với mình (suy ra từ lịch hẹn); chi tiết: tóm tắt nhịn ăn, dinh dưỡng, FMD qua gRPC, kèm độ trễ | `GET /api/consultations/review-user/{userId}` | Tên hội viên (hiện chỉ có `userId`; cần Identity hoặc lưu `userName` lúc đặt lịch, cùng cách đã làm với `UserEmail`) |
| Kê lời khuyên | Form 3 ô (tóm tắt, dinh dưỡng, nhịn ăn) gắn với một buổi; **lịch sử phiếu đã kê** | `POST /api/consultations/advice` | `GET /api/consultations/nutritionist/{id}/advices` (chưa có) |
| Hồ sơ chuyên gia | Sửa giới thiệu, chứng chỉ, tags, ảnh đại diện (URL) | Không | `PUT /api/consultations/nutritionists/me` (chưa có), kiểm tra chỉ sửa hồ sơ của mình |
| Thông báo | Chuông và danh sách (dùng lại Navbar) | `/api/notifications/...` | Không |

Có thể làm ngay bằng cách **tách** phần "Cổng Bác Sĩ & gRPC" trong `ConsultationView.jsx` (khoảng 300 dòng) thành `features/doctor/*`; tab đó hiện tại chạy tốt (xác nhận, hủy, gRPC, kê lời khuyên).

## 6. Portal Quản trị (Admin)

| Mục menu | Nội dung | API dùng (đã có) | Cần thêm ở BE |
|---|---|---|---|
| Tổng quan quản trị | Thẻ số liệu: số người dùng, số chuyên gia, lịch hẹn hôm nay, thông báo gửi lỗi | Một phần | `GET /api/admin/stats` gom số liệu (mới) |
| Quy tắc FMD | Bảng 5 ngày, sửa kcal, đạm, béo, carb, mô tả; cảnh báo nếu lệch thiết kế 1100/780/760/760/780 | `GET`, `PUT /api/admin/fmd-rules/{day}` | Không |
| Mẫu bữa ăn | Danh sách, **tạo mới**; sửa và xóa | `GET`, `POST /api/mealtemplates` | `PUT`, `DELETE /api/mealtemplates/{id}` |
| Người dùng và phân quyền | Danh sách người dùng (email, họ tên, role, trạng thái), tìm kiếm, **đổi role**, khóa tài khoản | `PUT /api/users/{id}/role` | `GET /api/users` (phân trang, tìm kiếm), `PUT /api/users/{id}/active` |
| Chuyên gia | Danh sách hồ sơ chuyên gia, **xác thực**, gắn tài khoản người dùng | `GET /api/consultations/nutritionists` | `POST /api/consultations/nutritionists`, `PUT .../{id}/verify`, `PUT .../{id}/link-user` |
| Giám sát hệ thống | Trạng thái job Hangfire, kích hoạt tay, liên kết dashboard; nhật ký thông báo; gửi thông báo thủ công | `POST /api/notifications/send` | Đưa JobService qua Gateway và **thêm xác thực Admin** cho `/jobs/*` (hiện không có xác thực) |

## 7. Lộ trình triển khai (tổng ≈ 7 đến 8 ngày công, một người)

| Giai đoạn | Việc | Ước lượng |
|---|---|---|
| **P0. Khung theo role** | `roles.js`, `RoleGuard`, `Sidebar` nhận menu theo role, `App.jsx` chọn portal, ẩn nút hội viên trong Navbar cho Nutri/Admin, test ánh xạ role → menu | 0,5 ngày |
| **P1. Admin dùng API sẵn có** | Quy tắc FMD, Mẫu bữa ăn (xem và tạo), Phân quyền (đổi role theo ID người dùng) | 1,5 ngày |
| **P2. Portal chuyên gia từ phần đã có** | Tách tab bác sĩ thành `features/doctor`, thêm Tổng quan, Lịch hẹn (lọc), Hồ sơ bệnh nhân | 1,5 ngày |
| **P3. Bổ sung backend** | `GET /api/users`, `PUT /api/users/{id}/active`; sửa và xóa mẫu bữa ăn; `GET .../nutritionist/{id}/advices`; `PUT .../nutritionists/me`; xác thực và liên kết chuyên gia; tên hội viên trong lịch hẹn; `GET /api/admin/stats`. Mỗi API kèm test e2e | 2 ngày |
| **P4. Hoàn thiện giao diện P3** | Danh sách người dùng, quản lý chuyên gia, lịch sử phiếu, hồ sơ chuyên gia, Tổng quan quản trị | 1,5 ngày |
| **P5. Giám sát và hoàn tất** | JobService qua Gateway + xác thực; trang Giám sát; cập nhật `DEMO_SCRIPT.md`, slide Actors, `TEAM_FIX_NOTES.md`; test trình duyệt cả 3 role | 1 ngày |

**Có thể trình diễn sớm:** xong P0 + P1 + P2 (khoảng 3,5 ngày) đã có đủ giao diện Admin và Chuyên gia khác biệt rõ rệt, dùng API hiện có. P3 đến P5 là phần mở rộng.

## 8. Kiểm thử

- **FE (`npm test`):** ánh xạ role → menu, `RoleGuard` (User vào route admin bị chặn), Sidebar không hiện mục sai role.
- **API (script e2e mới `docs/tests/e2e-role-portals.js`):** mỗi API mới kiểm đúng/sai quyền (User 403, Nutri chỉ dữ liệu của mình, Admin 200), kiểm tra nghiệp vụ (đổi role có hiệu lực sau đăng nhập lại, khóa tài khoản chặn đăng nhập).
- **Trình duyệt:** đăng nhập lần lượt `minhanh`, `bacsi`, `admin`, kiểm menu và một thao tác chính mỗi role.

## 9. Rủi ro và điểm cần chốt

1. **Chặn Nutri/Admin dùng chức năng hội viên ở backend hay chỉ ẩn ở giao diện?** Đề xuất chỉ ẩn ở giao diện (đủ cho yêu cầu hiển thị, Admin còn cần quyền đọc để hỗ trợ). Nếu muốn chặn cứng, phải thêm policy cho từng controller hội viên và cập nhật test.
2. **Đổi role chỉ có hiệu lực sau khi người đó đăng nhập lại** (role nằm trong JWT, hết hạn 2 giờ). Cần ghi chú trên giao diện.
3. **JobService hiện không có xác thực** và không đi qua Gateway: cần sửa trước khi đưa nút kích hoạt job lên giao diện Admin.
4. **Tên hội viên** trong danh sách lịch hẹn của bác sĩ cần nguồn dữ liệu (Consultation không truy vấn được Identity): đề xuất lưu `UserName` lúc đặt lịch giống `UserEmail`.
5. Tài khoản Admin đầu tiên vẫn chưa có seed trong Identity (hiện đặt bằng `scripts/seed-demo.js`); nên thêm seeder khi triển khai P3.
6. Tài liệu bảng phân quyền cần sửa: `POST /api/consultations/sessions` → `POST /api/consultations/book`.

---

## 10. Trạng thái triển khai (16/11/2026)

### Đã làm: P0 + P1 (Portal Admin)
- **P0 khung theo role:** `src/app/roles.js` (role → portal → tab được phép), `src/app/menus.js` (menu Admin), `Sidebar` nhận menu và tiêu đề theo portal, `Navbar` ẩn streak và nút "Ghi nhận bữa ăn" ở portal Admin, `App.jsx` chọn portal theo role trong JWT; tab không thuộc portal thì tự quay về tab mặc định.
- **P1 trang Admin** (`src/features/admin/`), toàn bộ dùng API đã có:

| Trang | Chức năng | API |
|---|---|---|
| Tổng quan quản trị | Số quy tắc FMD, mẫu bữa ăn, chuyên gia; kiểm tra 4 dịch vụ qua Gateway; bảng phân quyền; cảnh báo nếu rule FMD lệch thiết kế | `GET fmd-rules`, `mealtemplates`, `consultations/nutritionists`, và 4 probe |
| Quy tắc FMD | Sửa kcal, macro, mô tả từng ngày (kiểm tổng macro = 100%), nút "Đặt theo thiết kế" | `GET`, `PUT /api/admin/fmd-rules/{day}` |
| Mẫu bữa ăn | Danh sách và tạo mẫu mới | `GET`, `POST /api/mealtemplates` |
| Phân quyền người dùng | Đổi role theo mã người dùng (GUID), cảnh báo khi tự hạ quyền | `PUT /api/users/{id}/role` |
| Thông báo hệ thống | Gửi thông báo thủ công (Email hoặc trong ứng dụng) | `POST /api/notifications/send` |

- **Kiểm thử:** thêm `tests/roles.test.js` và `tests/adminApi.test.js` → `npm test` **27/27 đạt**. Đã thao tác trên trình duyệt bằng `admin@longevity.test`: menu chỉ có 5 mục Admin, 4 dịch vụ báo "Hoạt động", sửa và khôi phục rule FMD, tạo mẫu bữa ăn (4 → 5), đổi role, báo lỗi GUID sai, gửi thông báo. Đăng nhập `minhanh` vẫn thấy đúng menu hội viên.
- **Giới hạn đã biết:** chưa có danh sách người dùng nên phải nhập GUID; chưa có sửa và xóa mẫu bữa ăn; chuyên gia vẫn dùng portal hội viên (tab "Cổng Bác Sĩ & gRPC").

### Còn lại: P2 đến P5 (portal Chuyên gia, API bổ sung, giám sát)

## 11. Kiểm kê API backend dành cho Chuyên gia (Nutritionist)

| API | Quyền | Trạng thái |
|---|---|---|
| `GET /api/consultations/nutritionists`, `/nutritionists/{id}` | Công khai | Có |
| `GET /api/consultations/nutritionists/{id}/availability?date=` | Công khai | Có |
| `GET /api/consultations/nutritionist/{nutritionistId}` (lịch hẹn của mình) | Nutritionist, Admin; bác sĩ chỉ xem hồ sơ của mình | Có |
| `POST /api/consultations/{sessionId}/confirm` | Nutritionist, Admin; chỉ lịch của mình | Có |
| `POST /api/consultations/{sessionId}/cancel` | Chủ lịch, bác sĩ phụ trách, Admin | Có |
| `GET /api/consultations/review-user/{userId}` (gRPC: nhịn ăn, dinh dưỡng, FMD) | Nutritionist, Admin; chỉ hội viên đã đặt lịch với mình | Có |
| `POST /api/consultations/advice` (kê lời khuyên, phát sự kiện email) | Nutritionist, Admin; chỉ buổi của mình | Có |
| Dùng chung: `/api/notifications/...`, `GET/PUT /api/users/{id}/profile` | Chủ tài khoản | Có |
| Danh sách phiếu lời khuyên **đã kê** của bác sĩ | Nutritionist, Admin | **Chưa có** |
| Bác sĩ xem và **sửa hồ sơ chuyên gia** của mình (giới thiệu, tags, ảnh) | Nutritionist | **Chưa có** |
| Danh sách **hội viên** của bác sĩ kèm tên (hiện chỉ có `userId` trong lịch hẹn) | Nutritionist | **Chưa có** (cần lưu `UserName` lúc đặt lịch) |
| Admin **tạo, xác thực, gắn tài khoản** cho hồ sơ chuyên gia | Admin | **Chưa có** |
| Thống kê (số buổi, số phiếu) | Nutritionist | **Chưa có** (có thể suy ra từ danh sách lịch hẹn ở FE) |

Kết luận: các thao tác lõi của bác sĩ (xem lịch, xác nhận, hủy, xem dữ liệu bệnh nhân qua gRPC, kê lời khuyên) **đủ API để dựng portal Chuyên gia ngay (P2)**. Các mục "Chưa có" nằm ở P3.


## 12. Cập nhật: Portal Chuyên gia (P2) đã làm xong

Đăng nhập tài khoản role Nutritionist (vd. `bacsi@longevity.test`) vào **portal Chuyên gia riêng** (tím), không còn dùng giao diện hội viên. `src/features/doctor/`, chỉ dùng API đã có:

| Mục | Chức năng | API |
|---|---|---|
| Tổng quan | Số lịch chờ xác nhận, lịch hôm nay (giờ Việt Nam), số hội viên, số buổi hoàn thành; 5 lịch sắp tới có nút Xác nhận, Hủy, Kê lời khuyên; hồ sơ chuyên gia (tags) | `GET nutritionists`, `GET nutritionist/{id}` |
| Lịch hẹn | Lọc theo trạng thái và ngày; Xác nhận, Hủy, Kê lời khuyên, mở Hồ sơ bệnh nhân | `confirm`, `cancel` |
| Hồ sơ bệnh nhân | Danh sách hội viên đã đặt lịch (gom từ lịch hẹn); bảng sức khỏe qua gRPC (nhịn ăn, dinh dưỡng trung bình, FMD kèm định mức theo ngày, thời gian phản hồi); các buổi của hội viên đó | `GET review-user/{userId}` |
| Kê lời khuyên | Danh sách buổi chờ lời khuyên, form 3 ô (≥ 5 ký tự), danh sách buổi đã hoàn thành | `POST advice` |

- Tài khoản role Nutritionist **chưa gắn hồ sơ chuyên gia** sẽ thấy thông báo hướng dẫn nhờ Admin gắn hồ sơ.
- Logic thuần tách ra `doctorLogic.js` và có test: `tests/doctorLogic.test.js` (5), cập nhật `tests/roles.test.js` → `npm test` **32/32 đạt**.
- Đã thao tác thật bằng `bacsi@longevity.test`: lọc lịch chờ, xác nhận, xem hồ sơ gRPC của hội viên, báo lỗi khi ô lời khuyên ngắn, gửi lời khuyên (buổi chuyển Hoàn thành, email tới hộp thư hội viên trong Mailpit), hủy lịch còn lại.
- Tab "Cổng Bác Sĩ & gRPC" cũ trong mục Tư vấn của hội viên không còn được dùng (chuyên gia không vào portal hội viên nữa).
- **Còn thiếu (cần API ở P3):** tên hội viên (đang hiển thị mã rút gọn), nội dung phiếu đã kê, chuyên gia tự sửa hồ sơ.


---

## 13. Lỗi "hội viên đặt lịch, bác sĩ không thấy" (16/11/2026)

**Nguyên nhân gốc:** lịch hẹn gắn với *hồ sơ chuyên gia* (`nutritionist_profiles`), còn bác sĩ đăng nhập thấy lịch qua `nutritionist_profiles.user_id` trùng `userId` trong JWT. Ba hồ sơ seed của Consultation có `user_id` **giả** (`aaaa…`, `bbbb…`, `cccc…`), nên chỉ hồ sơ nào được gắn tay với một tài khoản thật thì bác sĩ mới thấy lịch. Hội viên đặt với bác sĩ chưa gắn (ở demo là BS. CKI Trần Thanh Tùng) thì **không ai nhìn thấy** lịch đó.

**Đã sửa:**
- `scripts/seed-demo.js` gắn **đủ 3 hồ sơ** với 3 tài khoản thật: `bacsi@longevity.test` (Đặng Minh Tuấn), `nutritionist@longevitytracker.com` (Lê Thị Hoàng Oanh, tài khoản Khoa seed), `bacsi3@longevity.test` (Trần Thanh Tùng). Chạy lại: `node scripts/seed-demo.js`.
- **Portal chuyên gia tự làm mới mỗi 10 giây** nên lịch mới của hội viên tự xuất hiện, không cần tải lại trang.
- **Bác sĩ nhận thông báo "Lịch tư vấn mới"**: sự kiện `ConsultationBooked` mang thêm `NutritionistUserId`; Notification tạo thông báo trong ứng dụng cho bác sĩ (hiện ở chuông).
- Test mới `docs/tests/e2e-booking-sync.js` (24 kiểm tra): với từng bác sĩ, hội viên đặt lịch thì đúng bác sĩ đó thấy, bác sĩ khác bị 403, bác sĩ có thông báo, xác nhận xong hội viên thấy trạng thái mới.

**Còn thiếu (P3):** Admin gắn hồ sơ chuyên gia với tài khoản ngay trên giao diện; chặn đặt lịch với bác sĩ chưa gắn tài khoản. Hiện bác sĩ mới (tạo ngoài seed) phải gắn bằng SQL.


---

## 14. API Admin mới của Identity (Khoa) đã nối vào giao diện (16/11/2026)

Khoa đã thêm vào Identity: liệt kê người dùng có phân trang, khóa/mở khóa tài khoản, thống kê. Qua Gateway gọi được ở cả `/api/users...` và `/api/admin/...`; FE dùng nhóm `/api/users` (cùng prefix đã có route).

| API | Quyền | Đã nối vào |
|---|---|---|
| `GET /api/users?pageNumber&pageSize&searchTerm&role&isActive` | Admin | Trang **Người dùng và phân quyền** (bảng, tìm kiếm có debounce, lọc vai trò và trạng thái, phân trang); ô chọn người nhận ở **Thông báo hệ thống** |
| `PUT /api/users/{id}/status` `{isActive, reason}` | Admin; không tự khóa mình (400); khóa thì thu hồi phiên và chặn đăng nhập (403) | Nút **Khóa / Mở khóa** kèm lý do trong trang Người dùng |
| `GET /api/users/stats` | Admin | **Tổng quan quản trị**: tổng, đang hoạt động, đã khóa, email xác thực; theo vai trò; đăng ký 1, 7, 30 ngày; hồ sơ sức khỏe (hoàn thiện, kcal trung bình, nhịn ăn ưa thích) |
| `PUT /api/users/{id}/role` (đã có) | Admin | Chọn vai trò ngay trên từng dòng rồi **Lưu** (thay cho ô nhập GUID cũ) |

Việc cần làm cho bản cũ ở mục 6 của kế hoạch này: dòng "Người dùng và phân quyền" và "GET /api/users" **đã xong**; còn thiếu: sửa/xóa mẫu bữa ăn, gắn hồ sơ chuyên gia với tài khoản, giám sát JobService.

Kiểm thử: `tests/adminApi.test.js` thêm 3 test → `npm test` **35/35**; script mới `docs/tests/e2e-admin-users.js` **19/19**; 5 script e2e cũ vẫn đạt (42 + 45 + 34 + 16 + 24); đã thao tác trên trình duyệt bằng admin (tìm kiếm, lọc, khóa và mở khóa, đổi role và trả lại, nút tự khóa bị vô hiệu, chọn người nhận thông báo).
