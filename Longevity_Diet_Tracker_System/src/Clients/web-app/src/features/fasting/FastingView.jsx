import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Timer,
  Play,
  Square,
  XCircle,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Droplets,
  Loader2,
  WifiOff,
  Wifi,
  Pause,
  Flame,
} from 'lucide-react';
import { fastingApi, FASTING_TYPES, FastingApiError } from './fastingApi';

const REMINDER_LEAD_MS = 15 * 60 * 1000; // khớp email nhắc nhở của backend (15 phút trước giờ kết thúc)

// Mốc tham khảo (ước lượng chung, không phải chẩn đoán y tế).
const MILESTONES = [
  { hours: 4, label: 'Cơ thể hấp thu xong bữa ăn gần nhất' },
  { hours: 12, label: 'Bắt đầu chuyển sang đốt mỡ (Ketosis nhẹ)' },
  { hours: 16, label: 'Tự thực bào (Autophagy) tăng dần' },
];

const pad = (n) => String(Math.floor(n)).padStart(2, '0');

function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${pad(total / 3600)}:${pad((total % 3600) / 60)}:${pad(total % 60)}`;
}

const formatHours = (h) => (h == null ? '—' : `${h.toFixed(h < 10 ? 1 : 0)} giờ`);

const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
    : '—';

const errorMessage = (err) =>
  err instanceof FastingApiError ? err.message : 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.';

function ProgressRing({ progress, overdue, children }) {
  const size = 232;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Tiến độ ${Math.round(progress * 100)}%`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-slate-100" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={`${overdue ? 'stroke-emerald-500' : 'stroke-emerald-600'} transition-[stroke-dashoffset] duration-700`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export default function FastingView() {
  const [session, setSession] = useState(null); // phiên đang chạy
  const [finished, setFinished] = useState(null); // phiên vừa kết thúc / hủy (để hiện tóm tắt)
  const [source, setSource] = useState(null); // { mock, reason } của lần gọi API gần nhất
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(FASTING_TYPES.find((t) => t.label === '16:8')); // mặc định 16:8
  const [notes, setNotes] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState(null);

  const loadExtras = useCallback(async () => {
    const [h, st] = await Promise.all([fastingApi.getHistory(8), fastingApi.getStats()]);
    setHistory(h);
    setStats(st);
  }, []);

  useEffect(() => {
    loadExtras();
  }, [loadExtras, session?.id]);

  // Nạp phiên đang chạy khi mở trang (đồng hồ dựa trên giờ của server nên tải lại trang vẫn đúng).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const result = await fastingApi.getActiveSession();
        if (!alive) return;
        setSession(result.session);
        setSource({ mock: result.mock, reason: result.reason });
      } catch (err) {
        if (alive) setError(errorMessage(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Chỉ chạy bộ đếm khi có phiên đang diễn ra.
  useEffect(() => {
    if (!session) return undefined;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session]);

  const act = useCallback(async (fn) => {
    setBusy(true);
    setError('');
    try {
      return await fn();
    } catch (err) {
      setError(errorMessage(err));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const handleStart = () =>
    act(async () => {
      const result = await fastingApi.startFasting({ fastingType: selected.value, durationHours: selected.hours });
      setSession(result.session);
      setFinished(null);
      setNotes('');
      setSource({ mock: result.mock, reason: result.reason });
    });

  const handleEnd = () =>
    act(async () => {
      const result = await fastingApi.endFasting(session.id, notes.trim() || undefined);
      setFinished(result.session);
      setSession(null);
      setConfirmCancel(false);
      setSource({ mock: result.mock, reason: result.reason });
    });

  const handlePauseResume = () =>
    act(async () => {
      const result = session.isPaused
        ? await fastingApi.resumeFasting(session.id)
        : await fastingApi.pauseFasting(session.id);
      setSession(result.session);
      setSource({ mock: result.mock, reason: result.reason });
    });

  const handleCancel = () =>
    act(async () => {
      const result = await fastingApi.cancelFasting(session.id);
      setFinished(result.session);
      setSession(null);
      setConfirmCancel(false);
      setSource({ mock: result.mock, reason: result.reason });
    });

  // ------------------------------------------------------------------ số liệu đồng hồ
  const timer = useMemo(() => {
    if (!session) return null;
    const start = Date.parse(session.startTimeUtc);
    const target = Date.parse(session.targetEndTimeUtc);
    const total = target - start;
    const effNow = session.isPaused && session.pausedAtUtc ? Date.parse(session.pausedAtUtc) : now;
    const elapsed = Math.max(0, effNow - start);
    const remaining = target - effNow;
    return {
      elapsed,
      remaining,
      overdue: remaining <= 0,
      progress: total > 0 ? elapsed / total : 0,
      elapsedHours: elapsed / 3600e3,
      totalHours: total / 3600e3,
      nearEnd: remaining > 0 && remaining <= REMINDER_LEAD_MS,
    };
  }, [session, now]);

  const sourceBadge = source && (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
        source.mock ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
      }`}
      title={
        source.mock
          ? source.reason === 'no-token'
            ? 'Bạn chưa đăng nhập: dữ liệu chỉ lưu trên trình duyệt này và không gửi lên máy chủ.'
            : 'Không kết nối được máy chủ: đang dùng dữ liệu mô phỏng trên trình duyệt này.'
          : 'Dữ liệu được lưu trên máy chủ.'
      }
    >
      {source.mock ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
      {source.mock
        ? source.reason === 'no-token'
          ? 'Chế độ mô phỏng (chưa đăng nhập)'
          : 'Chế độ mô phỏng (mất kết nối)'
        : 'Dữ liệu thật'}
    </span>
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                Nhịn Ăn Gián Đoạn (Intermittent Fasting)
              </span>
              {sourceBadge}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              Bộ Đếm Giờ Fasting 16/8 & Tự Động Hóa Nhắc Nhở
            </h2>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <p className="font-semibold">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-3xl p-10 border border-slate-200 flex items-center justify-center gap-2 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang tải phiên nhịn ăn...</span>
        </div>
      ) : session && timer ? (
        /* ---------------------------------------------------------- PHIÊN ĐANG CHẠY */
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs flex flex-col items-center gap-5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5" />
              <span>
                Phiên {session.typeLabel} · bắt đầu {formatDateTime(session.startTimeUtc)}
              </span>
            </div>

            <ProgressRing progress={timer.progress} overdue={timer.overdue}>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {timer.overdue ? 'Đã vượt mục tiêu' : 'Còn lại'}
              </span>
              <span className="text-4xl font-extrabold tabular-nums text-slate-900 mt-1">
                {formatClock(timer.overdue ? -timer.remaining : timer.remaining)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1">
                Đã nhịn {formatClock(timer.elapsed)} / {formatHours(timer.totalHours)}
              </span>
            </ProgressRing>

            {timer.overdue ? (
              <div className="w-full p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  <strong>Bạn đã đạt mục tiêu.</strong> Có thể kết thúc phiên và ăn bữa đầu tiên theo nguyên tắc Hara Hachi Bu
                  (ăn đến khoảng 80% no).
                </p>
              </div>
            ) : timer.nearEnd ? (
              <div className="w-full p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  <strong>Còn chưa đến 15 phút</strong> là đạt mục tiêu. Hệ thống cũng gửi email nhắc nhở vào thời điểm này.
                </p>
              </div>
            ) : null}

            <div className="w-full space-y-2">
              <label htmlFor="fasting-notes" className="text-xs font-bold text-slate-600">
                Ghi chú cảm nhận (tùy chọn, lưu khi kết thúc)
              </label>
              <input
                id="fasting-notes"
                type="text"
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ví dụ: hơi đói lúc 14 giờ, uống trà gừng"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {session.isPaused && (
              <div className="w-full p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <Pause className="w-4 h-4 mt-0.5 shrink-0" />
                <p>
                  <strong>Đang tạm dừng.</strong> Đồng hồ đã dừng; khi tiếp tục, mốc kết thúc sẽ được dời đúng bằng thời gian đã tạm dừng.
                </p>
              </div>
            )}

            <div className="w-full flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handlePauseResume}
                disabled={busy}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition-all"
              >
                {session.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                <span>{session.isPaused ? 'Tiếp Tục' : 'Tạm Dừng'}</span>
              </button>

              <button
                type="button"
                onClick={handleEnd}
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 fill-white" />}
                <span>Kết Thúc Phiên Nhịn Ăn</span>
              </button>

              {confirmCancel ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={busy}
                    className="px-4 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-all"
                  >
                    Xác nhận hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(false)}
                    disabled={busy}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                  >
                    Giữ phiên
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmCancel(true)}
                  disabled={busy}
                  className="flex items-center justify-center gap-2 px-5 py-3 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Hủy Phiên</span>
                </button>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-extrabold text-slate-800 text-sm">Mốc tham khảo theo thời gian nhịn</h3>
            <ul className="space-y-3">
              {MILESTONES.filter((m) => m.hours <= Math.max(timer.totalHours, 12)).map((m) => {
                const reached = timer.elapsedHours >= m.hours;
                return (
                  <li key={m.hours} className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold shrink-0 ${
                        reached ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {reached ? <CheckCircle2 className="w-4 h-4" /> : `${m.hours}h`}
                    </span>
                    <div>
                      <p className={`text-xs font-bold ${reached ? 'text-slate-800' : 'text-slate-500'}`}>Mốc {m.hours} giờ</p>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{m.label}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200 text-emerald-900 text-[11px] flex items-start gap-2">
              <Droplets className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
              <p>
                Uống đủ nước lọc hoặc trà thảo mộc không đường. Nếu thấy choáng váng hoặc mệt bất thường, hãy kết thúc phiên
                và hỏi ý kiến chuyên gia dinh dưỡng.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* ---------------------------------------------------------- CHƯA CÓ PHIÊN */
        <div className="space-y-4">
          {finished && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-start gap-2 ${
                finished.status === 'Completed'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              {finished.status === 'Completed' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <p>
                {finished.status === 'Completed' ? (
                  <>
                    <strong>Đã hoàn tất phiên {finished.typeLabel}.</strong> Thời gian nhịn thực tế:{' '}
                    <strong>{formatHours(finished.actualFastedHours)}</strong>.
                  </>
                ) : (
                  <>
                    <strong>Đã hủy phiên {finished.typeLabel}.</strong>
                  </>
                )}
              </p>
            </div>
          )}

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-5">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">Chọn chế độ nhịn ăn</h3>
              <p className="text-xs text-slate-500 mt-1">Phiên bắt đầu ngay khi bạn bấm nút bên dưới.</p>
            </div>

            <div role="radiogroup" aria-label="Chế độ nhịn ăn" className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {FASTING_TYPES.map((t) => {
                const active = selected.value === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelected(t)}
                    className={`text-left p-4 rounded-2xl border transition-all ${
                      active
                        ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-600/20'
                        : 'border-slate-200 bg-white hover:border-emerald-300'
                    }`}
                  >
                    <span className="block text-xl font-extrabold text-slate-900">{t.label}</span>
                    <span className="block text-[11px] font-semibold text-slate-600 mt-1">{t.title}</span>
                    <span className="block text-[11px] text-slate-400 mt-1">{t.hint}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleStart}
              disabled={busy}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
              <span>Bắt Đầu Phiên {selected.label}</span>
            </button>
          </div>
        </div>
      )}

      {/* Streak & lịch sử (chỉ khi dữ liệu thật từ máy chủ) */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            ['Chuỗi hiện tại', `${stats.currentStreakDays} ngày`, true],
            ['Chuỗi dài nhất', `${stats.longestStreakDays} ngày`, false],
            ['Phiên hoàn tất', stats.completedSessions, false],
            ['Tổng giờ nhịn', `${Math.round(stats.totalFastedHours)} giờ`, false],
          ].map(([label, value, flame]) => (
            <div key={label} className="bg-white rounded-2xl p-4 border border-slate-200">
              <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                {flame && <Flame className="w-3.5 h-3.5 text-amber-500" />}
                {label}
              </p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs">
          <h3 className="font-extrabold text-slate-800 text-sm mb-3">Lịch sử gần đây</h3>
          <ul className="divide-y divide-slate-100">
            {history.map((h) => (
              <li key={h.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="font-bold text-slate-800">{h.typeLabel} · {formatDateTime(h.startTimeUtc)}</p>
                  {h.moodNotes && <p className="text-slate-500 mt-0.5">{h.moodNotes}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-slate-800">
                    {h.actualFastedHours != null ? formatHours(h.actualFastedHours) : '—'}
                  </p>
                  <p className={h.status === 'Completed' ? 'text-emerald-700 font-semibold' : 'text-slate-400 font-semibold'}>
                    {h.status === 'Completed' ? 'Hoàn tất' : 'Đã hủy'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Thông tin tính năng */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Timer className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">Chế Độ 12:12, 14:10, 16:8, 18:6 & 20:4</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Theo dõi thời gian nhịn ăn thực tế và các mốc Đốt Mỡ (Ketosis), Tự Thực Bào (Autophagy). Mỗi người chỉ có một phiên
            đang chạy tại một thời điểm.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">Đồng Bộ Hồ Sơ Cho Chuyên Gia</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Số giờ nhịn ăn tổng hợp được chuyên gia dinh dưỡng đồng hành và phân tích trong buổi tư vấn.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">Nhắc Nhở Qua Email</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tác vụ nền gửi email nhắc trước khi phiên đạt mục tiêu khoảng 15 phút, tới địa chỉ email trong tài khoản đăng nhập.
          </p>
        </div>
      </div>
    </div>
  );
}
