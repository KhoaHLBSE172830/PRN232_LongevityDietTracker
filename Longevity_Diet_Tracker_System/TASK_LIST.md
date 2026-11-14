# TASK LIST & PHÂN RÃ CÔNG VIỆC — LONGEVITY DIET TRACKER SYSTEM

> **Tài liệu phân công nhiệm vụ và tiến độ đồ án (WBS - Work Breakdown Structure)**  
> **Căn cứ**: Tài liệu kiến trúc `AGENT.md`, triết lý Blue Zones & Fasting Mimicking Diet (FMD), và trao đổi nhóm ngày 09/11/2026.  
> **Tình trạng phân công**: Cột *Người phụ trách* đang để trống `[Chưa phân công]` để nhóm họp và thống nhất.

---

## 1. TỔNG QUAN PHÂN CHIA MÔ HÌNH KIẾN TRÚC C4

Theo tiến độ nhóm và chỉ dẫn của Hoàng Lê Bách Khoa:

* **Mô hình C1 (System Context) & C2 (Container Architecture)**:  
  👉 **Hoàng Lê Bách Khoa & Trần Anh Kiệt** đã hoàn thành và gửi thầy duyệt.
* **Mô hình C3 (Component Diagram) & C4 (Code / Class Diagram)**:  
  👉 **3 thành viên còn lại (Nguyễn Ngọc Tường Vy, Dương Đình Khôi, Trần Phạm Khánh Quốc)** sẽ chia nhau vẽ C3 và C4 tương ứng với các Microservices mà mình đảm nhiệm code.

---

## 2. MA TRẬN 5 DOMAIN & DANH SÁCH NHIỆM VỤ CHI TIẾT

---

### DOMAIN 1: Core Fasting & Dinh Dưỡng (Blue Zones & FMD)

* **Dịch vụ đảm nhiệm**: `Diet & Fasting Service` (`src/Services/DietFasting/`)
* **Database**: `diet_db` (PostgreSQL) | **Port**: `5002` (HTTP) / `7002` (gRPC Server)

| Mã Task | Tên công việc | Mô tả nghiệp vụ chi tiết | API / Đầu ra kỹ thuật | Người phụ trách |
| :--- | :--- | :--- | :--- | :---: |
| **TASK-1.1** | **Nhật ký Bữa ăn (Meal Log) & Blue Zones Macros** | - CRUD nhật ký bữa ăn (`MealLog`, `MealFoodItem`).<br>- Tự động tính toán tổng Calo, Protein, Carbs, Fat, Fiber.<br>- Kiểm tra cache Redis (`nutrition:food:{name}`) trước khi tra cứu món mới. | `POST /api/meals`<br>`GET /api/meals/user/{id}` | `[Chưa nhận]` |
| **TASK-1.2** | **Quản lý Nhịn ăn gián đoạn (Intermittent Fasting)** | - Quản lý phiên nhịn ăn (16/8, 18/6, OMAD).<br>- Đảm bảo Invariant: 1 User chỉ có tối đa 01 phiên ở trạng thái `InProgress`.<br>- Tính tổng số giờ nhịn ăn thực tế khi bấm kết thúc. | `POST /api/fasting/start`<br>`POST /api/fasting/{id}/end`<br>`GET /api/fasting/user/{id}/active` | `[Chưa nhận]` |
| **TASK-1.3** | **Theo dõi Chu kỳ FMD 5 ngày (Fasting Mimicking Diet)** | - Quản lý chu kỳ FMD 5 ngày theo chuẩn Valter Longo:<br>  + Ngày 1: Ngưỡng calo tối đa 1.100 kcal.<br>  + Ngày 2 - 5: Ngưỡng calo tối đa 750 kcal.<br>- Gắn cờ cảnh báo `ExceededThreshold = true` nếu tổng calo trong ngày vượt mức. | `POST /api/fmd/start`<br>`GET /api/fmd/user/{id}/active`<br>`GET /api/fmd/rules` | `[Chưa nhận]` |
| **TASK-1.4** | **Triển khai gRPC Server cho DietFasting** | - Triển khai gRPC Service kế thừa contract từ `BuildingBlocks.Grpc`.<br>- Cung cấp 2 RPC: `GetUserFastingSummary` và `GetUserNutritionSummary` cho Consultation Service gọi qua cổng `7002`. | Port gRPC `7002`<br>Proto: `diet_fasting.proto` | `[Chưa nhận]` |
| **TASK-1.5** | **Vẽ mô hình C3 & C4 cho DietFasting Service** | - **C3**: Sơ đồ thành phần các tầng Presentation $\rightarrow$ Application $\rightarrow$ Infrastructure $\rightarrow$ Domain của DietFasting.<br>- **C4**: Class Diagram chi tiết các Entity: `MealLog`, `MealFoodItem`, `FastingSession`, `FmdCycle`, `MealTemplate`. | File diagram (PNG / Draw.io / Mermaid) | `[Chưa nhận]` |

---

### DOMAIN 2: Nghiệp Vụ Tư Vấn & Hợp Đồng gRPC

