# AGENT.md — Senior Backend Developer & AI Coding Guidelines

Tài liệu này đóng vai trò là kim chỉ nam kiến trúc (System Context, Architectural Rules, Business Invariants, Coding Standards) dành cho AI Agent và Backend Developer khi triển khai, tái cấu trúc hoặc bảo trì các dịch vụ thuộc hệ thống **Longevity Diet Tracker System**.

---

## 1. Bối Cảnh Hệ Thống & Phạm Vi Nghiệp Vụ

### 1.1. Mục Tiêu & Miền Nghiệp Vụ (Domain Scope)
Hệ thống hỗ trợ theo dõi lối sống trường thọ dựa trên hai trụ cột cốt lõi:
- **Triết lý Blue Zones**: Thực đơn tập trung thực vật, cân bằng vi/đa lượng (Macros/Micros), ngũ cốc nguyên hạt, hạn chế calo rỗng.
- **Fasting Mimicking Diet (FMD)**: Chu kỳ nhịn ăn giả lập 5 ngày định kỳ và các chế độ nhịn ăn gián đoạn (Intermittent Fasting - IF: 16/8, 18/6, OMAD).
- **Mô hình tác nhân (C0 System Context)**:
  - `User`: Ghi nhật ký bữa ăn (`MealLog`), theo dõi tiến trình nhịn ăn (`FastingSession`) và chu kỳ FMD 5 ngày (`FmdCycle`).
  - `Nutritionist`: Đánh giá tiến độ dinh dưỡng, nhịn ăn của người dùng; tạo và gửi phiếu tư vấn (`AdviceNote`).
  - `Admin`: Quản lý quy tắc FMD (`FmdRule`), các mẫu thực đơn chuẩn Blue Zones (`MealTemplate`).
- **Hệ thống ngoại vi (External Systems)**:
  - `Google Authentication`: Đăng nhập/xác thực qua OAuth 2.0.
  - `Email Service`: Gửi thông báo/nhắc nhở qua giao thức SMTP (Mailpit cho local dev, SendGrid/SES khi production).
  - `Nutrition API`: Tra cứu thông tin thực phẩm và hàm lượng Macro/Micro qua REST/HTTPS.

### 1.2. Danh Mục Dịch Vụ & Kiến Trúc Container (C2 Architecture)
Hệ thống vận hành theo kiến trúc Microservices độc lập về cơ sở dữ liệu (**Database-per-Service**) trên nền tảng PostgreSQL:

| Tên Dịch Vụ | Công Nghệ / Port | Database (PostgreSQL) | Cơ Chế Giao Tiếp Chính |
| :--- | :--- | :--- | :--- |
| **YarpGateway** | ASP.NET Core 8 / YARP (`5000`) | *None* | Reverse Proxy tiếp nhận HTTP/HTTPS từ Web (React) và Mobile (Flutter) |
| **Identity Service** | ASP.NET Core 8 (`5001`) | `identity_db` | OAuth 2.0 (Google), JWT Provider, User/Role Management |
| **Diet & Fasting Service** | ASP.NET Core 8 (`5002` HTTP / `7002` gRPC) | `diet_db` | REST API, gRPC Server, Redis Caching, External Nutrition API Client |
| **Consultation Service** | ASP.NET Core 8 (`5003`) | `consultation_db` | REST API, gRPC Client sang Diet & Fasting, Publishes RabbitMQ Events |
| **Notification Service** | ASP.NET Core 8 (`5004`) | `notification_db` | Consumes RabbitMQ Events, SMTP Client gửi Email |
| **Job Service** | Hangfire Worker & Dashboard (`5005`) | `job_db` | Hangfire Server, Recurring Jobs, Publishes Trigger Events qua RabbitMQ |

---

## 2. Quy Tắc Kiến Trúc Onion Architecture (Bắt Buộc)

Mỗi service nghiệp vụ (`Identity`, `DietFasting`, `Consultation`, `Notification`) phải tuân thủ nghiêm ngặt 4 tầng của Onion Architecture. Chiều phụ thuộc chỉ được phép hướng **từ ngoài vào trong**:

```
[ Presentation (API) ] ──> [ Infrastructure ] ──> [ Application ] ──> [ Domain ]
          │                                              │                 │
          └──────────────────────────────────────────────┴─────────────────┘
```

