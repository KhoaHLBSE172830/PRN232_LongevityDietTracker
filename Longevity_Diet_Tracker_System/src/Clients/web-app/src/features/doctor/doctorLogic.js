// Logic thuần (không phụ thuộc React) cho portal Chuyên gia: dễ kiểm thử.

// ConsultationStatus phía backend: 1 Pending, 2 Confirmed, 3 Completed, 4 Cancelled.
export const STATUS = { PENDING: 1, CONFIRMED: 2, COMPLETED: 3, CANCELLED: 4 };

export const STATUS_LABELS = {
  1: 'Chờ xác nhận',
  2: 'Đã xác nhận',
  3: 'Đã hoàn thành',
  4: 'Đã hủy',
};

export const STATUS_TONES = {
  1: 'bg-amber-50 text-amber-700 border-amber-200',
  2: 'bg-blue-50 text-blue-700 border-blue-200',
  3: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  4: 'bg-rose-50 text-rose-700 border-rose-200',
};

const TZ = 'Asia/Ho_Chi_Minh';

/** Ngày yyyy-MM-dd theo giờ Việt Nam của một thời điểm. */
export const vnDateKey = (value) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(value));

export const formatVnDateTime = (value) =>
  new Intl.DateTimeFormat('vi-VN', { timeZone: TZ, hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));

/** Consultation không truy vấn được Identity nên chỉ có mã hội viên: hiển thị dạng rút gọn. */
export const shortId = (userId) => `Hội viên #${String(userId || '').slice(0, 8)}`;

/** Chỉ buổi còn hiệu lực (chờ hoặc đã xác nhận) mới kê lời khuyên được. */
export const canGiveAdvice = (s) => s.status === STATUS.PENDING || s.status === STATUS.CONFIRMED;
export const canConfirm = (s) => s.status === STATUS.PENDING;
export const canCancel = (s) => s.status === STATUS.PENDING || s.status === STATUS.CONFIRMED;

const byTimeAsc = (a, b) => new Date(a.scheduledAtUtc) - new Date(b.scheduledAtUtc);

/** Số liệu tổng quan từ danh sách lịch hẹn. `now` truyền vào để kiểm thử. */
export function summarize(sessions, now = new Date()) {
  const todayKey = vnDateKey(now);
  const list = sessions || [];
  const active = list.filter(canCancel);
  return {
    total: list.length,
    pending: list.filter((s) => s.status === STATUS.PENDING).length,
    confirmed: list.filter((s) => s.status === STATUS.CONFIRMED).length,
    completed: list.filter((s) => s.status === STATUS.COMPLETED).length,
    cancelled: list.filter((s) => s.status === STATUS.CANCELLED).length,
    today: active.filter((s) => vnDateKey(s.scheduledAtUtc) === todayKey).length,
    patients: new Set(list.map((s) => s.userId)).size,
    upcoming: active.filter((s) => new Date(s.scheduledAtUtc) > now).sort(byTimeAsc).slice(0, 5),
  };
}

/** Lọc theo trạng thái ('all' hoặc số) và ngày yyyy-MM-dd (rỗng = mọi ngày); sắp xếp theo giờ hẹn. */
export function filterSessions(sessions, status = 'all', dateKey = '') {
  return [...(sessions || [])]
    .filter((s) => status === 'all' || s.status === Number(status))
    .filter((s) => !dateKey || vnDateKey(s.scheduledAtUtc) === dateKey)
    .sort(byTimeAsc);
}

/** Gom lịch hẹn theo hội viên: [{ userId, sessions, count, last, active }] mới nhất trước. */
export function groupPatients(sessions) {
  const map = new Map();
  for (const s of sessions || []) {
    const entry = map.get(s.userId) || { userId: s.userId, sessions: [] };
    entry.sessions.push(s);
    map.set(s.userId, entry);
  }
  return [...map.values()]
    .map((p) => {
      const sorted = [...p.sessions].sort((a, b) => byTimeAsc(b, a));
      return { ...p, sessions: sorted, count: sorted.length, last: sorted[0], active: sorted.filter(canCancel).length };
    })
    .sort((a, b) => byTimeAsc(b.last, a.last));
}
