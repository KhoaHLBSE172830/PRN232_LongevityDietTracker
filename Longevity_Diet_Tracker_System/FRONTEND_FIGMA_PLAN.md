# Kế hoạch dựng Front-end theo Figma + đối chiếu Backend

> Người lập: Kiệt (16/11/2026). Trạng thái: **KẾ HOẠCH – chưa code**. Chờ team duyệt.
> Nguồn: 10 ảnh Figma (Landing, Tổng quan, Fasting, Bữa ăn, FMD, Hồ sơ, Tư vấn) + khảo sát `src/Clients/web-app` và 4 service BE.
> Nhãn "(Minh họa)" trên Figma cho thấy thiết kế là bản demo cục bộ → ưu tiên **nối dữ liệu thật ở chỗ BE đã có, phần chưa có thì giữ mock có banner rõ ràng** (giống cách đã làm ở Fasting/Consultation).

---

## 1. Hiện trạng FE (tái sử dụng được nhiều)

| File | Dòng | Tình trạng |
|---|---|---|
| `App.jsx` | 139 | Đã có tab overview/meals/fasting/fmd/consultation/profile → **giữ** |
| `shared/pages/LandingPage.jsx` | 812 | Có sẵn, chỉnh theo Figma |
| `shared/pages/OverviewDashboard.jsx` | 386 | Dùng `DEMO_USER` (streak, tên), chưa gọi API |
| `shared/components/Navbar.jsx`, `Sidebar.jsx` | 127 / 479 | Dùng `DEMO_USER`; chưa có chuông thông báo/menu user |
| `features/meals/*` (MealsView, AddMealModal, mealsApi) | 405/571/113 | Gọi `/api/meals/user/{id}?date=`, `POST /api/meals`, `/api/nutrition/search` – **chưa gửi token** |
| `features/fasting/*` | 466/275 | Đã nối BE thật (Kiệt làm), theme xanh dương |
| `features/fmd/*` | 250/144 | Đã nối BE (Quốc) |
| `features/consultation/*` | 870/221 | Đã nối BE (Khôi), đã sửa N1–N9 |
| `features/auth/ProfileView.jsx` | 106 | **Tĩnh**, không state, không API |
| `features/auth/AuthModal.jsx`, `authApi.js` | 175/50 | Giả lập thành công, luôn dùng `DEMO_USER` |
| `shared/services/apiClient.js` | 38 | Chưa có interceptor gắn token |

Design system: Tailwind có palette `longevity` (xanh lá), `sage`, `ikaria`; font cấu hình **Be Vietnam Pro** nhưng `index.css`/`index.html` đang dùng **Plus Jakarta Sans** → cần thống nhất theo Figma (đề xuất giữ Plus Jakarta Sans, sửa tailwind config).

---

## 2. Đối chiếu từng màn hình Figma ↔ FE ↔ BE

Ký hiệu: ✅ BE đủ · 🟡 BE có nhưng thiếu một phần · ❌ BE chưa có (giữ mock + ghi chú).

