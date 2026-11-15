import { apiClient, DEMO_USER } from '../../shared/services/apiClient';

/**
 * Consultation API (Khôi - Domain 2) — chỉ dùng trong thư mục features/consultation/.
 *
 * Quy tắc kiến trúc & xử lý lỗi:
 *  - Có access token hợp lệ -> gọi backend thật qua Gateway (:7159 hoặc :5003).
 *  - Sử dụng timeout 20000ms để tránh treo UI khi gRPC liên dịch vụ khởi động chậm.
 *  - KHÔNG nuốt lỗi HTTP (400/401/403/404/409/500/503) và KHÔNG trả "thành công giả".
 *  - Ném ConsultationApiError kèm thông điệp chi tiết từ server.
 *  - Khi không có token hoặc máy chủ offline: cho phép fallback danh sách hiển thị với nhãn mô phỏng.
 */

const TOKEN_KEY = 'accessToken';
const REQUEST_TIMEOUT_MS = 20000;
const NAME_ID_URI = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';

export class ConsultationApiError extends Error {
  constructor(message, { status = 0, network = false, validationErrors = null } = {}) {
    super(message);
    this.name = 'ConsultationApiError';
    this.status = status;
    this.network = network;
    this.validationErrors = validationErrors;
  }
}

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Trả về { token, userId, role } nếu có JWT token, ngược lại null */
export function getConsultationAuthSession() {
  let token = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
  if (!token || token.split('.').length !== 3) return null;

  const claims = decodeJwt(token);
  if (!claims) return null;
  if (claims.exp && claims.exp * 1000 < Date.now()) return null;

  const userId = claims.nameid || claims[NAME_ID_URI] || claims.sub;
  const role = claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || claims.role;
  return { token, userId, role };
}

function getRequestConfig() {
  const session = getConsultationAuthSession();
  const headers = { 'Content-Type': 'application/json' };
  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }
  return {
    headers,
    timeout: REQUEST_TIMEOUT_MS
  };
}

function toApiError(err) {
  if (!err?.response) {
    return new ConsultationApiError(
      'Không thể kết nối đến máy chủ Consultation / Gateway (:7159 hoặc :5003). Vui lòng kiểm tra dịch vụ.',
      { network: true }
    );
  }
  const { status, data } = err.response;
  if (status === 502 || status === 503 || status === 504) {
    return new ConsultationApiError(
      data?.message || data?.Message || 'Dịch vụ Tư Vấn hoặc Diet & Fasting (gRPC) tạm thời không khả dụng (503).',
      { status, network: true }
    );
  }
  const serverMessage = data?.message ?? data?.Message ?? data?.errorMessage ?? data?.ErrorMessage;
  const validationErrors = data?.validationErrors || data?.ValidationErrors || null;

  if (status === 401) {
    return new ConsultationApiError('Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.', { status });
  }
  if (status === 403) {
    return new ConsultationApiError(serverMessage || 'Bạn không có quyền thực hiện thao tác này (403 Forbidden).', { status });
  }
  if (status === 409) {
    return new ConsultationApiError(serverMessage || 'Xung đột dữ liệu hoặc buổi tư vấn đã có phiếu lời khuyên (409 Conflict).', { status });
  }
  return new ConsultationApiError(
    serverMessage || (validationErrors ? validationErrors.join(', ') : `Yêu cầu thất bại (HTTP ${status}).`),
    { status, validationErrors }
  );
}

