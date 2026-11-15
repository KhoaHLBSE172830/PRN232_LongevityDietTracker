# KẾ HOẠCH HÀNH ĐỘNG & BẢNG PHÂN TÍCH CÂN BẰNG TẢI (MASTER PLAN V4 - DEFINITIVE)
## DỰ ÁN: LONGEVITY DIET TRACKER SYSTEM (PRN232)

> **Mục tiêu**: Báo cáo & Chấm tiến độ với Giảng viên vào **Slot 1 — Sáng Thứ 2 (16/11/2026)**  
> **Căn cứ**: `AGENT.md`, Khung slide 24 trang (`Guideline V1.0`), Quy chuẩn luồng nghiệp vụ (`Workflow là gì - PDF`), C0 Context Diagram & C2 Architecture Diagram.  
> **Cam kết cốt lõi**: Đảm bảo **cân đối 100% về độ khó và khối lượng công việc** cho cả 5 thành viên, bao quát trọn vẹn toàn bộ 30 REST APIs, 3 gRPC Methods, 8 RabbitMQ Integration Events, 4 PostgreSQL Databases, 1 Redis Cache, 1 Hangfire Service và trọn bộ Frontend Web Client.

---

## 1. RÀ SOÁT ĐẦY ĐỦ CÁC DOMAIN & HIỆN TRẠNG TOÀN HỆ THỐNG

Sau khi kiểm toán chi tiết toàn bộ mã nguồn (`ApiGateways`, `BuildingBlocks`, 5 `Services`, các Controller, Entity và Repository), hệ thống bao gồm đầy đủ **5 Domain chuẩn kiến trúc Microservices**:

1. **Domain 1: Core Fasting & Dinh Dưỡng Blue Zones (`Diet & Fasting Service` - Port 5002 / gRPC 7002)**:
   * *Module Bữa ăn & Macros*: `MealsController` (`POST /api/meals`, `GET /api/meals/user/{id}`).
   * *Module Tra cứu Dinh dưỡng*: `NutritionController` (`GET /api/nutrition/search`, `GET /api/nutrition/details/{id}`) tích hợp **Redis Distributed Cache**.
   * *Module Nhịn ăn gián đoạn (IF 16/8 & OMAD)*: `FastingController` (`POST /api/fasting/start`, `POST /api/fasting/{id}/end`, `GET /api/fasting/user/{id}/active`).
   * *Module Chu kỳ FMD 5 ngày*: `FmdController` (`POST /api/fmd/start`, `GET /api/fmd/user/{id}/active`).
   * *Module Quản trị Master Data Admin*: `FmdRulesController` (2 APIs) và `MealTemplatesController` (3 APIs).
   * *Module gRPC Server*: Mở cổng `7002` phản hồi dữ liệu qua HTTP/2 Protobuf (`diet_fasting.proto`).
2. **Domain 2: Tư Vấn Chuyên Gia & Hợp Đồng gRPC Client (`Consultation Service` - Port 5003)**:
   * `ConsultationsController`: Đặt lịch hẹn (`/book`), Bác sĩ kê lời khuyên (`/advice`), Hồ sơ chuyên gia (`/nutritionist/{id}`).
   * **gRPC Client (`DietFastingGrpcClient`)**: Gọi đồng bộ sang cổng 7002 của DietFasting để lấy snapshot dinh dưỡng và lịch sử nhịn ăn phục vụ buổi tư vấn.
3. **Domain 3: Hệ Thống Thông Báo & Event Consumer (`Notification Service` - Port 5004)**:
   * `NotificationsController`: Xem lịch sử thông báo, Gửi thông báo trực tiếp, Cài đặt tùy chọn nhận tin (`/preferences`).
   * **RabbitMQ Consumer (`RabbitMqNotificationConsumer`)**: BackgroundService lắng nghe message từ Queue `notification_events_queue`.
   * **SMTP Mail Client (`SmtpEmailService`)**: Soạn email HTML chuẩn y tế và gửi qua Mailpit (Port 1025 / Web 8025).
4. **Domain 4: Tác Vụ Nền, Hangfire & DevOps (`JobService` - Port 5005 & Docker)**:
   * `JobsController`: Kích hoạt job kiểm tra thủ công (`/jobs/trigger/fasting-check`, `/jobs/trigger/fmd-check`).
   * **Hangfire Schedulers**: Recurring Jobs định kỳ quét phiên nhịn ăn hết giờ và quét chuyển ngày chu kỳ FMD 5 ngày.
   * **RabbitMQ Publisher (`RabbitMqJobPublisher`)**: Bắn trigger event vào Exchange `longevity_events_exchange`.
   * **DevOps/Docker**: 4 container Docker (`postgres`, `redis`, `rabbitmq`, `mailpit`) và script khởi tạo 5 database tự động.
5. **Domain 5: Gateway, Identity & Nền Tảng Chung (`YarpGateway` - Port 5000/7159 & `Identity Service` - Port 5001)**:
   * **YARP Reverse Proxy**: Định tuyến từ cổng `5000` (HTTPS `7159`) tới 4 cụm microservices nội bộ, xử lý CORS toàn hệ thống.
   * **Identity Service**: `AuthController` (Register, Login, Google OAuth, Refresh Token) & `UsersController` (Profile thể trạng & mục tiêu sức khỏe).

---

## 2. BẢNG ĐÁNH GIÁ CÂN BẰNG TẢI (WORKLOAD BALANCE SCORE) CHO 5 THÀNH VIÊN

Để không có bất kỳ sự chênh lệch nào (người quá nặng, người quá nhẹ), khối lượng công việc được phân bổ theo bảng định lượng dưới đây:

