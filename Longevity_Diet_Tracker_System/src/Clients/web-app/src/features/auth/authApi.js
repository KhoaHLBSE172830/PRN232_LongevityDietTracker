import { apiClient, DEMO_USER } from '../../shared/services/apiClient';
import { getSession, setAccessToken } from '../../shared/services/session';

// Identity (Khoa) chưa dùng được cho đăng nhập thật (đã chốt: không sửa). Quy ước:
//  - Backend trả lỗi nghiệp vụ (400/401/409...) => ném lỗi để UI hiển thị.
//  - Không kết nối được / 5xx => rơi về chế độ DEMO (không có JWT), UI có banner.

export class AuthError extends Error {
  constructor(message, { status } = {}) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

function isBackendDown(err) {
  const status = err?.response?.status;
  return !err?.response || status >= 500;
}

function messageOf(err, fallback) {
  const d = err?.response?.data;
  return d?.Message || d?.message || fallback;
}

function userFromToken(fallbackName, email) {
  const s = getSession();
  if (!s) return null;
  return {
    ...DEMO_USER,
    id: s.userId,
    email: s.email || email,
    role: s.role,
    name: fallbackName || (s.email || email || 'Bạn').split('@')[0],
  };
}

export const authApi = {
  /** @returns {{ user, demo: boolean }} */
  async login({ email, password }) {
    try {
      const res = await apiClient.post('/api/auth/login', { email, password });
      const token = res.data?.data?.accessToken || res.data?.accessToken;
      if (!token) throw new AuthError('Phản hồi đăng nhập không hợp lệ.');
      setAccessToken(token);
      const user = userFromToken(res.data?.data?.fullName, email);
      if (!user) {
        setAccessToken(null);
        throw new AuthError('Token nhận được không hợp lệ.');
      }
      return { user, demo: false };
    } catch (err) {
      if (err instanceof AuthError) throw err;
      if (isBackendDown(err)) {
        setAccessToken(null);
        return { user: { ...DEMO_USER, email }, demo: true };
      }
      throw new AuthError(messageOf(err, 'Email hoặc mật khẩu không đúng.'), { status: err.response?.status });
    }
  },

  /** Đăng ký. Role luôn là người dùng thường: không bao giờ gửi role từ FE. */
  async register({ email, password, fullName }) {
    try {
      await apiClient.post('/api/auth/register', { email, password, fullName });
      return this.login({ email, password });
    } catch (err) {
      if (err instanceof AuthError) throw err;
      if (isBackendDown(err)) {
        setAccessToken(null);
        return { user: { ...DEMO_USER, email, name: fullName || DEMO_USER.name }, demo: true };
      }
      throw new AuthError(messageOf(err, 'Không thể tạo tài khoản.'), { status: err.response?.status });
    }
  },

  /** Vào nhanh: dùng JWT dev (VITE_DEV_JWT) nếu có để chạy với backend thật, không thì demo thuần. */
  quickDemo() {
    const devJwt = import.meta.env?.VITE_DEV_JWT;
    if (devJwt) {
      setAccessToken(devJwt);
      const user = userFromToken(null, DEMO_USER.email);
      if (user) return { user: { ...user, name: DEMO_USER.name }, demo: false };
      setAccessToken(null);
    }
    setAccessToken(null);
    return { user: DEMO_USER, demo: true };
  },

  /** PUT /api/users/{id}/profile — ném AuthError nếu máy chủ từ chối (vd. macro != 100%). */
  async updateProfile(userId, profile) {
    try {
      const res = await apiClient.put(`/api/users/${userId}/profile`, { userId, ...profile });
      return res.data?.data ?? null;
    } catch (err) {
      throw new AuthError(messageOf(err, 'Không lưu được hồ sơ lên máy chủ.'), { status: err?.response?.status });
    }
  },

  async getProfile(userId) {
    const id = userId || getSession()?.userId;
    if (!id) return null;
    try {
      const res = await apiClient.get(`/api/users/${id}/profile`);
      return res.data?.data || null;
    } catch {
      return null;
    }
  },
};
