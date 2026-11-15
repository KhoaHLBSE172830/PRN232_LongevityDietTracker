# GHI CHÚ SỬA LỖI CHO KHÔI (`KHOI_FIXES.md`)

> **Người sửa**: Kiệt. **Ngày**: 16/11/2026.  
> **Căn cứ**: kết quả kiểm tra lại commit `cfac1e4` của Khôi (`KHOI_REVIEW.md` Mục 6): còn 4 ca script lỗi, 1 hồi quy ở giao diện và một số điểm nhỏ (mã **N1–N9**).  
> **Trạng thái**: đã sửa trực tiếp trên nhánh `kiet` (cùng nhánh với `dev` tại thời điểm sửa). **Chưa commit.**  
> **Kết quả sau khi sửa**: script `docs/tests/e2e-consultation.js` đạt **27/27 ca bắt buộc** (trước khi sửa: 23/27); giao diện kiểm tra lại trên trình duyệt với 4 loại tài khoản; build backend 0 lỗi 0 cảnh báo; `vite build` thành công.

> ⚠️ **Dành cho Khôi, đọc trước khi merge**: các file dưới đây Khôi cũng đang làm việc. Nếu Khôi sửa tiếp cùng file trên nhánh riêng thì sẽ **conflict**. Cách an toàn: `git fetch origin dev && git merge origin/dev` **sau khi** thay đổi này được merge vào `dev`, rồi mới sửa tiếp. Danh sách file bị đụng nằm ở Mục 3.

---

## 1. TÓM TẮT NHỮNG GÌ ĐÃ SỬA

| Mã | Mức | Vấn đề | Đã sửa | Kiểm chứng |
| :-: | :---: | :--- | :--- | :--- |
| **N1** | 🔴 | Hội viên (và người chưa đăng nhập) mở tab Tư vấn thấy **trang trống**, không đặt được lịch | `loadData` dùng `Promise.allSettled`; chỉ gọi API của bác sĩ khi role là Nutritionist/Admin; lỗi hiện bằng banner | Trình duyệt: token User thấy 3 bác sĩ, đặt lịch được; không token vẫn thấy 3 bác sĩ kèm gợi ý đăng nhập |
| **N2** | 🟠 | Role `Nutritionist` nhưng không có hồ sơ bác sĩ vẫn kê đơn được (fail-open) | Không phải Admin mà không có hồ sơ → 403; kiểm tra quyền **trước** mọi kiểm tra trạng thái | Script `K9e` ✅ |
| **N3** | 🟠 | Bác sĩ xem được danh sách bệnh nhân của bác sĩ khác | `GET /nutritionist/{id}`: không phải Admin thì `{id}` phải là hồ sơ của chính người gọi | Script `K15` ✅; trình duyệt: bác sĩ #2 chỉ thấy 1 bệnh nhân của mình |
| **N4** | 🟠 | `review-user` chỉ kiểm tra bệnh nhân có lịch với *ai đó* | Phải có lịch với **chính hồ sơ bác sĩ của người gọi** (Admin: với bất kỳ bác sĩ nào) | Script `K10d`, `K10c` ✅ |
| **N5** | 🟡 | Giờ hẹn có offset (`+07:00`) bị lưu lệch | `ConsultationSession.Schedule` chuyển đổi theo `DateTimeKind`: `Local → ToUniversalTime()` | Script `K17` ✅ (`09:00+07:00` → `02:00Z`) |
| **N6** | 🟡 | Chữ cứng gây hiểu nhầm trong modal gRPC | Hiển thị độ trễ **đo thực tế**; "Chế độ" đúng dữ liệu; định mức FMD theo ngày | Trình duyệt: "Phản hồi 1763 ms", "Chế độ: Không có phiên đang chạy" |
| **N7** | 🟡 | Lỗi 5xx của danh sách bị ẩn; danh sách bác sĩ mẫu dùng cho mọi lỗi | Mọi lỗi được ném và hiện banner; danh sách mẫu **chỉ khi mất kết nối** và có nhãn | Trình duyệt: tắt Consultation → banner vàng + banner đỏ + nút "Thử lại" |
| **N8** | 🟡 | Sơ đồ C3/C4 dùng tên không có trong code | Đối chiếu và sửa 3 sơ đồ (Mục 4) | `mermaid.parse` đạt cho cả 8 sơ đồ trong `docs/diagrams/` |
| **N9** | 🟡 | Tài liệu nhắc `HasActiveSessionAsync` (không có) và "< 5ms" | Sửa trong `KHOI_CONSULTATION_DOCUMENTATION.md`, thêm mục 2.1 | Đọc lại |

