# Longevity Diet Tracker System - Backend Microservices Architecture

> Dựa trên mô hình **C0 - System Context** và **C2 - System Architecture (Container)** theo chuẩn **Blue Zones & Fasting Mimicking Diet (FMD)**.

---

## 1. Phân Tích Mô Hình Kiến Trúc (Architecture Overview)

### 1.1. Mô hình C0 – System Context (Longevity Diet Tracker)
- **Actors (Người dùng & Tác nhân)**:
  - **User [Person]**: Ghi nhật ký bữa ăn (*Logs meals*), theo dõi chu kỳ nhịn ăn và chu kỳ FMD (*tracks fasting and FMD cycle*) qua giao thức HTTPS.
  - **Nutritionist [Person]**: Đánh giá tiến độ dinh dưỡng của người dùng, gửi lời khuyên dinh dưỡng (*Reviews progress, sends advice*) qua giao thức HTTPS.
  - **Admin [Person]**: Quản lý các quy tắc FMD và các mẫu thực đơn chuẩn (*Manages FMD rules and meal templates*) qua giao thức HTTPS.
- **External Systems (Hệ thống bên ngoài)**:
  - **Google Authentication [External System]**: Xác thực người dùng (*Authenticates users*) qua chuẩn OAuth 2.0.
  - **Email Service [External System]**: Gửi email thông báo, lời khuyên và nhắc nhở (*Sends notifications*) qua giao thức SMTP.
  - **Nutrition API [External System]**: Tra cứu thông tin thực phẩm và hàm lượng vi/đa lượng (Macros/Micros) (*Looks up food and macros*) qua REST/HTTPS.

---

### 1.2. Mô hình C2 – System Architecture (Container Architecture)
Toàn bộ Backend được xây dựng theo kiến trúc **Microservices** hướng sự kiện (Event-Driven) kết hợp giao tiếp đồng bộ (gRPC / REST) và kiến trúc **Onion Architecture** cho từng service:

```
[Mobile App (Flutter)]  \
                         --> [API Gateway (YARP)] 
[Web App (React)]       /        |
                                 +---> REST/HTTP ---> [Identity Service] -------> [Identity DB (PostgreSQL)]
                                 |                            |
                                 |                            +---> OAuth 2.0 ---> [Google Auth]
                                 |
                                 +---> REST/HTTP ---> [Diet & Fasting Service] --> [Diet DB (PostgreSQL)]
                                 |                           |           ^        [Cache (Redis)]
                                 |                           |           |        REST/HTTPS ---> [Nutrition API]
                                 |                           |          gRPC
                                 |                           v           |
                                 +---> REST/HTTP ---> [Consultation Service] ----> [Consultation DB (PostgreSQL)]
                                                             |
                                                             v (Publish)
                                 [Job Service (Hangfire)] -> [RabbitMQ Broker] -> (Consume) -> [Notification Service]
                                        |                                                               |
                                        +---> [Job DB (PostgreSQL)]                                     +---> [Notification DB (PostgreSQL)]
                                                                                                        +---> SMTP ---> [Email Service]
```

1. **API Gateway [YARP]**:
   - Reverse proxy trung tâm, tiếp nhận request từ Flutter Mobile App & React Web App qua HTTPS.
   - Định tuyến vào các Internal Services: `Identity Service`, `Diet & Fasting Service`, `Consultation Service`.
2. **Identity Service [.NET 8, Onion]**:
   - Quản lý tài khoản, xác thực JWT, phân quyền (User, Nutritionist, Admin).
   - Tích hợp OAuth 2.0 với **Google Authentication**.
   - Database: `Identity DB` (PostgreSQL).
