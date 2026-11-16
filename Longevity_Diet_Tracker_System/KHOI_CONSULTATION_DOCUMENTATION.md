# BÁO CÁO BÀN GIAO & ĐẶC TẢ KỸ THUẬT PHÂN HỆ CONSULTATION SERVICE
## THÀNH VIÊN ĐẢM NHIỆM: DƯƠNG ĐÌNH KHÔI (DOMAIN 2)
### DỰ ÁN: LONGEVITY DIET TRACKER SYSTEM (PRN232 - .NET 8 MICROSERVICES)
*Cập nhật toàn diện sau đợt Review & Nghiệm thu chéo từ Team (KHOI_REVIEW.md)*

---

## 1. TỔNG QUAN PHẠM VI CÔNG VIỆC CỦA DƯƠNG ĐÌNH KHÔI

Theo **Master Plan V4** tại [PLAN_ASSIGNMENT.md](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/PLAN_ASSIGNMENT.md) và tiêu chuẩn kiến trúc tại [AGENT.md](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/AGENT.md), phân hệ do **Dương Đình Khôi** đảm nhiệm là **Domain 2: Tư Vấn Chuyên Gia & Hợp Đồng gRPC (`Consultation Service`)**:

| Mục | Chi tiết đảm nhiệm |
| :--- | :--- |
| **Backend Service** | `Consultation Service` (.NET 8, Onion Architecture 4 tầng, PostgreSQL `consultation_db` chuẩn `snake_case`, Cổng nội bộ `5003`, Route Gateway `https://localhost:7159/api/consultations/*`) |
| **"Vũ khí" Kỹ thuật Chuyên sâu** | 1. **gRPC Client (Inter-Service Sync)**: Đồng bộ trực tiếp qua HTTP/2 Protobuf sang `Diet & Fasting Service` (Cổng `7002`) lấy dữ liệu nhịn ăn 16/8 và vi/đa lượng.<br>2. **RabbitMQ Publisher (Async Event-Driven)**: Bắn thông điệp `advice.sent` vào Exchange `longevity_events_exchange` để `Notification Service` nhận và gửi email y tế. |
| **Frontend Giao diện (React)** | Màn hình **Khách Hàng Đặt Lịch Tư Vấn & Cổng Bác Sĩ Kê Phiếu Lời Khuyên** (`src/features/consultation/`) |
| **Điểm cân bằng tải** | **8.5 / 10** (Đồng đều tuyệt đối cùng các thành viên trong nhóm) |

---

## 2. BẢNG TỔNG HỢP 12 HẠNG MỤC SỬA LỖI & NÂNG CẤP (REFAC VÀ FIX THEO KHOI_REVIEW.MD)

Dưới đây là chi tiết toàn bộ 12 vấn đề kỹ thuật (A1 – A12) do thành viên Kiệt rà soát và cách Khôi đã giải quyết dứt điểm:

| Mã | Hạng mục phản biện từ Review | Giải pháp kỹ thuật Khôi đã thực hiện | Vị trí File đã sửa | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **A1** | Sai URL gRPC (`https://localhost:7002` gây lỗi SSL `AuthenticationException: Cannot determine the frame size`) | Đổi sang cleartext HTTP/2: `"http://localhost:7002"` khớp với Kestrel `DietFasting.API`. | [appsettings.json](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.API/appsettings.json) | ✅ Đã Fix |
| **A2** | Fake data trong gRPC fallback (Hardcode 24 fasts / 384h / 1850 kcal / FMD day 3) | Xóa toàn bộ số liệu bịa đặt. Bổ sung `ServiceUnavailableException` (HTTP 503) và rethrow khi gRPC lỗi. | [DietFastingGrpcClient.cs](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.Infrastructure/Core/Grpc/DietFastingGrpcClient.cs) | ✅ Đã Fix |
| **A3** | Thiếu `[Authorize]` trên Controller, không kiểm tra JWT Claims và phân quyền RBAC | Bổ sung `[Authorize]` class-level, `[AllowAnonymous]` cho danh mục bác sĩ. Buộc `POST /book` lấy `UserId` từ JWT (`nameid`/`sub`), kiểm tra quyền xem lịch. | [ConsultationsController.cs](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.API/Controllers/ConsultationsController.cs) | ✅ Đã Fix |
| **A4** | Nutritionist có thể soi trộm hồ sơ người dùng bất kỳ qua `/review-user` mà không có lịch hẹn | `ReviewUserDietProgressAsync` kiểm tra bệnh nhân có lịch hẹn (`Pending`/`Confirmed`/`Completed`) **với chính hồ sơ bác sĩ của người gọi** (lấy từ JWT qua `NutritionistProfile.UserId`). Không có thì `403 Forbidden`. Admin chỉ cần bệnh nhân có lịch hợp lệ với bất kỳ bác sĩ nào. *(Bản trước kiểm tra "với ai đó" và gọi sai tên method; đã sửa ở mục 2.1.)* | [ConsultationApplicationServices.cs](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.Application/Services/ConsultationApplicationServices.cs) | ✅ Đã Fix |
| **A5** | `AdviceNote` lưu `Guid.Empty` cho `UserId` và `NutritionistId` | `SendAdviceAsync` đọc trực tiếp `UserId` và `NutritionistId` từ `ConsultationSession` trong DB, loại bỏ hoàn toàn `Guid.Empty`. | [ConsultationApplicationServices.cs](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.Application/Services/ConsultationApplicationServices.cs) | ✅ Đã Fix |
| **A6** | Gửi lời khuyên trùng lặp gây 500 DB Crash (Duplicate Key Exception) | Kiểm tra `GetBySessionIdAsync(sessionId)`. Nếu đã có lời khuyên thì ném `ConflictException` (HTTP 409). Trong Domain Entity kiểm tra trạng thái không phải `Completed`. | [ConsultationEntities.cs](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.Domain/Entities/ConsultationEntities.cs), [ConsultationApplicationServices.cs](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.Application/Services/ConsultationApplicationServices.cs) | ✅ Đã Fix |
| **A7** | Thiếu Invariants & Validation (cho phép đặt lịch quá khứ, bác sĩ chưa verified, thiếu độ dài lời khuyên) | Thêm Data Annotations `[Required]`, `[MinLength(5)]`, `[MaxLength(2000)]`. Kiểm tra `scheduledAtUtc > DateTime.UtcNow` và `nutritionist.IsVerified`. | [ConsultationDtos.cs](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.Application/DTOs/ConsultationDtos.cs), [ConsultationEntities.cs](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.Domain/Entities/ConsultationEntities.cs) | ✅ Đã Fix |
| **A8** | Frontend nuốt toàn bộ lỗi Backend – luôn giả vờ "thành công" kể cả khi lỗi 400/409/500 | Xây dựng lớp `ConsultationApiError`, phân giải mã lỗi server và ném lỗi thật. Giao diện hiển thị Toast màu đỏ cảnh báo. | [consultationApi.js](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Clients/web-app/src/features/consultation/consultationApi.js), [ConsultationView.jsx](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Clients/web-app/src/features/consultation/ConsultationView.jsx) | ✅ Đã Fix |
| **A9** | Doctor Tab đọc sai API (gọi `getUserSessions` thay vì `getNutritionistSessions`) và hardcode tên bệnh nhân | Chuyển sang gọi `getNutritionistSessions(...)` cho hồ sơ bác sĩ của người đăng nhập (Admin có bộ chọn bác sĩ). Hiển thị mã hội viên rút gọn vì tên hội viên thuộc `identity_db` (Database-per-Service). | [ConsultationView.jsx](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Clients/web-app/src/features/consultation/ConsultationView.jsx) | ✅ Đã Fix |
| **A10** | Database `consultation_db` lệch chuẩn đặt tên (`PascalCase` thay vì `snake_case`) | Bật lại `.UseSnakeCaseNamingConvention()`, xóa migration cũ, sinh migration mới `20261115193709_InitialConsultationDb.cs` và cập nhật database. | [DependencyInjection.cs](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.Infrastructure/DependencyInjection.cs), [Migrations](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.Infrastructure/Migrations/) | ✅ Đã Fix |
| **A11** | Thiếu Axios timeout gây treo giao diện khi gRPC khởi động chậm | Đặt cấu hình `timeout: 20000` (20 giây) cho toàn bộ request trong `consultationApi.js`. | [consultationApi.js](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Clients/web-app/src/features/consultation/consultationApi.js) | ✅ Đã Fix |
| **A12** | Thiếu 3 diagram bắt buộc theo chuẩn đồ án | Tạo 3 sơ đồ C3/C4 Mermaid trong thư mục `docs/diagrams/`, đối chiếu tên component/class với code (đã chỉnh ở mục 2.1). Chưa xuất file `.png` (cần render bằng mermaid.live). | [C3_Consultation.mmd](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/docs/diagrams/C3_Consultation.mmd), [C3_DietFasting.mmd](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/docs/diagrams/C3_DietFasting.mmd), [C4_Consultation.mmd](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/docs/diagrams/C4_Consultation.mmd) | ✅ Đã Fix |