---

## 2. CHI TIẾT TỪNG THAY ĐỔI

### 2.1. Backend (`src/Services/Consultation/`)

**`Consultation.Application/Services/ConsultationApplicationServices.cs`**
- Thêm `record struct ConsultationCaller(Guid UserId, bool IsAdmin)`: gói thông tin người gọi (lấy từ JWT ở tầng API) để truyền vào Application mà không để Application phụ thuộc ASP.NET.
- Đổi chữ ký các use case cần phân quyền:
  - `GetNutritionistSessionsAsync(nutritionistId, caller)` (trước: `nutritionistId`)
  - `SendAdviceAsync(dto, caller)` (trước: `dto, Guid? callerNutritionistId = null`)
  - `ReviewUserDietProgressAsync(caller, userId)` (trước: `doctorUserId, userId`)
- Thêm hàm riêng `RequireOwnProfileUnlessAdminAsync(caller)`: Admin → `null`; còn lại phải có hồ sơ bác sĩ (tra theo `NutritionistProfile.UserId`), **không có thì ném `ConsultationForbiddenException`** (sửa lỗi fail-open ở N2).
- **N3**: `GetNutritionistSessionsAsync` yêu cầu `profile.Id == nutritionistId` (trừ Admin).
- **N2**: `SendAdviceAsync` kiểm tra quyền ngay sau khi tải phiên, **trước** các kiểm tra 409/400 (không để lộ trạng thái phiên cho người không có quyền). Bỏ khối kiểm tra cũ `callerProfile != null && ...`.
- **N4**: `ReviewUserDietProgressAsync` chỉ chấp nhận phiên có `NutritionistId == profile.Id` (trừ Admin); trạng thái hợp lệ vẫn là `Pending`/`Confirmed`/`Completed` như Khôi đã chọn.

**`Consultation.API/Controllers/ConsultationsController.cs`**
- Thêm `CurrentCaller => new(CurrentUserId, User.IsInRole("Admin"))` và truyền vào 3 action: `GetNutritionistSessions`, `SendAdvice`, `ReviewUserProgress`.

**`Consultation.Domain/Entities/ConsultationEntities.cs`**
- **N5**: `Schedule` dùng `switch` theo `DateTimeKind`: `Utc → giữ nguyên`, `Local → ToUniversalTime()`, `Unspecified → coi là UTC`. Cách cũ (`SpecifyKind(..., Utc)` cho mọi giá trị không phải UTC) chỉ gán nhãn nên lệch đúng bằng offset múi giờ.

### 2.2. Frontend (`src/Clients/web-app/src/features/consultation/`)

**`consultationApi.js`** (viết lại, giữ nguyên `ConsultationApiError`, `toApiError`, `getConsultationAuthSession`)
- `getNutritionists`, `getUserSessions`, `getUserAdvices`, `getNutritionistSessions`: **ném lỗi cho mọi trường hợp** (trước đây chỉ ném khi 401/403, còn lại trả mảng rỗng hoặc danh sách mẫu).
- Thêm `export const SAMPLE_NUTRITIONISTS` (danh sách mẫu) và `export const isOfflineError(err)`; giao diện quyết định có dùng danh sách mẫu hay không.
- `bookSession`: **bỏ đường "mô phỏng thành công"** khi mất mạng (trước đây trả `isSuccess: true, isMock: true` nhưng không lưu gì, rồi giao diện reload và lịch biến mất). Đặt lịch luôn cần máy chủ.
- `getNutritionistSessions(nutritionistId)` bỏ giá trị mặc định cứng `1111...`.