| # | Màn hình Figma | FE sẽ chỉnh | BE dùng | Đánh giá |
|---|---|---|---|---|
| 1 | **Landing** | `LandingPage.jsx`, `AuthModal.jsx` | `POST /api/auth/login`, `/register` (Khoa) | 🟡 Giao diện tĩnh làm được ngay. Đăng nhập thật phụ thuộc Identity (mục 4) |
| 2 | **Tổng quan** (lời chào, streak, kcal/macro, fasting đang chạy, FMD, thói quen, bữa hôm nay) | `OverviewDashboard.jsx` | `GET /api/meals/user/{id}?date=`, `GET /api/fasting/.../active`, `GET /api/fmd/...` | 🟡 Kcal/macro/fasting/FMD ghép được từ 3 API có sẵn (gọi song song, `Promise.allSettled`). **Streak, thói quen (nước/vận động)** ❌ chưa có BE |
| 3 | **Fasting** (preset 12:12/14:10/16:8/18:6/20:4, đồng hồ, bắt đầu/kết thúc, lịch sử) | `FastingView.jsx` (đã có) | `POST start/end/cancel`, `GET active` | 🟡 Thiếu preset **14:10** (enum), **pause/resume**, **lịch sử/danh sách phiên**, streak |
| 4 | **Bữa ăn** (chọn ngày, 4 bữa, thêm món, mẫu bữa, tổng macro) | `MealsView.jsx`, `AddMealModal.jsx` | `GET/POST /api/meals`, `/api/mealtemplates`, `/api/nutrition/search` (Vy) | 🟡 Đọc/thêm OK. **Sửa/xóa bữa** ❌; GET meals **chưa kiểm quyền chủ sở hữu** |
| 5 | **FMD** (ngày 1–5, kcal từng ngày, ngày nghỉ, tiến độ) | `FmdView.jsx` | `/api/fmd/...` (Quốc) | 🟡 Figma ghi kcal ~1100/780/760/760/780; rule BE là 1100/725 → **lệch; đã chốt theo Figma** (Quốc chỉnh rule BE cho khớp). Thiếu **lịch sử chu kỳ** và **hủy chu kỳ** |
| 6 | **Hồ sơ** (thông tin, mục tiêu kcal/macro, kiểu fasting ưa thích, hướng ăn, nhắc nước/tối) | `ProfileView.jsx` | `GET/PUT /api/users/{id}/profile` (Khoa) | ❌/🟡 Identity chỉ có thông tin cơ bản; **mục tiêu năng lượng/macro, fasting ưa thích, định hướng ăn, cấu hình nhắc** chưa có field |
| 7 | **Tư vấn** (danh sách bác sĩ, đặt lịch, lịch của tôi, ghi chú tư vấn) | `ConsultationView.jsx` | `/api/consultations/...` (Khôi) | 🟡 "Ghi chú tư vấn" = `AdviceNote` ✅. Thiếu **khung giờ trống, tag/avatar bác sĩ, xác nhận/hủy lịch từ phía user**. Màn hình bác sĩ/gRPC review không có trong Figma → giữ, ẩn theo role |
| 8 | **Navbar/Sidebar** (chuông, menu user, streak) | `Navbar.jsx`, `Sidebar.jsx` | `/api/notifications/...` (Quốc) | 🟡 Có thông báo nhưng **chưa có trạng thái đã đọc / đếm chưa đọc** cho chuông |

---

## 3. Kế hoạch triển khai FE (theo thứ tự)

**Giai đoạn F0 – Nền tảng (làm trước, ~0.5 ngày)**
1. `apiClient.js`: interceptor gắn `Authorization: Bearer` từ `localStorage.accessToken`; xử lý 401 → mở AuthModal.
2. Tạo helper dùng chung `shared/services/session.js` (lấy userId/role từ JWT — đã có logic ở `fastingApi.js`, tách ra).
3. Chuẩn hóa token màu/font theo Figma (sửa `tailwind.config.js` sang Plus Jakarta Sans, `index.css`), thêm component dùng chung: `Card`, `StatPill`, `ProgressRing`, `Banner` (offline/mock – giống banner đã dùng ở Fasting/Consultation).
4. `mealsApi.js`: thêm token (nhờ interceptor) — không cần đổi endpoint.

**F1 – Landing + Auth (~0.5 ngày)** · chỉnh `LandingPage`, `AuthModal` đúng Figma; login/register gọi Identity thật, nếu Identity chưa chạy thì giữ chế độ demo có banner.

**F2 – Navbar/Sidebar + Tổng quan (~1 ngày)** · bỏ `DEMO_USER`; Overview gọi meals + fasting + fmd song song; thẻ chưa có BE (streak, thói quen) hiển thị dữ liệu mẫu có nhãn "(Minh họa)" đúng như Figma.

**F3 – Bữa ăn (~1 ngày)** · chỉnh layout theo Figma, mẫu bữa (`mealtemplates`); nút sửa/xóa ẩn cho đến khi BE có.

