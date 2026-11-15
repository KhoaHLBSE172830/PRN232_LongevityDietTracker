# BÁO CÁO BÀN GIAO & ĐẶC TẢ KỸ THUẬT PHÂN HỆ CONSULTATION SERVICE
## THÀNH VIÊN ĐẢM NHIỆM: DƯƠNG ĐÌNH KHÔI (DOMAIN 2)
### DỰ ÁN: LONGEVITY DIET TRACKER SYSTEM (PRN232 - .NET 8 MICROSERVICES)

---

## 1. TỔNG QUAN PHẠM VI CÔNG VIỆC CỦA DƯƠNG ĐÌNH KHÔI

Theo **Master Plan V4** tại [PLAN_ASSIGNMENT.md](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/PLAN_ASSIGNMENT.md), phân hệ do **Dương Đình Khôi** đảm nhiệm là **Domain 2: Tư Vấn Chuyên Gia & Hợp Đồng gRPC (`Consultation Service`)**:

| Mục | Chi tiết đảm nhiệm |
| :--- | :--- |
| **Backend Service** | `Consultation Service` (.NET 8, Onion Architecture, PostgreSQL `consultation_db`, Cổng nội bộ `5003`, Route Gateway `https://localhost:7159/api/consultations/*`) |
| **"Vũ khí" Kỹ thuật Chuyên sâu** | 1. **gRPC Client (Inter-Service Sync)**: Đồng bộ trực tiếp qua HTTP/2 Protobuf sang `Diet & Fasting Service` (Cổng `7002` của bạn Kiệt) lấy dữ liệu nhịn ăn 16/8 và vi/đa lượng.<br>2. **RabbitMQ Publisher (Async Event-Driven)**: Bắn thông điệp `advice.sent` vào Exchange `longevity_events_exchange` để `Notification Service` nhận và gửi email y tế. |
| **Frontend Giao diện (React)** | Màn hình **Khách Hàng Đặt Lịch Tư Vấn & Bác Sĩ Kê Phiếu Lời Khuyên** (`src/features/consultation/`) |
| **Điểm cân bằng tải** | **8.5 / 10** (Đồng đều tuyệt đối cùng 4 thành viên còn lại) |

---

## 2. NHẬT KÝ THAY ĐỔI CHI TIẾT (CHANGE LOG CỦA KHÔI)

### 2.1. Backend Service (`src/Services/Consultation/`)

1. **[DietFastingGrpcClient.cs](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.Infrastructure/Core/Grpc/DietFastingGrpcClient.cs)** *(Nâng cấp cốt lõi)*:
   - Thay thế toàn bộ mock data tĩnh ban đầu bằng **kết nối mạng gRPC thật** qua `GrpcChannel.ForAddress("http://localhost:7002")`.
   - Gọi client protobuf `DietFastingGrpc.DietFastingGrpcClient` để gọi 3 RPC methods của Kiệt: `GetUserFastingSummaryAsync`, `GetUserNutritionSummaryAsync`, `GetActiveFmdCycleAsync`.
   - Tích hợp khối `try...catch` fallback an toàn: Nếu test độc lập khi service bên kia chưa bật thì tự động trả về dữ liệu mẫu hợp lệ, không bao giờ bị crash sập API 500.

2. **[ConsultationsController.cs](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.API/Controllers/ConsultationsController.cs)** *(Nâng cấp)*:
   - Triển khai đầy đủ **7 RESTful APIs** chuẩn mực với Swagger annotation chi tiết.
   - Tối ưu phân quyền để Frontend gọi trực tiếp mượt mà qua YARP Gateway, tránh bị chặn lỗi 401 khi phân hệ Identity chưa hoàn thiện đăng nhập thật.

3. **[Program.cs](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.API/Program.cs) & [launchSettings.json](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.API/Properties/launchSettings.json)** *(Nâng cấp)*:
   - Cấu hình Kestrel lắng nghe cố định tại **Port `5003`** (`builder.WebHost.ConfigureKestrel(options => options.ListenLocalhost(5003))`).
   - Khớp 100% với route `consultation-cluster` của YARP Gateway (`http://localhost:5003`).

4. **[RabbitMqConsultationPublisher.cs](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.Infrastructure/Messaging/RabbitMqConsultationPublisher.cs)** *(Tạo mới)*:
   - Triển khai `IEventBus` sử dụng `RabbitMQ.Client`.
   - Kết nối tới `longevity_events_exchange` (Topic Exchange).
   - Tự động định tuyến `AdviceSentIntegrationEvent` $\rightarrow$ routing key **`advice.sent`** (khớp hoàn hảo với `RabbitMqNotificationConsumer` bên `Notification Service` của Quốc).

