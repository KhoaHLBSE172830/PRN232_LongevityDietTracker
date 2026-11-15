import { apiClient, DEMO_USER } from '../../shared/services/apiClient';

export const DEFAULT_FMD_RULES = [
  { dayNumber: 1, maxCalories: 1100, targetProteinPercent: 11, targetFatPercent: 46, targetCarbPercent: 43, description: 'Ngày Khởi Động: Chuẩn bị cơ thể chuyển đổi năng lượng' },
  { dayNumber: 2, maxCalories: 725, targetProteinPercent: 9, targetFatPercent: 44, targetCarbPercent: 47, description: 'Đốt mỡ sâu & Kích hoạt tái sinh tế bào gốc' },
  { dayNumber: 3, maxCalories: 725, targetProteinPercent: 9, targetFatPercent: 44, targetCarbPercent: 47, description: 'Thanh lọc tế bào lão hóa và giảm chỉ số viêm' },
  { dayNumber: 4, maxCalories: 725, targetProteinPercent: 9, targetFatPercent: 44, targetCarbPercent: 47, description: 'Tái tạo hệ miễn dịch và trẻ hóa sinh học' },
  { dayNumber: 5, maxCalories: 725, targetProteinPercent: 9, targetFatPercent: 44, targetCarbPercent: 47, description: 'Hoàn tất chu kỳ & Phục hồi cơ quan nội tạng' },
];

export const fmdApi = {
  // POST /api/fmd/start — Bắt đầu chu kỳ FMD 5 ngày
  async startCycle(payload = { userId: DEMO_USER.id, startDate: new Date().toISOString() }) {
    try {
      const requestBody = {
        userId: payload.userId || DEMO_USER.id,
        startDate: payload.startDate || new Date().toISOString(),
      };
      const res = await apiClient.post('/api/fmd/start', requestBody);
      return res.data?.data ?? res.data;
    } catch (err) {
      console.warn('[FMD API]: Bắt đầu chu kỳ FMD (Fallback):', err.message);
      const now = new Date();
      const end = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
      return {
        id: 'fmd-demo-cycle-01',
        userId: payload.userId || DEMO_USER.id,
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
    try {
      const res = await apiClient.get(`/api/fmd/user/${userId}/active`);
      return res.data?.data ?? null;
    } catch (err) {
      console.warn('[FMD API]: Lấy chu kỳ active:', err.message);
      return null;
    }
  },

  // GET /api/admin/fmd-rules — Lấy danh mục định mức calo 5 ngày FMD
  async getRules() {
    try {
      const res = await apiClient.get('/api/admin/fmd-rules');
      const data = res.data?.data;
      return Array.isArray(data) && data.length > 0 ? data : DEFAULT_FMD_RULES;
    } catch (err) {
      console.warn('[FMD API]: Lấy rules FMD (Fallback):', err.message);
      return DEFAULT_FMD_RULES;
    }
  },

  // GET /api/notifications/user/{userId} — Lấy lịch sử hộp thư thông báo sức khỏe
  async getUserNotifications(userId = DEMO_USER.id) {
    try {
      const res = await apiClient.get(`/api/notifications/user/${userId}`);
      return res.data?.data ?? [];
    } catch (err) {
      console.warn('[Notification API]: Lấy lịch sử thông báo:', err.message);
      return [];
    }
  },

  // GET /api/notifications/preferences/{userId} — Xem tùy chọn nhận thông báo
  async getPreferences(userId = DEMO_USER.id) {
    try {
      const res = await apiClient.get(`/api/notifications/preferences/${userId}`);
      return res.data?.data ?? {
        userId,
        emailNotificationsEnabled: true,
        fastingRemindersEnabled: true,
        nutritionistAdviceAlertsEnabled: true,
      };
    } catch (err) {
      console.warn('[Notification API]: Lấy preferences:', err.message);
      return {
        userId,
        emailNotificationsEnabled: true,
        fastingRemindersEnabled: true,
        nutritionistAdviceAlertsEnabled: true,
      };
    }
  },

  // PUT /api/notifications/preferences/{userId} — Cập nhật tùy chọn nhận thông báo
  async updatePreferences(userId = DEMO_USER.id, preferences) {
    try {
      const res = await apiClient.put(`/api/notifications/preferences/${userId}`, preferences);
      return res.data?.data ?? preferences;
    } catch (err) {
      console.warn('[Notification API]: Cập nhật preferences:', err.message);
      return preferences;
    }
  },
};