**F4 – Fasting (~0.5 ngày)** · đổi theme từ xanh dương sang palette Figma, thêm preset 14:10 (chỉ hiển thị khi BE hỗ trợ; tạm gửi 16:8 sẽ sai nên **không bật** nếu chưa có enum), khối lịch sử dạng mock.

**F5 – FMD (~0.5 ngày)** · layout 5 ngày + ngày nghỉ; hiển thị kcal theo Figma (đã chốt), ghi chú "(Minh họa)" nếu BE trả số khác cho đến khi Quốc chỉnh rule.

**F6 – Hồ sơ (~1 ngày)** · chuyển sang form có state; lưu phần Identity có thật (họ tên, tuổi, cân nặng…), phần còn lại lưu `localStorage` tạm + banner.

**F7 – Tư vấn (~0.5 ngày)** · đổi layout theo Figma (tab: bác sĩ / lịch của tôi / ghi chú); giữ phần role bác sĩ.

**F8 – Test e2e trên trình duyệt + chỉnh responsive (~0.5 ngày).**

Tổng ước tính: **~5–6 ngày công** cho 1 người, F1–F7 có thể chia song song sau F0.

---

## 4. Điều kiện tiên quyết (chặn đăng nhập thật)

Đây là các lỗi ở Identity (phần Khoa), **chưa sửa theo yêu cầu "khoan đụng vào phần Khoa"**:
- Identity chạy cổng **5251** (launchSettings) nhưng Gateway/docs mong **5001**.
- Migration `identity_db` đang **PascalCase** trong khi runtime dùng snake_case → lỗi DB khi chạy thật.
- Đăng ký cho phép tự chọn role **Admin**.
- Profile không kiểm quyền chủ sở hữu.

**Đã chốt: không sửa Identity.** FE chạy bằng token test/demo; đăng ký/đăng nhập tài khoản thật sẽ không dùng được cho đến khi Khoa sửa. Các mục này được ghi lại để báo Khoa.

---

## 5. Danh sách BE còn thiếu (để báo bạn bè)

| Chủ | Thiếu | Ảnh hưởng màn hình |
|---|---|---|
| **Khoa** (Identity) | Sửa cổng/migration; chặn tự đăng ký Admin; thêm field hồ sơ: mục tiêu kcal & macro, fasting ưa thích, định hướng ăn, cấu hình nhắc nước/tối; kiểm quyền profile | Landing/Auth, Hồ sơ |
| **Kiệt** (Fasting) | Enum 14:10; API lịch sử phiên; pause/resume; streak; (nếu cần) API thói quen nước/vận động | Fasting, Tổng quan |
| **Vy** (Meals) | Sửa/xóa bữa; kiểm quyền chủ sở hữu GET meals | Bữa ăn |
| **Quốc** (FMD/Notification) | Lịch sử + hủy chu kỳ FMD; chỉnh rule kcal cho khớp Figma (1100/780/760/760/780, đã chốt); kiểm quyền GET FMD; read-state + unread-count cho thông báo | FMD, Navbar |
| **Khôi** (Consultation) | Khung giờ trống; tag/avatar bác sĩ; API xác nhận/hủy lịch từ phía user; tên field "ghi chú tư vấn" cho khớp Figma | Tư vấn |

---

## 6. Quyết định đã chốt (cập nhật 16/11/2026)

1. **Font: Plus Jakarta Sans.** Sửa `tailwind.config.js` (`fontFamily.sans`) cho khớp `index.css`/`index.html`, bỏ Be Vietnam Pro.
2. **Kcal FMD: theo Figma** (ngày 1 ≈ 1100, ngày 2–5 ≈ 780/760/760/780). FE hiển thị đúng số Figma. Rule BE của Quốc (1100/725) cần Quốc chỉnh lại qua `admin/fmd-rules` hoặc seed để khớp; trong lúc chờ, FE hiển thị số Figma và ghi chú "(Minh họa)" nếu BE trả số khác.
3. **Không sửa Identity (Khoa).** FE đăng nhập bằng chế độ demo/token test: `AuthModal` giữ luồng hiện tại nhưng tạo token hợp lệ cho dev, kèm banner "Chế độ demo". Hồ sơ: phần Identity có thật thì gọi API nếu chạy được, các field mới (mục tiêu kcal/macro, fasting ưa thích, định hướng ăn, nhắc nước/tối) lưu `localStorage`.
4. **Phần chưa có BE** (streak, thói quen, lịch sử, sửa/xóa bữa…): giữ dữ liệu mẫu nhãn "(Minh họa)", nối thật khi BE có.
5. **Phân công: Kiệt làm toàn bộ FE (F0–F8), làm tuần tự**, không chia song song. Ước tính giữ ~5–6 ngày công; đề xuất thứ tự ưu tiên khi cần cắt: F0 → F2 (Tổng quan) → F3 (Bữa ăn) → F4/F5 → F6 → F7 → F1 → F8.