### 2.1. Bổ sung sau lần kiểm tra lại (Kiệt, 16/11/2026): các điểm N1–N9

Sau khi chạy lại toàn bộ kiểm thử, còn một số điểm chưa đạt đã được sửa tiếp (chi tiết từng file: [KHOI_FIXES.md](KHOI_FIXES.md)):

| Mã | Nội dung | Tóm tắt cách sửa |
| :---: | :--- | :--- |
| **N1** | Hội viên bình thường mở tab Tư vấn thấy trang trống (gọi API bác sĩ bị 403 làm sụp `Promise.all`) | `loadData` dùng `Promise.allSettled`, chỉ gọi API bác sĩ khi role là Nutritionist/Admin, lỗi hiển thị bằng banner |
| **N2** | Role Nutritionist nhưng không có hồ sơ bác sĩ vẫn kê đơn được | Không phải Admin mà không có hồ sơ thì `403` |
| **N3** | Bác sĩ xem được bệnh nhân của bác sĩ khác | `GET /nutritionist/{id}` chỉ cho hồ sơ của chính mình (Admin xem mọi bác sĩ) |
| **N4** | `review-user` chỉ kiểm tra "có lịch với ai đó" | Phải có lịch với chính bác sĩ gọi |
| **N5** | Giờ hẹn có offset (`+07:00`) bị lưu lệch | Chuyển đổi theo `DateTimeKind` (`Local` → `ToUniversalTime()`) |
| **N6** | Chữ cứng "Độ trễ < 5ms", "Chế độ: 16/8", ghi chú FMD cố định | Hiển thị độ trễ đo thực tế, chế độ nhịn ăn đúng dữ liệu, định mức FMD theo ngày |
| **N7** | Lỗi 5xx của danh sách bị ẩn, danh sách bác sĩ mẫu dùng cho mọi lỗi | Mọi lỗi được báo; danh sách mẫu chỉ khi mất kết nối và có nhãn |
| **N8** | Sơ đồ C3/C4 dùng tên không có trong code | Đã đối chiếu và sửa tên component/class/RPC |
| **N9** | Tài liệu nhắc method `HasActiveSessionAsync` không tồn tại, con số "< 5ms" | Đã sửa trong tài liệu này |

---

## 3. BẢNG ĐẶC TẢ CHI TIẾT 7 RESTful APIS (CONSULTATION DOMAIN)

Tất cả các API được gọi thông qua **YARP Gateway** (`https://localhost:7159` hoặc cổng HTTP `5000`):