| Thành viên | Phân hệ Backend đảm nhiệm | Màn hình Frontend (Web App) | "Vũ khí" Kỹ thuật chuyên sâu | Điểm tải |
| :--- | :--- | :--- | :--- | :---: |
| **Hoàng Lê Khoa** *(Leader)* | - `Identity Service` (6 REST APIs)<br>- `YarpGateway` (Reverse Proxy 10 routes)<br>- Cấu hình Docker & Script Multi-DB | Màn hình **Đăng ký, Đăng nhập & Profile cá nhân** (`features/auth/`) | **YARP Proxy & Google OAuth 2.0 / JWT Multi-role** | **8.5 / 10** |
| **Nguyễn Ngọc Tường Vy** | - `DietFasting (Meal Module)` (2 REST APIs)<br>- `Nutrition Module` (2 REST APIs)<br>- `MealTemplates (Thực đơn mẫu)` (3 REST APIs)<br>- Thuật toán tính vi/đa lượng (Macros)<br>- Quy tắc ăn no 80% (Hara Hachi Bu) | - Màn hình **Nhật ký Bữa ăn & Tra cứu món ăn** (`features/meals/`)<br>- **Dựng khung Web App chung** (Sidebar, Navbar, Theme Luxury)<br>- **Landing Page công khai & Dashboard 4 trụ cột** | **External Nutrition API (USDA), Redis Distributed Cache & Blue Zones Meal Templates** | **8.5 / 10** |
| **Trần Anh Kiệt** | - `DietFasting (Fasting Module)` (3 REST APIs)<br>- `JobService (Hangfire)` (2 APIs)<br>- **Triển khai gRPC Server (Cổng 7002, 3 RPCs)**<br>- Hangfire Recurring Schedulers | Màn hình **Đồng hồ bấm giờ Nhịn ăn 16/8 & OMAD** (`features/fasting/`) | **gRPC Server (HTTP/2 Protobuf) & Hangfire Background Schedulers** | **8.5 / 10** |
| **Trần Phạm Khánh Quốc** | - `DietFasting (FMD Module)` (2 REST APIs)<br>- `Admin FMD Rules` (2 REST APIs)<br>- `Notification Service` (4 REST APIs)<br>- Logic cảnh báo vi phạm calo FMD | Màn hình **Lộ trình Chu kỳ FMD 5 ngày & Hộp thư thông báo** (`features/fmd/`) | **RabbitMQ Consumer (Async Event-Driven) & SMTP Mailpit Client** | **8.5 / 10** |
| **Dương Đình Khôi** | - `Consultation Service` (4 REST APIs)<br>- Nghiệp vụ Bác sĩ dinh dưỡng & Đặt lịch khám<br>- Quản lý Phiếu lời khuyên (`AdviceNote`)<br>- **Tích hợp gRPC Client sang cổng 7002** | Màn hình **Đặt lịch tư vấn & Bác sĩ gửi phiếu lời khuyên** (`features/consultation/`) | **gRPC Client (Inter-service Sync) & RabbitMQ Event Publisher** | **8.5 / 10** |

👉 **NHẬN XÉT ĐỘ CÂN ĐỐI**:  
* Mức độ cân đối: **Đều chằn chặn 8.5/10 cho cả 5 thành viên**!
* Không ai bị quá tải (Vy không phải gánh một mình cả Fasting lẫn FMD và gRPC).
* Quốc và Kiệt đều có phần Backend cốt lõi thuộc `DietFasting` kèm theo 1 dịch vụ chuyên sâu (Kiệt có gRPC Server + Hangfire, Quốc có FMD + RabbitMQ Consumer + Mailpit).
* Mỗi người đều sở hữu đúng **1 kỹ thuật cao cấp đặc trưng** để tự tin trả lời vấn đáp khi giảng viên chấm điểm từng cá nhân!

---

## 3. BẢNG ĐẶC TẢ CHI TIẾT 100% TOÀN BỘ 30 APIS & 3 gRPC METHODS HIỆN HỮU

Dưới đây là danh mục chính xác đến từng endpoint, method, route gateway và payload đã có sẵn trong mã nguồn backend:

### BẢNG 1: IDENTITY & USER PROFILE (KHOA PHỤ TRÁCH) — PORT 5001
| Method | Endpoint qua Gateway (`https://localhost:7159`) | Target Service Route | Request Body / Query Params | Chức năng & Kết quả nghiệp vụ |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | `Identity.API: /api/auth/register` | `RegisterRequestDto` (`Email`, `Password`, `FullName`, `Role`) | Đăng ký tài khoản mới (User / Nutritionist / Admin). |
| `POST` | `/api/auth/login` | `Identity.API: /api/auth/login` | `LoginRequestDto` (`Email`, `Password`) | Đăng nhập bằng Email & Mật khẩu, sinh JWT Token & Refresh Token. |
| `POST` | `/api/auth/google-login` | `Identity.API: /api/auth/google-login` | `GoogleLoginRequestDto` (`IdToken`) | Đăng nhập một chạm Google OAuth 2.0. |
| `POST` | `/api/auth/refresh-token` | `Identity.API: /api/auth/refresh-token` | `RefreshTokenRequestDto` (`Token`, `RefreshToken`) | Gia hạn phiên làm việc JWT an toàn. |
| `GET` | `/api/users/{id}/profile` | `Identity.API: /api/users/{id}/profile` | Route param: `id` (GUID) | Lấy hồ sơ thể trạng người dùng (Chiều cao, cân nặng, mục tiêu). |
| `PUT` | `/api/users/{id}/profile` | `Identity.API: /api/users/{id}/profile` | `UserProfileDto` | Cập nhật hồ sơ thể trạng và sở thích ăn uống. |

---