---

## 7. Trạng thái triển khai (16/11/2026)

F0–F8 đã làm xong ở mức **nối dữ liệu + hành vi**, build Vite OK, đã chạy thử trên trình duyệt ở chế độ demo (Gateway không chạy). **Chưa chạy lại với backend thật + JWT**, và **chưa so khớp từng pixel với Figma** (chỉ tái sử dụng giao diện sẵn có, chỉnh theo cấu trúc/chức năng).

| Giai đoạn | Đã làm | Còn thiếu / ghi chú |
|---|---|---|
| F0 | `session.js`, interceptor token + bắt 401, font Plus Jakarta Sans, `ui.jsx` | `fastingApi.js`/`fmdApi.js` vẫn có bản decode JWT riêng |
| F1 | `authApi` (lỗi nghiệp vụ hiện thông báo, BE sập → demo), `AuthModal` (lỗi, sửa lỗi hooks khi `isOpen=false`), `userStore` giữ người dùng sau F5, đăng xuất, 401 → mở form đăng nhập, `VITE_DEV_JWT` cho vào nhanh bằng token dev | Landing chưa chỉnh theo Figma (giữ nguyên) |
| F2 | Navbar: chuông thông báo (số thông báo gần đây, chưa có đã đọc), nút hồ sơ/đăng xuất; Sidebar dùng người dùng thật + đăng xuất; Tổng quan gọi meals/fasting/FMD/tư vấn song song (`overviewData.js`), banner demo | Streak, thói quen: "(Minh họa)" |
| F3 | Chọn ngày (hôm trước/sau), bữa ghi đúng ngày đang xem, mẫu bữa ăn `/api/mealtemplates`, sửa lệch múi giờ khi gửi `date` | Sửa/xóa bữa chưa có BE |
| F4 | Preset 14:10 (gửi `Extended`=5 + 14 giờ, nhãn suy ra từ thời lượng), theme xanh lá | Pause/resume, lịch sử, streak chưa có BE. **BE chưa có enum 14:10** nên phiên này xuất hiện trong dữ liệu BE là loại "Extended" |
| F5 | Kcal 1100/780/760/760/780 hiển thị theo Figma, banner khi rule BE lệch | **Quốc cần chỉnh rule BE**; cảnh báo vượt kcal phía BE vẫn dùng rule cũ cho đến lúc đó. Lịch sử/hủy chu kỳ chưa có BE |
| F6 | Hồ sơ dạng form: tên, kcal, macro (tổng = 100%), fasting ưa thích, định hướng ăn; nhắc email/fasting lưu qua Notification API; nhắc nước/tối lưu cục bộ | Lưu cục bộ vì Identity chưa hỗ trợ các trường này |
| F7 | "Phiếu lời khuyên" → "Ghi Chú Tư Vấn"; tab Cổng Bác Sĩ & gRPC chỉ hiện cho Nutritionist/Admin | Khung giờ trống, tag/avatar bác sĩ, xác nhận/hủy lịch chưa có BE |
| F8 | Build OK; chạy thử demo: landing → vào nhanh → 6 tab, bắt đầu fasting 14:10, lưu hồ sơ | Chưa test với stack Docker + JWT thật |

Lỗi tìm thấy khi test và đã sửa: `loadOverview` đọc nhầm kết quả `fastingApi` (trả `{session, mock, reason}`) gây `RangeError` và trang Tổng quan kẹt "Đang tải...".

