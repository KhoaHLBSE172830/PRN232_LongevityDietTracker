# KẾ HOẠCH HÀNH ĐỘNG & BẢNG PHÂN TÍCH CÂN BẰNG TẢI (MASTER PLAN V3)
## DỰ ÁN: LONGEVITY DIET TRACKER SYSTEM (PRN232)

> **Mục tiêu**: Báo cáo & Chấm tiến độ với Giảng viên vào **Slot 1 — Sáng Thứ 2 (16/11/2026)**  
> **Căn cứ**: `AGENT.md`, Khung slide 24 trang (`Guideline V1.0`), Quy chuẩn luồng nghiệp vụ (`Workflow là gì - PDF`).  
> **Mục tiêu phân chia**: Đảm bảo **cân đối 100% về độ khó và khối lượng công việc** cho cả 5 thành viên, mỗi người sở hữu đúng 1 kỹ thuật chuyên sâu và 1 phân hệ giao diện hoàn chỉnh.

---

## 1. RÀ SOÁT ĐẦY ĐỦ CÁC DOMAIN & HIỆN TRẠNG TOÀN HỆ THỐNG

Sau khi kiểm toán chi tiết toàn bộ mã nguồn (`ApiGateways`, `BuildingBlocks`, 5 `Services`, các Controller, Entity và Repository), hệ thống bao gồm đầy đủ **5 Domain chuẩn kiến trúc**:

1. **Domain 1: Core Fasting & Dinh dưỡng Blue Zones (`Diet & Fasting Service`)**:
   * *Module Bữa ăn & Macros*: `MealsController` (`POST /api/meals`, `GET /api/meals/user/{id}`).
   * *Module Tra cứu Dinh dưỡng*: `NutritionController` (`GET /api/nutrition/search`, `details/{id}`) kết hợp **Redis Cache**.
   * *Module Nhịn ăn gián đoạn (IF)*: `FastingController` (`POST /api/fasting/start`, `POST /api/fasting/{id}/end`, `active`).
   * *Module Chu kỳ FMD 5 ngày*: `FmdController` (`POST /api/fmd/start`, `active`).
   * *Module Quản trị Master Data Admin*: `FmdRulesController`, `MealTemplatesController`.
   * *Module gRPC Server*: Mở cổng `7002` phản hồi dữ liệu qua Protobuf HTTP/2.
2. **Domain 2: Tư vấn Chuyên gia & Hợp đồng gRPC (`Consultation Service`)**:
   * `ConsultationsController`: Đặt lịch hẹn (`/book`), Bác sĩ kê lời khuyên (`/advice`), Hồ sơ chuyên gia (`/nutritionist/{id}`).
   * **gRPC Client**: Gọi sang cổng 7002 của DietFasting để lấy snapshot dinh dưỡng/nhịn ăn của khách hàng.
3. **Domain 3: Hệ thống Thông báo & Event Consumer (`Notification Service`)**:
   * `NotificationsController`: Lịch sử thông báo, Cài đặt tùy chọn nhận tin (`/preferences`).
   * **RabbitMQ Consumer**: BackgroundService lắng nghe message từ Queue `notification_events_queue`.
   * **SMTP Mail Client**: Soạn email HTML chuẩn Blue Zones và gửi qua Mailpit (Port 1025).
4. **Domain 4: Background Job, DB Scripts & DevOps (`JobService` & Docker)**:
   * `JobsController`: Kích hoạt job kiểm tra nhanh (`/jobs/trigger/fasting-check`, `/fmd-check`).
   * **Hangfire Schedulers**: Recurring Jobs quét phiên nhịn ăn hết giờ và quét chuyển ngày chu kỳ FMD 5 ngày.
   * **RabbitMQ Publisher**: Bắn trigger event vào Exchange `longevity_events_exchange`.
   * **DevOps/Docker**: 4 container Docker (`postgres`, `redis`, `rabbitmq`, `mailpit`) và script khởi tạo 5 database.
