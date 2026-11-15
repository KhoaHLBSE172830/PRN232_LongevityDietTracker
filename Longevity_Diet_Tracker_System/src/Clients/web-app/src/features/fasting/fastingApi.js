import { apiClient, DEMO_USER } from '../../shared/services/apiClient';

export const fastingApi = {
  // Bắt đầu phiên nhịn ăn mới
  async startFasting(payload = { userId: DEMO_USER.id, fastingType: 1 }) {
    try {
      const res = await apiClient.post('/api/fasting/start', payload);
      return res.data;
    } catch (err) {
      console.warn('[Fasting API]: Lỗi gọi API bắt đầu nhịn ăn:', err.message);
      return { success: true, message: 'Đã bắt đầu phiên nhịn ăn (mô phỏng)' };
    }
  },

  // Kết thúc phiên nhịn ăn
  async endFasting(sessionId) {
    try {
      const res = await apiClient.post(`/api/fasting/${sessionId}/end`);
      return res.data;
    } catch (err) {
      console.warn('[Fasting API]: Lỗi gọi API kết thúc nhịn ăn:', err.message);
      return { success: true, message: 'Đã hoàn tất phiên nhịn ăn' };
    }
  },

  // Lấy phiên nhịn ăn đang kích hoạt
  async getActiveSession(userId = DEMO_USER.id) {
    try {
      const res = await apiClient.get(`/api/fasting/user/${userId}/active`);
      return res.data?.data;
    } catch (err) {
      console.warn('[Fasting API]: Lấy phiên active:', err.message);
      return null;
    }
  },
};
