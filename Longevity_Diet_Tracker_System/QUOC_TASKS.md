# KẾ HOẠCH THỰC THI CHI TIẾT CỦA TRẦN PHẠM KHÁNH QUỐC (`QUOC_TASKS.md`)
## DỰ ÁN: LONGEVITY DIET TRACKER SYSTEM (PRN232)

> **Thành viên phụ trách**: Trần Phạm Khánh Quốc  
> **Nhánh Git làm việc**: `quoc` (tách từ `dev` — đã đồng bộ toàn bộ phần của Kiệt tại commit `2b00280`)  
> **Đích Merge (Pull Request)**: `quoc` $\rightarrow$ `dev`  
> **Điểm tải phân bổ**: **8.5 / 10** (Cân đối 100% theo `PLAN_ASSIGNMENT.md`)  
> **Căn cứ quy chuẩn**: `PLAN_ASSIGNMENT.md`, `AGENT.md`, `README.md`, `TASK_LIST.md`

---

## 1. TỔNG QUAN PHẠM VI CÔNG VIỆC CỦA QUỐC

Theo `PLAN_ASSIGNMENT.md` (Mục 2, 3, 4, 8, 9, 10, 11) và `TASK_LIST.md`, Quốc chịu trách nhiệm trọn vẹn cho **4 mảng công việc chính**:

| STT | Hạng mục | Chi tiết phạm vi đảm nhiệm | Đầu ra kỹ thuật |
| :-: | :--- | :--- | :--- |
| **1** | **Backend FMD & Admin Rules**<br>(`DietFasting Service` - Port `5002`) | - Chu kỳ nhịn ăn giả lập FMD 5 ngày (`FmdController`: 2 APIs)<br>- Quản trị định mức Calo/Macro FMD (`FmdRulesController`: 2 APIs)<br>- Phối hợp cảnh báo vượt ngưỡng calo FMD (`Invariant 4.1`: Ngày 1 = 1100 kcal, Ngày 2–5 = 725 kcal) | **4 REST APIs** trên `DietFasting.API` + Database `diet_db` |
| **2** | **Backend Notification, RabbitMQ Consumer & SMTP Mailpit**<br>(`Notification Service` - Port `5004`) | - Quản lý lịch sử & tùy chọn thông báo (`NotificationsController`: 4 APIs)<br>- Background Worker `RabbitMqNotificationConsumer` lắng nghe queue `notification_events_queue` (`notification.#`, `fmd.#`, `advice.#`)<br>- Đảm bảo **Idempotency** qua `EventId` (`AGENT.md` Warning 5)<br>- Gửi email HTML qua `SmtpEmailService` tới **Mailpit** (`:1025` / Web UI `:8025`) | **4 REST APIs** trên `Notification.API` + Database `notification_db` + Email trên Mailpit |
| **3** | **Frontend Lộ Trình FMD 5 Ngày & Hộp Thư Thông Báo**<br>(`Web Client` - Port `5173`) | - Nối API thực tế trong `src/Clients/web-app/src/features/fmd/fmdApi.js`<br>- Hoàn thiện giao diện `src/Clients/web-app/src/features/fmd/FmdView.jsx` (Kích hoạt chu kỳ FMD, hiển thị ngày hiện tại 1–5, định mức calo và hộp thư thông báo sức khỏe) | Tương tác mượt mà qua YARP Gateway (`https://localhost:7159`) |
| **4** | **Vẽ Sơ Đồ Kiến Trúc C3 & C4**<br>(`docs/diagrams/`) | - **C3**: `Notification Service` Component Diagram (`TASK-3.4`)<br>- **C4**: `Notification.Domain` Class Diagram (`TASK-3.4`)<br>- **C4**: `DietFasting.Domain` Class Diagram (`TASK-1.5`) | **3 bộ sơ đồ** (`.mmd` + `.png` $\ge$ 1600px) trong `docs/diagrams/` |

---

## 2. ĐẶC TẢ 8 REST APIs & CÁC SỰ KIỆN RABBITMQ QUỐC PHỤ TRÁCH