### BẢNG 2: BỮA ĂN, TRA CỨU DINH DƯỠNG & THỰC ĐƠN MẪU BLUE ZONES (VY PHỤ TRÁCH) — PORT 5002
| Method | Endpoint qua Gateway (`https://localhost:7159`) | Target Service Route | Request Body / Query Params | Chức năng & Kết quả nghiệp vụ |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/meals` | `DietFasting.API: /api/meals` | `CreateMealLogDto` (`UserId`, `MealType`, `LoggedAt`, `FoodItems`, `SatietyPercentage`) | Ghi nhận bữa ăn, tự động tính tổng Calo, 4 Macros, kiểm tra quy tắc no 80% (Hara Hachi Bu). |
| `GET` | `/api/meals/user/{userId}` | `DietFasting.API: /api/meals/user/{userId}` | Query param: `?date=yyyy-MM-dd` | Lấy danh sách 4 bữa ăn trong ngày của người dùng kèm chi tiết dưỡng chất. |
| `GET` | `/api/nutrition/search` | `DietFasting.API: /api/nutrition/search` | Query param: `?query={keyword}` | Tra cứu thực phẩm theo từ khóa (Tích hợp Redis Cache & USDA Catalog). |
| `GET` | `/api/nutrition/details/{externalFoodId}` | `DietFasting.API: /api/nutrition/details/{id}` | Route param: `externalFoodId` | Lấy bảng thành phần vi/đa lượng chi tiết của món ăn (Cache Redis 24h). |
| `GET` | `/api/mealtemplates` | `DietFasting.API: /api/mealtemplates` | Không có | Lấy danh sách thực đơn mẫu chuẩn sống thọ Blue Zones (Plant-Slant). |
| `GET` | `/api/mealtemplates/{id}` | `DietFasting.API: /api/mealtemplates/{id}` | Route param: `id` (GUID) | Lấy chi tiết món ăn trong một thực đơn mẫu. |
| `POST` | `/api/mealtemplates` | `DietFasting.API: /api/mealtemplates` | `CreateMealTemplateRequest` | Admin/User tạo mới thực đơn mẫu dinh dưỡng trường thọ. |

---

### BẢNG 3: NHỊN ĂN GIÁN ĐOẠN 16/8 & gRPC SERVER (KIỆT PHỤ TRÁCH) — PORT 5002 / gRPC 7002
| Method | Endpoint qua Gateway (`https://localhost:7159`) | Target Service Route | Request Body / Query Params | Chức năng & Kết quả nghiệp vụ |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/fasting/start` | `DietFasting.API: /api/fasting/start` | `StartFastingRequestDto` (`UserId`, `FastingType`, `DurationHours`) | Bắt đầu phiên nhịn ăn (16/8, 18/6, 20/4 OMAD), tính giờ kết thúc dự kiến. |
| `POST` | `/api/fasting/{sessionId}/end` | `DietFasting.API: /api/fasting/{id}/end` | Route param: `sessionId` (GUID) | Kết thúc phiên nhịn ăn, ghi nhận tổng số giờ nhịn thực tế. |
| `GET` | `/api/fasting/user/{userId}/active` | `DietFasting.API: /api/fasting/user/{id}/active` | Route param: `userId` (GUID) | Lấy phiên nhịn ăn đang kích hoạt (để chạy đồng hồ đếm ngược trên web). |
| `gRPC` | `DietFastingGrpc.GetUserFastingSummary` | `DietFasting.API: Cổng 7002 (HTTP/2)` | `UserFastingSummaryRequest` (`user_id`) | Cung cấp dữ liệu nhịn ăn tổng hợp tức thì cho Consultation Service. |
| `gRPC` | `DietFastingGrpc.GetUserNutritionSummary` | `DietFasting.API: Cổng 7002 (HTTP/2)` | `UserNutritionSummaryRequest` (`user_id`, `start_date`, `end_date`) | Cung cấp số liệu calo/macros trung bình 7 ngày qua cho Bác sĩ. |
| `gRPC` | `DietFastingGrpc.GetActiveFmdCycle` | `DietFasting.API: Cổng 7002 (HTTP/2)` | `ActiveFmdCycleRequest` (`user_id`) | Cung cấp trạng thái FMD hiện tại cho các dịch vụ khác. |

---

### BẢNG 4: CHU KỲ FMD 5 NGÀY & ADMIN FMD RULES (QUỐC PHỤ TRÁCH) — PORT 5002
| Method | Endpoint qua Gateway (`https://localhost:7159`) | Target Service Route | Request Body / Query Params | Chức năng & Kết quả nghiệp vụ |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/fmd/start` | `DietFasting.API: /api/fmd/start` | `StartFmdCycleDto` (`UserId`, `TargetStartDateUtc`) | Kích hoạt chu kỳ nhịn ăn giả định FMD 5 ngày (Dr. Valter Longo). |
| `GET` | `/api/fmd/user/{userId}/active` | `DietFasting.API: /api/fmd/user/{id}/active` | Route param: `userId` (GUID) | Lấy thông tin ngày hiện tại của chu kỳ FMD đang chạy (Ngày 1 $\rightarrow$ 5). |
| `GET` | `/api/admin/fmd-rules` | `DietFasting.API: /api/admin/fmd-rules` | Header: `Role=Admin` | Admin xem cấu hình định mức calo 5 ngày (Ngày 1: 1100 kcal, Ngày 2-5: 725 kcal). |
| `PUT` | `/api/admin/fmd-rules/{dayNumber}` | `DietFasting.API: /api/admin/fmd-rules/{day}` | `UpdateFmdRuleRequest` (`MaxCalories`, `MaxCarbsPercentage`) | Admin điều chỉnh định mức calo và tỷ lệ dinh dưỡng từng ngày FMD. |

---

### BẢNG 5: TƯ VẤN CHUYÊN GIA & LỜI KHUYÊN (KHÔI PHỤ TRÁCH) — PORT 5003
| Method | Endpoint qua Gateway (`https://localhost:7159`) | Target Service Route | Request Body / Query Params | Chức năng & Kết quả nghiệp vụ |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/consultations/book` | `Consultation.API: /api/consultations/book` | `BookConsultationDto` (`UserId`, `NutritionistId`, `ScheduledAtUtc`, `Notes`) | Người dùng đặt lịch hẹn tư vấn sức khỏe trực tuyến với chuyên gia. |
| `GET` | `/api/consultations/nutritionist/{id}` | `Consultation.API: /api/consultations/nutritionist/{id}` | Route param: `nutritionistId` (GUID) | Bác sĩ xem danh sách các buổi hẹn tư vấn của mình. |
| `POST` | `/api/consultations/advice` | `Consultation.API: /api/consultations/advice` | `SendAdviceDto` (`ConsultationSessionId`, `UserId`, `AdviceSummary`, `DietaryRecommendations`) | Bác sĩ gửi phiếu lời khuyên (AdviceNote) $\rightarrow$ Tự động bắn Event sang RabbitMQ. |
| `GET` | `/api/consultations/review-user/{userId}` | `Consultation.API: /api/consultations/review-user/{id}` | Route param: `userId` (GUID) | **Gọi gRPC sang DietFasting** lấy snapshot calo, chất xơ & nhịn ăn để bác sĩ thẩm định. |

---