### 2.1. Domain Layer (`{Service}.Domain`)
- **Trọng tâm**: Domain Entities, Value Objects, Domain Enums, Domain Events, Custom Domain Exceptions và Repository Interfaces (`IRepository<T>`).
- **Quy tắc vàng**:
  - Tuyệt đối **KHÔNG** phụ thuộc vào bất kỳ thư viện bên ngoài hoặc tầng nào khác (ngoại trừ các interface dùng chung từ `BuildingBlocks.Common`).
  - Không tham chiếu Entity Framework Core, ASP.NET Core, hay thư viện Serialization/HTTP.
  - Áp dụng **Rich Domain Model**: Mọi logic kiểm tra tính hợp lệ và chuyển trạng thái phải nằm trong method của chính Entity hoặc Value Object. Tránh Anemic Domain Model (chỉ có getter/setter public).

### 2.2. Application Layer (`{Service}.Application`)
- **Trọng tâm**: Use cases, Application Services / Handlers, DTOs (Request/Response Records), FluentValidation Validators, Service Interfaces (`IMealService`, `IFastingService`), và Event Bus Abstractions (`IEventBus`).
- **Quy tắc vàng**:
  - Không truy cập trực tiếp hạ tầng kỹ thuật (DB context, Redis connection, SMTP, HTTP client bên thứ ba). Mọi phụ thuộc phải thông qua Abstraction/Interface.
  - Phối hợp thực thi domain logic, commit thay đổi qua `IUnitOfWork`.
  - Không bao giờ trả Domain Entity trực tiếp ra API; luôn map sang DTO.

### 2.3. Infrastructure Layer (`{Service}.Infrastructure`)
- **Trọng tâm**: Triển khai chi tiết các interface từ Domain & Application:
  - `DbContext` (EF Core với PostgreSQL Npgsql), Fluent API Configurations, Migrations.
  - Caching (Redis), gRPC Clients / Servers, External HTTP Clients (Nutrition API), Message Bus Pub/Sub (RabbitMQ).
- **Quy tắc vàng**:
  - Quản lý transaction, connection string, cấu hình EF Core Index, Foreign Keys nội bộ của DB.
  - Xử lý serialization/deserialization, cấu hình Polly retry policy cho các external call.

### 2.4. Presentation / API Layer (`{Service}.API`)
- **Trọng tâm**: Controllers / Minimal APIs, Middlewares, Dependency Injection Registrations, `Program.cs`, Swagger.
- **Quy tắc vàng**:
  - Controller phải giữ ở mức "Ultra-Thin": Chỉ nhận request -> validate -> gọi Application Service -> map kết quả sang HTTP Response chuẩn (`Result<T>`).
  - Không đặt câu lệnh `if/else` nghiệp vụ trong Controller.
  - Đăng ký Global Exception Handling Middleware để chuẩn hóa mã lỗi trả về.

---

## 3. Tiêu Chuẩn Kỹ Thuật & Môi Trường

### 3.1. C# 12 & .NET 8 Standards
- Luôn bật `<Nullable>enable</Nullable>` và `<ImplicitUsings>enable</ImplicitUsings>`.
- Sử dụng **Primary Constructors**, **File-scoped Namespaces**, **Pattern Matching**, và **Records** cho DTOs / Integration Events (đảm bảo immutability).
- Toàn bộ phương thức I/O (Database, Network, File) phải là **Asynchronous (`async`/`await`)**, luôn nhận và truyền `CancellationToken`.

### 3.2. PostgreSQL & EF Core Conventions
- **Naming Convention**: Toàn bộ Table, Column, Index, Constraint trong PostgreSQL phải theo chuẩn **`snake_case`** (sử dụng `.UseSnakeCaseNamingConvention()` của EF Core Npgsql).
- **Thời gian**: Bắt buộc lưu trữ dưới dạng **`timestamp with time zone` (UTC)**. Trong code C#, luôn sử dụng `DateTime.UtcNow`.
- **Database-per-Service**: Tuyệt đối **KHÔNG** tạo Foreign Key xuyên database giữa các microservices. Mọi liên kết liên dịch vụ chỉ được lưu bằng `UserId` (UUID/Guid) và tra cứu thông qua gRPC hoặc Event-Driven sync.
- **Index**: Mọi foreign key nội bộ, trường tìm kiếm thường xuyên (`user_id`, `created_at`, `status`) phải được đánh Index rõ ràng trong Fluent API Configuration.