### 2.1. Bảng 4 REST APIs thuộc `DietFasting Service` (Port `5002` — Qua Gateway `https://localhost:7159`)
| Method | Endpoint qua Gateway | Target Controller (`DietFasting.API`) | Request Body / Params | Nghiệp vụ & Quy tắc (`AGENT.md`) |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/fmd/start` | `FmdController.StartCycle` | `StartFmdCycleDto` (`UserId`, `StartDate`) | Kích hoạt chu kỳ FMD 5 ngày ở trạng thái `Active`, `CurrentDay = 1`. Trả lỗi `409 Conflict` nếu User đang có chu kỳ FMD `Active`. |
| `GET` | `/api/fmd/user/{userId}/active` | `FmdController.GetActiveCycle` | Route: `userId` (`Guid`) | Lấy chu kỳ FMD đang chạy của người dùng kèm `CurrentDay` (1 $\rightarrow$ 5) và `TargetCaloriesToday` (1100 hoặc 725 kcal). |
| `GET` | `/api/admin/fmd-rules` | `FmdRulesController.GetAllRules` | Header: `Bearer Token` (`Role = Admin`) | Xem danh sách cấu hình định mức Calo & % Protein/Fat/Carb cho 5 ngày FMD. |
| `PUT` | `/api/admin/fmd-rules/{dayNumber}` | `FmdRulesController.UpdateRule` | Route: `dayNumber` (`1..5`)<br>Body: `UpdateFmdRuleRequest` | Admin cập nhật (hoặc khởi tạo) định mức `MaxCalories` và tỷ lệ Macro cho ngày FMD tương ứng. |

### 2.2. Bảng 4 REST APIs thuộc `Notification Service` (Port `5004` — Qua Gateway `https://localhost:7159`)
| Method | Endpoint qua Gateway | Target Controller (`Notification.API`) | Request Body / Params | Nghiệp vụ & Quy tắc (`AGENT.md`) |
| :---: | :--- | :--- | :--- | :--- |
| `POST` | `/api/notifications/send` | `NotificationsController.SendNotification` | `SendNotificationRequest` (`UserId`, `Recipient`, `Subject`, `Body`, `Channel`, `EventId`) | Kiểm tra Idempotency theo `EventId` $\rightarrow$ Gửi email qua SMTP Mailpit $\rightarrow$ Lưu `NotificationLog` (`Sent` / `Failed`). |
| `GET` | `/api/notifications/user/{userId}` | `NotificationsController.GetUserNotifications` | Route: `userId` (`Guid`) | Lấy lịch sử 50 thông báo gần nhất của người dùng (sắp xếp theo `CreatedAt` giảm dần). |
| `GET` | `/api/notifications/preferences/{userId}` | `NotificationsController.GetPreferences` | Route: `userId` (`Guid`) | Lấy cấu hình bật/tắt nhận email thông báo, nhắc nhở nhịn ăn, lời khuyên chuyên gia (tự tạo mặc định `true` nếu chưa có). |
| `PUT` | `/api/notifications/preferences/{userId}` | `NotificationsController.UpdatePreferences` | Route: `userId` (`Guid`)<br>Body: `UpdatePreferenceRequest` | Cập nhật tùy chọn nhận thông báo của người dùng (`UpdatePreferences`). |

### 2.3. Các Integration Events RabbitMQ mà `RabbitMqNotificationConsumer` của Quốc xử lý
* **Exchange**: `longevity_events_exchange` (`type: topic`, `durable: true`)
* **Queue**: `notification_events_queue` (`durable: true`, `autoAck: false`)
* **Bindings & Luồng xử lý**:
  1. `fmd.alert` (`FmdCycleAlertIntegrationEvent` — bắn từ `MealService` khi log bữa ăn vượt ngưỡng calo ngày FMD):
     - Gửi email cảnh báo đỏ qua SMTP tới Mailpit (`http://localhost:8025`) và lưu `NotificationLog` với `EventId = fmdEvent.Id.ToString()`.
  2. `advice.sent` (`AdviceSentIntegrationEvent` — bắn từ `Consultation Service` khi Bác sĩ gửi phiếu lời khuyên):
     - Gửi email phiếu lời khuyên dinh dưỡng qua SMTP tới Mailpit và lưu `NotificationLog` với `EventId = adviceEvent.Id.ToString()`.
  3. `notification.email` (`SendEmailNotificationIntegrationEvent` — bắn từ `FastingReminderService` của Kiệt khi phiên nhịn ăn sắp hoàn tất):
     - Gửi email nhắc nhở nhịn ăn tới `emailEvent.RecipientEmail` và lưu `NotificationLog` với `EventId = emailEvent.Id.ToString()`.

---

## 3. QUY TẮC SỐNG CÒN & NGUYÊN TẮC TRÁNH CONFLICT VỚI KIỆT