**`ConsultationView.jsx`**
- Import thêm `isOfflineError`, `SAMPLE_NUTRITIONISTS`; state mới `loadErrors`, `offlineSample`, `grpcLatencyMs`.
- **N1/N7**: `loadData` viết lại:
  - Danh sách bác sĩ, lịch hẹn, phiếu lời khuyên tải **độc lập** bằng `Promise.allSettled`.
  - Chưa đăng nhập: vẫn tải danh sách bác sĩ (API công khai), không gọi lịch hẹn/phiếu (sẽ 401).
  - API bác sĩ chỉ gọi khi role là Nutritionist/Admin; Nutritionist dùng **hồ sơ của chính mình** (tìm theo `userId` trong danh sách bác sĩ), Admin dùng bác sĩ đang chọn.
  - Chỉ khi danh sách bác sĩ **không lấy được vì mất kết nối** mới dùng `SAMPLE_NUTRITIONISTS`, kèm banner vàng "dữ liệu giả".
  - Banner lỗi (đỏ) cho từng phần tải thất bại, nút "Thử lại"; banner xanh "Bạn chưa đăng nhập" khi không có token.
- Tab Cổng Bác Sĩ: bộ chọn bác sĩ dùng `doctorOptions` (Nutritionist chỉ thấy mình, Admin thấy tất cả); tài khoản không phải bác sĩ thấy thông báo thay vì danh sách rỗng gây hiểu nhầm.
- `handleConfirmBooking`: bỏ nhánh `isMock`.
- **N6** (modal gRPC): bỏ "Độ trễ < 5ms" cố định, thay bằng "Phản hồi N ms" **đo bằng `performance.now()`**; "Chế độ" chỉ hiển thị loại nhịn ăn khi đang nhịn, còn lại "Không có phiên đang chạy" (trước đây luôn hiện "16/8"); dòng ghi chú FMD tính theo ngày (ngày 1 → 1100 kcal, ngày 2–5 → 725 kcal) thay cho câu cố định "Ngày thứ 3 ... 725 kcal".

### 2.3. Sơ đồ (`docs/diagrams/`)

- **`C3_Consultation.mmd`**: sửa `ConsultationApplicationService → ConsultationService`, `IDietFastingGrpcClient → IDietFastingGrpcClientService`, `IEventBusPublisher → IEventBus`, `RabbitMqEventPublisher → RabbitMqConsultationPublisher`; RPC `GetUserHealthSummary` (không tồn tại) → 3 RPC thật; thêm `ConsultationDbSeeder`, `ConsultationCaller`, `GET /nutritionists/{id}`, `GET /user/{id}/advices`; bỏ `Unverify()` (không có); đổi tên enum `SessionStatus → ConsultationStatus`; sửa danh sách exception; middleware mô tả đúng (`BaseHttpException`, không phải ProblemDetails).
- **`C3_DietFasting.mmd`**: sửa thành phần cho khớp code: 6 controller (thêm `NutritionController`, `FmdRulesController`, `MealTemplatesController`), `DietFastingGrpcService` + `DietFastingGrpcServer` + `IDietFastingGrpcClientService` (bỏ `GetUserHealthSummary`, `IHealthSummaryQuery`, `DietFastingGrpcEndpoint` không tồn tại), bỏ `FmdDailyLog` (không có), thêm `FmdRule`, `MealTemplate`, `NutritionApiClient`, `RabbitMqEventBus`, `FastingScheduleTriggerConsumer`, `FastingReminderService`, `RedisReminderDedupStore`, luồng Hangfire/Notification qua RabbitMQ.
- **`C4_Consultation.mmd`**: sửa `NutritionistProfile` (có `UserId`, `Sessions`; bỏ `Unverify`/`UpdateProfile`), `ConsultationSession` (chữ ký `Schedule`, thêm `Complete`, `Cancel(reason)`, `AttachAdvice(advice)`), `ConsultationStatus`, `IConsultationService` (chữ ký thật), `ConsultationService`, `IDietFastingGrpcClientService` (3 phương thức), 3 interface repository (phương thức thật, bỏ `HasActiveSessionAsync`), thêm `IEventBus`, `RabbitMqConsultationPublisher`, `ConsultationCaller`.
- Kiểm tra cú pháp bằng `mermaid.parse` (mermaid 10.9.1): **cả 8 sơ đồ trong thư mục đều hợp lệ**. **Chưa render ra `.png`** (cần mermaid.live hoặc mermaid-cli).

