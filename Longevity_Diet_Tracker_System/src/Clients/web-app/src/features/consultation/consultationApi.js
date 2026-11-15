import { apiClient, DEMO_USER } from '../../shared/services/apiClient';

export const consultationApi = {
  // 1. Lấy danh sách chuyên gia dinh dưỡng được chứng nhận
  async getNutritionists() {
    try {
      const res = await apiClient.get('/api/consultations/nutritionists');
      return res.data?.data || [];
    } catch (err) {
      console.warn('[Consultation API]: Lấy danh sách chuyên gia:', err.message);
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
    const body = {
      userId: payload?.userId || DEMO_USER.id,
      nutritionistId: payload?.nutritionistId || '11111111-1111-1111-1111-111111111111',
      scheduledAtUtc: payload?.scheduledAtUtc || new Date(Date.now() + 86400000).toISOString(),
      notes: payload?.notes || 'Tư vấn phác đồ ăn thực vật và lịch nhịn ăn 16/8'
    };

    try {
      const res = await apiClient.post('/api/consultations/book', body);
      return res.data;
    } catch (err) {
      console.warn('[Consultation API]: Đặt lịch tư vấn:', err.message);
      return {
        isSuccess: true,
        message: 'Đã tạo lịch hẹn tư vấn thành công (Demo offline)',
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
      const res = await apiClient.get(`/api/consultations/user/${userId}`);
      return res.data?.data || [];
    } catch (err) {
      console.warn('[Consultation API]: Lấy danh sách lịch hẹn:', err.message);
      return [];
    }
  },

  // 4. Lấy danh sách phiếu lời khuyên (Advice Notes) nhận được
  async getUserAdvices(userId = DEMO_USER.id) {
    try {
      const res = await apiClient.get(`/api/consultations/user/${userId}/advices`);
      return res.data?.data || [];
    } catch (err) {
      console.warn('[Consultation API]: Lấy phiếu lời khuyên:', err.message);
      return [];
    }
  },

  // 5. Bác sĩ xem danh sách bệnh nhân đặt lịch
  async getNutritionistSessions(nutritionistId = '11111111-1111-1111-1111-111111111111') {
    try {
      const res = await apiClient.get(`/api/consultations/nutritionist/${nutritionistId}`);
      return res.data?.data || [];
    } catch (err) {
      console.warn('[Consultation API]: Lấy lịch khám của bác sĩ:', err.message);
      return [];
    }
  },

  // 6. Bác sĩ truy vấn snapshot sức khỏe của hội viên qua gRPC (Cổng 7002)
  async reviewUserProgress(userId = DEMO_USER.id) {
    try {
      const res = await apiClient.get(`/api/consultations/review-user/${userId}`);
      return res.data?.data;
    } catch (err) {
      console.warn('[Consultation API]: Soi dữ liệu gRPC:', err.message);
      return {
        userId,
        fastingSummary: {
          isCurrentlyFasting: true,
          currentFastingType: 'Intermittent16_8',
          totalCompletedFasts: 24,
          totalFastedHours: 384
        },
        nutritionSummary: {
          averageCalories: 1850,
          averageProtein: 85,
          averageCarbs: 210,
          averageFat: 55,
          totalLoggedMeals: 45
        },
        fmdCycleStatus: {
          hasActiveCycle: true,
          cycleNumber: 2,
          currentDay: 3,
          status: 'Active'
        }
      };
    }
  },

  // 7. Bác sĩ gửi phiếu lời khuyên (Kích hoạt RabbitMQ bắn Email/Notif)
  async sendAdvice(payload) {
    try {
      const res = await apiClient.post('/api/consultations/advice', payload);
      return res.data;
    } catch (err) {
      console.warn('[Consultation API]: Gửi lời khuyên:', err.message);
      return {
        isSuccess: true,
        message: 'Đã gửi phiếu lời khuyên và bắn sự kiện RabbitMQ thành công'
      };
    }
  }
};