### 3.3. Inter-Service Communication Standards
- **Đồng bộ (Synchronous - Low Latency)**: Sử dụng **gRPC** (Proto definition nằm tại `BuildingBlocks.Grpc`) cho việc đọc dữ liệu giữa các dịch vụ. Ví dụ: `Consultation Service` gọi gRPC sang `DietFasting Service` để lấy snapshot tiến độ dinh dưỡng của khách hàng.
- **Bất đồng bộ (Asynchronous - Event-Driven)**: Sử dụng **RabbitMQ** (đóng gói qua `BuildingBlocks.Messaging`) cho các luồng hành động phụ thuộc không cần phản hồi tức thì:
  - Khi `Job Service` quét đến giờ nhịn ăn -> Publish `FastingReminderTriggeredEvent`.
  - Khi `Consultation Service` gửi phiếu tư vấn -> Publish `AdviceSentIntegrationEvent`.
  - `Notification Service` lắng nghe các event này để ghi log và bắn email qua SMTP.

---

## 4. Quy Tắc Miền Nghiệp Vụ Cốt Lõi (Domain Invariants)

### 4.1. Fasting & Chu Kỳ FMD (5-Day Fasting Mimicking Diet)
1. **Fasting Session**:
   - Trạng thái hợp lệ: `Started` -> `InProgress` -> `Completed` hoặc `Cancelled`.
   - Một người dùng tại một thời điểm chỉ có tối đa **01** phiên nhịn ăn ở trạng thái `InProgress`.
2. **Chu kỳ FMD (5 ngày)**:
   - Ngày 1: Ngưỡng calo ~1.100 kcal (11% protein, 46% fat, 43% carb).
   - Ngày 2 - 5: Ngưỡng calo ~725 kcal (9% protein, 44% fat, 47% carb).
   - Khi ghi nhận hoặc validate log bữa ăn trong chu kỳ FMD, phải kiểm tra ngày hiện tại (`DayNumber` từ 1 đến 5). Nếu vượt quá ngưỡng Calo/Macro của ngày tương ứng, phải gắn cờ `ExceededThreshold = true` và kích hoạt cảnh báo, không âm thầm bỏ qua.

### 4.2. Nhật Ký Dinh Dưỡng & Blue Zones
- Khi tra cứu thực phẩm: Luôn kiểm tra cache Redis theo key `nutrition:food:{normalized_name}` trước khi gọi ra External Nutrition API.
- Thực đơn Blue Zones ưu tiên tỷ lệ đạm thực vật, các loại đậu, ngũ cốc nguyên hạt. Dữ liệu Macro cơ bản gồm: `Calories`, `ProteinGrams`, `FatGrams`, `CarbsGrams`, `FiberGrams`.

### 4.3. Phân Quyền & Bảo Mật (RBAC)
- Khai báo các Role: `User`, `Nutritionist`, `Admin`.
- Mọi endpoint phải kiểm tra Claims:
  - `User` chỉ có quyền xem/sửa dữ liệu chính mình (`UserId` từ JWT Token).
  - `Nutritionist` chỉ được xem dữ liệu của `User` khi có một buổi tư vấn (`ConsultationSession`) hợp lệ và đang hoạt động giữa hai bên.
  - `Admin` quản trị Master Data (FMD Rules, Meal Templates), không chỉnh sửa nhật ký cá nhân của User.

---

## 5. Chuẩn Hóa Response & Xử Lý Lỗi

Mọi API response phải tuân theo cấu trúc chuẩn `Result<T>` hoặc `PagedResult<T>` từ `BuildingBlocks.Common`.

### 5.1. Cấu Trúc Result Pattern
```csharp
public class Result<T>
{
    public bool IsSuccess { get; init; }
    public T? Data { get; init; }
    public string? ErrorCode { get; init; }
    public string? ErrorMessage { get; init; }
    public List<string>? ValidationErrors { get; init; }

    public static Result<T> Success(T data) => new() { IsSuccess = true, Data = data };
    public static Result<T> Failure(string code, string message) => new() { IsSuccess = false, ErrorCode = code, ErrorMessage = message };
    public static Result<T> ValidationFailure(List<string> errors) => new() { IsSuccess = false, ErrorCode = "VALIDATION_ERROR", ErrorMessage = "Dữ liệu không hợp lệ", ValidationErrors = errors };
}
```