---

## 8. Đã sửa phía Backend (Kiệt, Khoa, Khôi) — 16/11/2026

Test: `node docs/tests/e2e-new-apis.js` (gọi thẳng Identity :5001, DietFasting :5002, Consultation :5003) → **42/42 PASS**, chạy 2 lần liên tiếp. Đã thử thêm trên trình duyệt qua Gateway: đăng ký thật, lưu hồ sơ lên Identity, fasting 14:10 + tạm dừng/tiếp tục/lịch sử/streak, đặt và hủy lịch tư vấn bằng khung giờ trống.

| Phần | Thay đổi |
|---|---|
| **Khoa – Identity** | Cổng `launchSettings` 5251 → **5001** (khớp Gateway). Migration `identity_db` sinh lại theo snake_case. Đăng ký **không nhận role từ client** (luôn `User`); thêm `PUT /api/users/{id}/role` (chỉ Admin) để cấp Nutritionist. `GET/PUT profile` chỉ chủ tài khoản hoặc Admin (403 nếu khác). Hồ sơ thêm: `dailyCalorieTarget` (800–5000), `proteinPercent`/`carbsPercent`/`fatPercent` (tổng 100), `preferredFastingType`, `waterReminderEnabled`, `eveningReminderEnabled`. |
| **Khoa – lỗi tìm thấy khi test** | Đăng nhập (đúng mật khẩu) và lưu hồ sơ trả **500** (`DbUpdateConcurrencyException`): khóa Guid tự sinh nhưng chưa khai báo `ValueGeneratedNever`, EF coi `RefreshToken`/`UserProfile` mới là "Modified". Đã sửa trong `IdentityConfigurations.cs`. Lỗi này khiến đăng nhập thật chưa từng chạy được. |
| **Kiệt – DietFasting** | `FastingType.Intermittent14_10 = 7`. `POST /api/fasting/{id}/pause` và `/resume` (phiên tạm dừng vẫn là `InProgress`, mốc kết thúc dời đúng thời gian đã dừng, nhắc email bỏ qua phiên đang tạm dừng). `GET /api/fasting/user/{id}/history?limit=`, `GET /api/fasting/user/{id}/stats` (streak hiện tại/dài nhất, số phiên, tổng giờ). Migration mới `AddFastingPause`. |
| **Khôi – Consultation** | `NutritionistProfile.Tags`, `AvatarUrl` (migration `AddNutritionistTags`, seed có tags). `GET /api/consultations/nutritionists/{id}/availability?date=` (8 khung/ngày theo giờ VN, đã đặt thì không trống). Đặt trùng khung giờ → 409. `POST /api/consultations/{id}/confirm` (bác sĩ phụ trách/Admin) và `/cancel` (chủ lịch/bác sĩ phụ trách/Admin). Confirm/Cancel kiểm tra trạng thái hợp lệ. |

**Việc cần làm trên máy từng người sau khi pull:**
- `identity_db`: migration đã thay bằng bản mới → xóa DB rồi `dotnet ef database update` (DB chưa có dữ liệu thật).
- `diet_db`, `consultation_db`: chỉ cần `dotnet ef database update` (migration bổ sung).
- DB `consultation_db` đã seed trước đó sẽ chưa có `tags` (seeder chỉ chạy khi bảng rỗng) → FE tự bỏ qua; muốn có thì xóa DB hoặc cập nhật `tags` bằng SQL.

**Còn lại (không thuộc 3 người này):** Vy – sửa/xóa bữa ăn; Quốc – rule FMD 1100/780/760/760/780, lịch sử/hủy chu kỳ FMD, đã đọc/chưa đọc cho thông báo. Chưa có: đổi họ tên qua Identity (FE chỉ lưu cục bộ), tác vụ gửi nhắc uống nước/bữa tối, thói quen nước/vận động.

**Ghi chú an toàn còn tồn tại (chưa sửa):** Identity băm mật khẩu bằng SHA-256 không muối; nên đổi sang BCrypt/PBKDF2 trước khi nộp.

---