### 3.1. Tuân Thủ Nghiêm Ngặt 5 Cảnh Báo Trong `AGENT.md`
1. **WARNING 1 (Onion Architecture)**:
   - Chiều phụ thuộc bắt buộc: `API` $\rightarrow$ `Infrastructure` $\rightarrow$ `Application` $\rightarrow$ `Domain`.
   - `Domain` không tham chiếu EF Core, ASP.NET Core hay thư viện ngoài. Logic chuyển trạng thái nằm trong Entity (`FmdCycle.Create()`, `FmdCycle.AdvanceDay()`, `FmdCycle.CheckThreshold()`, `FmdRule.UpdateRule()`, `NotificationLog.MarkAsSent()`, `NotificationLog.MarkAsFailed()`, `NotificationPreference.UpdatePreferences()`).
   - `Application` không inject `DbContext`, chỉ gọi qua `IRepository` và `IUnitOfWork`.
   - `Controller` giữ ở mức Ultra-Thin, không chứa logic nghiệp vụ.
2. **WARNING 2 (Database-per-Service & Snake Case)**:
   - Không tạo Foreign Key xuyên database (`diet_db` và `notification_db` độc lập hoàn toàn, chỉ lưu `UserId` kiểu `Guid`).
   - Toàn bộ bảng/cột trong PostgreSQL phải theo chuẩn `snake_case` (`.UseSnakeCaseNamingConvention()`) và thời gian dùng `DateTime.UtcNow` (`timestamp with time zone`).
3. **WARNING 3 (Không Expose Domain Entity)**:
   - Luôn map sang DTO (`FmdCycleResponseDto`, `FmdRuleDto`, `NotificationLogResponse`, `NotificationPreferenceDto`) và bọc trong cấu trúc chuẩn `SuccessResp` / `Result<T>`.
4. **WARNING 4 (Async/Await & CancellationToken)**:
   - Tuyệt đối không dùng `.Result` hay `.Wait()`.
5. **WARNING 5 (Idempotency Cho Consumer)**:
   - Luôn kiểm tra `_logRepository.HasEventBeenProcessedAsync(request.EventId)` trước khi gửi mail hoặc ghi DB để tránh gửi trùng lặp.

### 3.2. Quy Tắc Phối Hợp Với Phần Của Kiệt (KHÔNG SỬA LOGIC CỦA KIỆT)
Nhánh `quoc` đã được tạo từ nhánh `dev` (commit `2b00280` — đã bao gồm toàn bộ code Kiệt vừa hoàn thành). Để **không xảy ra conflict và không làm hỏng bất kỳ tính năng nào của Kiệt**:

> [!CAUTION]
> **NGUYÊN TẮC BẤT DI BẤT DỊCH KHI LÀM VIỆC TRONG `DietFasting`**:
> 1. **TUYỆT ĐỐI KHÔNG SỬA** bất kỳ dòng logic nào của Kiệt trong:
>    - `FastingController` (trong `DietControllers.cs`)
>    - `FastingService` (trong `DietApplicationServices.cs`)
>    - `IFastingService` (trong `IDietServices.cs`)
>    - `FastingSession` (trong `DietEntities.cs`)
>    - `FastingSessionConfiguration` (trong `DietConfigurations.cs`)
>    - `FastingReminderService.cs`, `IReliableEventBus.cs`, `RedisReminderDedupStore.cs`, `DietFastingGrpcService.cs`, `RabbitMqEventBus.cs`, `DietDbContext.cs`.
> 2. Trong các file dùng chung của `DietFasting`, Quốc **chỉ được thêm/chỉnh sửa bên trong phạm vi các class FMD** (`FmdController`, `FmdRulesController`, `FmdService`, `FmdRuleService`, `IFmdService`, `IFmdRuleService`, `FmdCycle`, `FmdRule`).
> 3. Trong `FastingScheduleTriggerConsumer.cs`, nếu Quốc đăng ký thêm handler cho job chuyển ngày FMD (`JobName == "FmdCycleDailyJob"`), **chỉ được nối thêm nhánh `else if`** vào khối xử lý `trigger.JobName`, giữ nguyên 100% nhánh `if (trigger.JobName == FastingCheckJobName)` của Kiệt.
> 4. **Không sửa** thư mục `src/Clients/web-app/src/shared/` và các thư mục `features/{auth|meals|fasting|consultation}/`. Quốc chỉ code Frontend trong `src/Clients/web-app/src/features/fmd/`.

---

## 4. DANH SÁCH CÁC VIỆC CẦN LÀM CỦA QUỐC (CHECKLIST THỰC THI)

### Việc 1: Tạo nhánh `quoc` từ `dev` (Đã có code của Kiệt)
- [x] Đảm bảo đang đứng ở commit mới nhất của `dev` (`2b00280 các phần của Kiệt`) và tạo nhánh `quoc`:
  ```bash
  git checkout dev
  git pull origin dev
  git checkout -b quoc
  ```