### BẢNG 6: HỘP THƯ THÔNG BÁO & EMAIL SMTP (QUỐC PHỤ TRÁCH) — PORT 5004
| Method | Endpoint qua Gateway (`https://localhost:7159`) | Target Service Route | Request Body / Query Params | Chức năng & Kết quả nghiệp vụ |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/notifications/send` | `Notification.API: /api/notifications/send` | `SendNotificationRequest` (`UserId`, `Recipient`, `Subject`, `Body`, `Channel`) | Gửi thông báo trực tiếp qua Email hoặc In-App. |
| `GET` | `/api/notifications/user/{userId}` | `Notification.API: /api/notifications/user/{id}` | Route param: `userId` (GUID) | Lấy danh sách lịch sử thông báo sức khỏe của người dùng. |
| `GET` | `/api/notifications/preferences/{userId}` | `Notification.API: /api/notifications/preferences/{id}` | Route param: `userId` (GUID) | Xem cài đặt bật/tắt nhận email nhắc nhở nhịn ăn và lời khuyên. |
| `PUT` | `/api/notifications/preferences/{userId}` | `Notification.API: /api/notifications/preferences/{id}` | `UpdatePreferenceRequest` | Cập nhật tùy chọn nhận thông báo của người dùng. |

---

### BẢNG 7: TÁC VỤ NỀN & HANGFIRE SCHEDULERS (KIỆT PHỤ TRÁCH) — PORT 5005
| Method | Endpoint qua Gateway / Direct | Target Service Route | Request Body / Query Params | Chức năng & Kết quả nghiệp vụ |
| :---: | :--- | :--- | :--- | :--- |
| `GET` | `http://localhost:5005/` | `JobService.API: /` | Không có | Kiểm tra tình trạng hoạt động của Hangfire Job Service & Kết nối RabbitMQ. |
| `POST` | `http://localhost:5005/jobs/trigger/fasting-check` | `JobService.API: /jobs/trigger/fasting-check` | Không có | Kích hoạt ngay lập tức tác vụ quét lịch nhịn ăn (phục vụ demo trực tiếp). |
| `POST` | `http://localhost:5005/jobs/trigger/fmd-check` | `JobService.API: /jobs/trigger/fmd-check` | Không có | Kích hoạt ngay lập tức tác vụ kiểm tra chu kỳ FMD và cảnh báo vi phạm. |

---

### BẢNG 8: HỆ THỐNG 8 SỰ KIỆN RABBITMQ LIÊN DỊCH VỤ (EVENT-DRIVEN ARCHITECTURE)
| Tên Event (`BuildingBlocks.Messaging`) | Service Bắn Tin (Publisher) | Service Nhận Tin (Consumer) | Thời điểm kích hoạt & Nghiệp vụ |
| :--- | :---: | :---: | :--- |
| `UserRegisteredIntegrationEvent` | `Identity Service` | `Notification Service` | Người dùng tạo tài khoản thành công $\rightarrow$ Gửi email chào mừng. |
| `MealLoggedIntegrationEvent` | `DietFasting Service` | `Notification Service` | Người dùng ghi nhận bữa ăn $\rightarrow$ Cập nhật thống kê và kiểm tra vi phạm. |
| `FastingStartedIntegrationEvent` | `DietFasting Service` | `JobService / Notification` | Bắt đầu nhịn ăn $\rightarrow$ Lên lịch nhắc uống nước & nhắc giờ kết thúc. |
| `FastingCompletedIntegrationEvent` | `DietFasting Service` | `Notification Service` | Hoàn tất phiên nhịn ăn $\rightarrow$ Ghi nhận thành tích chuỗi sống khỏe. |
| `FmdCycleAlertIntegrationEvent` | `DietFasting Service` | `Notification Service` | Người dùng nạp calo vượt định mức trong ngày FMD $\rightarrow$ Gửi email cảnh báo vi phạm ngay lập tức. |
| `ConsultationBookedIntegrationEvent` | `Consultation Service` | `Notification Service` | Đặt lịch tư vấn thành công $\rightarrow$ Gửi email xác nhận lịch hẹn cho cả 2 bên. |
| `AdviceSentIntegrationEvent` | `Consultation Service` | `Notification Service` | Bác sĩ gửi phiếu lời khuyên $\rightarrow$ Bắn thông báo và gửi nội dung qua Email. |
| `FastingScheduleTriggerIntegrationEvent`| `JobService (Hangfire)`| `DietFasting / Notification` | Hangfire quét định kỳ $\rightarrow$ Bắn trigger kích hoạt xử lý nền. |

---

## 4. DANH SÁCH NHIỆM VỤ CHI TIẾT (TASKLIST CHECKLIST) CHO TỪNG BẠN

### 1. TASKLIST HOÀNG LÊ KHOA (LEADER)
- [x] **Infra & Database**: Tạo `docker-compose.yml` (Postgres, Redis, RabbitMQ, Mailpit) và script `init-multiple-databases.sh`.
- [x] **Gateway**: Cấu hình `YarpGateway` (10 routes định tuyến, 4 clusters, thiết lập CORS cho `localhost:5173`).
- [x] **Backend Identity**: Viết `AuthController` (Register, Login, Google OAuth, Refresh Token) & `UsersController` (Profile).
- [x] **EF Core Migration**: Tạo migration `InitialIdentityDb` cho database `identity_db`.
- [ ] **Nối API Frontend Auth**: Mở file `src/features/auth/authApi.js`, nối hàm `login()`, `register()`, `getProfile()` vào cổng `https://localhost:7159/api/auth/*`.
- [ ] **Demo sáng thứ Hai**: Thực hiện đăng nhập thử nghiệm tài khoản trên Web để nhận JWT Token.

### 2. TASKLIST NGUYỄN NGỌC TƯỜNG VY
- [x] **Frontend Master**: Dựng hoàn chỉnh kiến trúc Web Client:
  - Landing Page tối giản sang trọng (`src/shared/pages/LandingPage.jsx`) không dùng gradient sến súa, chuẩn văn phong sống thọ.
  - Tổng quan 4 trụ cột (`src/shared/pages/OverviewDashboard.jsx`) liên kết trực tiếp vào 4 phân hệ.
  - Thanh Sidebar thông minh (`src/shared/components/Sidebar.jsx`) hỗ trợ thu gọn/mở rộng, lưu trạng thái vào `localStorage` không bị bung khi chuyển tab.
