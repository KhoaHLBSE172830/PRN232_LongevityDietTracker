import { apiClient } from '../../shared/services/apiClient';
import { getSession } from '../../shared/services/session';
import { getCurrentUser } from '../../shared/services/userStore';

// Thói quen (nước uống, vận động) theo ngày. Đã đăng nhập: lưu trên máy chủ (DietFasting /api/habits).
// Chưa đăng nhập hoặc mất kết nối: lưu cục bộ theo người dùng + ngày, giao diện có nhãn chế độ demo.

export const WATER_STEP_ML = 250;
export const MOVEMENT_STEP_MIN = 10;
const DEFAULT_GOALS = { waterGoalMl: 2000, movementGoalMinutes: 30 };

export const todayKey = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const localKey = (userId, date) => `longevity_habits_${userId}_${date}`;

const readLocal = (userId, date) => {
  try {
    const v = JSON.parse(localStorage.getItem(localKey(userId, date)) || 'null');
    return { waterMl: v?.waterMl || 0, movementMinutes: v?.movementMinutes || 0 };
  } catch {
    return { waterMl: 0, movementMinutes: 0 };
  }
};

const writeLocal = (userId, date, v) => {
  try {
    localStorage.setItem(localKey(userId, date), JSON.stringify(v));
  } catch {
    /* bỏ qua */
  }
};

const clamp = (n, max) => Math.min(max, Math.max(0, n));

export const habitsApi = {
  /** @returns {{ date, waterMl, movementMinutes, waterGoalMl, movementGoalMinutes, source: 'server' | 'local' }} */
  async getDay(date = todayKey()) {
    const session = getSession();
    if (session) {
      try {
        const res = await apiClient.get(`/api/habits/user/${session.userId}?date=${date}`);
        const d = res.data?.data;
        if (d) return { ...d, date, source: 'server' };
      } catch {
        /* rơi về cục bộ */
      }
    }
    const user = getCurrentUser();
    return { date, ...readLocal(user.id, date), ...DEFAULT_GOALS, source: 'local' };
  },

  /** Cộng thêm (số âm để hoàn tác). */
  async add({ waterMl = 0, movementMinutes = 0 }, date = todayKey()) {
    const session = getSession();
    if (session) {
      try {
        const res = await apiClient.post(`/api/habits/user/${session.userId}/add?date=${date}`, { waterMl, movementMinutes });
        const d = res.data?.data;
        if (d) return { ...d, date, source: 'server' };
      } catch {
        /* rơi về cục bộ */
      }
    }
    const user = getCurrentUser();
    const cur = readLocal(user.id, date);
    const next = { waterMl: clamp(cur.waterMl + waterMl, 10000), movementMinutes: clamp(cur.movementMinutes + movementMinutes, 1440) };
    writeLocal(user.id, date, next);
    return { date, ...next, ...DEFAULT_GOALS, source: 'local' };
  },
};