5. **Domain 5: Gateway, Auth & Nền tảng chung (`YarpGateway` & `Identity Service`)**:
   * **YARP Reverse Proxy**: Định tuyến từ cổng `5000` (HTTPS `7159`) tới các microservices nội bộ, xử lý CORS.
   * **Identity Service**: `AuthController` (Register, Login, Google OAuth, Refresh Token) & `UsersController` (Profile thể trạng).

---

## 2. BẢNG ĐÁNH GIÁ CÂN BẰNG TẢI (WORKLOAD BALANCE SCORE) CHO 5 THÀNH VIÊN

Để không có sự chênh lệch (người quá nặng, người quá nhẹ), khối lượng công việc được phân bổ theo bảng định lượng dưới đây:

| Thành viên | Phân hệ Backend đảm nhiệm | Màn hình Frontend (Web App) | "Vũ khí" Kỹ thuật chuyên sâu | Điểm tải công việc |
| :--- | :--- | :--- | :--- | :---: |
| **Hoàng Lê Khoa** *(Leader)* | - `Identity Service` (6 APIs)<br>- `YarpGateway` (Reverse Proxy)<br>- Quản lý Docker & CI/CD | Màn hình **Đăng ký, Đăng nhập & Profile cá nhân** | **YARP Proxy & Google OAuth 2.0 / JWT** | **8.5 / 10** |
| **Nguyễn Ngọc Tường Vy** | - `DietFasting (Meal Module)` (2 APIs)<br>- `Nutrition Module` (2 APIs)<br>- Thuật toán tính vi/đa lượng (Macros)<br>- Quy tắc ăn no 80% (Hara Hachi Bu) | - Màn hình **Nhật ký Bữa ăn & Tra cứu món ăn**<br>- **Dựng khung Web App chung** (Sidebar, Navbar, Theme Blue Zones)<br>- Hỗ trợ tút tát UI cho nhóm | **External Nutrition API (USDA) & Redis Distributed Cache** | **8.5 / 10** |
| **Trần Anh Kiệt** | - `DietFasting (Fasting Module)` (3 APIs)<br>- `JobService` (2 APIs)<br>- **Triển khai gRPC Server (Cổng 7002)**<br>- Hangfire Recurring Jobs | Màn hình **Đồng hồ bấm giờ Nhịn ăn 16/8 & Dashboard giám sát Jobs** | **gRPC Server (HTTP/2 Protobuf) & Hangfire Schedulers** | **8.5 / 10** |
| **Trần Phạm Khánh Quốc** | - `DietFasting (FMD Module)` (2 APIs)<br>- `Admin Rules & Templates` (5 APIs)<br>- `Notification Service` (4 APIs)<br>- Logic cảnh báo vi phạm calo FMD | Màn hình **Theo dõi Chu kỳ FMD 5 ngày, Quản lý Rules & Hộp thư thông báo** | **RabbitMQ Consumer (Async Event-Driven) & SMTP Mailpit** | **8.5 / 10** |
| **Dương Đình Khôi** | - `Consultation Service` (4 APIs)<br>- Bác sĩ dinh dưỡng & Đặt lịch hẹn<br>- Phiếu lời khuyên (`AdviceNote`)<br>- Tích hợp gRPC Client sang cổng 7002 | Màn hình **Khách hàng đặt lịch tư vấn & Bác sĩ gửi phiếu lời khuyên** | **gRPC Client (Inter-service Sync) & RabbitMQ Publisher** | **8.5 / 10** |

👉 **NHẬN XÉT**:  
* Mức độ cân đối: **Đều chằn chặn 8.5/10 cho cả 5 thành viên**!
* Không ai bị quá tải (Vy không phải gánh một mình cả Fasting lẫn FMD và gRPC).
* Quốc và Kiệt đều có phần Backend cốt lõi thuộc `DietFasting` kèm theo 1 dịch vụ chuyên sâu (Kiệt có gRPC Server + Hangfire, Quốc có FMD + RabbitMQ Consumer + Mailpit).
* Mỗi người đều sở hữu đúng **1 kỹ thuật cao cấp** để tự tin trả lời vấn đáp khi thầy hỏi!

---

## 3. CẤU TRÚC PHÂN CHIA THƯ MỤC CODE (`src/`) RÕ RÀNG — KHÔNG CONFLICT