### 2.4. Tài liệu
- **`KHOI_CONSULTATION_DOCUMENTATION.md`**: sửa dòng A4 (không còn nhắc `HasActiveSessionAsync`), A9 (hiển thị mã hội viên rút gọn, không phải tên), A12 (chưa có `.png`), bỏ "độ trễ < 5ms"; thêm mục **2.1** liệt kê N1–N9.

---

## 3. DANH SÁCH FILE ĐÃ ĐỤNG (để Khôi biết khi merge)

| File | Loại thay đổi |
| :--- | :--- |
| `src/Services/Consultation/Consultation.Application/Services/ConsultationApplicationServices.cs` | Sửa (chữ ký 3 use case, `ConsultationCaller`, kiểm tra quyền) |
| `src/Services/Consultation/Consultation.API/Controllers/ConsultationsController.cs` | Sửa nhỏ (truyền `CurrentCaller`) |
| `src/Services/Consultation/Consultation.Domain/Entities/ConsultationEntities.cs` | Sửa nhỏ (`Schedule`) |
| `src/Clients/web-app/src/features/consultation/consultationApi.js` | Viết lại |
| `src/Clients/web-app/src/features/consultation/ConsultationView.jsx` | Sửa (`loadData`, banner, tab bác sĩ, modal gRPC) |
| `docs/diagrams/C3_Consultation.mmd`, `C3_DietFasting.mmd`, `C4_Consultation.mmd` | Viết lại |
| `KHOI_CONSULTATION_DOCUMENTATION.md` | Sửa và thêm mục 2.1 |

**Không đổi**: migration, `DietFastingGrpcClient`, `RabbitMqConsultationPublisher`, DTO, repository, cấu hình, các file của người khác.

---

## 4. KẾT QUẢ KIỂM CHỨNG SAU KHI SỬA

### 4.1. Script tự động `node docs/tests/e2e-consultation.js` (27/27)
Tất cả ca bắt buộc đạt, gồm các ca trước đó lỗi: `K9e` (403), `K10d` (403), `K15` (403), `K17` (`02:00Z`). Ca `K10b` (tắt DietFasting → 503) và `K13` (tắt RabbitMQ vẫn đặt lịch được) cũng đạt. INFO không đổi: `K14` (trùng giờ), `K13b` (cooldown).

### 4.2. Trình duyệt (`http://localhost:5173`, tab "Tư vấn chuyên gia")
| Tình huống | Kết quả |
| :--- | :--- |
| Token **User**: mở tab | 3 thẻ bác sĩ, 3 nút "Đặt Lịch Tư Vấn", không lỗi |
| Token User: đặt lịch | Lịch xuất hiện, trạng thái **"Chờ xác nhận"** (khớp DB) |
| Token User: tab Cổng Bác Sĩ | Thông báo "chỉ dành cho Bác sĩ/Admin" |
| **Không đăng nhập** | 3 bác sĩ + banner "Bạn chưa đăng nhập" |
| Token **Nutritionist #2** | Chỉ thấy 1 bệnh nhân của mình; bộ chọn chỉ có tên bác sĩ #2 |
| Nutritionist: "Soi Dữ Liệu Sức Khỏe (gRPC)" | "Phản hồi 1763 ms" (đo thật), "Chế độ: Không có phiên đang chạy", số liệu thật |
| Nutritionist: "Kê Đơn Lời Khuyên" | Thành công; DB `advice_notes.user_id` = hội viên, `nutritionist_id` = bác sĩ #2, phiên `Completed` ("Đã Kê Đơn") |
| **Tắt Consultation** | Banner vàng "danh sách bác sĩ mẫu (dữ liệu giả)", banner đỏ cho lịch hẹn và phiếu, nút "Thử lại"; không thêm lịch giả |

