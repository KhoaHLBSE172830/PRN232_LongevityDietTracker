import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { consultationApi } from '../consultation/consultationApi';
import { getSession } from '../../shared/services/session';

// Dữ liệu dùng chung cho các trang của portal Chuyên gia: hồ sơ chuyên gia của tài khoản đang đăng nhập và lịch hẹn.

const DoctorContext = createContext(null);

export function DoctorProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // silent = làm mới ngầm (không hiện trạng thái đang tải) để lịch mới của hội viên tự xuất hiện.
  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const me = getSession();
      const list = await consultationApi.getNutritionists();
      const mine = list.find((n) => String(n.userId).toLowerCase() === String(me?.userId).toLowerCase()) || null;
      setProfile(mine);
      if (mine) setSessions((await consultationApi.getNutritionistSessions(mine.id)) || []);
      else setSessions([]);
    } catch (err) {
      setError(err.message || 'Không tải được dữ liệu chuyên gia.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    const timer = setInterval(() => reload(true), 10000);
    return () => clearInterval(timer);
  }, [reload]);

  const value = useMemo(() => ({ profile, sessions, loading, error, reload }), [profile, sessions, loading, error, reload]);
  return <DoctorContext.Provider value={value}>{children}</DoctorContext.Provider>;
}

export const useDoctor = () => {
  const ctx = useContext(DoctorContext);
  if (!ctx) throw new Error('useDoctor phải nằm trong DoctorProvider');
  return ctx;
};