---

### Việc 2: Hoàn thiện & Khắc phục các điểm tồn đọng ở `Notification Service` (Port `5004`)
Qua đối chiếu Mục 10 & Mục 11 của `PLAN_ASSIGNMENT.md` với source code hiện tại của `Notification`:

- [x] **2.1. Đồng bộ cổng chạy `Notification.API` về `5004`**:
  - *Hiện trạng*: `Notification.API/Properties/launchSettings.json` đang cấu hình cổng `5264`, trong khi `YarpGateway` (`appsettings.json` dòng 97) định tuyến `/api/notifications/{**catch-all}` tới `http://localhost:5004`, và `README.md` / `AGENT.md` quy định cổng `5004`.
  - *Cách làm*: Cấu hình Kestrel trong `Notification.API/Program.cs` (mặc định `Ports:Http = 5004`) và cập nhật `launchSettings.json` về `http://localhost:5004` để gọi trực tiếp hay gọi qua YARP Gateway (`https://localhost:7159/api/notifications/*`) đều hoạt động 100%.

- [x] **2.2. Sinh lại Migration `InitialNotificationDb` chuẩn `snake_case` và đầy đủ cột `event_id`**:
  - *Hiện trạng* (Cảnh báo tại Mục 11.1 `PLAN_ASSIGNMENT.md`): File migration cũ `20261109192809_InitialNotificationDb.cs` đang tạo tên cột PascalCase (`"Id"`, `"UserId"`, `"Recipient"`...) và **thiếu hẳn cột `event_id` (`EventId`)** cũng như index `ix_notification_logs_event_id`. Khi chạy với `.UseSnakeCaseNamingConvention()`, PostgreSQL sẽ báo lỗi `42703: column n.id does not exist` hoặc `column n.event_id does not exist`.
  - *Cách làm*:
    1. Xóa thư mục `src/Services/Notification/Notification.Infrastructure/Migrations/` cũ.
    2. Chạy lệnh tạo lại migration chuẩn `snake_case`:
       ```bash
       dotnet ef migrations add InitialNotificationDb --project src/Services/Notification/Notification.Infrastructure --startup-project src/Services/Notification/Notification.API
       ```
    3. Cập nhật vào `notification_db`:
       ```bash
       dotnet ef database drop --project src/Services/Notification/Notification.Infrastructure --startup-project src/Services/Notification/Notification.API --force
       dotnet ef database update --project src/Services/Notification/Notification.Infrastructure --startup-project src/Services/Notification/Notification.API
       ```
    4. Ngoài ra trong `Notification.Infrastructure/Repository/NotificationRepositories.cs` (dòng 50), kiểm tra `FindByIdAsync` để tránh lỗi case-sensitive nếu cần.

- [x] **2.3. Nâng cấp `RabbitMqNotificationConsumer` để gửi Email thật vào Mailpit cho `fmd.alert` & `advice.sent`, và tự động kết nối lại RabbitMQ**:
  - *Hiện trạng*:
    1. Trong `RabbitMqNotificationConsumer.cs` (dòng 108–135), hai sự kiện `fmd.alert` (`FmdCycleAlertIntegrationEvent`) và `advice.sent` (`AdviceSentIntegrationEvent`) đang truyền `NotificationChannel.InApp` vào `SendAndLogNotificationAsync`. Trong khi đó `NotificationService.SendAndLogNotificationAsync` chỉ gửi email qua `SmtpEmailService` và gọi `log.MarkAsSent()` khi `Channel == NotificationChannel.Email`! Hệ quả là khi test kịch bản Demo Workflow 2 (vượt ngưỡng calo FMD) và Workflow 3 (bác sĩ gửi lời khuyên), **email không được gửi tới Mailpit (`http://localhost:8025`)** và bản ghi `NotificationLog` bị treo ở trạng thái `Pending`.
    2. `StartAsync` chỉ thử kết nối RabbitMQ **một lần duy nhất** lúc khởi động; nếu RabbitMQ khởi động chậm hơn `Notification.API` thì consumer bị idle vĩnh viễn (Mục 10.1 `PLAN_ASSIGNMENT.md`).
  - *Cách làm*:
    1. Đổi xử lý `fmd.alert` và `advice.sent` sang `NotificationChannel.Email` kèm nội dung HTML chuẩn y tế Blue Zones / FMD (vẫn lưu vào `notification_logs` với trạng thái `Sent` để hiển thị trên cả Hộp thư Web lẫn Mailpit `:8025`).
    2. Thêm binding `consultation.#` để nhận cả `ConsultationBookedIntegrationEvent` (`consultation.booked`) gửi email xác nhận đặt lịch tư vấn (Mục 10.7 `PLAN_ASSIGNMENT.md`).
    3. Chuyển vòng lặp kết nối RabbitMQ vào `ExecuteAsync` với cơ chế tự động retry mỗi 5–10 giây nếu broker chưa sẵn sàng (giống pattern chuẩn trong `DietFasting`), đảm bảo bật service thứ tự nào cũng tự kết nối được.
    4. Trong `NotificationService.SendAndLogNotificationAsync`, nếu `Channel != NotificationChannel.Email` (ví dụ `InApp` hoặc `Push`), vẫn gọi `log.MarkAsSent()` để trạng thái không bị kẹt ở `Pending`, đồng thời kiểm tra `NotificationPreference` (`EmailNotificationsEnabled`) của User.

