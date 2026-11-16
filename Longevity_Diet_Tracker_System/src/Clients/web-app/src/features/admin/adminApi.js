import { apiClient } from '../../shared/services/apiClient';
import { getSession } from '../../shared/services/session';

// API dành cho Admin (đều qua Gateway, cần JWT role Admin cho thao tác ghi). Lỗi luôn được ném để giao diện hiển thị.

export class AdminApiError extends Error {
  constructor(message, { status = 0, network = false } = {}) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.network = network;
  }
}

function toError(err, fallback) {
  if (!err?.response) return new AdminApiError('Không kết nối được máy chủ.', { network: true });
  const { status, data } = err.response;
  if (status === 401) return new AdminApiError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', { status });
  if (status === 403) return new AdminApiError('Bạn không có quyền Admin để thực hiện thao tác này.', { status });
  let msg = data?.Message || data?.message;
  const detail = data?.data;
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const first = Object.values(detail).flat().find((v) => typeof v === 'string');
    if (first) msg = first;
  }
  return new AdminApiError(msg || fallback, { status });
}

const wrap = async (fn, fallback) => {
  try {
    return await fn();
  } catch (err) {
    throw toError(err, fallback);
  }
};

/** Thiết kế đã chốt: 1100/780/760/760/780 kcal. */
export const DESIGN_FMD_KCAL = { 1: 1100, 2: 780, 3: 760, 4: 760, 5: 780 };

export const FASTING_TYPE_OPTIONS = [
  { value: 1, label: '12:12' },
  { value: 7, label: '14:10' },
  { value: 2, label: '16:8' },
  { value: 3, label: '18:6' },
  { value: 4, label: '20:4' },
  { value: 5, label: 'Kéo dài (24 giờ trở lên)' },
  { value: 6, label: 'FMD 5 ngày' },
];

export const NOTIFICATION_CHANNELS = [
  { value: 2, label: 'Trong ứng dụng' },
  { value: 1, label: 'Email' },
  { value: 3, label: 'Push' },
];

export const ROLE_OPTIONS = [
  { value: 'User', label: 'Hội viên (User)' },
  { value: 'Nutritionist', label: 'Chuyên gia (Nutritionist)' },
  { value: 'Admin', label: 'Quản trị (Admin)' },
];

export const adminApi = {
  // ---- Quy tắc FMD: GET công khai, PUT chỉ Admin
  getFmdRules: () =>
    wrap(async () => (await apiClient.get('/api/admin/fmd-rules')).data?.data ?? [], 'Không tải được quy tắc FMD.'),

  updateFmdRule: (dayNumber, body) =>
    wrap(async () => (await apiClient.put(`/api/admin/fmd-rules/${dayNumber}`, body)).data?.data, 'Không lưu được quy tắc FMD.'),

  // ---- Mẫu bữa ăn: GET mọi người dùng đăng nhập, POST chỉ Admin
  getTemplates: () =>
    wrap(async () => (await apiClient.get('/api/mealtemplates')).data?.data ?? [], 'Không tải được mẫu bữa ăn.'),

  createTemplate: (body) =>
    wrap(async () => (await apiClient.post('/api/mealtemplates', body)).data?.data, 'Không tạo được mẫu bữa ăn.'),

  // ---- Phân quyền: chỉ Admin. Role mới có hiệu lực khi người đó đăng nhập lại (role nằm trong JWT).
  setUserRole: (userId, role) =>
    wrap(async () => (await apiClient.put(`/api/users/${userId}/role`, { role })).data?.data, 'Không đổi được role.'),

  // ---- Gửi thông báo thủ công: chỉ Admin
  sendNotification: (body) =>
    wrap(async () => (await apiClient.post('/api/notifications/send', body)).data?.data, 'Không gửi được thông báo.'),

  // ---- Danh sách chuyên gia (công khai) cho trang Tổng quan
  getNutritionists: () =>
    wrap(async () => (await apiClient.get('/api/consultations/nutritionists')).data?.data ?? [], 'Không tải được chuyên gia.'),

  /** Kiểm tra nhanh các dịch vụ qua Gateway. Mỗi mục trả { name, ok, ms, note }. */
  async probeServices() {
    const userId = getSession()?.userId;
    const probes = [
      { name: 'Identity', run: () => apiClient.get(`/api/users/${userId}/profile`) },
      { name: 'Diet & Fasting', run: () => apiClient.get('/api/admin/fmd-rules') },
      { name: 'Consultation', run: () => apiClient.get('/api/consultations/nutritionists') },
      { name: 'Notification', run: () => apiClient.get(`/api/notifications/user/${userId}/unread-count`) },
    ];
    return Promise.all(
      probes.map(async (p) => {
        const t0 = performance.now();
        try {
          await p.run();
          return { name: p.name, ok: true, ms: Math.round(performance.now() - t0) };
        } catch (err) {
          const status = err?.response?.status;
          return { name: p.name, ok: false, ms: Math.round(performance.now() - t0), note: status ? `HTTP ${status}` : 'Không kết nối được' };
        }
      })
    );
  },
};
