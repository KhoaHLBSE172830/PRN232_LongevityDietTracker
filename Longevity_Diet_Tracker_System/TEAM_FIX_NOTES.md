# Ghi chú sửa lỗi cho Khoa, Khôi, Quốc, Vy, Kiệt

> Người sửa: Kiệt (có hỗ trợ), 16/11/2026. Mọi thay đổi nằm trên nhánh `kiet`, **chưa commit/merge**.
> Mỗi người đọc phần của mình: **(1) đã sửa gì**, **(2) làm gì sau khi pull**, **(3) còn thiếu gì**.
> Kiểm chứng: `node docs/tests/e2e-new-apis.js` (42 kiểm tra), `node docs/tests/e2e-meals-fmd-notifications.js` (45 kiểm tra) và `node docs/tests/e2e-habits-templates.js` (25 kiểm tra) đều PASS, cộng với thao tác thật trên trình duyệt qua Gateway.

## Làm gì sau khi pull (chung cho mọi người)

```bash
dotnet build Longevity_Diet_Tracker_System.sln
# Identity: migration đã được thay mới -> xóa DB cũ rồi tạo lại
dotnet ef database drop --force --project src/Services/Identity/Identity.Infrastructure --startup-project src/Services/Identity/Identity.API
dotnet ef database update --project src/Services/Identity/Identity.Infrastructure --startup-project src/Services/Identity/Identity.API
# Các DB còn lại chỉ cần cập nhật (migration bổ sung)
# diet_db có thêm bảng habit_logs và cập nhật rule FMD
dotnet ef database update --project src/Services/DietFasting/DietFasting.Infrastructure --startup-project src/Services/DietFasting/DietFasting.API
dotnet ef database update --project src/Services/Consultation/Consultation.Infrastructure --startup-project src/Services/Consultation/Consultation.API
dotnet ef database update --project src/Services/Notification/Notification.Infrastructure --startup-project src/Services/Notification/Notification.API
```

Identity nay chạy cổng **5001** (khớp Gateway). Chạy FE trỏ vào Gateway cổng khác bằng biến `VITE_API_BASE_URL`.

---

## 1. KHOA (Identity)

### Đã sửa
| # | Vấn đề | Cách sửa |
|---|---|---|
| K1 | Cổng Identity 5251 ≠ cổng Gateway/docs 5001 | `launchSettings.json` → 5001 |
| K2 | Migration `identity_db` PascalCase trong khi runtime dùng snake_case (lỗi DB khi chạy thật) | Xóa và sinh lại `InitialIdentityDb` (bảng/cột snake_case) |
| K3 | **Đăng nhập đúng mật khẩu và lưu hồ sơ trả 500** (`DbUpdateConcurrencyException`): khóa Guid tự sinh nhưng chưa khai báo `ValueGeneratedNever`, EF coi `RefreshToken`/`UserProfile` mới là "Modified" | `ValueGeneratedNever()` cho `User`, `RefreshToken`, `UserProfile` trong `IdentityConfigurations.cs` |
| K4 | Đăng ký cho client tự chọn role (`Role = Admin`) | `RegisterRequestDto` bỏ `Role`; đăng ký luôn là `User` |
| K5 | Không có cách cấp role Nutritionist | `PUT /api/users/{id}/role` (chỉ Admin), body `{"role":"Nutritionist"}` (chuỗi, không phân biệt hoa thường) |
| K6 | `GET/PUT /api/users/{id}/profile` ai cũng đọc/sửa được hồ sơ người khác | Chỉ chủ tài khoản hoặc Admin, còn lại 403 |
| K7 | Hồ sơ thiếu trường cho màn Hồ sơ | Thêm `dailyCalorieTarget` (800–5000), `proteinPercent`/`carbsPercent`/`fatPercent` (tổng = 100), `preferredFastingType`, `waterReminderEnabled`, `eveningReminderEnabled`; sai thì 400 |

File chính: `Identity.API/Controllers/UsersController.cs`, `Identity.Application/Services/IdentityServices.cs`, `Identity.Application/DTOs/AuthDtos.cs`, `Identity.Domain/Entities/UserProfile.cs`, `Identity.Infrastructure/Configurations/IdentityConfigurations.cs`, migration mới.