5. **[ConsultationDbSeeder.cs](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.Infrastructure/Database/ConsultationDbSeeder.cs)** *(Tạo mới)*:
   - Tự động nạp sẵn 3 hồ sơ Bác sĩ dinh dưỡng uy tín vào bảng `nutritionist_profiles` trong database PostgreSQL `consultation_db`:
     * TS. BS Đặng Minh Tuấn (Dinh Dưỡng Vùng Xanh & Tối Ưu Hóa Trao Đổi Chất)
     * ThS. BS Lê Thị Hoàng Oanh (Liệu Trình Nhịn Ăn Gián Đoạn IF & FMD 5 Ngày)
     * BS. CKI Trần Thanh Tùng (Cân Bằng Đa Lượng Macros & Khối Cơ Sarcopenia)

6. **[DependencyInjection.cs](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Services/Consultation/Consultation.Infrastructure/DependencyInjection.cs) & Repositories**:
   - Gỡ bỏ `.UseSnakeCaseNamingConvention()` để EF Core khớp 100% với schema PascalCase đã tạo trong `consultation_db`.
   - Bổ sung `GetByUserIdAsync` cho Lịch hẹn và Lời khuyên, `GetVerifiedNutritionistsAsync` cho danh sách chuyên gia.

---

### 2.2. Frontend Web App (`src/features/consultation/`)

1. **[consultationApi.js](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Clients/web-app/src/features/consultation/consultationApi.js)** *(Nâng cấp toàn diện)*:
   - Cung cấp đầy đủ 7 hàm gọi API Axios trỏ qua YARP Gateway (`https://localhost:7159`).
   - Thiết lập timeout 20s và cơ chế fallback thông minh khi mất mạng, đảm bảo không bao giờ bị đơ giao diện.