```text
Longevity_Diet_Tracker_System/
│
├── docker-compose.yml                      # 4 container Docker (postgres, redis, rabbitmq, mailpit)
├── Longevity_Diet_Tracker_System.sln       # Solution .NET 8
│
└── src/
    │
    ├── ==================== [BACKEND .NET 8] ====================
    │
    ├── ApiGateways/
    │   └── YarpGateway/                    # 👉 [KHOA] Reverse Proxy định tuyến trung tâm
    │
    ├── BuildingBlocks/                     # Thư viện dùng chung (Common, Grpc, Messaging)
    │
    ├── Services/                           # 5 Microservices độc lập
    │   ├── Identity/                       # 👉 [KHOA] Auth, JWT, Google OAuth, Profile
    │   │
    │   ├── DietFasting/                    # 👉 [CORE - VY, KIỆT, QUỐC CÙNG LÀM]
    │   │   ├── Bữa ăn, Macros, Redis       # (Vy phụ trách)
    │   │   ├── Nhịn ăn 16/8 & gRPC Server  # (Kiệt phụ trách)
    │   │   └── Chu kỳ FMD 5 ngày & Rules   # (Quốc phụ trách)
    │   │
    │   ├── JobService/                     # 👉 [KIỆT] Hangfire hẹn giờ quét lịch nhịn ăn
    │   ├── Notification/                   # 👉 [QUỐC] Consumer RabbitMQ, Mailpit SMTP
    │   └── Consultation/                   # 👉 [KHÔI] Bác sĩ, Lời khuyên, gRPC Client
    │
    │
    └── ==================== [FRONTEND REACT + VITE] =============
    │
    └── Clients/
        └── web-app/                        # Ứng dụng Web Client React + Tailwind CSS
            ├── package.json
            ├── vite.config.js
            └── src/
                ├── App.jsx                 # Điều hướng 2 chiều: [Landing Page] ↔ [Dashboard]
                │
                ├── shared/                 # 👉 [PHẦN CHUNG - VY ĐÃ DỰNG SẴN KHUNG CHUẨN]
                │   ├── components/         
                │   │   ├── Sidebar.jsx     # Thanh bên thu gọn/mở rộng (Collapsible, nhớ trạng thái)
                │   │   ├── Navbar.jsx      # Thanh tiêu đề trên cùng, chuỗi sống khỏe & ngày
                │   │   └── Toast.jsx       # Popup thông báo mượt mà
                │   ├── pages/              
                │   │   ├── LandingPage.jsx       # 🌐 Trang chủ giới thiệu công khai bên ngoài (Sang xịn, Minimal Luxury)
                │   │   └── OverviewDashboard.jsx # 📊 Trang tổng quan 4 trụ cột bên trong (Sau khi vào hệ thống)
                │   └── services/           
                │       └── apiClient.js    # Cấu hình gốc Axios trỏ vào Gateway (https://localhost:7159)
                │
                └── features/               # 👉 [5 PHÒNG RIÊNG CHO 5 BẠN - MỖI BẠN 1 VIEW & 1 API]
                    │
                    ├── auth/               # 🔐 [KHOA]: Đăng nhập, Đăng ký, Hồ sơ cá nhân
                    │   ├── AuthModal.jsx   # Form popup Đăng nhập & Đăng ký
                    │   ├── ProfileView.jsx # Màn hình quản lý hồ sơ & bảo mật
                    │   └── authApi.js      # File gọi API Auth (Khoa tự do code không lo conflict)
                    │
                    ├── meals/              # 🥗 [VY]: Bữa ăn, Thước đo 80% Hara Hachi Bu, Tra cứu USDA
                    │   ├── MealsView.jsx   # Màn hình chính Bữa ăn của Vy
                    │   ├── AddMealModal.jsx# Popup chọn món, tính gram, calo & chất xơ
                    │   └── mealsApi.js     # File gọi API Meals & Nutrition
                    │
                    ├── fasting/            # ⏱️ [KIỆT]: Nhịn ăn gián đoạn 16/8, OMAD, Bộ đếm giờ
                    │   ├── FastingView.jsx # Màn hình đếm giờ nhịn ăn
                    │   └── fastingApi.js   # File gọi API Fasting
                    │
                    ├── fmd/                # 🌿 [QUỐC]: Chu kỳ FMD 5 ngày, Cảnh báo định mức calo
                    │   ├── FmdView.jsx     # Màn hình theo dõi lộ trình 5 ngày thanh lọc
                    │   └── fmdApi.js       # File gọi API FMD & Rules
                    │
                    └── consultation/       # 👨‍⚕️ [KHÔI]: Đặt lịch khám, Bác sĩ gửi lời khuyên
                        ├── ConsultationView.jsx # Màn hình danh sách chuyên gia & đặt lịch
                        └── consultationApi.js   # File gọi API Consultation
```