### Còn thiếu (Khoa cần làm tiếp)
1. **Mật khẩu băm SHA-256 không muối** (`HashPassword`) → đổi sang BCrypt hoặc PBKDF2 trước khi nộp.
2. **Chưa có tài khoản Admin đầu tiên**: không có seed Admin, nên chưa ai gọi được `PUT /users/{id}/role`. Cần seeder Admin (hoặc cập nhật `role` trong DB bằng tay: `UPDATE users SET role = 'Admin' WHERE email = '...'`). Lưu ý cột `role` đang lưu số hay chữ tùy cấu hình, kiểm tra trước khi chạy SQL.
3. **Chưa có API đổi họ tên / email**: FE đang lưu họ tên cục bộ.
4. `GoogleAuthService` mới là khung (16 dòng), chưa xác thực token Google thật.
5. Chưa dùng `refresh-token` ở FE; token hết hạn sau 2 giờ thì phải đăng nhập lại.
6. Chưa có xác thực email, đổi/quên mật khẩu, giới hạn số lần đăng nhập sai.
7. `waterReminderEnabled`/`eveningReminderEnabled` mới chỉ **lưu**, chưa có tác vụ nào gửi nhắc.

---

## 2. KHÔI (Consultation)

### Đã sửa lần này
| # | Vấn đề | Cách sửa |
|---|---|---|
| H1 | Thiếu thẻ chuyên môn và ảnh bác sĩ (Figma) | `NutritionistProfile.Tags` (chuỗi cách nhau dấu phẩy, tối đa 200) và `AvatarUrl`; API trả `tags` (mảng), `avatarUrl`; migration `AddNutritionistTags`; seeder có tags |
| H2 | Không có khung giờ trống | `GET /api/consultations/nutritionists/{id}/availability?date=yyyy-MM-dd` → 8 khung/ngày (08–11h, 13–16h giờ Việt Nam, buổi 45 phút); khung đã đặt hoặc đã qua thì `isAvailable=false` |
| H3 | Đặt trùng giờ vẫn được | `POST /book` kiểm tra chồng giờ với lịch Pending/Confirmed của cùng bác sĩ → **409** |
| H4 | Không xác nhận/hủy lịch được | `POST /api/consultations/{id}/confirm` (bác sĩ phụ trách hoặc Admin) và `POST /api/consultations/{id}/cancel` (chủ lịch, bác sĩ phụ trách hoặc Admin) |
| H5 | `Confirm()`/`Cancel()` không kiểm tra trạng thái | `Confirm` chỉ từ Pending; `Cancel` không cho khi đã Completed/Cancelled → 409 |

Các lỗi N1–N9 đã sửa trước đó nằm trong `KHOI_FIXES.md` (phân quyền, múi giờ, lỗi nuốt, v.v.).

### Còn thiếu (Khôi cần làm tiếp)
1. **Khung giờ làm việc cố định cho mọi bác sĩ** (rule trong code). Chưa có bảng lịch làm việc riêng từng bác sĩ, ngày nghỉ, hay API để bác sĩ tự cấu hình.
2. **Chưa có API sửa `tags`/`avatarUrl`** (chỉ có qua seeder/DB); chưa có upload ảnh, chỉ lưu URL.
3. DB đã seed trước khi pull sẽ **không có tags** (seeder chỉ chạy khi bảng rỗng) → xóa `consultation_db` tạo lại hoặc `UPDATE nutritionist_profiles SET tags = '...'`.
4. **Xác nhận/hủy lịch chưa phát sự kiện** sang Notification (hội viên/bác sĩ không nhận thông báo khi lịch đổi trạng thái). Chỉ có sự kiện `ConsultationBooked` và phiếu lời khuyên.
5. Chưa có đổi lịch (reschedule), nhắc lịch trước giờ hẹn, đánh giá bác sĩ.
6. Danh sách lịch của bác sĩ chưa trả tên hội viên (chỉ có `userId`), vì Consultation không truy vấn Identity.
7. Thời lượng buổi tư vấn cố định 45 phút (hằng số trong `BookSessionAsync`).

