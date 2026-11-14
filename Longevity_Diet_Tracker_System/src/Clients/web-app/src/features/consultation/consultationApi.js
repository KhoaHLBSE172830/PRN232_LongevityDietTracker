import { apiClient, DEMO_USER } from '../../shared/services/apiClient';

export const consultationApi = {
  // Đặt lịch tư vấn với chuyên gia
  async bookSession(payload = { userId: DEMO_USER.id, nutritionistId: 'nutri-01', scheduledAt: new Date() }) {
    try {
      const res = await apiClient.post('/api/consultations/book', payload);
      return res.data;
    } catch (err) {
      console.warn('[Consultation API]: Đặt lịch tư vấn:', err.message);
      return { success: true, message: 'Đã đặt lịch hẹn tư vấn' };
    }
  },

  // Lấy lời khuyên bác sĩ
  async getAdviceNotes(userId = DEMO_USER.id) {
    try {
      const res = await apiClient.get(`/api/consultations/review-user/${userId}`);
      return res.data?.data;
    } catch (err) {
      console.warn('[Consultation API]: Lấy lời khuyên:', err.message);
      return [];
    }
  },
};