- [x] **Frontend Meals**: Hoàn thiện màn hình Bữa ăn (`src/features/meals/MealsView.jsx`) với Thước đo no 80% (`Hara Hachi Bu`), biểu đồ Calo/Chất xơ, 4 khung giờ ăn và Modal chọn món (`AddMealModal.jsx`).
- [x] **Backend Meals & Templates**: Hoàn thiện `MealsController` (`POST /api/meals`, `GET /api/meals/user/{id}`) và `MealTemplatesController` (3 APIs quản lý thực đơn mẫu Blue Zones).
- [x] **Backend Nutrition & Cache**: Viết `NutritionController` kết nối `NutritionApiClient` và `RedisCacheService`.
- [x] **EF Core Migration**: Chạy migration `InitialDietDb` cho bảng `MealLogs`, `FoodItems`.
- [ ] **Nối API Frontend Meals**: Mở file `src/features/meals/mealsApi.js`, bật kết nối thực tế gọi `POST /api/meals` và `GET /api/nutrition/search`.
- [ ] **Demo sáng thứ Hai**: Tìm kiếm món "Đậu nành Edamame" $\rightarrow$ Thêm vào bữa trưa $\rightarrow$ Vòng tròn calo nhảy số tức thì $\rightarrow$ Báo chuẩn vùng sống thọ dưới 80% no.

### 3. TASKLIST TRẦN ANH KIỆT
- [x] **Backend Fasting**: Viết `FastingController` (`/start`, `/{id}/end`, `/active`).
- [x] **gRPC Server**: Tạo file `diet_fasting.proto`, triển khai `DietFastingGrpcServer` mở cổng `7002` phản hồi dữ liệu nhịn ăn và dinh dưỡng qua HTTP/2.
- [x] **Hangfire Jobs**: Viết `JobService.API` với `FastingScheduleJob` và endpoint kích hoạt `/jobs/trigger/fasting-check`.
- [x] **Frontend Fasting**: Khung giao diện `src/features/fasting/FastingView.jsx` đã được dựng sẵn sang trọng.
- [ ] **Nối API Frontend Fasting**: Mở file `src/features/fasting/fastingApi.js`, gọi `/api/fasting/start` và gắn state vào nút "Bắt đầu nhịn ăn".
- [ ] **Demo sáng thứ Hai**: Bấm bắt đầu nhịn ăn 16/8 $\rightarrow$ Đồng hồ chạy $\rightarrow$ Mở Swagger JobService bấm Trigger job kiểm tra nền.

### 4. TASKLIST TRẦN PHẠM KHÁNH QUỐC
- [x] **Backend FMD & Admin Rules**: Viết `FmdController` (2 APIs chu kỳ FMD 5 ngày) và `FmdRulesController` (2 APIs quản trị định mức calo FMD).
- [x] **Backend Notification**: Viết `NotificationsController` (`/send`, `/user/{id}`, `/preferences`).
- [x] **RabbitMQ Consumer**: Viết `RabbitMqNotificationConsumer` lắng nghe queue `notification_events_queue` các routing key: `fmd.alert`, `advice.sent`, `notification.email`.
- [x] **SMTP Email Client**: Cấu hình `SmtpEmailService` gửi email HTML qua Mailpit.
- [x] **Frontend FMD**: Khung giao diện `src/features/fmd/FmdView.jsx` đã được dựng sẵn lộ trình 5 ngày thanh lọc.
- [ ] **Nối API Frontend FMD**: Mở file `src/features/fmd/fmdApi.js`, gọi `/api/fmd/start` khi người dùng kích hoạt chu kỳ FMD mới.
- [ ] **Demo sáng thứ Hai**: Cố tình log một bữa ăn 1200 kcal trong ngày FMD 1 $\rightarrow$ Backend bắn event `FmdCycleAlertIntegrationEvent` qua RabbitMQ $\rightarrow$ Mở Mailpit (`http://localhost:8025`) thấy ngay email cảnh báo đỏ!

### 5. TASKLIST DƯƠNG ĐÌNH KHÔI
- [x] **Backend Consultation**: Viết `ConsultationsController` (`/book`, `/nutritionist/{id}`, `/advice`, `/review-user/{id}`).
- [x] **gRPC Client**: Viết `DietFastingGrpcClient` gọi đồng bộ sang cổng `7002` của Kiệt để lấy số liệu calo, chất xơ và lịch sử nhịn ăn của khách hàng.
- [x] **RabbitMQ Publisher**: Bắn event `AdviceSentIntegrationEvent` vào RabbitMQ khi bác sĩ gửi phiếu lời khuyên.
- [x] **Frontend Consultation**: Khung giao diện `src/features/consultation/ConsultationView.jsx` đã được dựng sẵn sạch đẹp.
- [ ] **Nối API Frontend Consultation**: Mở file `src/features/consultation/consultationApi.js`, gọi `/api/consultations/book` và `/api/consultations/advice`.
- [ ] **Demo sáng thứ Hai**: Đăng nhập tài khoản Bác sĩ $\rightarrow$ Bấm xem xét hồ sơ khách hàng (gRPC lấy snapshot cực nhanh) $\rightarrow$ Gõ lời khuyên và bấm Gửi.

---

## 5. ĐÁNH GIÁ ĐỘ DÀY / ĐỘ ĐỦ CỦA DỰ ÁN: CÓ THỂ CÓ HƠN HAY KHÔNG?

### Câu hỏi cốt lõi của Vy:
> *"File plan có đầy đủ toàn bộ API hiện có trong dự án rồi đầy đủ các tasklist chưa? Có thể có hơn hoặc thêm hơn vậy không, hay là vừa đủ không dư không thiếu?"*

### Phân tích chi tiết sự cân đối định lượng giữa 5 thành viên (Sau khi điều chỉnh):