### 5.2. HTTP Status Code Mapping
- `200 OK` / `201 Created`: Thao tác thành công kèm `Data`.
- `400 Bad Request`: Validation failure hoặc vi phạm quy tắc nghiệp vụ (Domain Invariants).
- `401 Unauthorized`: Token thiếu, hết hạn hoặc không hợp lệ.
- `403 Forbidden`: Người dùng không có quyền trên tài nguyên.
- `404 Not Found`: Không tìm thấy Entity theo Identifier.
- `500 Internal Server Error`: Lỗi hệ thống không lường trước (phải được ghi log đầy đủ kèm `CorrelationId`).

---

## 6. WARNINGS & ATTENTIONS (Quy Tắc Cấm & Cảnh Báo Sống Còn)

> ⚠️ **WARNING 1: TUYỆT ĐỐI KHÔNG VI PHẠM CHIỀU PHỤ THUỘC CỦA ONION ARCHITECTURE**
> - **CẤM**: Tầng `Domain` tham chiếu bất kỳ class nào của `Application`, `Infrastructure`, hay `API`.
> - **CẤM**: Tầng `Application` inject trực tiếp `DbContext` của EF Core. Application chỉ được dùng `IRepository` hoặc `IUnitOfWork`.
> - **CẤM**: Đưa logic nghiệp vụ vào Controller hoặc gRPC Handler.

> ⚠️ **WARNING 2: CẤM CROSS-DATABASE TRANSACTIONS & FOREIGN KEYS**
> - Không dùng `JOIN` bảng giữa các database khác nhau (VD: Không bao giờ query nối bảng từ `diet_db` sang `identity_db`).
> - Không tạo TransactionScope ôm nhiều database. Dữ liệu liên dịch vụ phải nhất quán theo cơ chế **Eventual Consistency** qua RabbitMQ.

> ⚠️ **WARNING 3: KHÔNG EXPOSE DOMAIN ENTITY RA NGOÀI API**
> - Bắt buộc map Domain Entity sang DTO / ViewModel trước khi trả về client. Tránh tình trạng lộ cấu trúc bảng, Circular Reference khi serialize JSON, hoặc Over-posting lỗ hổng bảo mật.

> ⚠️ **WARNING 4: TRÁNH BLOCKING CALLS VÀ RUNSYNC OVER ASYNC**
> - Tuyệt đối không dùng `.Result`, `.Wait()`, hay `Task.Run().Result`. Luôn sử dụng `await` tuần tự từ Controller đến Infrastructure để tránh ThreadPool Starvation.

> ⚠️ **WARNING 5: ĐẢM BẢO IDEMPOTENCY CHO BACKGROUND JOBS & MESSAGE CONSUMERS**
> - Các Consumer trên `Notification Service` và Scheduled Jobs trên `Job Service` (Hangfire) có thể nhận lại message trùng lặp (At-least-once delivery). Toàn bộ Consumer phải kiểm tra tính Idempotent (kiểm tra trạng thái bản ghi trước khi gửi email hoặc ghi DB).

---

## 7. Quy Trình 5 Bước Thực Thi Task Mới Dành Cho Agent

Khi nhận yêu cầu tạo mới hoặc chỉnh sửa chức năng, AI Agent phải thực hiện tuần tự theo quy trình sau:

1. **Bước 1: Domain Analysis & Modeling**
   - Xác định Aggregate Root, Entities, Value Objects cần thiết trong `{Service}.Domain`.
   - Định nghĩa quy tắc hợp lệ (Invariants) trong Entity method.
2. **Bước 2: Contract & Interface Definition**
   - Khai báo DTOs (Request/Response) và interface Service/Repository trong `{Service}.Application`.
   - Viết FluentValidation cho Request DTO.
3. **Bước 3: Infrastructure Implementation**
   - Cấu hình EF Core Fluent Mapping (`snake_case`, UTC datetime, Indexes) trong `{Service}.Infrastructure`.
   - Sinh file Migration tương ứng (nếu có thay đổi schema).
   - Triển khai Repository hoặc External Client (gRPC/HTTP/Redis/RabbitMQ).
4. **Bước 4: Application Use Case & API Wiring**
   - Viết Service / Handler thực thi use case, điều phối Entity và Repository.
   - Thêm Endpoint vào Controller/Minimal API tại `{Service}.API` với đầy đủ Auth filter và OpenAPI/Swagger summary.
5. **Bước 5: Cross-cutting Verification**
   - Kiểm tra logging, Result response wrapper, xử lý cancellation token, và đảm bảo không có cảnh báo vi phạm kiến trúc.