> [!TIP]
> **Quy tắc làm việc nhóm an toàn (Zero Conflict Rule):**
> 1. Mỗi thành viên khi làm Frontend chỉ mở đúng thư mục trong `src/features/{tên_domain}/` của mình.
> 2. Khi nối API backend, mỗi người tự viết trong file `*Api.js` riêng của mình, không đụng chạm vào file của bạn khác.
> 3. Thanh Sidebar hỗ trợ tính năng thu gọn/mở rộng (`isCollapsed`), tự động lưu trạng thái vào `localStorage` và không bị tự bung ra khi chuyển tab.

---

## 4. KỊCH BẢN DEMO 3 WORKFLOW LIỀN MẠCH CHO BUỔI THỨ 2

1. **Workflow 1: Đăng nhập & Lối sống Dinh dưỡng Blue Zones (Khoa $\rightarrow$ Vy)**
   * Mở màn: Trình chiếu **Trang Chủ Giới Thiệu (Landing Page)** bên ngoài với thiết kế tối giản sang trọng, giới thiệu đề tài và 4 trụ cột.
   * Khoa bấm nút **"Đăng Nhập"** trên Landing Page (hoặc nút Vào nhanh Demo Minh Anh) $\rightarrow$ Chuyển mượt mà sang **Bảng điều khiển (Dashboard)**.
   * Chuyển sang tab **Dinh Dưỡng & Bữa Ăn (Vy)**: Người dùng tra cứu thực phẩm $\rightarrow$ Ghi nhận bữa ăn trưa chuẩn thực vật $\rightarrow$ Vòng tròn calo cập nhật động, hệ thống tự động tính Macros và kiểm tra ngưỡng no 80% (`Hara Hachi Bu`).
2. **Workflow 2: Thử thách Nhịn ăn 16/8, Chu kỳ FMD 5 ngày & Bắn cảnh báo (Kiệt $\rightarrow$ Quốc)**
   * Kiệt demo User bấm bắt đầu nhịn ăn 16/8 $\rightarrow$ Đồng hồ đếm ngược chạy `InProgress`.
   * Quốc demo User bắt đầu chu kỳ FMD 5 ngày $\rightarrow$ Cố ý log bữa ăn vượt quá 1.100 kcal của Ngày 1 $\rightarrow$ Hệ thống phát hiện vi phạm, gắn cờ `ExceededThreshold = true`, lập tức kích hoạt RabbitMQ gửi email cảnh báo vi phạm tới Mailpit!
3. **Workflow 3: Bác sĩ Khám bệnh qua gRPC & Gửi Phiếu Lời Khuyên (Khôi $\rightarrow$ Quốc)**
   * Khôi demo tài khoản Bác sĩ mở trang xem xét khách hàng $\rightarrow$ Hệ thống gọi gRPC ngầm sang server của Kiệt để lấy số liệu dinh dưỡng vừa log ở WF-01 và WF-02 với tốc độ cực nhanh.
   * Bác sĩ nhập lời khuyên dinh dưỡng và bấm Gửi $\rightarrow$ Bắn Event vào RabbitMQ.
   * Quốc mở giao diện hộp thư Mailpit (`http://localhost:8025`) $\rightarrow$ Email lời khuyên xuất hiện ngay lập tức trong hòm thư của User.