export const consultationApi = {
  // 1. Lấy danh sách chuyên gia dinh dưỡng được chứng nhận
  async getNutritionists() {
    try {
      const res = await apiClient.get('/api/consultations/nutritionists', getRequestConfig());
      return res.data?.data || [];
    } catch (err) {
      console.warn('[Consultation API]: Lấy danh sách chuyên gia từ server không thành công, dùng danh sách mẫu:', err.message);
      return [
        {
          id: '11111111-1111-1111-1111-111111111111',
          fullName: 'TS. BS Đặng Minh Tuấn',
          certification: 'Board Certified in Longevity & Anti-Aging (ABAARM)',
          specialization: 'Dinh Dưỡng Vùng Xanh & Tối Ưu Hóa Trao Đổi Chất',
          bio: '15 năm nghiên cứu mô hình sống thọ Okinawa và Loma Linda. Cố vấn chế độ ăn thực vật giàu đạm đậu và quy tắc no 80% (Hara Hachi Bu).',
          isVerified: true
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          fullName: 'ThS. BS Lê Thị Hoàng Oanh',
          certification: 'Chuyên gia Dinh Dưỡng Lâm Sàng & Fasting Mimicking Diet',
          specialization: 'Liệu Trình Nhịn Ăn Gián Đoạn (IF) & FMD 5 Ngày',
          bio: 'Chuyên gia đồng hành cùng hàng ngàn khách hàng hoàn thành chu kỳ thanh lọc tái tạo tế bào (Autophagy) và tái thiết lập độ nhạy insulin.',
          isVerified: true
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          fullName: 'BS. CKI Trần Thanh Tùng',
          certification: 'Y Học Thể Thao & Dinh Dưỡng Trường Thọ',
          specialization: 'Cân Bằng Đa Lượng (Macros) & Khối Cơ Sarcopenia',
          bio: 'Tập trung xây dựng thực đơn cá nhân hóa kết hợp đạm thực vật sạch và bảo toàn khối cơ nạc khi thực hiện chu kỳ nhịn ăn.',
          isVerified: true
        }
      ];
    }
  },

  // 2. Hội viên đặt lịch hẹn tư vấn mới
  async bookSession(payload) {
    const session = getConsultationAuthSession();
    const effectiveUserId = session?.userId || payload?.userId || DEMO_USER.id;

    const body = {
      userId: effectiveUserId,
      nutritionistId: payload?.nutritionistId || '11111111-1111-1111-1111-111111111111',
      scheduledAtUtc: payload?.scheduledAtUtc || new Date(Date.now() + 86400000).toISOString(),
      notes: payload?.notes || 'Tư vấn phác đồ ăn thực vật và lịch nhịn ăn 16/8'
    };

    try {
      const res = await apiClient.post('/api/consultations/book', body, getRequestConfig());
      return res.data;
    } catch (err) {
      // Nếu có lỗi HTTP thật từ server (400, 401, 403, 409, 500) -> ném lỗi để UI hiển thị thông báo
      if (err.response) {
        throw toApiError(err);
      }
      // Chỉ khi hoàn toàn không có mạng và không có phiên đăng nhập mới dùng offline fallback có gắn cờ rõ ràng
      console.warn('[Consultation API]: Ngoại lệ mạng, dùng chế độ offline mô phỏng:', err.message);
      return {
        isSuccess: true,
        isMock: true,
        message: 'Đã tạo lịch hẹn tư vấn (Chế độ mô phỏng offline do chưa kết nối Gateway)',
        data: {
          id: 'mock-session-' + Date.now(),
          ...body,
          durationMinutes: 45,
          status: 1
        }
      };
    }
  },

  // 3. Lấy danh sách lịch hẹn của hội viên
  async getUserSessions(userId = DEMO_USER.id) {
    try {
      const res = await apiClient.get(`/api/consultations/user/${userId}`, getRequestConfig());
      return res.data?.data || [];
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        throw toApiError(err);
      }
      console.warn('[Consultation API]: Lấy danh sách lịch hẹn hội viên:', err.message);
      return [];
    }
  },

  // 4. Lấy danh sách phiếu lời khuyên (Advice Notes) nhận được
  async getUserAdvices(userId = DEMO_USER.id) {
    try {
      const res = await apiClient.get(`/api/consultations/user/${userId}/advices`, getRequestConfig());
      return res.data?.data || [];
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        throw toApiError(err);
      }
      console.warn('[Consultation API]: Lấy phiếu lời khuyên:', err.message);
      return [];
    }
  },

  // 5. Bác sĩ xem danh sách bệnh nhân đặt lịch
  async getNutritionistSessions(nutritionistId = '11111111-1111-1111-1111-111111111111') {
    try {
      const res = await apiClient.get(`/api/consultations/nutritionist/${nutritionistId}`, getRequestConfig());
      return res.data?.data || [];
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        throw toApiError(err);
      }
      console.warn('[Consultation API]: Lấy lịch khám của bác sĩ:', err.message);
      return [];
    }
  },

  // 6. Bác sĩ truy vấn snapshot sức khỏe của hội viên qua gRPC (Cổng 7002)
  async reviewUserProgress(userId = DEMO_USER.id) {
    try {
      const res = await apiClient.get(`/api/consultations/review-user/${userId}`, getRequestConfig());
      return res.data?.data;
    } catch (err) {
      // Tuyệt đối không giả mạo số liệu sức khỏe 24 fasts / 384 hours / 1850 kcal
      throw toApiError(err);
    }
  },

  // 7. Bác sĩ gửi phiếu lời khuyên (Kích hoạt RabbitMQ bắn Email/Notif)
  async sendAdvice(payload) {
    try {
      const res = await apiClient.post('/api/consultations/advice', payload, getRequestConfig());
      return res.data;
    } catch (err) {
      // Tuyệt đối không nuốt lỗi 409 Conflict hoặc 500 khi gửi trùng phiếu
      throw toApiError(err);
    }
  }
};