| STT | Method | Endpoint qua Gateway | Quyền truy cập | Chức năng nghiệp vụ & HTTP Response Codes |
| :---: | :---: | :--- | :---: | :--- |
| **1** | `GET` | `/api/consultations/nutritionists` | Public (`[AllowAnonymous]`) | Lấy danh sách chuyên gia dinh dưỡng được xác thực từ bảng `nutritionist_profiles` (**200 OK**). |
| **2** | `GET` | `/api/consultations/nutritionists/{id}` | Public (`[AllowAnonymous]`) | Xem thông tin chi tiết một chuyên gia dinh dưỡng (**200 OK**, **404 Not Found**). |
| **3** | `POST` | `/api/consultations/book` | `[Authorize]` (User) | Hội viên đặt lịch hẹn mới. Kiểm tra ngày tương lai, bác sĩ verified (**201 Created**, **400 Bad Request**, **401 Unauthorized**). |
| **4** | `GET` | `/api/consultations/user/{userId}` | `[Authorize]` (Chính chủ / Doctor / Admin) | Xem toàn bộ lịch hẹn tư vấn của hội viên (**200 OK**, **403 Forbidden**). |
| **5** | `GET` | `/api/consultations/user/{userId}/advices` | `[Authorize]` (Chính chủ / Doctor / Admin) | Xem danh sách phiếu lời khuyên y khoa đã nhận (**200 OK**, **403 Forbidden**). |
| **6** | `GET` | `/api/consultations/nutritionist/{id}` | `[Authorize]` (Nutritionist / Admin) | Bác sĩ xem danh sách bệnh nhân đặt lịch hẹn với mình (**200 OK**, **403 Forbidden**). |
| **7** | `GET` | `/api/consultations/review-user/{userId}` | `[Authorize]` (Nutritionist / Admin) | **gRPC Client (:7002)**: Gọi HTTP/2 Protobuf sang `DietFasting` lấy snapshot dinh dưỡng sau khi đã kiểm tra có lịch hẹn giữa 2 bên (**200 OK**, **403 Forbidden**, **503 Service Unavailable**). |
| **8** | `POST` | `/api/consultations/advice` | `[Authorize]` (Nutritionist / Admin) | Bác sĩ gửi phiếu lời khuyên ➜ Đổi trạng thái phiên thành `Completed` ➜ **Bắn sự kiện `advice.sent` vào RabbitMQ** (**201 Created**, **409 Conflict**, **403 Forbidden**). |

---

## 4. CƠ CHẾ KẾT NỐI LIÊN DỊCH VỤ ("VŨ KHÍ" BẢO VỆ VẤN ĐÁP)

### 4.1. Giao Tiếp Đồng Bộ: gRPC Client (:7002)
* **Bài toán nghiệp vụ**: Bác sĩ ở `Consultation Service` cần xem dữ liệu nhịn ăn và calo của khách hàng ở `DietFasting Service`. Nếu query trực tiếp database `diet_db` thì **vi phạm nguyên lý Database-per-Service**. Nếu gọi REST API qua Gateway thì chịu độ trễ phân giải JSON cao.
* **Giải pháp của Khôi**: Viết `DietFastingGrpcClient` sử dụng giao thức HTTP/2 nhị phân gọi trực tiếp sang cổng `7002` của `DietFasting.API`. Dữ liệu được mã hóa chuẩn Protobuf contract `diet_fasting.proto`; giao diện hiển thị thời gian phản hồi **đo thực tế** của mỗi lần gọi (không còn con số cố định).
* **Cơ chế chịu lỗi**: Khi `DietFasting.API` chưa bật hoặc gặp sự cố, hệ thống trả về mã lỗi HTTP 503 Service Unavailable kèm thông điệp rõ ràng, không nuốt lỗi và không tạo ra số liệu giả mạo.

### 4.2. Giao Tiếp Bất Đồng Bộ: RabbitMQ Publisher (`advice.sent`)
* **Bài toán nghiệp vụ**: Sau khi kê đơn xong, cần gửi email thông báo cho bệnh nhân qua `Notification Service`. Nếu gọi trực tiếp SMTP thì Bác sĩ phải chờ 2–5 giây và nếu SMTP lỗi thì buổi khám bị rollback thất bại.
* **Giải pháp của Khôi**: Áp dụng Event-Driven Architecture. `ConsultationService` publish sự kiện `AdviceSentIntegrationEvent` vào Exchange `longevity_events_exchange` với routing key `advice.sent`. Việc gửi email do background consumer bên `Notification Service` đảm nhiệm mà không làm nghẽn tiến trình của Bác sĩ.

---

## 5. HỆ THỐNG SƠ ĐỒ THIẾT KẾ KIẾN TRÚC (C3 / C4 MERMAID DIAGRAMS)