---

## 3. QUỐC (FMD + Notification)

### Đã sửa lần này
| # | Vấn đề | Cách sửa |
|---|---|---|
| Q1 | Kcal FMD 1100/725 lệch Figma (1100/780/760/760/780) | `FmdCycle.DefaultCaloriesForDay`, seed rule mặc định, fallback trong service; migration `UpdateFmdRulesFigmaKcal` chỉ đổi dòng còn giữ 725, **không đè giá trị Admin đã chỉnh** |
| Q2 | `GET /api/fmd/user/{id}/active` ai cũng xem được | Chỉ chủ hoặc Admin (403) |
| Q3 | Không có lịch sử / hủy chu kỳ | `GET /api/fmd/user/{id}/history` (mới nhất trước) và `POST /api/fmd/{cycleId}/cancel`; hủy lần 2 → 400, người khác hủy → 403 |
| Q4 | Thông báo không có trạng thái đã đọc | `NotificationLog.ReadAtUtc` + `isRead`; `GET /user/{id}/unread-count`, `POST /{id}/read`, `POST /user/{id}/read-all`; migration `AddNotificationReadAt` |
| Q5 | `GET /notifications/user/{id}` và `/preferences/{id}` ai cũng xem/sửa được | Chỉ chủ hoặc Admin |
| Q6 | `POST /notifications/send` ai cũng gọi được (gửi email giả mạo) | Chỉ Admin; các service khác vẫn gửi qua RabbitMQ |

### Còn thiếu (Quốc cần làm tiếp)
1. **JobService (Hangfire) chưa được chạy kiểm tra** trong đợt này: việc tự chuyển ngày FMD (`AdvanceActiveCyclesAsync`) và nhắc fasting qua RabbitMQ chưa test lại.
2. **Email thật chưa được kiểm tra**: mới xác nhận có bản ghi thông báo khi vượt kcal, chưa mở Mailpit (`:8025`) xem thư gửi đúng nội dung.
3. Thông báo chưa phân trang (tối đa 50), chưa có xóa thông báo, chưa lọc theo loại.
4. Hai cột cũ `target_calories_day1`/`target_calories_days2_to5` trong `fmd_cycles` giờ chỉ mang tính tham khảo (định mức thực lấy theo ngày); có thể bỏ ở migration sau.
5. Chưa có thông báo cho sự kiện: xác nhận/hủy lịch tư vấn (cần Khôi phát sự kiện), tạm dừng/tiếp tục fasting.
6. Chưa có API để người dùng đặt kcal FMD riêng; chỉ Admin sửa rule (`PUT /api/admin/fmd-rules/{day}`).

---

## 4. VY (Meals) — sửa kèm theo yêu cầu

### Đã sửa
| # | Vấn đề | Cách sửa |
|---|---|---|
| V1 | **`GET /api/meals/user/{id}?date=yyyy-MM-dd` luôn lỗi 400** (Npgsql: `DateTime` Kind=Unspecified), FE trước giờ chỉ chạy bằng dữ liệu mẫu | Chuẩn hóa ngày sang UTC; thêm `utcOffsetMinutes` để tính "ngày" theo giờ địa phương |
| V2 | Không sửa/xóa được bữa ăn | `PUT /api/meals/{id}`, `DELETE /api/meals/{id}` (chủ hoặc Admin); sửa xong tính lại tổng và kiểm lại ngưỡng FMD |
| V3 | `POST /api/meals` tin `userId` client gửi lên | Lấy chủ bữa từ JWT |
| V4 | `GET /api/meals/user/{id}` ai cũng xem được | Chỉ chủ hoặc Admin |
| V5 | Sửa bữa ăn sẽ lỗi 500 do khóa Guid tự sinh (cùng lỗi K3) | `ValueGeneratedNever()` cho `MealLog`, `MealFoodItem` |
| V6 | Không áp mẫu bữa ăn thành bữa thật | `POST /api/mealtemplates/{id}/apply` body `{mealType, loggedAt?, utcOffsetMinutes?, satietyPercentage?}` → tạo bữa với 1 dòng món = mẫu (1 phần); FE có nút "+ Sáng/Trưa/Tối/Phụ" trên mỗi mẫu |
| V7 | Kiểm ngưỡng FMD khi ghi/sửa bữa tính "ngày" theo UTC | `CreateMealLogDto`/`UpdateMealLogDto` có `utcOffsetMinutes` (mặc định 0); ngày tính theo giờ địa phương. FE tự gửi |
| V8 | FE chỉ hiển thị 1 bữa cho mỗi loại bữa | FE hiển thị tất cả bữa trong ngày, bữa mới không còn ghi đè bữa cùng loại |