---

### Việc 3: Hoàn thiện Module FMD & Admin FMD Rules trong `DietFasting Service` (Port `5002`)
> **Lưu ý**: Tuyệt đối chỉ thêm/chỉnh sửa trong phạm vi class FMD, không đụng vào code Fasting của Kiệt.

- [ ] **3.1. Tạo lại `diet_db` từ Migration mới của Kiệt (Mục 10.5 & 11.1 `PLAN_ASSIGNMENT.md`)**:
  ```bash
  dotnet ef database drop --project src/Services/DietFasting/DietFasting.Infrastructure --startup-project src/Services/DietFasting/DietFasting.API --force
  dotnet ef database update --project src/Services/DietFasting/DietFasting.Infrastructure --startup-project src/Services/DietFasting/DietFasting.API
  ```

- [x] **3.2. Chuẩn hóa `FmdController`, `FmdService` & `FmdRuleService`**:
  - Trong `FmdController` (`DietControllers.cs`):
    - Hỗ trợ lấy `UserId` từ JWT Token (`ClaimTypes.NameIdentifier` / `"sub"`) nếu `dto.UserId == Guid.Empty`, đồng thời kiểm tra quyền sở hữu dữ liệu theo `AGENT.md` 4.3.
  - Trong `FmdService` (`DietApplicationServices.cs`):
    - Chuẩn hóa `StartDate` về UTC (`DateTime.SpecifyKind(..., DateTimeKind.Utc)`) hoặc mặc định `DateTime.UtcNow` nếu client gửi `default`, tránh lỗi Npgsql `Cannot write DateTime with Kind=Unspecified to PostgreSQL type 'timestamp with time zone'`.
  - Trong `FmdRuleService` (`DietApplicationServices.cs`):
    - Khi gọi `GetAllRulesAsync()`, nếu bảng `fmd_rules` chưa có dữ liệu, tự động seed 5 quy tắc chuẩn Dr. Valter Longo (`AGENT.md` 4.1):
      * Ngày 1: `1100 kcal` (11% Protein, 46% Fat, 43% Carb) — *Ngày Khởi Động: Chuyển đổi năng lượng*.
      * Ngày 2–5: `725 kcal` (9% Protein, 44% Fat, 47% Carb) — *Kích hoạt Autophagy & Tái tạo tế bào gốc*.
  - Trong `IFmdService` / `FmdService` & `FastingScheduleTriggerConsumer.cs` (Mục 10.2 `PLAN_ASSIGNMENT.md`):
    - Thêm method `AdvanceActiveCyclesAsync(CancellationToken)` trong `IFmdService` / `FmdService` để chuyển ngày (`AdvanceDay()`) cho các chu kỳ FMD đang `Active`.
    - Trong `FastingScheduleTriggerConsumer.cs`, thêm nhánh `else if (trigger.JobName == "FmdCycleDailyJob")` gọi `fmdService.AdvanceActiveCyclesAsync(cancellationToken)` (giữ nguyên 100% nhánh `if (trigger.JobName == FastingCheckJobName)` của Kiệt).

---

### Việc 4: Nối API Frontend cho Màn hình FMD (`src/Clients/web-app/src/features/fmd/`)
> **Lưu ý**: Chỉ chỉnh sửa 2 file `fmdApi.js` và `FmdView.jsx` trong `src/Clients/web-app/src/features/fmd/`.