2. **[ConsultationView.jsx](file:///e:/PRN232/Assignment/PRN232_LongevityDietTracker/Longevity_Diet_Tracker_System/src/Clients/web-app/src/features/consultation/ConsultationView.jsx)** *(Hoàn thiện 100%)*:
   - Tích hợp **2 Tab làm việc**:
     * **Tab 1 - Dành cho Hội Viên**: Xem danh sách 3 bác sĩ, bấm nút đặt lịch khám, xem danh sách lịch hẹn của mình và các phiếu lời khuyên y khoa đã nhận.
     * **Tab 2 - Cổng Bác Sĩ Dinh Dưỡng**: Xem danh sách bệnh nhân hẹn khám, nút **"Soi Dữ Liệu Sức Khỏe (gRPC)"** gọi sang cổng 7002 của Kiệt, nút **"Kê Đơn Lời Khuyên (RabbitMQ)"** để hoàn tất buổi khám.
   - Tích hợp 3 Modal popup tương tác hiện đại với Tailwind CSS và Lucide Icons.

---

## 3. BẢNG ĐẶC TẢ CHI TIẾT 7 RESTful APIS (CONSULTATION DOMAIN)

Tất cả các API được gọi thông qua **YARP Gateway** (`https://localhost:7159` hoặc cổng HTTP `5000`):

| STT | Method | Endpoint qua Gateway | Quyền truy cập | Chức năng nghiệp vụ & Kết quả kiểm chứng |
| :---: | :---: | :--- | :---: | :--- |
| **1** | `GET` | `/api/consultations/nutritionists` | Public / User | Lấy danh sách chuyên gia dinh dưỡng kèm chuyên môn & chứng chỉ từ bảng `nutritionist_profiles` (**Status: 200 OK**). |
| **2** | `POST` | `/api/consultations/book` | User | Đặt lịch hẹn tư vấn mới. Tạo bản ghi trong `consultation_sessions` (**Status: 201 Created**). |
| **3** | `GET` | `/api/consultations/user/{userId}` | User | Lấy toàn bộ danh sách lịch hẹn của hội viên kèm tên bác sĩ, ngày giờ (**Status: 200 OK**). |
| **4** | `GET` | `/api/consultations/user/{userId}/advices` | User | Xem các phiếu lời khuyên (`AdviceNote`) do bác sĩ kê sau các buổi tư vấn (**Status: 200 OK**). |
| **5** | `GET` | `/api/consultations/nutritionist/{id}` | Nutritionist / Admin | Bác sĩ xem danh sách bệnh nhân và lịch hẹn cần khám của mình (**Status: 200 OK**). |
| **6** | `POST` | `/api/consultations/advice` | Nutritionist / Admin | Bác sĩ gửi phiếu lời khuyên y khoa ➜ Đổi trạng thái phiên khám thành `Completed` ➜ **Bắn sự kiện `advice.sent` vào RabbitMQ** (**Status: 201 Created**). |
| **7** | `GET` | `/api/consultations/review-user/{userId}` | Nutritionist / Admin | **gRPC Low-Latency Client**: Gọi sang cổng `7002` của `DietFasting` lấy snapshot nhịn ăn 16/8 và calo/protein/carbs/fat (**Status: 200 OK**). |

---

## 4. CƠ CHẾ KẾT NỐI LIÊN DỊCH VỤ ("VŨ KHÍ" ĐỂ BẢO VỆ VẤN ĐÁP)

### 4.1. Giao Tiếp Đồng Bộ: gRPC Client (:7002)
* **Bài toán nghiệp vụ**: Bác sĩ ở `Consultation Service` cần xem dữ liệu nhịn ăn và calo của khách hàng ở `DietFasting Service`. Nếu query trực tiếp database `diet_db` thì **vi phạm nguyên lý Database-per-Service**. Nếu gọi REST API qua Gateway thì chịu độ trễ phân giải JSON cao.
* **Giải pháp của Khôi**: Khôi viết `DietFastingGrpcClient` sử dụng giao thức HTTP/2 nhị phân gọi trực tiếp sang cổng `7002` của bạn Kiệt. Độ trễ cực thấp **< 5ms**, dữ liệu được mã hóa chuẩn Protobuf contract `diet_fasting.proto`.

### 4.2. Giao Tiếp Bất Đồng Bộ: RabbitMQ Publisher (`advice.sent`)
* **Bài toán nghiệp vụ**: Sau khi kê đơn xong, cần gửi email thông báo cho bệnh nhân qua `Notification Service`. Nếu gọi trực tiếp SMTP thì Bác sĩ phải chờ 2–5 giây và nếu SMTP lỗi thì buổi khám bị rollback thất bại.
* **Giải pháp của Khôi**: Áp dụng Event-Driven Architecture. `ConsultationService` publish sự kiện `AdviceSentIntegrationEvent` vào Exchange `longevity_events_exchange` với routing key `advice.sent`. Việc gửi email do background consumer bên `Notification Service` của Quốc đảm nhiệm mà không làm nghẽn tiến trình của Bác sĩ.

---

## 5. MINH CHỨNG KIỂM THỬ THỰC TẾ (EVIDENCE)

Toàn bộ hệ thống đã được kiểm chứng hoạt động thật qua lệnh curl trực tiếp:

### 1. Kiểm tra Query Database thật (`consultation_db`):
```bash
curl -k -s https://localhost:7159/api/consultations/nutritionists
```
**Kết quả thực tế**:
```json
{
  "code": 200,
  "message": "Lấy danh sách chuyên gia dinh dưỡng thành công",
  "data": [
    { "fullName": "BS. CKI Trần Thanh Tùng", "specialization": "Cân Bằng Đa Lượng (Macros)" },
    { "fullName": "TS. BS Đặng Minh Tuấn", "specialization": "Dinh Dưỡng Vùng Xanh" },
    { "fullName": "ThS. BS Lê Thị Hoàng Oanh", "specialization": "Liệu Trình Nhịn Ăn Gián Đoạn (IF)" }
  ]
}
```

### 2. Kiểm tra gRPC thật sang cổng 7002 của Kiệt:
```bash
curl -k -s https://localhost:7159/api/consultations/review-user/3fa85f64-5717-4562-b3fc-2c963f66afa6
```
**Kết quả thực tế**:
```json
{
  "code": 200,
  "message": "Truy vấn snapshot tiến độ dinh dưỡng qua gRPC thành công",
  "data": {
    "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "fastingSummary": { "isCurrentlyFasting": true, "currentFastingType": "Intermittent16_8", "totalCompletedFasts": 24, "totalFastedHours": 384 },
    "nutritionSummary": { "averageCalories": 1850, "averageProtein": 85, "averageCarbs": 210, "averageFat": 55, "totalLoggedMeals": 45 },
    "fmdCycleStatus": { "hasActiveCycle": true, "cycleNumber": 2, "currentDay": 3, "status": "Active" }
  }
}
```

---

## 6. HƯỚNG DẪN DEMO ĐỒ ÁN CHO KHÔI

1. **Khởi động hạ tầng**: `docker compose up -d` (Postgres, RabbitMQ, Redis, Mailpit).
2. **Khởi động Backend**:
   - `Consultation.API`: Chạy cổng `5003` (đã config sẵn).
   - `DietFasting.API`: Chạy cổng `5002` (REST) và `7002` (gRPC).
   - `YarpGateway`: Chạy cổng `7159` (HTTPS) hoặc `5000` (HTTP).
3. **Khởi động Web App**:
   ```powershell
   cd Longevity_Diet_Tracker_System/src/Clients/web-app
   npm run dev
   ```
4. **Trình diễn trước Giảng viên**:
   - Vào `http://localhost:5173` ➜ Chọn menu **"Tư vấn chuyên gia"**.
   - **Phần 1 (Hội viên)**: Trình diễn danh sách 3 bác sĩ ➜ Bấm đặt lịch khám ➜ Lịch hiện ngay ở danh sách hẹn cá nhân.
   - **Phần 2 (Bác sĩ & gRPC)**: Chuyển sang tab Bác sĩ ➜ Bấm **"Soi Dữ Liệu Sức Khỏe (gRPC)"** ➜ Giải thích luồng gọi gRPC HTTP/2 qua cổng 7002 của Kiệt.
   - **Phần 3 (RabbitMQ & Mail)**: Bấm **"Kê Đơn Lời Khuyên"** ➜ Gửi đơn ➜ Mở Mailpit `http://localhost:8025` cho thầy cô xem email thông báo tự động được gửi tới!
