import { mealsApi } from '../../features/meals/mealsApi';
import { fastingApi, typeLabel } from '../../features/fasting/fastingApi';
import { fmdApi, kcalForDay } from '../../features/fmd/fmdApi';
import { consultationApi } from '../../features/consultation/consultationApi';
import { getSession } from './session';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const fmtHM = (ms) => {
  const m = Math.max(0, Math.floor(ms / 60000));
  return `${Math.floor(m / 60)}g ${String(m % 60).padStart(2, '0')}p`;
};

const fmtClock = (iso) =>
  new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', weekday: 'long' }).format(new Date(iso));

/** Gom dữ liệu 4 trụ cột cho trang Tổng quan. Mỗi nguồn lỗi độc lập (Promise.allSettled). */
export async function loadOverview(user) {
  const [mealsR, fastR, fmdR, sessR, advR, statsR] = await Promise.allSettled([
    mealsApi.getUserMeals(user.id),
    fastingApi.getActiveSession(),
    fmdApi.getActiveCycle(user.id),
    getSession() ? consultationApi.getUserSessions(user.id) : Promise.resolve(null),
    getSession() ? consultationApi.getUserAdvices(user.id) : Promise.resolve(null),
    fastingApi.getStats(),
  ]);

  const meals = mealsR.status === 'fulfilled' && Array.isArray(mealsR.value) ? mealsR.value : [];
  const sum = (k) => meals.reduce((a, m) => a + num(m[k]), 0);
  const nutrition = {
    meals,
    calories: Math.round(sum('totalCalories')),
    protein: Math.round(sum('totalProteinGrams') * 10) / 10,
    carbs: Math.round(sum('totalCarbsGrams') * 10) / 10,
    fat: Math.round(sum('totalFatGrams') * 10) / 10,
    fiber: Math.round(sum('totalFiberGrams') * 10) / 10,
    budget: user.caloricBudget,
  };

  let fasting = { state: 'none' };
  if (fastR.status === 'rejected') fasting = { state: 'error' };
  else if (fastR.value?.session) {
    const s = fastR.value.session;
    const start = new Date(s.startTimeUtc).getTime();
    const end = new Date(s.targetEndTimeUtc).getTime();
    const now = Date.now();
    fasting = {
      state: 'active',
      label: s.typeLabel || typeLabel(s.fastingType),
      elapsedText: fmtHM(now - start),
      targetHours: Math.round((end - start) / 3600e3),
      endClock: new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date(end)),
      pct: Math.min(100, Math.max(0, ((now - start) / Math.max(1, end - start)) * 100)),
    };
  }

  const cycle = fmdR.status === 'fulfilled' ? fmdR.value : null;
  const fmd = cycle
    ? { state: 'active', day: cycle.currentDay, kcal: kcalForDay(cycle.currentDay), number: cycle.cycleNumber }
    : { state: 'none' };

  let consultation = { state: 'guest' };
  if (sessR.status === 'fulfilled' && Array.isArray(sessR.value)) {
    const upcoming = sessR.value
      .filter((x) => new Date(x.scheduledAtUtc) > new Date() && [1, 2, 'Pending', 'Confirmed'].includes(x.status))
      .sort((a, b) => new Date(a.scheduledAtUtc) - new Date(b.scheduledAtUtc))[0];
    const advices = advR.status === 'fulfilled' && Array.isArray(advR.value) ? advR.value : [];
    const latest = [...advices].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];
    consultation = {
      state: 'ok',
      next: upcoming ? { who: upcoming.nutritionistName || 'Chuyên gia', when: fmtClock(upcoming.scheduledAtUtc) } : null,
      advice: latest?.adviceSummary || null,
    };
  }

  const streak = statsR.status === 'fulfilled' && statsR.value ? statsR.value.currentStreakDays : null;
  return { nutrition, fasting, fmd, consultation, streak };
}