Trong lúc kiểm tra phát hiện thêm một chi tiết nhỏ và đã sửa luôn: khi mất kết nối vẫn hiện banner sai "Tài khoản bác sĩ chưa gắn hồ sơ" (vì danh sách mẫu không có `userId` thật). Giờ chỉ xác định hồ sơ bác sĩ khi danh sách lấy được từ server.

---

## 5. NHỮNG ĐIỂM KHÔNG THAY ĐỔI / CÒN MỞ (để Khôi quyết định)

| # | Nội dung | Ghi chú |
| :-: | :--- | :--- |
| 1 | Trạng thái `Completed` vẫn được tính là "lịch hợp lệ" để bác sĩ xem dữ liệu bệnh nhân (`review-user`) | Giữ nguyên lựa chọn của Khôi. `AGENT.md` 4.3 nói "đang hoạt động": nếu muốn chặt hơn, chỉ cho `Pending`/`Confirmed` (sau khi kê đơn bác sĩ không xem lại được nữa) |
| 2 | Bác sĩ vẫn xem được lịch hẹn/phiếu của **mọi hội viên** qua `GET /user/{id}` và `/user/{id}/advices` | Khớp mô tả "Chính chủ / Doctor / Admin" trong tài liệu của Khôi. Chặt hơn: chỉ hội viên có lịch với bác sĩ đó |
| 3 | Ca script `K16` chưa đủ dữ liệu để phân biệt trường hợp ở điểm 2 | Cần thêm dữ liệu bệnh nhân có lịch với bác sĩ khác |
| 4 | Hai hội viên đặt trùng giờ với cùng một bác sĩ (`K14`), publisher RabbitMQ chờ ~4 giây mỗi request khi broker tắt (`K13b`) | Đề xuất, ngoài spec |
| 5 | Chưa có API xác nhận hoặc hủy lịch (`Confirm()`/`Cancel()` có trong domain) | Ngoài phạm vi 8 API đã nêu |
| 6 | **Chưa xuất `.png`** cho các sơ đồ | Dán nội dung `.mmd` vào mermaid.live rồi xuất ≥ 1600px |
| 7 | 3 hồ sơ bác sĩ seed dùng `UserId` giả (`aaaaaaaa-...`, `bbbbbbbb-...`, `cccccccc-...`) | Phân quyền dựa vào việc `NutritionistProfile.UserId` trùng `nameid` trong JWT. Khi Identity chạy thật, tài khoản bác sĩ phải có `UserId` trùng hồ sơ (seed theo tài khoản thật hoặc gán khi đăng ký), nếu không bác sĩ đó sẽ bị 403 ở các API bác sĩ |
| 8 | `apiClient.js` (phần của Khoa) chưa gắn token | Consultation tự gắn header nên không bị ảnh hưởng |

---

## 6. CÁCH KIỂM TRA LẠI

```bash
# Chuẩn bị như docs/tests/E2E_TEST_CASES.md Mục 2, thêm consultation_db:
dotnet ef database update --project src/Services/Consultation/Consultation.Infrastructure --startup-project src/Services/Consultation/Consultation.API
dotnet run --project src/Services/Consultation/Consultation.API     # cổng 5003, tự seed 3 bác sĩ

node docs/tests/e2e-consultation.js          # kỳ vọng: 27/27 ca bắt buộc
```
Trình duyệt: đặt `localStorage.setItem('accessToken', '<JWT>')` với role `User` / `Nutritionist` (xem `docs/tests/E2E_TEST_CASES.md` Mục 2 để tạo JWT; hồ sơ bác sĩ #1 có `UserId = aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa`, #2 là `bbbbbbbb-...`).
