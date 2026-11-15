# REVIEW CODE NHÁNH `Khoi` — NHỮNG ĐIỂM CẦN SỬA (`KHOI_REVIEW.md`)

> **Người review**: Kiệt. **Ngày**: 16/11/2026. **Phạm vi**: commit `0222097`, `bfd4ce5` (đã có trong `dev` qua PR #4).  
> **Đối chiếu với**: `KHOI_CONSULTATION_DOCUMENTATION.md` (tài liệu bàn giao do Khôi viết), `AGENT.md`, `PLAN_ASSIGNMENT.md`.  
> **Cách kiểm tra**: chạy thật cả luồng (Postgres, Redis, RabbitMQ, Mailpit, Gateway, Consultation, DietFasting, Notification, frontend trên trình duyệt), không chỉ đọc code. Script chạy lại được: `docs/tests/e2e-consultation.js`.

## 0. Cách phân loại (để không báo oan)

| Nhóm | Ý nghĩa | Số lượng |
| :---: | :--- | :---: |
| **A** | **Lỗi trong phần Khôi đã làm**: trái tài liệu của chính Khôi, `AGENT.md` hoặc `PLAN_ASSIGNMENT.md`, có bằng chứng khi chạy | **12** |
| **C** | **Không phải lỗi**: đúng spec, ngoài phạm vi, hoặc hạn chế đã biết. Chỉ ghi lại để biết | 8 |

> Không có điểm nhóm B (lỗi có từ trước) nào tách riêng. Một giá trị cấu hình có từ trước (A1) được xếp vào nhóm A vì tài liệu của Khôi khẳng định gRPC đã chạy thật.

**Kết quả script lần 1 (commit `bfd4ce5`): 8/22 ca bắt buộc đạt**, 14 ca lỗi, 2 ca INFO (K14, K13b).

> ✅ **Cập nhật 16/11/2026: Khôi đã sửa trong commit `cfac1e4`. Kiểm tra lại: 23/27 ca đạt, nhưng còn 4 ca lỗi và 1 hồi quy mới nghiêm trọng ở giao diện. Xem Mục 6** (đọc Mục 6 trước nếu chỉ cần tình trạng hiện tại).
>
> 🛠️ **Cập nhật cuối: các điểm N1–N9 ở Mục 6 đã được Kiệt sửa trực tiếp, script đạt 27/27. Xem [KHOI_FIXES.md](KHOI_FIXES.md)** để biết đã đổi file nào, kiểm chứng ra sao và những điểm còn mở.

---

## 1. Những gì Khôi đã làm đúng (đã kiểm chứng khi chạy)

| Hạng mục trong tài liệu của Khôi | Kết quả |
| :--- | :--- |
| Consultation chạy cổng 5003, gọi được qua Gateway | ✅ |
| 7 API đều có và phản hồi | ✅ |
| Seed 3 bác sĩ vào `consultation_db` khi khởi động | ✅ (K0: 3 bác sĩ) |
| `RabbitMqConsultationPublisher` (trước đây `IEventBus` chưa được đăng ký nên không bắn được event) | ✅ đã đăng ký; `consultation.booked` và `advice.sent` tới Notification, **email vào Mailpit** (K6, K8b) |
| Đặt lịch: 201, trạng thái `Pending`, bác sĩ không tồn tại trả 404 | ✅ (K4a, K5c) |
| 20 yêu cầu đặt lịch đồng thời: đủ 20 bản ghi và đủ 20 email | ✅ (K12) |
| Gửi phiếu đúng payload: 201, phiên chuyển `Completed`, email cho bệnh nhân | ✅ (K8a, K8b) |
| Giao diện đặt lịch thật: bấm "Đặt lịch" thì DB có dòng mới (`Status = 1`) | ✅ |
| Chỉ sửa trong `Consultation/` và `features/consultation/` (không đụng file người khác) | ✅ diff xác nhận |
| Build toàn solution | ✅ 0 lỗi, 0 cảnh báo |

---

## 2. NHÓM A: LỖI TRONG PHẦN KHÔI ĐÃ LÀM

### A1. 🔴 gRPC sang DietFasting **không bao giờ gọi được** (luôn trả số liệu bịa)
- **Đối chiếu**: tài liệu 2.1(1) viết *"kết nối mạng gRPC thật"*, Mục 5 đưa "kết quả thực tế". Nhưng số liệu trong Mục 5 (`totalCompletedFasts: 24`, `totalFastedHours: 384`, `averageCalories: 1850`, FMD `cycleNumber: 2, currentDay: 3`) **trùng từng số với dữ liệu mẫu mà code trả khi gọi gRPC lỗi**.
- **Nguyên nhân**: `Consultation.API/appsettings.json` đặt `"GrpcSettings": { "DietFastingUrl": "https://localhost:7002" }` (giá trị có từ scaffold ban đầu), ghi đè giá trị mặc định `http://localhost:7002` trong code. Cổng 7002 của DietFasting là **HTTP/2 không TLS**, nên bắt tay SSL luôn thất bại.
- **Bằng chứng**: log Consultation: `Failed to call DietFasting gRPC ... on https://localhost:7002. Returning fallback data` kèm `AuthenticationException: Cannot determine the frame size`. Phía DietFasting không nhận được cuộc gọi nào. Script `K10a`: user chưa từng nhịn ăn vẫn nhận `24` lần nhịn, `384` giờ.
- **Cách sửa (1 dòng)**: đổi `appsettings.json` thành `"DietFastingUrl": "http://localhost:7002"` (hoặc xóa khóa này để dùng mặc định trong code). **Đã xác nhận**: đặt biến môi trường `GrpcSettings__DietFastingUrl=http://localhost:7002` thì `K10a` đạt, trả `totalCompletedFasts = 0`.
- **Kiểm tra lại**: script `K10a`, ca manual G6/G7 bên dưới.

### A2. 🔴 Khi gRPC lỗi, hệ thống trả **dữ liệu y khoa bịa** như thật (cả server lẫn frontend)
- **Đối chiếu**: tài liệu 2.1(1) nói đây là chủ đích ("trả dữ liệu mẫu hợp lệ, không bao giờ sập 500"). Vấn đề không phải việc có fallback mà là **bác sĩ không phân biệt được số liệu thật và số bịa**, và chính fallback này đã che mất lỗi A1.
- **Chỗ lỗi**: `DietFastingGrpcClient.cs` (3 khối `catch` trả `24 lần nhịn / 384 giờ / 1850 kcal / FMD ngày 3`) và `consultationApi.js` `reviewUserProgress` (cùng số liệu khi mọi lỗi).
- **Bằng chứng** (`K10b`): tắt DietFasting, `GET /review-user/{id}` vẫn **200** với số liệu bịa; bật `Grpc:RequireAuth=true` phía DietFasting thì cũng rơi vào fallback (lỗi `Unauthenticated` bị nuốt).
- **Rủi ro**: bác sĩ đọc "bệnh nhân đã nhịn 24 lần" của người chưa từng nhịn để kê lời khuyên.
- **Cách sửa**: không bịa số liệu. Một trong hai: (a) trả lỗi rõ ràng (`503` + thông điệp "dịch vụ dữ liệu sức khỏe tạm thời không khả dụng"); (b) nếu muốn giữ demo offline thì đặt sau cờ `Grpc:AllowDemoFallback` (mặc định `false`) và trả thêm `dataSource: "demo"` để giao diện hiện nhãn **"Dữ liệu mô phỏng"**. Frontend: bỏ dữ liệu mẫu trong `reviewUserProgress`, hiện lỗi thật.
- **Kiểm tra lại**: script `K10b`.

### A3. 🔴 Toàn bộ API Consultation **không yêu cầu đăng nhập** và không phân quyền
- **Đối chiếu**: bảng spec Mục 3 ghi quyền *User* / *Nutritionist, Admin*; `AGENT.md` 4.3: *"Mọi endpoint phải kiểm tra Claims"*. Tài liệu 2.1(2) cho biết đã *"tối ưu phân quyền... tránh bị chặn lỗi 401 khi Identity chưa hoàn thiện"*, tức bỏ `[Authorize]` có chủ đích để frontend chạy. Tuy nhiên quyết định này mở toàn bộ dữ liệu sức khỏe.
- **Bằng chứng** (script `K1`, `K2`, `K3`, `K4b`): không có token vẫn **201** khi đặt lịch và **200** khi xem lịch hẹn, phiếu lời khuyên, danh sách bệnh nhân của bác sĩ và `review-user` (snapshot sức khỏe). Role `User` gọi được `review-user`. Token của B xem được lịch hẹn và phiếu của A; token B đặt lịch **thay A** (`userId` lấy từ body).
- **Cách sửa**: khôi phục `[Authorize]`: `POST book`, `GET user/{id}`, `GET user/{id}/advices` cho chủ tài khoản (so `userId` với claim `nameid`); `GET nutritionist/{id}`, `POST advice`, `GET review-user/{id}` chỉ `Nutritionist`/`Admin`. `GET nutritionists` giữ công khai đúng spec.
- **Phải phối hợp**: `consultationApi.js` hiện **không gắn token** và `apiClient.js` (phần của Khoa) chưa có interceptor. Nếu bật xác thực ngay thì giao diện nhận 401 và hiện "thành công giả" (A8). Cách làm an toàn: thêm cờ `Auth:Enforce` (mặc định `false` cho tới khi Khoa gắn token), bật khi Khoa xong.
- **Kiểm tra lại**: script `K1`, `K2`, `K3`, `K4b`.

### A4. 🔴 `review-user` không kiểm tra bác sĩ có phiên tư vấn hợp lệ với bệnh nhân
- **Đối chiếu**: `AGENT.md` 4.3: *"Nutritionist chỉ được xem dữ liệu của User khi có một `ConsultationSession` hợp lệ và đang hoạt động giữa hai bên"*. DietFasting không thể kiểm tra điều này (khác database), nên **Consultation là nơi bắt buộc kiểm tra** (đã ghi ở `PLAN_ASSIGNMENT.md` Mục 11.4).
- **Hiện trạng**: `ReviewUserDietProgressAsync` gọi thẳng gRPC cho bất kỳ `userId`.
- **Cách sửa**: thêm truy vấn "có `ConsultationSession` giữa bác sĩ (theo JWT) và `userId` với trạng thái `Pending`/`Confirmed` chưa hủy" trước khi gọi gRPC, không có thì 403.
- **Lưu ý phụ thuộc**: hiện 3 hồ sơ bác sĩ seed dùng `UserId` giả (`aaaaaaaa-...`, `bbbbbbbb-...`, `cccccccc-...`) không khớp tài khoản Identity nào, nên chưa có cách nối "người đăng nhập" với "hồ sơ bác sĩ". Cần quyết định cách nối (seed theo tài khoản thật, hoặc gán khi đăng ký) trước khi làm A3 và A4 đầy đủ.

### A5. 🔴 Phiếu lời khuyên gửi từ giao diện bị gán cho người dùng rỗng, hội viên **không bao giờ thấy phiếu**
- **Đối chiếu**: tài liệu 2.2 và hướng dẫn demo Mục 6: bác sĩ "Kê Đơn Lời Khuyên" thì hội viên nhận phiếu và email.
- **Chỗ lỗi**: `ConsultationView.jsx` `handleSendAdvice` chỉ gửi `consultationSessionId`, `adviceSummary`, `dietaryRecommendations`, `fastingRecommendations`, **thiếu `userId` và `nutritionistId`** (cả hai là `Guid` bắt buộc trong `SendAdviceDto`, thiếu thì thành `00000000-...`). Backend tin dữ liệu từ body.
- **Bằng chứng** (`K7`): gửi đúng payload của giao diện: HTTP 201, nhưng trong DB `advice_notes."UserId" = 00000000-0000-0000-0000-000000000000`; `GET /user/{A}/advices` **không trả phiếu**. Event `advice.sent` cũng mang `UserId` rỗng (Notification ghi nhận cho người dùng rỗng).
- **Cách sửa**: (1) **Backend lấy `UserId` và `NutritionistId` từ `ConsultationSession` đã lưu**, không nhận từ body (vừa sửa A5, vừa chặn gán nhầm ở A6); (2) frontend vẫn nên gửi đủ trường nếu API còn yêu cầu.
- **Kiểm tra lại**: script `K7`.

### A6. 🟠 Gửi phiếu lời khuyên thiếu kiểm tra nghiệp vụ và có thể trả 500
- **Bằng chứng** (script, mỗi ca dùng lịch hẹn riêng):
  - `K8c`: gửi phiếu lần 2 cho cùng phiên trả **500** (DB có index unique `IX_advice_notes_ConsultationSessionId`; code không bắt lỗi). Mong đợi 409.
  - `K9a`: phiếu cho `userId`/`nutritionistId` **khác** với phiên được chấp nhận (201).
  - `K9b`: bác sĩ khác (token của bác sĩ #2) kê đơn cho phiên của bác sĩ #1 được chấp nhận (201).
  - `K9c`: phiếu rỗng (`adviceSummary`, `dietaryRecommendations`, `fastingRecommendations` toàn rỗng) được chấp nhận (201).
- **Chỗ lỗi**: `ConsultationService.SendAdviceAsync` và `SendAdviceDto` (không có ràng buộc `[Required]`/độ dài); `ConsultationSession.AttachAdvice` luôn gọi `Complete()` kể cả phiên đã `Cancelled`/`Completed` (Rich Domain Model của `AGENT.md` 2.1 yêu cầu kiểm tra trạng thái trong Entity).
- **Cách sửa**: lấy id từ phiên (A5); kiểm tra `nutritionistId` của phiên khớp bác sĩ trong JWT (403); `[Required]` + `MaxLength` cho 3 trường; `AttachAdvice` chỉ cho phép khi phiên `Pending`/`Confirmed` và chưa có phiếu (ném `ConflictException` → 409).

### A7. 🟠 Đặt lịch thiếu kiểm tra đầu vào
- **Bằng chứng** (script):
  - `K5a`: đặt vào ngày **2020** được chấp nhận (201).
  - `K5b`: `scheduledAtUtc` **không có chữ `Z`** (ví dụ `2026-11-18T09:00:00`) gây **500** (Npgsql chỉ nhận `DateTime` kiểu UTC).
  - `K9d`: đặt lịch với bác sĩ **chưa được xác minh** (`IsVerified = false`) được chấp nhận (201), trong khi danh sách chỉ hiển thị bác sĩ đã xác minh.
- **Cách sửa**: chuẩn hóa thời gian về UTC (như `StartDate` của FMD Quốc đã làm); từ chối thời điểm đã qua (400); từ chối bác sĩ `IsVerified = false` (400). `ConsultationSession.Schedule` nên kiểm tra các điều kiện này (Rich Domain).
- **Kiểm tra lại**: script `K5a`, `K5b`, `K9d`.

### A8. 🔴 Frontend Consultation báo "thành công" giả khi backend lỗi
- **Đối chiếu**: tài liệu 2.2 chỉ nói fallback *"khi mất mạng"*. Code dùng fallback cho **mọi lỗi** (kể cả 400/401/500/502).
- **Chỗ lỗi**: `consultationApi.js` `bookSession` (catch trả `isSuccess: true`, "Demo offline") và `sendAdvice` (catch trả "Đã gửi phiếu lời khuyên và **bắn sự kiện RabbitMQ thành công**"). `ConsultationView` chỉ kiểm tra `res?.isSuccess !== false`, và backend thật không có trường `isSuccess`, nên điều kiện **luôn đúng**.
- **Bằng chứng** (trình duyệt): đặt lịch lần 1: POST **201**, DB có 1 dòng. Tắt Consultation, đặt lịch lần 2: POST **502**, giao diện vẫn thêm một lịch hẹn mới và hiện "Đặt lịch thành công", DB vẫn **1 dòng**.
- **Cách sửa**: giống cách đã làm ở `fastingApi.js`: chỉ dùng dữ liệu giả khi lỗi mạng hoặc 502/503/504; lỗi HTTP khác thì ném lỗi với thông điệp của server (`message` hoặc `Message`) và hiện banner đỏ; chỉ thêm lịch/phiếu vào giao diện sau khi server trả 2xx. Với `sendAdvice`, không bao giờ hiện "đã bắn RabbitMQ" nếu chưa gọi thành công.

### A9. 🟠 Tab "Cổng Bác Sĩ" hiển thị sai và không dùng API của bác sĩ
- **Đối chiếu**: tài liệu 2.2: Tab 2 *"xem danh sách bệnh nhân hẹn khám"*.
- **Chỗ lỗi** (`ConsultationView.jsx`):
  - Danh sách tab Bác sĩ là `sessions` của **chính hội viên** (`getUserSessions(DEMO_USER.id)`); hàm `getNutritionistSessions` (API số 5) được viết nhưng **không được gọi ở đâu**.
  - Tên bệnh nhân lấy từ `DEMO_USER.fullName`, nhưng `DEMO_USER` chỉ có `name`, nên tên **trống**; dòng hiển thị `(minhanh.lifestyle@longevity.app)`.
  - Banner cứng "chế độ Bác Sĩ (Đặng Minh Tuấn)"; id mặc định bác sĩ cứng `11111111-...`.
  - Lịch hẹn mới được thêm cục bộ với `status: 2` ("Đã xác nhận") trong khi server tạo `Pending = 1`; giao diện hiện "Đã xác nhận" còn DB là "Chờ xác nhận", và sau khi tải lại sẽ đổi lại.
- **Bằng chứng** (trình duyệt): xác nhận cả 3 hiện tượng.
- **Cách sửa**: tab Bác sĩ gọi `getNutritionistSessions(<id hồ sơ bác sĩ>)`; dùng `name` thay `fullName` (hoặc lấy tên từ dữ liệu phiên); sau khi đặt lịch/gửi phiếu **tải lại danh sách từ server** thay vì tự dựng đối tượng cục bộ (sửa luôn lệch trạng thái).

### A10. 🟡 Bỏ `UseSnakeCaseNamingConvention()` trái `AGENT.md` 3.2
- **Đối chiếu**: tài liệu 2.1(6) ghi đã *"gỡ bỏ ... để EF khớp 100% schema PascalCase"*. `AGENT.md` 3.2 yêu cầu **bắt buộc** `snake_case`; các service khác (DietFasting, Notification, đã sinh lại migration) đều dùng `snake_case`.
- **Hiện trạng**: chạy được vì migration cũ cũng PascalCase (`"Id"`, `"UserId"`, `"ScheduledAtUtc"`), nhưng schema `consultation_db` thành ngoại lệ duy nhất của hệ thống.
- **Cách sửa** (giống Kiệt và Quốc đã làm, DB chưa có dữ liệu thật): bật lại `.UseSnakeCaseNamingConvention()`, xóa thư mục `Migrations/` của Consultation, `dotnet ef migrations add InitialConsultationDb`, rồi tạo lại `consultation_db`. Seeder không cần đổi. Lệnh tạo lại DB: xem `PLAN_ASSIGNMENT.md` Mục 11.1.

### A11. 🟡 Tài liệu bàn giao không khớp code
- Mục 2.2(1) ghi *"Thiết lập timeout 20s"*; `consultationApi.js` **không đặt timeout** nào (dùng 5 giây của `apiClient`). Lần gọi đầu sau khi backend khởi động nguội có thể vượt 5 giây và bị coi là lỗi (trong khi A8 biến lỗi đó thành "thành công giả").
- Mục 5 đưa "kết quả thực tế" của gRPC là số liệu fallback (xem A1).
- Mục 3 ghi các endpoint "Status: 200 OK" nhưng chưa nêu việc chúng đều không cần đăng nhập (A3).
- **Cách sửa**: đặt `timeout: 20000` trong `consultationApi.js` (như `fastingApi.js`/`fmdApi.js`) và cập nhật tài liệu sau khi sửa A1 và A3.

### A12. 🟡 Chưa thấy 3 sơ đồ C3/C4 được giao
- **Đối chiếu**: `PLAN_ASSIGNMENT.md` Mục 9.2 giao Khôi: `C3_Consultation`, `C3_DietFasting`, `C4_Consultation` (`.mmd` + `.png`). Hạn nộp nội bộ 15/11.
- **Hiện trạng**: `docs/diagrams/` có 5 file `.mmd`, **tất cả do Quốc đẩy** (3 của Notification/DietFasting, 2 của DietFasting). Chưa thấy file nào của Khôi. Tài liệu bàn giao của Khôi cũng không nhắc tới sơ đồ.
- **Cách xử lý**: nếu đã vẽ ở máy thì `git add` và đẩy lên; nếu chưa thì vẽ theo mẫu Mục 9.3 và 9.5 (Mermaid).

---

## 3. NHÓM C: KHÔNG PHẢI LỖI (đúng spec hoặc đã biết)

| # | Nội dung | Vì sao không tính là lỗi |
| :-: | :--- | :--- |
| C1 | `GET /api/consultations/nutritionists` công khai | **Đúng spec** (bảng Mục 3 ghi "Public / User") |
| C2 | Không có API xác nhận hoặc hủy lịch hẹn (domain có `Confirm()`/`Cancel()` nhưng không có endpoint) | Ngoài phạm vi: tài liệu của Khôi và `PLAN_ASSIGNMENT.md` Bảng 5 chỉ nêu các API đã có |
| C3 | Hai hội viên đặt trùng giờ với cùng một bác sĩ đều được chấp nhận (script `K14`, INFO) | Không nằm trong spec; có thể bổ sung ràng buộc sau |
| C4 | Khi RabbitMQ tắt, mỗi lần đặt lịch chậm thêm khoảng 4 giây vì publisher thử kết nối lại mỗi request (script `K13` đạt, `K13b` INFO) | Không treo, vẫn trả 201; có thể thêm cooldown 30 giây như publisher của Kiệt. Đề xuất |
| C5 | Event `advice.sent`/`consultation.booked` là best-effort, mất nếu broker tắt đúng lúc | Hạn chế chung đã biết (chưa có Outbox, xem `PLAN_ASSIGNMENT.md` Mục 11.4) |
| C6 | Email gửi tới `user@example.com` cố định (Notification) | Hạn chế đã biết, ngoài phạm vi |
| C7 | Giao diện hiển thị nhãn kỹ thuật ("MICROSERVICE DOMAIN 2", "gRPC cổng 7002", nút "(RabbitMQ)") | Có thể là chủ đích để trình diễn kiến trúc cho giảng viên; commit trước đó từng gỡ nhãn nội bộ nên cần thống nhất với Vy |
| C8 | Khi Kiệt bật `Grpc:RequireAuth=true` phía DietFasting, client của Khôi chưa gửi JWT nên sẽ bị `Unauthenticated` | Mới là việc cần phối hợp, cờ đang tắt mặc định nên chưa ảnh hưởng. Hướng dẫn gửi token: `PLAN_ASSIGNMENT.md` Mục 11.4 |

---

## 4. THỨ TỰ SỬA ĐỀ XUẤT (trước buổi demo)

| Ưu tiên | Việc | Vì sao | Công sức |
| :---: | :--- | :--- | :---: |
| 1 | **A1** sửa URL gRPC (`http://`) | Một dòng, làm cho phần "vũ khí" gRPC của Khôi chạy thật | rất nhỏ |
| 2 | **A5** backend lấy `userId`/`nutritionistId` từ phiên khám | Không sửa thì phiếu lời khuyên "biến mất" khỏi hội viên, đúng luồng demo Workflow 3 | nhỏ |
| 3 | **A8** frontend báo lỗi thật | Giảng viên có thể thấy "thành công" dù không có gì được lưu | nhỏ |
| 4 | **A2** không bịa số liệu y khoa | Quan trọng khi bác sĩ đọc kết quả | nhỏ |
| 5 | **A9** sửa tab Bác sĩ (danh sách, tên, trạng thái) | Hiển thị sai trong demo | vừa |
| 6 | **A7**, **A6** kiểm tra đầu vào, 409 thay 500 | Tránh 500 khi giảng viên thử nhập lạ | vừa |
| 7 | **A3**, **A4** xác thực và phân quyền | Bắt buộc theo `AGENT.md`, nhưng phụ thuộc Khoa (token ở frontend) và việc nối bác sĩ với tài khoản; dùng cờ `Auth:Enforce` | lớn |
| 8 | **A10**, **A11**, **A12** | Dọn dẹp, tài liệu, sơ đồ | nhỏ đến vừa |

---

## 5. TEST CASE VÀ CÁCH CHẠY LẠI

### 5.1. Chuẩn bị
Như `docs/tests/E2E_TEST_CASES.md` Mục 2, thêm database `consultation_db`:
```bash
dotnet ef database update --project src/Services/Consultation/Consultation.Infrastructure --startup-project src/Services/Consultation/Consultation.API
dotnet run --project src/Services/Consultation/Consultation.API     # 5003, tự seed 3 bác sĩ
```
Cần chạy thêm: Gateway (https 7159), DietFasting (5002/7002), Notification (5004), RabbitMQ, Mailpit. Lưu ý cổng 5432/6379 có thể bị chiếm bởi dự án khác (cách xử lý ở file test trên).

### 5.2. Chạy tự động
```bash
node docs/tests/e2e-consultation.js
```
Đặt `SKIP_DESTRUCTIVE=1` để bỏ qua K10b và K13 (hai ca tắt DietFasting và RabbitMQ). Script in `PASS` / `FAIL` / `INFO`.

| Mã review | Ca script | Mong đợi sau khi sửa |
| :-: | :-: | :--- |
| A1 | `K10a` | PASS (số liệu thật, user chưa nhịn lần nào trả 0) |
| A2 | `K10b` | PASS (lỗi 5xx hoặc cờ "dữ liệu mô phỏng", không còn số 24/384) |
| A3 | `K1`, `K2`, `K3`, `K4b` | PASS |
| A4 | (cần ca mới sau khi có phiên giữa bác sĩ và bệnh nhân) | review-user 403 nếu không có phiên hợp lệ |
| A5 | `K7` | PASS (hội viên thấy phiếu, `UserId` đúng) |
| A6 | `K8c`, `K9a`, `K9b`, `K9c` | PASS |
| A7 | `K5a`, `K5b`, `K9d` | PASS |
| A8, A9 | (kiểm tra trình duyệt, mục 5.3) | Xem 5.3 |
| C3, C4 | `K14`, `K13b` | INFO (đề xuất, không tính là lỗi) |

### 5.3. Test thủ công trên trình duyệt (`http://localhost:5173`, tab "Tư vấn chuyên gia")
| ID | Bước | Mong đợi |
| :-: | :--- | :--- |
| U1 | Chọn bác sĩ, chọn ngày mai, bấm "Xác Nhận Đặt Lịch" | Toast thành công; DB `consultation_sessions` có dòng mới; trạng thái hiển thị là **"Chờ xác nhận"** (khớp DB) |
| U2 | Tắt `Consultation.API`, đặt lịch lần nữa | ⚠️ **A8**: mong đợi báo lỗi, **không** thêm lịch mới, DB không đổi *(hiện: vẫn báo thành công và thêm lịch giả, Gateway trả 502)* |
| U3 | Tải lại trang sau U1 | Danh sách lịch hẹn khớp DB |
| U4 | Sang tab "Cổng Bác Sĩ" | ⚠️ **A9**: mong đợi danh sách bệnh nhân của bác sĩ, có tên đầy đủ *(hiện: lịch hẹn của chính hội viên, tên trống)* |
| U5 | Bấm "Kê Đơn Lời Khuyên", gửi | Toast thành công; email "New Nutritionist Consultation Advice Received" trong Mailpit (`http://localhost:8025`) |
| U6 | Quay lại tab hội viên, xem phiếu lời khuyên | ⚠️ **A5**: mong đợi thấy phiếu vừa gửi *(hiện: không thấy, DB lưu `UserId` rỗng)* |
| U7 | Bấm "Soi Dữ Liệu Sức Khỏe (gRPC)" với DietFasting đang chạy | Số liệu thật của user (user mới: 0 lần nhịn). ⚠️ **A1**: hiện luôn là 24 lần / 384 giờ |
| U8 | Như U7 nhưng tắt DietFasting | ⚠️ **A2**: mong đợi báo lỗi hoặc nhãn "Dữ liệu mô phỏng" *(hiện: vẫn 24 lần / 384 giờ như thật)* |

### 5.4. Ca đã chạy thật và ca chưa chạy
Đã chạy thật: toàn bộ ca script K0–K14 (22 ca bắt buộc + 2 INFO) và U1, U2, U4 trên trình duyệt (xác nhận A8, A9). **Chưa chạy:** U5–U8 trên giao diện (kết quả suy ra từ script và log), A4 (chưa có ca tự động).

---

## 6. KIỂM TRA LẠI SAU KHI KHÔI SỬA (commit `cfac1e4`, "resolve all 12 review issues")

> **Cách kiểm tra lại**: build lại, dựng lại stack, áp dụng migration mới của Consultation, chạy lại script (đã mở rộng thêm các ca K9e, K10c, K10d, K15, K16, K17) và kiểm tra giao diện trên trình duyệt với 3 loại tài khoản (hội viên, chưa đăng nhập, bác sĩ). Build: 0 lỗi, 0 cảnh báo.  
> **Kết quả script: 23/27 ca bắt buộc đạt (lần 1: 8/22).** Lỗi còn lại: `K9e`, `K10d`, `K15`, `K17`. INFO: `K14`, `K13b` (đề xuất, không tính lỗi).  
> Lưu ý trung thực về lần chạy này: lúc đầu script báo thêm một số ca lỗi, nhưng do chính dữ liệu test của mình (chuỗi `"16/8"` ngắn hơn `MinLength(5)` mới của Khôi, một lỗi gõ biến, email trễ làm lệch bộ đếm). Mình đã sửa script rồi chạy lại; các lỗi dưới đây còn lại sau khi loại các nhiễu đó.

### 6.1. Tình trạng 12 điểm A1–A12

| Mã | Trước | Sau khi sửa | Bằng chứng |
| :-: | :--- | :---: | :--- |
| **A1** gRPC URL `https://` | ❌ | ✅ **Đã sửa** | `appsettings.json` đã là `http://localhost:7002`; `K10a` đạt (số liệu thật, user mới = 0 lần nhịn); modal gRPC trên giao diện hiện số thật |
| **A2** Số liệu y khoa bịa | ❌ | ✅ **Đã sửa** | Client ném `ServiceUnavailableException`; `K10b` đạt (HTTP **503** khi tắt DietFasting); frontend bỏ dữ liệu mẫu |
| **A3** Không xác thực | ❌ | ⚠️ **Gần xong** | `[Authorize]`, role, chủ sở hữu, `userId` lấy từ JWT: `K1`, `K2`, `K3`, `K4b` đạt. Còn **N3** (bác sĩ xem bệnh nhân của bác sĩ khác) |
| **A4** `review-user` cần phiên hợp lệ | ❌ | ⚠️ **Một phần** | `K10c` đạt (user chưa có lịch bị 403). Nhưng `K10d` lỗi: **xem **N4** |
| **A5** Phiếu gán `UserId` rỗng | ❌ | ✅ **Đã sửa** | `K7` đạt; qua giao diện bác sĩ kê đơn: DB `advice_notes.user_id` = hội viên đúng, có email `New Nutritionist Consultation Advice Received` |
| **A6** Kiểm tra phiếu lời khuyên | ❌ | ⚠️ **Gần xong** | `K8c` (409), `K9a`, `K9b` (403), `K9c` (400) đạt. Còn **N2** (fail-open) |
| **A7** Kiểm tra đặt lịch | ❌ | ⚠️ **Gần xong** | `K5a` (400 quá khứ), `K5b` (không còn 500), `K9d` (400 bác sĩ chưa xác minh) đạt. Còn **N5** (múi giờ) |
| **A8** Giao diện báo thành công giả | ❌ | ✅ **Đã sửa** | Tắt Consultation rồi đặt lịch: toast đỏ "❌ Lỗi đặt lịch: Dịch vụ ... không khả dụng (503)", modal giữ nguyên, danh sách không thêm lịch giả |
| **A9** Tab Bác sĩ | ❌ | ⚠️ **Tab bác sĩ đúng, nhưng bị hồi quy N1 chặn ở tab hội viên** | Tab bác sĩ dùng `getNutritionistSessions` (hiện danh sách bệnh nhân từ server); trạng thái lấy từ server sau mỗi thao tác. Xem **N1** |
| **A10** `snake_case` | ❌ | ✅ **Đã sửa** | Bật lại convention; migration `InitialConsultationDb` sinh lại (cột `user_id`, `scheduled_at_utc`, index `ix_..._consultation_session_id` UNIQUE); áp dụng sạch trên DB trống |
| **A11** Timeout, tài liệu | ❌ | ✅ **Đã sửa** | `timeout: 20000` trong `consultationApi.js`. Tài liệu đã cập nhật (xem **N9** về chỗ chưa khớp) |
| **A12** Sơ đồ C3/C4 | ❌ | ⚠️ **Có file, chưa khớp code** | Có `C3_Consultation.mmd`, `C3_DietFasting.mmd`, `C4_Consultation.mmd`; chưa có `.png`, và tên một số thành phần không khớp code (xem **N8**) |

**Tóm lại:** 6/12 đã sửa xong, 6/12 sửa một phần. Thông điệp commit "resolve all 12" chưa đúng hoàn toàn.

### 6.2. LỖI MỚI VÀ LỖI CÒN LẠI SAU KHI SỬA

#### N1. 🔴 Hồi quy: tab "Dành cho hội viên" **trống hoàn toàn** với tài khoản hội viên bình thường và khi chưa đăng nhập
- **Nguyên nhân**: `ConsultationView.loadData` gọi `Promise.all([...])` gồm cả `getNutritionistSessions(...)` (API chỉ dành cho bác sĩ). Hội viên bị **403** (hoặc **401** khi chưa đăng nhập) → `Promise.all` từ chối → không có state nào được set, lỗi chỉ ghi `console.error`, không hiện thông báo.
- **Bằng chứng** (trình duyệt):
  - Token role **User**: 0 thẻ bác sĩ, **không có nút "Đặt Lịch Tư Vấn"**, "Lịch Hẹn Của Tôi: 0 buổi" (dù DB có lịch của user này). Console: `ConsultationApiError: Bạn không có quyền ... (403 Forbidden)` tại `getNutritionistSessions`.
  - **Chưa đăng nhập**: cũng 0 bác sĩ, console `Bạn chưa đăng nhập ...` (401) tại `getUserSessions`. Chế độ demo trước đây hiện được danh sách bác sĩ, giờ trống.
  - Token role **Nutritionist**: tab tải bình thường (3 bác sĩ, đặt lịch, danh sách bệnh nhân).
- **Hậu quả**: hội viên **không đặt lịch được** từ giao diện, đúng luồng chính của Domain 2.
- **Cách sửa**: chỉ gọi `getNutritionistSessions` khi role là `Nutritionist`/`Admin`; dùng `Promise.allSettled` để lỗi một phần không làm trống cả trang; hiện banner lỗi cho phần bị lỗi; khi chưa đăng nhập vẫn hiện danh sách bác sĩ (API công khai) kèm gợi ý "Đăng nhập để đặt lịch".
  ```js
  const role = getConsultationAuthSession()?.role;
  const isDoctor = role === 'Nutritionist' || role === 'Admin';
  const [nutri, mine, advices, docSessions] = await Promise.allSettled([
    consultationApi.getNutritionists(),
    consultationApi.getUserSessions(userId),
    consultationApi.getUserAdvices(userId),
    isDoctor ? consultationApi.getNutritionistSessions(targetDoctorId) : Promise.resolve([]),
  ]);
  ```
- **Kiểm tra lại**: ca U1 (đặt lịch bằng token role User) và U9 mới ở Mục 6.3.

#### N2. 🟠 Tài khoản có role `Nutritionist` nhưng không có hồ sơ bác sĩ vẫn kê đơn được (fail-open)
- **Chỗ lỗi**: `SendAdviceAsync`: `if (callerProfile != null && callerProfile.Id != session.NutritionistId) throw Forbidden`. Khi `callerProfile == null` (tài khoản không gắn hồ sơ nào) thì **bỏ qua kiểm tra** và cho qua.
- **Bằng chứng** (`K9e`): token role Nutritionist với `UserId` ngẫu nhiên (không có hồ sơ) gửi phiếu cho phiên của bác sĩ #1 → **201**.
- **Cách sửa**: không phải Admin mà không có hồ sơ → 403. Controller truyền thêm `isAdmin: User.IsInRole("Admin")`.

#### N3. 🟠 Bác sĩ xem được danh sách bệnh nhân (kèm ghi chú) của bác sĩ khác
- **Chỗ lỗi**: `GET /api/consultations/nutritionist/{id}` chỉ kiểm tra role, không kiểm tra `{id}` có phải hồ sơ của người gọi.
- **Bằng chứng** (`K15`): token bác sĩ #2 gọi với id của bác sĩ #1 → **200** kèm toàn bộ lịch hẹn.
- **Cách sửa**: tìm hồ sơ theo `UserId` trong JWT; không phải Admin thì `profile.Id` phải bằng `{id}`, nếu không 403.

#### N4. 🟠 `review-user` kiểm tra "bệnh nhân có phiên với **ai đó**", không phải "với **bác sĩ này**"
- **Đối chiếu**: `AGENT.md` 4.3: *"giữa hai bên"*. Tham số `doctorUserId` được truyền vào `ReviewUserDietProgressAsync` nhưng **không được dùng**; điều kiện là `userSessions.Any(Pending | Confirmed | Completed)`.
- **Bằng chứng** (`K10d`): bệnh nhân chỉ có lịch với bác sĩ #1, bác sĩ #2 vẫn xem được dữ liệu sức khỏe (**200**).
- **Cách sửa**: lấy hồ sơ bác sĩ từ JWT, yêu cầu có phiên với `NutritionistId == profile.Id` (Admin được bỏ qua). Cân nhắc có tính `Completed` hay không ("đang hoạt động" thường chỉ gồm `Pending`/`Confirmed`).

#### N5. 🟡 Giờ hẹn có múi giờ khác UTC bị lưu sai
- **Chỗ lỗi**: `ConsultationSession.Schedule` dùng `DateTime.SpecifyKind(scheduledAt, Utc)` cho mọi giá trị không phải UTC, kể cả kiểu `Local` (đáng ra phải `ToUniversalTime()`).
- **Bằng chứng** (`K17`): gửi `2027-03-10T09:00:00+07:00` → lưu `2027-03-10T09:00:00Z` (đúng phải là `02:00:00Z`). Lỗi hiện ra khi máy chủ không chạy múi giờ UTC (máy dev tại Việt Nam).
- **Cách sửa**: `Utc => v`, `Local => v.ToUniversalTime()`, `Unspecified => SpecifyKind(v, Utc)` (cách `FmdService` của Quốc đã làm).

#### N6. 🟡 Chữ cứng trong modal gRPC gây hiểu nhầm
- Modal hiển thị luôn "Độ trễ < 5ms" (không đo) và "Chế độ: 16/8" ngay cả khi hội viên không nhịn ăn ("Trạng thái: Đã dừng", không có chế độ). Nên hiển thị đúng `currentFastingType` (hoặc "Không có") và bỏ/đo thật độ trễ.

#### N7. 🟡 (từ đọc code, chưa chạy) Lỗi 5xx của danh sách bị im lặng, trả mảng rỗng
- `getUserSessions`, `getUserAdvices`, `getNutritionistSessions` chỉ ném lỗi khi 401/403; lỗi khác (kể cả 5xx) trả `[]`, giao diện hiện "Bạn chưa có lịch hẹn nào" như thể không có dữ liệu. `getNutritionists` rơi về danh sách 3 bác sĩ mẫu cho mọi lỗi. Nên hiện banner lỗi thay vì ẩn.

#### N8. 🟡 Sơ đồ C3/C4 chưa khớp code
- Có đủ 3 file `.mmd` (chưa render thử, chưa có `.png`). Nhưng:
  - `C3_Consultation.mmd`, `C3_DietFasting.mmd` dùng RPC **`GetUserHealthSummary`** (không tồn tại; thực tế có 3 RPC `GetUserFastingSummary`, `GetUserNutritionSummary`, `GetActiveFmdCycle`).
  - `C3_Consultation.mmd`: `RabbitMqEventPublisher`, `IEventBusPublisher` (thực tế `RabbitMqConsultationPublisher`, `IEventBus`); không có `ConsultationDbSeeder`.
  - `PLAN_ASSIGNMENT.md` Mục 9.4 yêu cầu tên component/class **khớp 100%** với code.

#### N9. 🟡 Tài liệu `KHOI_CONSULTATION_DOCUMENTATION.md` chưa chính xác ở vài chỗ
- Ghi A4 được giải quyết bằng `HasActiveSessionAsync(...)`; **không có method này trong code** (logic nằm trực tiếp trong `ReviewUserDietProgressAsync`), và A4 mới sửa một phần (N4).
- Tuyên bố đã giải quyết "dứt điểm" cả 12 điểm; còn N1–N5.

### 6.3. Ca kiểm tra bổ sung

Script `docs/tests/e2e-consultation.js` đã được mở rộng:

| Ca | Nội dung | Kết quả hiện tại |
| :-: | :--- | :---: |
| `K9e` | Role Nutritionist không có hồ sơ không kê đơn được (403) | ❌ (N2) |
| `K10c` | `review-user` cho hội viên chưa có lịch bị 403 | ✅ |
| `K10d` | Bác sĩ #2 không xem được bệnh nhân chỉ có lịch với bác sĩ #1 (403) | ❌ (N4) |
| `K15` | Bác sĩ #2 không xem danh sách bệnh nhân của bác sĩ #1 (403) | ❌ (N3) |
| `K16` | [đề xuất] Bác sĩ chỉ xem lịch hẹn của hội viên đã đặt với mình | ✅ (dữ liệu test chưa tạo trường hợp phân biệt, nên chưa đủ chắc) |
| `K17` | Giờ `09:00+07:00` lưu thành `02:00Z` | ❌ (N5) |

Test thủ công trên giao diện (`http://localhost:5173`, tab "Tư vấn chuyên gia"; đặt token vào `localStorage.accessToken`):

| ID | Bước | Mong đợi | Kết quả hiện tại |
| :-: | :--- | :--- | :---: |
| U1 | Token **User**: mở tab, chọn bác sĩ, đặt lịch | Hiện 3 bác sĩ, đặt được, lịch xuất hiện (trạng thái "Chờ xác nhận") | ❌ **N1** (tab trống) |
| U9 | **Không đăng nhập**: mở tab | Vẫn thấy danh sách bác sĩ kèm gợi ý đăng nhập | ❌ **N1** (tab trống) |
| U2 | Token **Nutritionist**: tắt Consultation, đặt lịch | Toast đỏ báo lỗi, không thêm lịch giả | ✅ |
| U4 | Token Nutritionist: tab "Cổng Bác Sĩ" | Danh sách bệnh nhân của bác sĩ lấy từ server | ✅ |
| U5 | Token Nutritionist: "Kê Đơn Lời Khuyên" rồi gửi | Toast thành công; DB `advice_notes.user_id` đúng hội viên; có email trong Mailpit | ✅ |
| U7 | Token Nutritionist: "Soi Dữ Liệu Sức Khỏe (gRPC)" | Số liệu thật (hội viên mới: 0 phiên, 0 kcal) | ✅ (còn chữ cứng N6) |

### 6.4. Thứ tự sửa còn lại (trước demo)
1. **N1** (hội viên không thấy bác sĩ, không đặt được lịch): sửa ngay, ảnh hưởng luồng chính của demo.
2. **N2, N3, N4**: ba lỗ hổng phân quyền còn lại (`K9e`, `K15`, `K10d`); cùng một nguyên nhân là chưa nối "tài khoản đăng nhập" với "hồ sơ bác sĩ" cho mọi trường hợp. Nên viết một hàm dùng chung (lấy hồ sơ theo `UserId` từ JWT, Admin bỏ qua).
3. **N5** (một dòng), **N6**, **N7**.
4. **N8** (đối chiếu sơ đồ với code, xuất PNG) và **N9** (cập nhật tài liệu sau khi sửa).