## 9. Đã sửa phần Quốc (FMD + Notification) và Vy (Meals) — 16/11/2026

Test: `node docs/tests/e2e-meals-fmd-notifications.js` (qua Gateway) → **45/45 PASS**; `e2e-new-apis.js` vẫn **42/42 PASS**. Đã chạy cả Gateway + Identity + DietFasting + Consultation + Notification + RabbitMQ + Redis + Postgres + Mailpit và thao tác trên trình duyệt: đăng ký thật, ghi/sửa/xóa bữa ăn, FMD bắt đầu/hủy/lịch sử, chuông thông báo.

| Phần | Thay đổi |
|---|---|
| **Vy – Meals** | `PUT /api/meals/{id}` (sửa loại bữa, món, ghi chú, mức no; tính lại tổng và kiểm lại ngưỡng FMD) và `DELETE /api/meals/{id}`; chỉ chủ bữa hoặc Admin. `POST /api/meals` lấy chủ bữa từ JWT (trước đây tin `userId` client gửi). `GET /api/meals/user/{id}` chỉ chủ hoặc Admin. |
| **Vy – lỗi tìm thấy** | `GET /api/meals/user/{id}?date=yyyy-MM-dd` **luôn lỗi 400** (Npgsql không nhận `DateTime` Kind=Unspecified) nên FE trước giờ chỉ chạy bằng dữ liệu mẫu. Đã sửa; thêm tham số `utcOffsetMinutes` để "ngày" tính theo giờ địa phương (FE tự gửi). |
| **Quốc – FMD** | Rule kcal mặc định **1100/780/760/760/780** (code + seed + migration `UpdateFmdRulesFigmaKcal` chỉ đổi dòng còn giữ 725, không đè giá trị Admin đã chỉnh). `GET /api/fmd/user/{id}/active` chỉ chủ hoặc Admin. `GET /api/fmd/user/{id}/history`, `POST /api/fmd/{cycleId}/cancel`. |
| **Quốc – Notification** | `readAtUtc`/`isRead` trên log (migration `AddNotificationReadAt`), `GET /user/{id}/unread-count`, `POST /{id}/read`, `POST /user/{id}/read-all`. Xem thông báo/preferences chỉ chủ hoặc Admin; `POST /send` chỉ Admin (các service khác gửi qua RabbitMQ). |
| **FE** | Sửa/thêm món + xóa bữa ăn; FMD hủy chu kỳ + lịch sử + khóa nút bắt đầu khi đang chạy; chuông thông báo đếm chưa đọc và đánh dấu đã đọc khi mở. Sửa lỗi hooks trong `AddMealModal` (`return null` đặt trước `useState` → lỗi khi mở modal). |

**Sau khi pull:** `dotnet ef database update` cho `diet_db` và `notification_db`.

**Chưa chạy/kiểm tra:** JobService (Hangfire) và luồng email nhắc fasting; email vượt kcal chỉ kiểm tra tới bản ghi thông báo, chưa mở Mailpit.


---

## 10. Đã sửa phần Kiệt và Vy (đợt 3) — 16/11/2026

Test mới: `node docs/tests/e2e-habits-templates.js` → **25/25 PASS**; hai script cũ vẫn 42/42 và 45/45. Đã thử trên trình duyệt qua Gateway: thói quen lưu trên máy chủ và còn sau khi tải lại, áp mẫu bữa ăn vào bữa trưa hai lần ra hai thẻ "Bữa Trưa" tổng 820 kcal.

- **Kiệt:** API thói quen (nước/vận động) + migration `AddHabitLogs` + route Gateway; thẻ thói quen ở Tổng quan đã bỏ nhãn "(Minh họa)" khi có dữ liệu thật.
- **Vy:** `POST /api/mealtemplates/{id}/apply`; ngày theo múi giờ khi kiểm ngưỡng FMD (`utcOffsetMinutes`); FE hiển thị nhiều bữa cùng loại và nút áp mẫu.
- Chi tiết, việc cần làm sau khi pull và phần còn thiếu: xem `TEAM_FIX_NOTES.md`.