3. **Diet & Fasting Service [.NET 8, Onion]**:
   - Core domain: Nhật ký ăn uống (`MealLog`, `MealFoodItem`), chế độ nhịn ăn (`FastingSession`), chu kỳ FMD 5 ngày (`FmdCycle`), mẫu thực đơn Blue Zones (`MealTemplate`).
   - Kết nối **Nutrition API** tra cứu Macro thực phẩm, kết hợp **Redis Cache** để lưu đệm dữ liệu dinh dưỡng.
   - Cung cấp **gRPC Server** phục vụ cho `Consultation Service` truy vấn tổng hợp tiến độ dinh dưỡng/nhịn ăn của người dùng với hiệu năng cao.
   - Publish sự kiện nhịn ăn/bữa ăn vào **RabbitMQ** và Consume các trigger nhắc nhở.
   - Database: `Diet DB` (PostgreSQL).
4. **Consultation Service [.NET 8, Onion]**:
   - Quản lý hồ sơ chuyên gia (`NutritionistProfile`), các buổi tư vấn (`ConsultationSession`), phiếu lời khuyên (`AdviceNote`).
   - Gọi sang `Diet & Fasting Service` qua giao thức **gRPC** để review tiến độ dinh dưỡng/nhịn ăn của người dùng.
   - Publish sự kiện `AdviceSentIntegrationEvent` vào **RabbitMQ** để gửi thông báo cho khách hàng.
   - Database: `Consultation DB` (PostgreSQL).
5. **Notification Service [.NET 8, Onion]**:
   - Lắng nghe (Consume) các Event từ **RabbitMQ** (nhắc nhở nhịn ăn, cảnh báo FMD, lời khuyên từ chuyên gia).
   - Gửi email thông báo qua giao thức **SMTP** tới **Email Service** (hỗ trợ Mailpit cho Local Dev).
   - Database: `Notification DB` (PostgreSQL) lưu lịch sử gửi và tùy chọn thông báo của người dùng.
6. **Job Service [Hangfire]**:
   - Quản lý các background job định kỳ (Scheduled Jobs): kiểm tra khung giờ nhịn ăn, kiểm tra ngày của chu kỳ FMD, tổng kết dinh dưỡng tuần.
   - Publish các event trigger vào **RabbitMQ**.
   - Database: `Job DB` (PostgreSQL) lưu trữ trạng thái Hangfire.
7. **BuildingBlocks & Shared Infrastructure**:
   - `BuildingBlocks.Common`: Lớp cơ sở (Base Entity, IAuditableEntity), Result pattern, Custom Exceptions, Paging.
   - `BuildingBlocks.Messaging`: Abstraction `IEventBus`, `IIntegrationEvent` và định nghĩa các Event dùng chung trên RabbitMQ.
   - `BuildingBlocks.Grpc`: File Proto `diet_fasting.proto` và các hợp đồng gRPC Contracts.

---

## 2. Cấu Trúc Solution & Dự Án (Project Structure)

