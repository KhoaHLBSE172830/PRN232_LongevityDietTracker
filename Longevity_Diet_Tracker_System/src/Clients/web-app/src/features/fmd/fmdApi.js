import { apiClient, DEMO_USER } from '../../shared/services/apiClient';

const TOKEN_KEY = 'accessToken';
const NAME_ID_URI = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';

function getAuthSession() {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || token.split('.').length !== 3) return null;
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const claims = JSON.parse(
      decodeURIComponent(
        atob(payload)
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      )
    );
    if (claims.exp && claims.exp * 1000 < Date.now()) return null;
    const userId = claims.nameid || claims[NAME_ID_URI] || claims.sub || DEMO_USER.id;
    return { token, userId };
  } catch {
    return null;
  }
}

function getRequestConfig() {
  const session = getAuthSession();
  return {
    timeout: 20000,
    headers: session?.token ? { Authorization: `Bearer ${session.token}` } : {},
  };
}

export function getEffectiveUserId(fallbackId = DEMO_USER.id) {
  return getAuthSession()?.userId || fallbackId;
}

export const DEFAULT_FMD_RULES = [
  { dayNumber: 1, maxCalories: 1100, targetProteinPercent: 11, targetFatPercent: 46, targetCarbPercent: 43, description: 'Ngày Khởi Động: Chuẩn bị cơ thể chuyển đổi năng lượng' },
  { dayNumber: 2, maxCalories: 725, targetProteinPercent: 9, targetFatPercent: 44, targetCarbPercent: 47, description: 'Đốt mỡ sâu & Kích hoạt tái sinh tế bào gốc' },
  { dayNumber: 3, maxCalories: 725, targetProteinPercent: 9, targetFatPercent: 44, targetCarbPercent: 47, description: 'Thanh lọc tế bào lão hóa và giảm chỉ số viêm' },
  { dayNumber: 4, maxCalories: 725, targetProteinPercent: 9, targetFatPercent: 44, targetCarbPercent: 47, description: 'Tái tạo hệ miễn dịch và trẻ hóa sinh học' },
  { dayNumber: 5, maxCalories: 725, targetProteinPercent: 9, targetFatPercent: 44, targetCarbPercent: 47, description: 'Hoàn tất chu kỳ & Phục hồi cơ quan nội tạng' },
];

export const fmdApi = {
  // POST /api/fmd/start — Bắt đầu chu kỳ FMD 5 ngày
  async startCycle(payload = {}) {
    const effectiveUserId = getEffectiveUserId(payload.userId || DEMO_USER.id);
    try {
      const requestBody = {
        userId: effectiveUserId,
        startDate: payload.startDate || new Date().toISOString(),
      };
      const res = await apiClient.post('/api/fmd/start', requestBody, getRequestConfig());
      return res.data?.data ?? res.data;
    } catch (err) {
      console.warn('[FMD API]: Bắt đầu chu kỳ FMD (Fallback):', err.message);
      const now = new Date();
      const end = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      return {
        id: 'fmd-demo-cycle-01',
        userId: effectiveUserId,
        cycleNumber: 1,
        startDate: now.toISOString(),
        endDate: end.toISOString(),
        currentDay: 1,
        status: 'Active',
        targetCaloriesToday: 1100,
      };
    }
  },

  // GET /api/fmd/user/{userId}/active — Lấy chu kỳ FMD đang hoạt động
  async getActiveCycle(userId = DEMO_USER.id) {
    const effectiveUserId = getEffectiveUserId(userId);
    try {
      const res = await apiClient.get(`/api/fmd/user/${effectiveUserId}/active`, getRequestConfig());
      return res.data?.data ?? null;
    } catch (err) {
      console.warn('[FMD API]: Lấy chu kỳ active:', err.message);
      return null;
    }
  },

  // GET /api/admin/fmd-rules — Lấy danh mục định mức calo 5 ngày FMD
  async getRules() {
    try {
      const res = await apiClient.get('/api/admin/fmd-rules', getRequestConfig());
      const data = res.data?.data;
      return Array.isArray(data) && data.length > 0 ? data : DEFAULT_FMD_RULES;
    } catch (err) {
      console.warn('[FMD API]: Lấy rules FMD (Fallback):', err.message);
      return DEFAULT_FMD_RULES;
    }
  },

  // GET /api/notifications/user/{userId} — Lấy lịch sử hộp thư thông báo sức khỏe
  async getUserNotifications(userId = DEMO_USER.id) {
    const effectiveUserId = getEffectiveUserId(userId);
    try {
      const res = await apiClient.get(`/api/notifications/user/${effectiveUserId}`, getRequestConfig());
      return res.data?.data ?? [];
    } catch (err) {
      console.warn('[Notification API]: Lấy lịch sử thông báo:', err.message);
      return [];
    }
  },

  // GET /api/notifications/preferences/{userId} — Xem tùy chọn nhận thông báo
  async getPreferences(userId = DEMO_USER.id) {
    const effectiveUserId = getEffectiveUserId(userId);
    try {
      const res = await apiClient.get(`/api/notifications/preferences/${effectiveUserId}`, getRequestConfig());
      return res.data?.data ?? {
        userId: effectiveUserId,
        emailNotificationsEnabled: true,
        fastingRemindersEnabled: true,
        nutritionistAdviceAlertsEnabled: true,
      };
    } catch (err) {
      console.warn('[Notification API]: Lấy preferences:', err.message);
      return {
        userId: effectiveUserId,
        emailNotificationsEnabled: true,
        fastingRemindersEnabled: true,
        nutritionistAdviceAlertsEnabled: true,
      };
    }
  },

  // PUT /api/notifications/preferences/{userId} — Cập nhật tùy chọn nhận thông báo
  async updatePreferences(userId = DEMO_USER.id, preferences) {
    const effectiveUserId = getEffectiveUserId(userId);
    try {
      const res = await apiClient.put(`/api/notifications/preferences/${effectiveUserId}`, preferences, getRequestConfig());
      return res.data?.data ?? preferences;
    } catch (err) {
      console.warn('[Notification API]: Cập nhật preferences:', err.message);
      return preferences;
    }
  },
};