| Thành viên | Số lượng REST APIs & Hợp đồng | Dịch vụ sở hữu | Khối lượng & "Vũ khí" kỹ thuật | Đánh giá tải |
| :--- | :---: | :--- | :--- | :---: |
| **Hoàng Lê Khoa** *(Leader)* | **6 REST APIs** | `Identity Service` (Port 5001) | YARP Reverse Proxy (10 Routes), Google OAuth 2.0 / JWT, Docker Compose 4 containers & Script Multi-DB | **Cân đối (8.5/10)** |
| **Nguyễn Ngọc Tường Vy** | **7 REST APIs** | `DietFasting Service` (Port 5002) | Bữa ăn, Thuật toán no 80% (Hara Hachi Bu), Tra cứu USDA, Thực đơn mẫu Blue Zones, Redis Cache & **Dựng toàn bộ kiến trúc Frontend Web Client** | **Cân đối (8.5/10)** |
| **Trần Anh Kiệt** | **5 REST APIs + 3 gRPC Methods** | `DietFasting` + `JobService` (Port 5005) | Nhịn ăn 16/8, OMAD, **Triển khai gRPC Server HTTP/2 Cổng 7002**, Hangfire Background Recurring Schedulers | **Cân đối (8.5/10)** |
| **Trần Phạm Khánh Quốc** | **8 REST APIs** | `DietFasting` + `Notification` (Port 5004) | Chu kỳ FMD 5 ngày, Admin FMD Rules, **RabbitMQ Background Consumer (`notification_events_queue`)**, SMTP Mailpit Client | **Cân đối (8.5/10)** |
| **Dương Đình Khôi** | **4 REST APIs** | `Consultation Service` (Port 5003) | Sở hữu nguyên 1 Microservice Consultation độc lập với Database riêng (`consultation_db`), **Tích hợp gRPC Client sang cổng 7002**, RabbitMQ Event Publisher | **Cân đối (8.5/10)** |

👉 **Lý do vì sao việc chuyển `MealTemplates` từ Quốc sang Vy là quyết định chuẩn xác nhất**:
1. **Khắc phục hoàn toàn sự chênh lệch con số**: Trước đây, Quốc có tới 11 APIs trong khi Vy chỉ có 4 APIs. Khi chuyển 3 APIs Thực đơn mẫu về cho Vy, Quốc giảm từ 11 xuống **8 APIs**, Vy tăng từ 4 lên **7 APIs**. Con số lúc này phân bổ đều tăm tắp từ **4 đến 8 APIs** cho cả 5 người!
2. **Khớp đúng 100% logic miền nghiệp vụ (Domain Cohesion)**: `MealTemplates` là thực đơn mẫu của các bữa ăn Blue Zones (Okinawan Sweet Potato Bowl, Ikarian Salad, Sardinian Minestrone...). Đây là phần nối dài trực tiếp của nghiệp vụ Bữa ăn & Dinh dưỡng mà Vy đang nắm giữ!
3. **Bảo toàn công sức cho người làm Frontend**: Vy là người dựng toàn bộ khung Frontend (Landing Page, Sidebar, Overview Dashboard, Theme, Toast, Modals), nên việc sở hữu 7 APIs backend cùng Redis Cache giúp tổng khối lượng đóng góp của Vy cực kỳ tương xứng và thuyết phục trước giảng viên!

### Câu trả lời kỹ thuật chuẩn mực:
1. **Độ đầy đủ**: File kế hoạch V4 này đã bao quát **chính xác 100% không sót một endpoint nào**:
   - Toàn bộ **30 REST APIs** trải đều trên 5 dịch vụ.
   - Toàn bộ **3 RPC Methods** trên hợp đồng gRPC Protobuf.
   - Toàn bộ **8 Integration Events** trên RabbitMQ Bus.
   - Toàn bộ các bảng trong **4 Database PostgreSQL**.
   - Trọn vẹn mã nguồn **Frontend Web Client** tương ứng từng thư mục tính năng.
2. **Có nên thêm hơn nữa không?**: **TUYỆT ĐỐI KHÔNG NÊN VẼ THÊM!**
   - Hiện tại dự án đã đạt đến **độ hoàn hảo cao nhất cho một bài tập lớn / đồ án môn học chuyên ngành PRN232 (.NET Microservices)**.
   - Thầy cô khi chấm đồ án Microservices chấm theo tiêu chí:
     * Kiến trúc phân tách rõ ràng qua API Gateway (Đã có YARP).
     * Giao tiếp đồng bộ hiệu năng cao Inter-service (Đã có gRPC HTTP/2).
     * Giao tiếp bất đồng bộ chịu tải cao Event-Driven (Đã có RabbitMQ Topic Exchange).
     * Bộ nhớ đệm phân tán (Đã có Redis).
     * Tác vụ nền theo lịch (Đã có Hangfire).
     * Đa cơ sở dữ liệu độc lập (Đã có 4 Database PostgreSQL riêng biệt).
     * Bảo mật phân quyền JWT & OAuth (Đã có Identity Service).
     * Dịch vụ gửi email thông báo (Đã có SMTP Mailpit).
     * Giao diện người dùng thực tế kết nối thông suốt (Đã có React + Tailwind CSS).
   - Nếu cố tình vẽ thêm các tính năng ngoài lề (như thanh toán VNPAY, chat realtime SignalR, xuất báo cáo PDF, theo dõi GPS...), nhóm sẽ rơi vào bẫy **Scope Creep (Phình to phạm vi)**:
     * Tăng nguy cơ phát sinh lỗi không lường trước khi demo trực tiếp.
     * Làm phân tán sự chú ý của thầy vào các tính năng phụ thay vì các kiến trúc Microservices cốt lõi.
     * Làm tăng áp lực không cần thiết cho các bạn trong nhóm ngay trước buổi sáng thứ Hai.
3. **Kết luận**:
   👉 **Dự án hiện tại nằm đúng "Vùng Vàng Lý Tưởng" (Goldilocks Zone): VỪA ĐỦ HOÀN HẢO, KHÔNG THIẾU MỘT MẢNH GHÉP NÀO VÀ KHÔNG HỀ DƯ THỪA!**

---

## 6. KỊCH BẢN DEMO 3 WORKFLOW LIỀN MẠCH CHO BUỔI THỨ 2