**Đính chính:** bản ghi chú trước nói "mọi người dùng đăng nhập đều tạo được mẫu bữa ăn" — **sai**. `POST /api/mealtemplates` vốn đã `[Authorize(Roles = "Admin")]` (đã kiểm chứng: người thường nhận 403, Admin nhận 201). Không cần sửa.

### Còn thiếu (Vy cần làm tiếp)
1. Tra cứu thực phẩm USDA dùng khóa demo (`NutritionApi:ApiKey = demo-nutrition-api-key`); cần khóa thật trong cấu hình thì mới có dữ liệu USDA, nếu không FE rơi về danh mục có sẵn. Đây là việc cấu hình, không sửa được bằng code.
2. Mẫu bữa ăn chỉ có tổng dinh dưỡng, **không có danh sách món** (nên bữa tạo từ mẫu chỉ có 1 dòng "1 phần"). Muốn chi tiết cần thêm món vào mẫu (`RecipeContentJson` đang chưa dùng).
3. Chưa có API sửa/xóa mẫu (chỉ tạo và xem).
4. `GET /api/meals/user/{id}` mặc định `utcOffsetMinutes = 0` nếu client không gửi (chỉ FE web đã gửi).

---

## 5. KIỆT (DietFasting + FE)

### Đã làm
- **Fasting:** enum `Intermittent14_10 = 7`; `POST /api/fasting/{id}/pause` và `/resume`; `GET /api/fasting/user/{id}/history` và `/stats` (streak); migration `AddFastingPause`.
- **Thói quen (mới):** bảng `habit_logs` (migration `AddHabitLogs`, duy nhất theo người dùng + ngày) và API `GET /api/habits/user/{id}?date=`, `PUT /api/habits/user/{id}?date=` (đặt giá trị tuyệt đối), `POST /api/habits/user/{id}/add?date=` (cộng/trừ, kết quả luôn trong 0..tối đa), `GET /api/habits/user/{id}/range?from=&to=` (tối đa 93 ngày). Mục tiêu mặc định 2000 ml nước và 30 phút vận động; chỉ chủ hoặc Admin; Gateway có route `/api/habits/**`.
- **FE:** thẻ Uống nước và Vận động ở Tổng quan dùng API thật khi đăng nhập (nút −/+250 ml và −/+10 phút, thanh tiến độ), chưa đăng nhập thì lưu cục bộ và ghi "lưu cục bộ". Toàn bộ FE theo Figma (xem `FRONTEND_FIGMA_PLAN.md` mục 7–9).

### Còn thiếu
1. **Chưa có test tự động cho FE**: cần thêm vitest + jsdom (`npm i -D`), việc cài gói mới bị chặn trong phiên làm việc này nên chưa làm. Test API hiện có là các script trong `docs/tests/`.
2. Landing chưa chỉnh pixel theo Figma (đã giữ nguyên giao diện sẵn có; cần bản thiết kế chi tiết để so khớp).
3. Thói quen chỉ có nước và vận động; Figma nếu có thêm thói quen khác (ngủ, thiền…) thì chưa có.
4. Streak ở Tổng quan/Navbar chỉ tính phiên fasting Completed; chưa tính ngày có đạt mục tiêu thói quen.
5. JobService (Hangfire) và email nhắc fasting chưa chạy kiểm tra lại trong đợt này.

---

## 6. Bổ sung đợt 4 (16/11/2026): hoàn tất phần còn thiếu của Kiệt, kèm lỗi email tìm thấy khi kiểm tra