* **Dịch vụ đảm nhiệm**: `Consultation Service` (`src/Services/Consultation/`)
* **Database**: `consultation_db` (PostgreSQL) | **Port**: `5003` (HTTP)

| Mã Task | Tên công việc | Mô tả nghiệp vụ chi tiết | API / Đầu ra kỹ thuật | Người phụ trách |
| :--- | :--- | :--- | :--- | :---: |
| **TASK-2.1** | **Quản lý Hồ sơ Chuyên gia (Nutritionist Profile)** | - Quản lý thông tin chuyên gia dinh dưỡng: Bằng cấp, chứng chỉ, chuyên môn Blue Zones, trạng thái phê duyệt (`IsVerified`). | `GET /api/consultations/nutritionists`<br>`POST /api/consultations/nutritionists` | `[Chưa nhận]` |
| **TASK-2.2** | **Quản lý Đặt lịch Tư vấn (Consultation Session)** | - Khách hàng đặt lịch hẹn với chuyên gia.<br>- Chuyên gia xác nhận, cập nhật trạng thái (`Pending` $\rightarrow$ `Confirmed` $\rightarrow$ `Completed` hoặc `Cancelled`). | `POST /api/consultations/sessions`<br>`GET /api/consultations/sessions/user/{id}` | `[Chưa nhận]` |
| **TASK-2.3** | **Tích hợp gRPC Client gọi sang DietFasting** | - Xây dựng gRPC Client kết nối thật sang `https://localhost:7002`.<br>- Lấy báo cáo dinh dưỡng và lịch sử nhịn ăn của khách hàng để chuyên gia có cơ sở chẩn đoán (thay thế phần code mock hiện tại). | `DietFastingGrpcClient.cs`<br>Kết nối GrpcChannel port `7002` | `[Chưa nhận]` |
| **TASK-2.4** | **Tạo Phiếu Lời khuyên & Bắn Event RabbitMQ** | - Chuyên gia tạo phiếu lời khuyên (`AdviceNote`) gửi cho khách hàng.<br>- Publish sự kiện `AdviceSentIntegrationEvent` vào RabbitMQ để Notification Service nhận và gửi mail. | `POST /api/consultations/advice`<br>Publish RabbitMQ Event | `[Chưa nhận]` |
| **TASK-2.5** | **Vẽ mô hình C3 & C4 cho Consultation Service** | - **C3**: Sơ đồ thành phần các tầng của Consultation Service.<br>- **C4**: Class Diagram chi tiết các Entity: `NutritionistProfile`, `ConsultationSession`, `AdviceNote`. | File diagram (PNG / Draw.io / Mermaid) | `[Chưa nhận]` |

---

### DOMAIN 3: Hệ Thống Thông Báo & Event Consumer

* **Dịch vụ đảm nhiệm**: `Notification Service` (`src/Services/Notification/`)
* **Database**: `notification_db` (PostgreSQL) | **Port**: `5004` (HTTP)

| Mã Task | Tên công việc | Mô tả nghiệp vụ chi tiết | API / Đầu ra kỹ thuật | Người phụ trách |
| :--- | :--- | :--- | :--- | :---: |
| **TASK-3.1** | **Xây dựng Background Consumer RabbitMQ** | - Tạo Background Worker lắng nghe message trên các Queue của RabbitMQ:<br>  + Nhận `AdviceSentIntegrationEvent` khi có lời khuyên mới.<br>  + Nhận `FastingReminderTriggeredEvent` khi có lịch nhắc nhịn ăn.<br>- Xử lý cơ chế **Idempotent** (tránh gửi trùng lặp email). | `RabbitMqNotificationConsumer.cs`<br>Lắng nghe message ổn định | `[Chưa nhận]` |
| **TASK-3.2** | **Tích hợp Gửi Email qua SMTP (Mailpit)** | - Xây dựng template email HTML chuẩn Blue Zones.<br>- Gửi email qua SMTP tới Mailpit (Port `1025`).<br>- Kiểm tra hộp thư đến trực quan tại `http://localhost:8025`. | Gửi mail thành công xuất hiện trên giao diện Mailpit | `[Chưa nhận]` |
| **TASK-3.3** | **Quản lý Lịch sử & Tùy chọn Nhận tin** | - Lưu lịch sử các email đã gửi (`NotificationLog`).<br>- Cho phép User cấu hình bật/tắt nhận email nhắc nhịn ăn hoặc thông báo chuyên gia (`NotificationPreference`). | `GET /api/notifications/logs/user/{id}`<br>`PUT /api/notifications/preferences` | `[Chưa nhận]` |
| **TASK-3.4** | **Vẽ mô hình C3 & C4 cho Notification Service** | - **C3**: Sơ đồ thành phần các tầng của Notification Service.<br>- **C4**: Class Diagram các Entity: `NotificationLog`, `NotificationPreference`. | File diagram (PNG / Draw.io / Mermaid) | `[Chưa nhận]` |

---

### DOMAIN 4: Background Job & DevOps