- [x] **4.1. Hoàn thiện `src/Clients/web-app/src/features/fmd/fmdApi.js`**:
  - Sửa `startCycle` truyền đúng DTO `{ userId: DEMO_USER.id, startDate: new Date().toISOString() }`.
  - Giữ và chuẩn hóa `getActiveCycle(userId)` (`GET /api/fmd/user/{userId}/active`) và `getRules()` (`GET /api/admin/fmd-rules`).
  - Thêm các hàm gọi `Notification Service` qua Gateway:
    - `getUserNotifications(userId)` $\rightarrow$ `GET /api/notifications/user/${userId}`
    - `getPreferences(userId)` $\rightarrow$ `GET /api/notifications/preferences/${userId}`
    - `updatePreferences(userId, prefs)` $\rightarrow$ `PUT /api/notifications/preferences/${userId}`
  - Giữ cơ chế Mock Fallback an toàn để khi chưa bật Backend hoặc chưa có JWT Token thì giao diện vẫn hoạt động mượt mà, không bao giờ lỗi trắng trang.

- [x] **4.2. Hoàn thiện `src/Clients/web-app/src/features/fmd/FmdView.jsx`**:
  - Gắn `useState` và `useEffect` tải thông tin chu kỳ FMD đang chạy (`activeCycle`), danh sách định mức 5 ngày (`rules`), và danh sách thông báo sức khỏe (`notifications`).
  - Gắn sự kiện `onClick={handleStartCycle}` cho nút **"Bắt Đầu Chu Kỳ FMD 5 Ngày Mới"** $\rightarrow$ gọi `fmdApi.startCycle()`, cập nhật trạng thái chu kỳ Ngày 1 $\rightarrow$ 5 và hiển thị thông báo xác nhận.
  - Làm nổi bật (highlight) ngày hiện tại (`activeCycle.currentDay`) trên Lộ trình 5 ngày FMD.
  - Hiển thị danh sách **Hộp Thư Thông Báo Sức Khỏe & Cảnh Báo Calo FMD** ngay trên màn hình để khi giảng viên chấm có thể thấy cả thông báo In-App trên Web lẫn Email trong Mailpit (`http://localhost:8025`).

---

### Việc 5: Vẽ 3 Sơ Đồ Kiến Trúc C3 & C4 (`Longevity_Diet_Tracker_System/docs/diagrams/`)
Theo Mục 9.2, 9.3, 9.4 của `PLAN_ASSIGNMENT.md`, Quốc phụ trách 3 sơ đồ đặt tại `Longevity_Diet_Tracker_System/docs/diagrams/`:

- [x] **5.1. `[C3] Component Diagram – Notification Service`** (`C3_Notification.mmd` & `C3_Notification.png`):
  - Chia 4 tầng Onion: `Notification.API` (`NotificationsController`) $\rightarrow$ `Notification.Application` (`INotificationService`/`NotificationService`, `IEmailService`, `INotificationLogRepository` có `HasEventBeenProcessedAsync`, `INotificationPreferenceRepository`) $\rightarrow$ `Notification.Infrastructure` (`NotificationDbContext`, Repositories, `RabbitMqNotificationConsumer`, `SmtpEmailService`) $\rightarrow$ `Notification.Domain` (`NotificationLog`, `NotificationPreference`, Enums).
  - Thể hiện rõ 2 luồng vào: (1) HTTP từ YARP Gateway; (2) AMQP bất đồng bộ từ RabbitMQ Exchange `longevity_events_exchange` $\rightarrow$ Queue `notification_events_queue` (`notification.#`, `advice.#`, `fmd.#`, `consultation.#`) $\rightarrow$ Kiểm tra Idempotency (`EventId`) $\rightarrow$ Gửi SMTP ra Mailpit `:1025` & lưu `notification_db`.
- [x] **5.2. `[C4] Code / Class Diagram – Notification Domain`** (`C4_Notification.mmd` & `C4_Notification.png`):
  - Vẽ `BaseEntity`, `NotificationLog` (có `EventId`, `MarkAsSent()`, `MarkAsFailed(error)`), `NotificationPreference` (`UpdatePreferences(...)`), `NotificationStatus`, `NotificationChannel` và sơ đồ trạng thái `Pending -> Sent | Failed`. Ghi chú rõ `UserId` không có FK xuyên service (Warning 2).
- [x] **5.3. `[C4] Code / Class Diagram – DietFasting Domain`** (`C4_DietFasting.mmd` & `C4_DietFasting.png`):
  - Vẽ đầy đủ `BaseEntity`, `MealLog`, `MealFoodItem`, `FastingSession`, `FmdCycle`, `FmdRule`, `MealTemplate` cùng 4 Enums (`MealType`, `FastingType`, `FastingStatus`, `FmdStatus`), thể hiện rõ cặp nghiệp vụ `FmdCycle.CheckThreshold()` $\leftrightarrow$ `MealLog.MarkThresholdExceeded()` (Invariant 4.1).