Kiểm chứng: `node docs/tests/e2e-new-apis.js` (42), `e2e-meals-fmd-notifications.js` (45), `e2e-habits-templates.js` (34), **`e2e-jobs-email.js` (16, mới)** đều PASS = **137 kiểm tra API**; thêm **17 test hàm cho FE** (`npm test` trong `src/Clients/web-app`, dùng `node --test`, không cần cài gói mới).

### Kiệt: đã bổ sung
| # | Việc | Kết quả |
|---|---|---|
| E1 | **Test FE tự động** | `tests/*.test.js`: giải mã JWT/phiên đăng nhập, đăng nhập (sai mật khẩu, backend sập → demo, đăng ký không gửi role), thói quen cục bộ, 5 chế độ nhịn ăn và enum 14:10, kcal FMD 1100/780/760/760/780. Chạy: `npm test` |
| E2 | **Thêm loại thói quen** | `habit_logs` có `sleep_minutes`, `mindful_minutes` (migration `AddHabitSleepMindful`); mục tiêu ngủ 480 phút, thiền 10 phút; FE có thẻ Giấc ngủ và Thiền, thư giãn |
| E3 | **Streak thói quen** | `GET /api/habits/user/{id}/streak?date=`: một ngày "đạt" khi đủ nước 2000 ml và vận động 30 phút; hôm nay chưa đạt vẫn giữ chuỗi hôm qua; FE hiện "Chuỗi đạt mục tiêu: N ngày" |
| E4 | **JobService (Hangfire) đã chạy lại** | 3 recurring job đăng ký đúng; `fasting-check` gửi nhắc và **không gửi trùng** khi chạy lần 2; `fmd-check` chuyển chu kỳ sang ngày kế tiếp |
| E5 | **Email qua Mailpit đã kiểm thật** | Email nhắc nhịn ăn, cảnh báo FMD, xác nhận đặt lịch, lời khuyên đều tới đúng hộp thư người dùng |

### Lỗi nặng tìm thấy khi kiểm tra email (đã sửa)
Ba loại email của Notification (cảnh báo FMD, xác nhận đặt lịch, lời khuyên) **luôn gửi tới `user@example.com`** (địa chỉ viết cứng trong `RabbitMqNotificationConsumer`), nên người dùng thật không bao giờ nhận được. Nội dung email FMD còn ghi định mức cũ 725 kcal.
- Sự kiện `FmdCycleAlert`, `AdviceSent`, `ConsultationBooked` có thêm `RecipientEmail` (mặc định null, tương thích ngược).
- **DietFasting:** email lấy từ JWT khi ghi/sửa bữa ăn (client không thể gửi email vào body).
- **Consultation:** lưu `UserEmail` (từ JWT) trên `consultation_sessions` lúc đặt lịch (migration `AddSessionUserEmail`) để sự kiện lời khuyên có địa chỉ.
- **Notification:** dùng `RecipientEmail`; nếu không có địa chỉ thì chỉ ghi thông báo trong ứng dụng (kênh InApp), không gửi email giả. Nội dung email FMD ghi 1100/780/760/760/780 kcal.

**Sau khi pull:** `dotnet ef database update` cho `diet_db` (AddHabitSleepMindful) và `consultation_db` (AddSessionUserEmail). Lưu ý `dotnet ef database update --no-build` sau khi vừa `migrations add` sẽ không áp dụng migration mới (chưa được build); bỏ `--no-build`.

### Còn thiếu sau đợt này
- **Kiệt:** test giao diện tự động (Playwright) và unit test backend (xUnit); Landing chưa so pixel với Figma (cần bản thiết kế chi tiết).
- **Quốc:** phân trang và xóa thông báo; thông báo cho sự kiện tạm dừng fasting.
- **Khôi:** xác nhận, hủy lịch vẫn chưa phát sự kiện/email; lịch riêng từng bác sĩ.
- **Khoa:** như mục 1 (băm mật khẩu, Admin seed, đổi họ tên, Google).
- Email nhắc nhịn ăn của phiên không có email trong JWT vẫn rơi về `user@example.com` (`FastingReminderService`); nên bỏ gửi khi không có địa chỉ.
