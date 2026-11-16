import React, { useEffect, useState } from 'react';
import { Stethoscope, X, Send } from 'lucide-react';
import { Banner } from '../../shared/components/ui';
import { consultationApi } from '../consultation/consultationApi';
import { kcalForDay } from '../fmd/fmdApi';
import { STATUS_LABELS, STATUS_TONES, formatVnDateTime, shortId, canConfirm, canCancel, canGiveAdvice } from './doctorLogic';
import { useDoctor } from './DoctorData';

export const inputCls =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20';
export const primaryBtn = 'rounded-xl bg-purple-700 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-purple-800 disabled:opacity-50';
export const ghostBtn = 'rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50';

export function DoctorHeader({ title, subtitle, action }) {
  const { profile } = useDoctor();
  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-3xl bg-gradient-to-r from-purple-900 to-indigo-900 p-6 text-white shadow-md md:flex-row md:items-center">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
          <Stethoscope className="h-6 w-6" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-purple-200">{profile?.fullName || 'Cổng chuyên gia dinh dưỡng'}</p>
          <h2 className="text-xl font-extrabold">{title}</h2>
          {subtitle && <p className="mt-1 text-xs text-purple-100">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export const StatusBadge = ({ status }) => (
  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_TONES[status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
    {STATUS_LABELS[status] || 'Lịch hẹn'}
  </span>
);

/** Trạng thái chung: đang tải, lỗi, hoặc tài khoản chưa gắn hồ sơ chuyên gia. Trả null khi có thể hiển thị nội dung. */
export function DoctorGate() {
  const { profile, loading, error } = useDoctor();
  if (loading) return <p className="text-sm text-slate-500">Đang tải dữ liệu chuyên gia...</p>;
  if (error) return <Banner tone="offline">{error}</Banner>;
  if (!profile)
    return (
      <Banner tone="demo">
        Tài khoản của bạn chưa được gắn với hồ sơ chuyên gia dinh dưỡng nào. Hãy nhờ Admin gắn hồ sơ (chức năng này hiện thực hiện ở cơ sở dữ liệu).
      </Banner>
    );
  return null;
}

/** Dòng một lịch hẹn kèm các nút thao tác theo trạng thái. */
export function SessionRow({ session, onConfirm, onCancel, onAdvice, onPatient, busy }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-extrabold text-slate-900">{formatVnDateTime(session.scheduledAtUtc)}</span>
          <StatusBadge status={session.status} />
        </div>
        <p className="text-xs font-semibold text-slate-600">
          {shortId(session.userId)} · {session.durationMinutes || 45} phút
        </p>
        {session.notes && <p className="text-[11px] italic text-slate-500">"{session.notes}"</p>}
      </div>
      <div className="flex flex-wrap gap-2">
        {onPatient && (
          <button type="button" className={ghostBtn} onClick={() => onPatient(session)}>
            Hồ sơ
          </button>
        )}
        {canConfirm(session) && onConfirm && (
          <button type="button" className={ghostBtn} disabled={busy} onClick={() => onConfirm(session)}>
            Xác nhận
          </button>
        )}
        {canGiveAdvice(session) && onAdvice && (
          <button type="button" className={primaryBtn} disabled={busy} onClick={() => onAdvice(session)}>
            Kê lời khuyên
          </button>
        )}
        {canCancel(session) && onCancel && (
          <button type="button" className="rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50" disabled={busy} onClick={() => onCancel(session)}>
            Hủy
          </button>
        )}
      </div>
    </div>
  );
}

/** Bảng sức khỏe của hội viên lấy qua gRPC (Consultation → DietFasting). */
export function PatientHealthPanel({ userId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [ms, setMs] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    setData(null);
    const t0 = performance.now();
    consultationApi
      .reviewUserProgress(userId)
      .then((d) => {
        if (!alive) return;
        setMs(Math.round(performance.now() - t0));
        setData(d);
      })
      .catch((err) => alive && setError(err.message || 'Không thể đồng bộ dữ liệu qua gRPC.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [userId]);

  if (loading) return <p className="text-xs text-slate-400">Đang gọi gRPC sang DietFasting...</p>;
  if (error) return <Banner tone="offline">{error}</Banner>;
  if (!data) return null;

  const f = data.fastingSummary || {};
  const n = data.nutritionSummary || {};
  const m = data.fmdCycleStatus || {};
  return (
    <div className="space-y-3 text-xs">
      {ms != null && <p className="text-[11px] font-bold text-emerald-700">Đồng bộ qua gRPC trong {ms} ms</p>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-extrabold text-slate-900">Nhịn ăn</p>
          <p className="mt-2 text-slate-600">{f.isCurrentlyFasting ? `Đang nhịn ${f.currentFastingType || ''}` : 'Không có phiên đang chạy'}</p>
          <p className="text-slate-600">Hoàn tất: <b>{f.totalCompletedFasts ?? 0}</b> phiên</p>
          <p className="text-slate-600">Tổng giờ: <b>{f.totalFastedHours ?? 0}</b> giờ</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="font-extrabold text-slate-900">Dinh dưỡng trung bình/ngày</p>
          <p className="mt-2 text-slate-600"><b>{n.averageCalories ?? 0}</b> kcal</p>
          <p className="text-slate-600">Đạm {n.averageProtein ?? 0} g · Carb {n.averageCarbs ?? 0} g · Béo {n.averageFat ?? 0} g</p>
        </div>
        <div className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4">
          <p className="font-extrabold text-teal-900">Chu kỳ FMD</p>
          {m.hasActiveCycle ? (
            <>
              <p className="mt-2 text-teal-800">Chu kỳ {m.cycleNumber ?? 1} · Ngày {m.currentDay ?? 1}/5</p>
              <p className="text-teal-700">Định mức hôm nay: tối đa {kcalForDay(m.currentDay ?? 1)} kcal</p>
            </>
          ) : (
            <p className="mt-2 text-teal-800">Chưa có chu kỳ đang chạy</p>
          )}
        </div>
      </div>
    </div>
  );
}

/** Hộp thoại kê lời khuyên cho một buổi tư vấn. */
export function AdviceModal({ session, onClose, onSent }) {
  const [summary, setSummary] = useState('');
  const [dietary, setDietary] = useState('');
  const [fasting, setFasting] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if ([summary, dietary, fasting].some((v) => v.trim().length < 5)) return setError('Mỗi ô cần ít nhất 5 ký tự.');
    setBusy(true);
    try {
      await consultationApi.sendAdvice({
        consultationSessionId: session.id,
        adviceSummary: summary.trim(),
        dietaryRecommendations: dietary.trim(),
        fastingRecommendations: fasting.trim(),
      });
      onSent?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-lg space-y-3 rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-slate-900">
            <Send className="h-4 w-4 text-purple-700" /> Kê lời khuyên
          </h3>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {shortId(session.userId)} · {formatVnDateTime(session.scheduledAtUtc)}. Gửi xong buổi chuyển sang Đã hoàn thành và hội viên nhận email.
        </p>
        {error && <Banner tone="offline">{error}</Banner>}
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-slate-600">Tóm tắt đánh giá</span>
          <textarea rows={3} className={inputCls} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-slate-600">Khuyến nghị dinh dưỡng</span>
          <textarea rows={3} className={inputCls} value={dietary} onChange={(e) => setDietary(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-slate-600">Khuyến nghị nhịn ăn (IF, FMD)</span>
          <textarea rows={3} className={inputCls} value={fasting} onChange={(e) => setFasting(e.target.value)} />
        </label>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={ghostBtn} onClick={onClose}>
            Đóng
          </button>
          <button type="submit" className={primaryBtn} disabled={busy}>
            {busy ? 'Đang gửi' : 'Gửi lời khuyên'}
          </button>
        </div>
      </form>
    </div>
  );
}