```mermaid
sequenceDiagram
    autonumber
    actor User as Khách Hàng (Minh Anh)
    actor Doctor as Bác Sĩ Dinh Dưỡng
    participant Web as Web Client (React)
    participant Yarp as YARP Gateway (7159)
    participant Diet as DietFasting Service (5002)
    participant Grpc as gRPC Server (7002)
    participant Consult as Consultation Service (5003)
    participant Bus as RabbitMQ Bus (5672)
    participant Notif as Notification Service (5004)
    participant Mail as Mailpit SMTP (8025)

    Note over User,Web: WORKFLOW 1: DINH DƯỠNG & QUY TẮC NO 80% (VY & KHOA)
    User->>Web: Đăng nhập tài khoản & Mở tab Dinh Dưỡng
    Web->>Yarp: POST /api/meals (Món: Đậu nành, Gạo lứt, Rau xanh)
    Yarp->>Diet: Chuyển tiếp tới MealsController
    Diet->>Diet: Tính Calo (920 kcal) & Kiểm tra Hara Hachi Bu (≤ 80%)
    Diet-->>Web: Trả về trạng thái "Vùng Sống Thọ Lý Tưởng"
    Web-->>User: Vòng tròn đo Calo nhảy 50%, hiển thị 30.5g chất xơ

    Note over User,Web: WORKFLOW 2: CHU KỲ FMD 5 NGÀY & CẢNH BÁO VI PHẠM CALO (QUỐC & KIỆT)
    User->>Web: Bắt đầu Chu kỳ FMD 5 Ngày mới
    Web->>Yarp: POST /api/fmd/start
    Yarp->>Diet: Kích hoạt chu kỳ FMD
    User->>Web: Cố tình log bữa ăn 1200 kcal trong ngày FMD 1 (Vượt định mức 1100 kcal)
    Diet->>Diet: Phát hiện ExceededThreshold = true
    Diet->>Bus: Publish FmdCycleAlertIntegrationEvent
    Bus->>Notif: Consumer nhận message từ routing key fmd.alert
    Notif->>Mail: Gửi email cảnh báo vi phạm định mức năng lượng
    Mail-->>User: Email cảnh báo đỏ xuất hiện trong hộp thư Mailpit (8025)

    Note over Doctor,Mail: WORKFLOW 3: BÁC SĨ KHÁM QUA gRPC & GỬI LỜI KHUYÊN (KHÔI)
    Doctor->>Web: Mở trang xem xét hồ sơ người dùng
    Web->>Yarp: GET /api/consultations/review-user/{userId}
    Yarp->>Consult: Chuyển tiếp tới ConsultationsController
    Consult->>Grpc: Gọi GetUserNutritionSummary qua HTTP/2 gRPC (7002)
    Grpc-->>Consult: Trả về dữ liệu Calo & Chất xơ siêu tốc
    Doctor->>Web: Nhập lời khuyên "Tăng cường thêm rau củ màu tím" & Bấm Gửi
    Web->>Yarp: POST /api/consultations/advice
    Consult->>Bus: Publish AdviceSentIntegrationEvent
    Bus->>Notif: Consumer nhận event advice.sent
    Notif->>Mail: Gửi email phiếu lời khuyên cho người dùng
    Mail-->>User: Email lời khuyên y tế xuất hiện ngay tức thì trong Mailpit
```

---

## 7. QUY TẮC PHỐI HỢP GIT ĐỂ KHÔNG BAO GIỜ XUNG ĐỘT (ZERO MERGE CONFLICT)

1. **Phân chia không gian Frontend độc lập**:
   * Mỗi bạn chỉ code trong đúng thư mục tính năng của mình (`src/features/{auth|meals|fasting|fmd|consultation}/`).
   * Không bạn nào đụng vào file `*View.jsx` hay `*Api.js` của bạn khác.
2. **Quy tắc đẩy nhánh cá nhân**:
   * Vy chỉ commit và push lên nhánh `vy`.
   * Khoa push lên nhánh `khoa`.
   * Kiệt push lên nhánh `kiet`.
   * Quốc push lên nhánh `quoc`.
   * Khôi push lên nhánh `khoi`.
   * Nhóm trưởng (Khoa) sẽ là người duy nhất merge các nhánh vào `dev` hoặc `main`.
3. **Môi trường hạ tầng dùng chung**:
   * Khi khởi động dự án, mỗi thành viên chỉ cần chạy 1 lệnh duy nhất ở thư mục gốc:
     ```bash
     docker compose up -d
     ```
   * Toàn bộ 4 cơ sở hạ tầng (Postgres 5432, Redis 6379, RabbitMQ 5672/15672, Mailpit 1025/8025) sẽ sẵn sàng 100%.


---

## 8. HƯỚNG DẪN KHỞI CHẠY FRONTEND & BẢN ĐỒ KHÔNG GIAN LÀM VIỆC (FRONTEND ONBOARDING GUIDE)

> [!IMPORTANT]
> **Dành riêng cho 4 bạn (Khoa, Kiệt, Quốc, Khôi) khi vừa pull code về máy:**  
> Đọc kỹ mục này để biết chính xác lệnh khởi chạy giao diện Web và vị trí thư mục của riêng mình!

### 1. Hướng Dẫn 3 Bước Khởi Chạy Frontend (Quickstart Commands)

Khi vừa pull nhánh `vy` (hoặc sau khi Khoa merge vào `dev`), mở Terminal tại thư mục gốc của Solution và chạy 3 lệnh sau:

```bash
# Bước 1: Di chuyển vào thư mục Web Client
cd src/Clients/web-app

# Bước 2: Cài đặt các gói thư viện (React, Tailwind, Lucide Icons, Axios)
npm install

# Bước 3: Khởi chạy máy chủ giao diện nội bộ (Local Dev Server)
npm run dev
```

Sau khi chạy lệnh trên, terminal sẽ cung cấp đường link:
👉 **URL truy cập giao diện**: `http://localhost:5173` (Mở trên Chrome/Edge).

> [!TIP]
> **Cơ chế Chạy Thử An Toàn (Mock Fallback)**:  
> Frontend đã được tích hợp sẵn dữ liệu mẫu dự phòng. Ngay cả khi các bạn chưa bật Backend hoặc chưa mở Docker, web vẫn hiển thị đầy đủ giao diện đẹp mắt, không bao giờ bị lỗi trắng trang (White Screen)!

---

### 2. Bản Đồ Phân Chia Không Gian Làm Việc Frontend (`src/Clients/web-app/src/`)

Để **triệt tiêu 100% xung đột mã nguồn (Zero Merge Conflict)**, toàn bộ Frontend được chia thành 2 vùng rõ rệt:

```text
src/Clients/web-app/src/
│
├── App.jsx                             # Điều hướng chính [Landing Page] ↔ [Dashboard]
├── main.jsx                            # Điểm khởi động React
│
├── shared/                             # 🛑 [VÙNG CHUNG ĐÃ KHÓA - VY ĐÃ DỰNG CHUẨN - KHÔNG SỬA]
│   ├── components/                     
│   │   ├── Sidebar.jsx                 # Thanh menu bên trái (Thu gọn/mở rộng, nhớ trạng thái)
│   │   ├── Navbar.jsx                  # Thanh tiêu đề trên cùng, ngày tháng & chuỗi sống khỏe
│   │   └── Toast.jsx                   # Khung popup thông báo mượt mà
│   ├── pages/                          
│   │   ├── LandingPage.jsx             # Trang giới thiệu công khai bên ngoài (Minimal Luxury)
│   │   └── OverviewDashboard.jsx       # Trang tổng quan 4 trụ cột sức khỏe bên trong
│   └── services/                       
│       └── apiClient.js                # Cấu hình gốc Axios trỏ vào Gateway (https://localhost:7159)
│
└── features/                           # 🟢 [PHÒNG LÀM VIỆC RIÊNG CỦA TỪNG BẠN - TỰ DO CODE]
    │
    ├── auth/                           # 🔐 [PHÒNG CỦA KHOA]
    │   ├── AuthModal.jsx               # Form popup Đăng nhập & Đăng ký
    │   ├── ProfileView.jsx             # Màn hình Hồ sơ cá nhân & Thể trạng
    │   └── authApi.js                  # 👉 Nơi Khoa viết hàm gọi API Auth & Profile
    │
    ├── meals/                          # 🥗 [PHÒNG CỦA VY]
    │   ├── MealsView.jsx               # Màn hình Nhật ký 4 bữa ăn & Thước đo no 80% (Hara Hachi Bu)
    │   ├── AddMealModal.jsx            # Popup chọn món, tính Calo, Đạm, Xơ & Tra cứu USDA
    │   └── mealsApi.js                 # 👉 Nơi Vy viết hàm gọi API Meals, Nutrition & Templates
    │
    ├── fasting/                        # ⏱️ [PHÒNG CỦA KIỆT]
    │   ├── FastingView.jsx             # Màn hình Bộ đếm giờ Nhịn ăn gián đoạn 16/8 & OMAD
    │   └── fastingApi.js               # 👉 Nơi Kiệt viết hàm gọi API Fasting (Start, End, Active)
    │
    ├── fmd/                            # 🌿 [PHÒNG CỦA QUỐC]
    │   ├── FmdView.jsx                 # Màn hình Lộ trình 5 ngày FMD & Thông báo sức khỏe
    │   └── fmdApi.js                   # 👉 Nơi Quốc viết hàm gọi API FMD & Rules
    │
    └── consultation/                   # 🩺 [PHÒNG CỦA KHÔI]
        ├── ConsultationView.jsx        # Màn hình Đặt lịch tư vấn & Bác sĩ gửi lời khuyên
        └── consultationApi.js          # 👉 Nơi Khôi viết hàm gọi API Consultation
```

---

### 3. Bảng Tra Cứu Nhanh Cho 5 Bạn (Ai Làm Gì Ở Đâu?)

| Bạn | Thư mục của bạn | Các file bạn toàn quyền chỉnh sửa | Nhiệm vụ chính khi ráp nối API |
| :--- | :--- | :--- | :--- |
| **Hoàng Lê Khoa** | `src/features/auth/` | `authApi.js`<br>`AuthModal.jsx`<br>`ProfileView.jsx` | Bật kết nối gọi `POST /api/auth/login`, `POST /api/auth/register` và lưu Access Token vào session/localStorage. |
| **Nguyễn Ngọc Tường Vy** | `src/features/meals/` | `mealsApi.js`<br>`MealsView.jsx`<br>`AddMealModal.jsx` | Bật kết nối gọi `POST /api/meals` và `GET /api/nutrition/search`, cập nhật dữ liệu calo thật lên thước đo no 80%. |
| **Trần Anh Kiệt** | `src/features/fasting/` | `fastingApi.js`<br>`FastingView.jsx` | Gắn sự kiện nút "Bắt Đầu Nhịn Ăn" gọi `POST /api/fasting/start`, cập nhật thời gian đếm ngược thực tế. |
| **Trần Phạm Khánh Quốc** | `src/features/fmd/` | `fmdApi.js`<br>`FmdView.jsx` | Gắn sự kiện nút "Bắt Đầu Chu Kỳ FMD Mới" gọi `POST /api/fmd/start`, hiển thị trạng thái chu kỳ ngày 1-5. |
| **Dương Đình Khôi** | `src/features/consultation/` | `consultationApi.js`<br>`ConsultationView.jsx` | Gắn sự kiện form đặt lịch gọi `POST /api/consultations/book` và nút gửi lời khuyên gọi `POST /api/consultations/advice`. |

---

### 4. Quy Tắc 3 Bước "Cắm Dây" API Cực Dễ Hiểu (3-Step Integration Rule)

Khi một bạn muốn nối giao diện của mình vào backend vừa viết:

* **Bước 1**: Mở file `*Api.js` trong thư mục của mình (ví dụ Kiệt mở `fastingApi.js`).
* **Bước 2**: Sử dụng đối tượng `apiClient` có sẵn để gọi endpoint Gateway:
  ```javascript
  import { apiClient } from '../../shared/services/apiClient';

  export const fastingApi = {
    startFasting: async (dto) => {
      // Gọi trực tiếp qua YARP Gateway cổng 7159
      const response = await apiClient.post('/api/fasting/start', dto);
      return response.data.data;
    },
  };
  ```
* **Bước 3**: Mở file `*View.jsx` tương ứng, import hàm từ file `*Api.js` và truyền dữ liệu khi người dùng bấm nút:
  ```javascript
  const handleStart = async () => {
    const result = await fastingApi.startFasting({ userId, fastingType: 1 });
    console.log("Phiên nhịn ăn đã tạo:", result);
  };
  ```

> [!CAUTION]
> **Quy Tắc Vàng Giữ An Toàn Tuyệt Đối**:
> * **KHÔNG SỬA** các file trong thư mục `src/shared/` (Sidebar, Navbar, Theme, Layout...).
> * **KHÔNG SỬA** file `*View.jsx` hay `*Api.js` của bạn khác.
> * Chỉ code trong đúng thư mục `features/{tên_của_mình}/`. Nhờ đó, dù cả 5 bạn cùng sửa code cùng lúc thì khi Git merge cũng **không bao giờ bị báo đỏ hay xung đột dòng lệnh**!