* **Dịch vụ đảm nhiệm**: `Job Service` (`src/Services/JobService/`) & Docker
* **Database**: `job_db` (PostgreSQL cho Hangfire) | **Port**: `5005` (HTTP)

| Mã Task | Tên công việc | Mô tả nghiệp vụ chi tiết | API / Đầu ra kỹ thuật | Người phụ trách |
| :--- | :--- | :--- | :--- | :---: |
| **TASK-4.1** | **Cấu hình Hangfire Server & Dashboard** | - Cấu hình Hangfire lưu trữ Job State trên `job_db`.<br>- Bật trang Hangfire Dashboard tại `/hangfire` (Port `5005`) để theo dõi các Recurring Jobs. | `http://localhost:5005/hangfire` | `[Chưa nhận]` |
| **TASK-4.2** | **Xây dựng Recurring Jobs hẹn giờ** | - Job định kỳ 15 phút: Quét các phiên nhịn ăn sắp kết thúc $\rightarrow$ Trigger bắn event.<br>- Job định kỳ 24h: Quét chu kỳ FMD đang hoạt động để chuyển tiếp ngày.<br>- Job hàng tuần: Quét tổng kết dinh dưỡng tuần cho User. | Cron Jobs chạy ngầm định kỳ | `[Chưa nhận]` |
| **TASK-4.3** | **Hoàn thiện RabbitMQ Publisher thật** | - Thay thế `Console.WriteLine(...)` trong `RabbitMqJobPublisher` bằng kết nối thật tới RabbitMQ (cổng `5672`) để đẩy message vào Queue. | Message xuất hiện thực tế trên RabbitMQ Queue | `[Chưa nhận]` |
| **TASK-4.4** | **DevOps & Tinh chỉnh Docker Compose** | - Quản lý và đảm bảo 4 container Docker (`postgres`, `redis`, `rabbitmq`, `mailpit`) vận hành ổn định trên máy của tất cả thành viên. | Script `docker-compose.yml` & `init-multiple-databases.sh` | `[Chưa nhận]` |

---

### DOMAIN 5: Gateway, Auth & Nền Tảng Chung (Leader Đảm Nhiệm)

* **Dịch vụ đảm nhiệm**: `YarpGateway` (`src/ApiGateways/YarpGateway/`) & `Identity Service` (`src/Services/Identity/`)
* **Database**: `identity_db` (PostgreSQL) | **Port**: `5000` (YARP Gateway) / `5001` (Identity)

| Mã Task | Tên công việc | Mô tả nghiệp vụ chi tiết | API / Đầu ra kỹ thuật | Người phụ trách |
| :--- | :--- | :--- | :--- | :---: |
| **TASK-5.1** | **YARP Reverse Proxy Gateway** | - Cấu hình định tuyến từ cổng trung tâm `5000` tới 4 microservices nội bộ (`5001`, `5002`, `5003`, `5004`). | Cổng Gateway `5000` | **Hoàng Lê Khoa** |
| **TASK-5.2** | **Identity Service & OAuth 2.0** | - Xác thực JWT Token, Refresh Token.<br>- Tích hợp đăng nhập Google OAuth 2.0.<br>- Quản lý phân quyền RBAC (Role: `User`, `Nutritionist`, `Admin`). | `POST /api/auth/login`<br>`POST /api/auth/register`<br>`POST /api/auth/google-login` | **Hoàng Lê Khoa** |
| **TASK-5.3** | **Mô hình Kiến trúc C1 & C2** | - Hoàn thiện sơ đồ C1 (System Context) và C2 (Container Architecture). | File báo cáo nộp thầy | **Hoàng Lê Khoa & Trần Anh Kiệt** *(Đã xong)* |
| **TASK-5.4** | **Code Review & Quản lý Git Develop** | - Quản lý nhánh `develop`, review Pull Request từ các nhánh cá nhân của thành viên, đảm bảo tuân thủ nghiêm ngặt `AGENT.md`. | Nhánh `develop` ổn định | **Hoàng Lê Khoa** |

---

## 3. QUY TRÌNH THỰC THI TASK CHO CÁC THÀNH VIÊN

1. **Nhận task**: Nhóm họp hoặc trao đổi trên Zalo, mỗi bạn điền tên mình vào cột `[Chưa nhận]` của Domain mà mình đảm nhận.
2. **Tạo nhánh Git riêng**: Mỗi thành viên đứng từ `dev` tạo 1 branch riêng của mình:

   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b <tên_bạn>   # Ví dụ: vy, khoi, quoc, kiet
   ```

3. **Thực thi code**: Tuân thủ Onion Architecture và các cảnh báo (WARNING 1 - 5) trong `AGENT.md`.
4. **Kiểm tra trước khi Merge**:

   ```bash
   git fetch origin dev
   git merge origin/dev        # Tự giải quyết conflict trên máy cá nhân nếu có
   git push origin <tên_bạn>
   ```

5. **Tạo PR**: Tạo Pull Request lên GitHub nhờ Khoa Leader review để merge vào `dev`.
