import { useState } from 'react';
import { consultationApi } from '../consultation/consultationApi';
import { useDoctor } from './DoctorData';
import { formatVnDateTime } from './doctorLogic';

/** Xác nhận, hủy và mở hộp thoại kê lời khuyên; tự tải lại lịch hẹn sau mỗi thao tác. */
export function useSessionActions() {
  const { reload } = useDoctor();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [adviceSession, setAdviceSession] = useState(null);

  const run = async (fn, okMessage) => {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await fn();
      setMessage(okMessage);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return {
    busy,
    message,
    error,
    adviceSession,
    confirm: (s) => run(() => consultationApi.confirmSession(s.id), `Đã xác nhận lịch ${formatVnDateTime(s.scheduledAtUtc)}.`),
    cancel: (s) => {
      if (!window.confirm('Hủy lịch hẹn này? Khung giờ sẽ được trả lại.')) return;
      run(() => consultationApi.cancelSession(s.id, 'Chuyên gia hủy lịch'), 'Đã hủy lịch hẹn.');
    },
    openAdvice: setAdviceSession,
    closeAdvice: () => setAdviceSession(null),
    afterAdvice: async () => {
      setMessage('Đã gửi lời khuyên. Hội viên sẽ nhận email.');
      await reload();
    },
  };
}