```
Longevity_Diet_Tracker_System/
├── docker-compose.yml                      # PostgreSQL, Redis, RabbitMQ, Mailpit
├── scripts/
│   └── init-multiple-databases.sh          # Khởi tạo tự động 5 DB trên PostgreSQL
├── Longevity_Diet_Tracker_System.sln       # Visual Studio Solution (.NET 8)
│
├── src/
│   ├── ApiGateways/
│   │   └── YarpGateway/                    # ASP.NET Core 8 Web API + YARP Reverse Proxy
│   │
│   ├── BuildingBlocks/
│   │   ├── BuildingBlocks.Common/          # Base Entity, Result, Exceptions, PagedResult
│   │   ├── BuildingBlocks.Messaging/       # RabbitMQ Integration Events, IEventBus
│   │   └── BuildingBlocks.Grpc/            # diet_fasting.proto & gRPC Contracts
│   │
│   └── Services/
│       ├── Identity/                       # [Onion Architecture]
│       │   ├── Identity.Domain/            # User, Role, RefreshToken, UserProfile
│       │   ├── Identity.Application/       # DTOs, IAuthService, ITokenService, IGoogleAuth
│       │   ├── Identity.Infrastructure/    # PostgreSQL EF Core, JWT Provider, Google OAuth
│       │   └── Identity.API/               # AuthController, UsersController, Program.cs
│       │
│       ├── DietFasting/                    # [Onion Architecture]
│       │   ├── DietFasting.Domain/         # MealLog, FastingSession, FmdCycle, MealTemplate
│       │   ├── DietFasting.Application/    # DTOs, IMealService, IFastingService, IFmdService
│       │   ├── DietFasting.Infrastructure/ # DietDbContext, RedisCache, NutritionApiClient, gRPC Server
│       │   └── DietFasting.API/            # Meals, Fasting, Fmd, Nutrition Controllers
│       │
│       ├── Consultation/                   # [Onion Architecture]
│       │   ├── Consultation.Domain/        # ConsultationSession, AdviceNote, NutritionistProfile
│       │   ├── Consultation.Application/   # DTOs, IConsultationService, gRPC Client interfaces
│       │   ├── Consultation.Infrastructure/# ConsultationDbContext, DietFastingGrpcClient
│       │   └── Consultation.API/           # ConsultationsController, Program.cs
│       │
│       ├── Notification/                   # [Onion Architecture]
│       │   ├── Notification.Domain/        # NotificationLog, NotificationPreference
│       │   ├── Notification.Application/   # DTOs, INotificationService, IEmailService
│       │   ├── Notification.Infrastructure/# NotificationDbContext, SmtpEmailService
│       │   └── Notification.API/           # NotificationsController, Program.cs
│       │
│       └── JobService/                     # [Hangfire Worker & API]
│           ├── JobService.Application/     # Recurring Jobs (FastingCheck, FmdCheck)
│           ├── JobService.Infrastructure/  # Hangfire Postgres Storage, RabbitMq Publisher
│           └── JobService.API/             # Hangfire Dashboard & Server, Program.cs
```

---

## 3. Cổng Dịch Vụ & Môi Trường Chạy (Ports & Environment)

| Thành Phần | Công Nghệ / Protocol | Cổng Mặc Định (Port) | Ghi Chú |
| :--- | :--- | :--- | :--- |
| **YarpGateway** | YARP / HTTP(S) | `5000` | Gateway định tuyến toàn bộ client |
| **Identity.API** | ASP.NET Core 8 Web API | `5001` | Auth, Profile, Google Login |
| **DietFasting.API** | Web API + gRPC | `5002` (HTTP) / `7002` (gRPC) | Meals, Fasting, FMD, Nutrition Cache |
| **Consultation.API**| ASP.NET Core 8 Web API | `5003` | Consultation, Advice, gRPC Client |
| **Notification.API**| ASP.NET Core 8 Web API | `5004` | Notification History, SMTP Client |
| **JobService.API**  | Hangfire Dashboard & Server | `5005` | `/hangfire` Dashboard, Schedulers |
| **PostgreSQL**      | Database Server | `5432` | 5 DBs: `identity_db`, `diet_db`, `consultation_db`, `notification_db`, `job_db` |
| **Redis**           | In-Memory Cache | `6379` | Cache thực phẩm & Macro Nutrition API |
| **RabbitMQ**        | Message Broker | `5672` (AMQP) / `15672` (UI) | Event Pub/Sub giữa các services |
| **Mailpit**         | SMTP Server + UI | `1025` (SMTP) / `8025` (Web UI)| Mock Email Service gửi thông báo |

---

## 4. Hướng Dẫn Khởi Chạy Nhanh (Quick Start)

### Bước 1: Khởi động Hạ tầng Docker (Postgres, Redis, RabbitMQ, Mailpit)
```bash
docker compose up -d
```
Kiểm tra:
- RabbitMQ Dashboard: `http://localhost:15672` (guest / guest)
- Mailpit Web UI: `http://localhost:8025`
- Redis: `localhost:6379`
- PostgreSQL: `localhost:5432`

### Bước 2: Build Toàn bộ Solution
```bash
dotnet build Longevity_Diet_Tracker_System.sln
```

### Bước 3: Chạy các Services
Bạn có thể mở `Longevity_Diet_Tracker_System.sln` bằng Visual Studio hoặc Rider và thiết lập **Multiple Startup Projects** cho các API project (`YarpGateway`, `Identity.API`, `DietFasting.API`, `Consultation.API`, `Notification.API`, `JobService.API`).