Đã tạo đầy đủ 3 sơ đồ kỹ thuật tại thư mục `docs/diagrams/`:
1. [C3_Consultation.mmd](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/docs/diagrams/C3_Consultation.mmd): Mô hình Component Diagram của Consultation Service theo Onion Architecture, thể hiện luồng vào qua Gateway, Controller, Use Case, Repositories, gRPC Client và RabbitMQ Publisher.
2. [C3_DietFasting.mmd](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/docs/diagrams/C3_DietFasting.mmd): Mô hình ranh giới tích hợp giữa Consultation Service và gRPC Server của DietFasting Service qua cổng 7002 HTTP/2 Protobuf.
3. [C4_Consultation.mmd](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/docs/diagrams/C4_Consultation.mmd): Sơ đồ lớp (Class Diagram) chi tiết thể hiện Rich Domain Model (`NutritionistProfile`, `ConsultationSession`, `AdviceNote`, `SessionStatus`) và các interface hợp đồng trong Onion Architecture.

---

## 6. HƯỚNG DẪN CHẠY VÀ XỬ LÝ LỖI KHI DEMO

### 6.1. Giải thích hiện tượng "nó vẫn vậy mà không ra API gì hết / localhost refused to connect"
Khi bạn mở trình duyệt và gặp thông báo *"Hmm... can't reach this page - localhost refused to connect"*, có **2 nguyên nhân cụ thể**:
1. **Gõ sai chính tả đường dẫn**: Trong ảnh chụp màn hình, URL đang là `http://localhost:5003/swaqger` (chữ **`q`** thay vì **`g`**). Đường dẫn chính xác phải là:
   $$\text{http://localhost:5003/swagger}$$
2. **Tiến trình Backend chưa được bật**: Dịch vụ `Consultation.API` hiện tại đang ở trạng thái tắt (chưa chạy lệnh `dotnet run`). Khi không có tiến trình nào lắng nghe trên cổng 5003 thì Windows sẽ từ chối kết nối (`refused to connect`).

### 6.2. Các bước khởi động toàn bộ hệ thống để demo thành công

#### Bước 1: Khởi động Docker Container (Database & Message Broker)
Mở PowerShell tại thư mục dự án:
```powershell
docker compose -f Longevity_Diet_Tracker_System/docker-compose.yml up -d
```
Kiểm tra đảm bảo 4 container đều xanh: `longevity_postgres`, `longevity_redis`, `longevity_rabbitmq`, `longevity_mailpit`.

#### Bước 2: Khởi động Consultation.API (Cổng 5003)
Mở 1 cửa sổ terminal mới:
```powershell
cd Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.API
dotnet run --launch-profile http
```
Sau khi thấy log `Now listening on: http://localhost:5003`, mở trình duyệt vào:
👉 **`http://localhost:5003/swagger`** (Swagger UI hiển thị đầy đủ 8 API của Consultation Service).

#### Bước 3: Khởi động DietFasting.API (Cổng 5002 REST & 7002 gRPC)
Mở 1 cửa sổ terminal thứ 2:
```powershell
cd Longevity_Diet_Tracker_System/src/Services/DietFasting/DietFasting.API
dotnet run
```
Tiến trình này sẽ phục vụ gRPC trên cổng 7002 để Consultation Service gọi sang.

#### Bước 4: Khởi động YARP API Gateway (Cổng 7159 HTTPS / 5000 HTTP)
Mở 1 cửa sổ terminal thứ 3:
```powershell
cd Longevity_Diet_Tracker_System/src/ApiGateways/YarpGateway
dotnet run
```
Gateway sẽ định tuyến `/api/consultations/*` về `http://localhost:5003`.

#### Bước 5: Khởi động Giao diện Frontend React
Mở 1 cửa sổ terminal thứ 4:
```powershell
cd Longevity_Diet_Tracker_System/src/Clients/web-app
npm run dev
```
Truy cập `http://localhost:5173`, chọn menu **"Tư vấn chuyên gia"**:
- **Tab Hội viên**: Chọn bác sĩ ➜ Bấm "Đặt Lịch Tư Vấn" ➜ Chọn ngày giờ tương lai ➜ Xác nhận.
- **Tab Cổng Bác Sĩ & gRPC**:
  * Chọn Bác sĩ từ danh sách.
  * Bấm nút **"Soi Dữ Liệu Sức Khỏe (gRPC)"** để xem số liệu nhịn ăn và calo thật được lấy qua cổng 7002.
  * Bấm nút **"Kê Đơn Lời Khuyên (RabbitMQ)"** để hoàn tất buổi khám và phát sự kiện sang Notification Service.
- Mở Mailpit tại `http://localhost:8025` để kiểm chứng email thông báo được gửi thành công.