---

## 5. HƯỚNG DẪN TEST CHI TIẾT KHI HOÀN THÀNH (STEP-BY-STEP TESTING GUIDE)

### Bước 1: Kiểm tra Build Toàn Hệ Thống
Tại thư mục `Longevity_Diet_Tracker_System`, chạy lệnh:
```bash
dotnet build Longevity_Diet_Tracker_System.sln
```
👉 **Kết quả kỳ vọng**: `Build succeeded. 0 Error(s)`.

### Bước 2: Khởi động Hạ tầng Docker & Cập nhật Database
```bash
# 1. Bật 4 container hạ tầng (Postgres 5432, Redis 6379, RabbitMQ 5672/15672, Mailpit 1025/8025)
docker compose up -d

# 2. Tạo lại schema chuẩn snake_case cho diet_db và notification_db
dotnet ef database drop --project src/Services/DietFasting/DietFasting.Infrastructure --startup-project src/Services/DietFasting/DietFasting.API --force
dotnet ef database update --project src/Services/DietFasting/DietFasting.Infrastructure --startup-project src/Services/DietFasting/DietFasting.API

dotnet ef database drop --project src/Services/Notification/Notification.Infrastructure --startup-project src/Services/Notification/Notification.API --force
dotnet ef database update --project src/Services/Notification/Notification.Infrastructure --startup-project src/Services/Notification/Notification.API
```

### Bước 3: Khởi chạy các Microservices (Lưu ý: Bật RabbitMQ trước khi bật Notification.API)
Mở các terminal hoặc chạy Multiple Startup Projects:
```bash
# Terminal 1: Notification Service (Port 5004)
dotnet run --project src/Services/Notification/Notification.API

# Terminal 2: Diet & Fasting Service (Port 5002 HTTP / 7002 gRPC)
dotnet run --project src/Services/DietFasting/DietFasting.API

# Terminal 3: Job Service Hangfire (Port 5005)
dotnet run --project src/Services/JobService/JobService.API

# Terminal 4: Identity Service (Port 5001) & YARP Gateway (Port 5000 / 7159)
dotnet run --project src/Services/Identity/Identity.API
dotnet run --project src/ApiGateways/YarpGateway
```

### Bước 4: Kịch Bản Test 8 APIs & Luồng Demo Sáng Thứ Hai (Workflow 2)
1. **Lấy JWT Token**:
   - Đăng ký/Đăng nhập qua `POST http://localhost:5001/api/auth/register` & `/api/auth/login` để lấy `accessToken` và `userId`.
2. **Test FMD Rules (`GET /api/admin/fmd-rules` & `PUT /api/admin/fmd-rules/1`)**:
   - Kiểm tra trả về đủ 5 ngày định mức (Ngày 1: `1100 kcal`, Ngày 2–5: `725 kcal`).
3. **Test Bắt đầu Chu kỳ FMD 5 Ngày (`POST /api/fmd/start`)**:
   ```json
   {
     "userId": "e0e7a1b3-4f8a-493e-9b62-7a4c9f1e8201",
     "startDate": "2026-11-16T00:00:00Z"
   }
   ```
   - Kết quả: `201 Created`, `currentDay = 1`, `status = "Active"`, `targetCaloriesToday = 1100`.
   - Gọi lại lần 2 khi chu kỳ đang `Active` $\rightarrow$ Nhận đúng `409 Conflict` (`ActiveFmdCycleAlreadyExistsException`).
4. **Test Cảnh Báo Vi Phạm Calo FMD Qua RabbitMQ & Mailpit (Kịch bản Demo chính của Quốc)**:
   - Gọi `POST http://localhost:5002/api/meals` với tổng calo `1200 kcal` (> `1100 kcal` của Ngày 1):
     ```json
     {
       "userId": "e0e7a1b3-4f8a-493e-9b62-7a4c9f1e8201",
       "mealType": 2,
       "loggedAt": "2026-11-16T05:00:00Z",
       "isHaraHachiBuCompliant": false,
       "satietyPercentage": 100,
       "foodItems": [
         {
           "externalFoodId": "fmd-test-01",
           "foodName": "Bữa trưa vượt ngưỡng FMD",
           "servingSize": 1,
           "servingUnit": "phần",
           "calories": 1200,
           "proteinGrams": 40,
           "carbsGrams": 150,
           "fatGrams": 45,
           "fiberGrams": 10
         }
       ]
     }
     ```
   - **Kiểm chứng 1**: Response trả về `exceededThreshold: true` kèm `thresholdViolationNotes`: `"Day 1 FMD Calorie Limit Exceeded! Projected: 1200 kcal vs Threshold: 1100 kcal."`
   - **Kiểm chứng 2**: Mở giao diện **Mailpit** tại `http://localhost:8025` $\rightarrow$ Thấy ngay email cảnh báo tiêu đề **`FMD Cycle Day 1 Alert`**!
   - **Kiểm chứng 3**: Gọi `GET http://localhost:5004/api/notifications/user/e0e7a1b3-4f8a-493e-9b62-7a4c9f1e8201` $\rightarrow$ Thấy bản ghi `NotificationLog` có `status = "Sent"` và `eventId` khác null.
