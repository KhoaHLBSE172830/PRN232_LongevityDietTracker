import { apiClient, DEMO_USER } from '../../shared/services/apiClient';

export const authApi = {
  // Đăng nhập email & mật khẩu
  async login(credentials = { email: '', password: '' }) {
    try {
      const res = await apiClient.post('/api/auth/login', credentials);
      if (res.data?.data?.accessToken) {
        localStorage.setItem('accessToken', res.data.data.accessToken);
      }
      return res.data;
    } catch (err) {
      console.warn('[Auth API]: Đăng nhập thử nghiệm:', err.message);
      return { success: true, user: DEMO_USER, token: 'demo-jwt-token' };
    }
  },

  // Đăng ký tài khoản
  async register(data) {
    try {
      const res = await apiClient.post('/api/auth/register', data);
      return res.data;
    } catch (err) {
      console.warn('[Auth API]: Đăng ký thử nghiệm:', err.message);
      return { success: true, message: 'Đăng ký thành công' };
    }
  },

  // Đăng nhập Google OAuth 2.0
  async googleLogin(idToken) {
    try {
      const res = await apiClient.post('/api/auth/google-login', { idToken });
      return res.data;
    } catch (err) {
      console.warn('[Auth API]: Google Login:', err.message);
      return { success: true, user: DEMO_USER };
    }
  },

  // Lấy hồ sơ người dùng
  async getProfile(userId = DEMO_USER.id) {
    try {
      const res = await apiClient.get(`/api/users/${userId}/profile`);
      return res.data?.data || DEMO_USER;
    } catch (err) {
      console.warn('[Auth API]: Lấy hồ sơ:', err.message);
      return DEMO_USER;
    }
  },
};
