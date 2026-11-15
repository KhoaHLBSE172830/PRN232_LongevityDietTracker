import { apiClient, DEMO_USER } from '../../shared/services/apiClient';

export const fmdApi = {
  // Bắt đầu chu kỳ FMD 5 ngày
  async startCycle(payload = { userId: DEMO_USER.id, startDay: 1 }) {
    try {
      const res = await apiClient.post('/api/fmd/start', payload);
      return res.data;
    } catch (err) {
      console.warn('[FMD API]: Bắt đầu chu kỳ FMD:', err.message);
      return { success: true, message: 'Đã bắt đầu chu kỳ FMD 5 ngày' };
    }
  },

  // Lấy chu kỳ FMD đang hoạt động
  async getActiveCycle(userId = DEMO_USER.id) {
    try {
      const res = await apiClient.get(`/api/fmd/user/${userId}/active`);
      return res.data?.data;
    } catch (err) {
      console.warn('[FMD API]: Lấy chu kỳ active:', err.message);
      return null;
    }
  },

  // Lấy danh mục định mức calo theo ngày
  async getRules() {
    try {
      const res = await apiClient.get('/api/admin/fmd-rules');
      return res.data?.data;
    } catch (err) {
      console.warn('[FMD API]: Lấy rules FMD:', err.message);
      return [];
    }
  },
};