5. **Test Chuyển Ngày FMD Tự Động Qua Hangfire Trigger**:
   - Gọi `POST http://localhost:5005/jobs/trigger/fmd-check` $\rightarrow$ `DietFasting` nhận trigger `FmdCycleDailyJob` và tăng `CurrentDay` của chu kỳ FMD lên `2` (ngưỡng calo tự động chuyển về `725 kcal`).
6. **Test Frontend Web App (`http://localhost:5173`)**:
   ```bash
   cd src/Clients/web-app
   npm install
   npm run dev
   ```
   - Mở `http://localhost:5173` $\rightarrow$ Chuyển sang tab **Chu Kỳ FMD 5 Ngày** $\rightarrow$ Bấm **"Bắt Đầu Chu Kỳ FMD 5 Ngày Mới"** $\rightarrow$ Giao diện hiển thị trạng thái đang hoạt động ở Ngày 1, định mức 1100 kcal và danh sách thông báo sức khỏe.

---

## 6. TIÊU CHÍ HOÀN THÀNH (DEFINITION OF DONE) & TẠO PR `quoc` $\rightarrow$ `dev`

Công việc của Quốc được xác nhận là **HOÀN THÀNH 100%** khi thỏa mãn toàn bộ checklist dưới đây:

- [ ] **Git & Zero Conflict**:
  - Làm việc trên nhánh `quoc` tách từ `dev` (đã có commit `2b00280` của Kiệt).
  - **Không sửa bất kỳ dòng logic nào của Kiệt** (`FastingSession`, `FastingService`, `FastingController`, `FastingReminderService`, gRPC, Hangfire).
  - Không sửa bất kỳ file nào trong `src/Clients/web-app/src/shared/` hoặc thư mục `features/` của thành viên khác.
- [ ] **Backend & Database**:
  - `dotnet build Longevity_Diet_Tracker_System.sln` thành công với `0 Error(s)`.
  - `Notification.API` chạy đúng cổng `5004`, migration `InitialNotificationDb` chuẩn `snake_case`, có đầy đủ cột `event_id`.
  - `RabbitMqNotificationConsumer` nhận `fmd.alert`, `advice.sent`, `notification.email` và gửi email thật sang Mailpit (`:8025`) với trạng thái `Sent` và kiểm tra Idempotency (`EventId`).
  - `FmdController` & `FmdRulesController` hoạt động chuẩn xác, tự động chuẩn hóa `DateTime` UTC, seed 5 quy tắc FMD mặc định và hỗ trợ chuyển ngày `AdvanceDay()`.
- [ ] **Frontend FMD**:
  - `fmdApi.js` và `FmdView.jsx` kết nối đầy đủ API `/api/fmd/*` và `/api/notifications/*`, có nút kích hoạt chu kỳ FMD, tiến trình 5 ngày và hộp thư thông báo.
- [ ] **Sơ đồ C3 & C4**:
  - Đủ 3 sơ đồ (`C3_Notification`, `C4_Notification`, `C4_DietFasting`) trong `Longevity_Diet_Tracker_System/docs/diagrams/` đúng chuẩn Onion Architecture & Rich Domain Model.
- [ ] **Đẩy nhánh & Tạo Pull Request (`quoc` $\rightarrow$ `dev`)**:
  ```bash
  git status
  git add .
  git commit -m "feat(quoc): complete FMD module, Notification consumer/SMTP, FMD frontend integration, and C3/C4 diagrams"
  git fetch origin dev
  git merge origin/dev
  git push -u origin quoc
  ```
  Sau khi push thành công, mở GitHub tạo Pull Request từ nhánh **`quoc`** vào nhánh **`dev`** để Leader (Hoàng Lê Khoa) review và merge.
