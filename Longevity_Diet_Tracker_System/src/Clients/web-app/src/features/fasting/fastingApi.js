import { apiClient, DEMO_USER } from '../../shared/services/apiClient';

/**
 * Fasting API (Kiệt) — chỉ dùng trong thư mục features/fasting/.
 *
 * Quy tắc:
 *  - Có access token hợp lệ  -> gọi backend thật qua Gateway. userId lấy từ claim `nameid` của JWT,
 *    vì server bỏ qua userId trong body (AGENT.md 4.3).
 *  - Không có token          -> chế độ mô phỏng (localStorage), có nhãn rõ ràng trên giao diện.
 *  - Lỗi mạng (không có phản hồi từ server) -> rơi về mô phỏng, có nhãn.
 *  - Lỗi HTTP thật (400/401/403/404/409...) -> ném FastingApiError kèm thông điệp của server.
 *    KHÔNG nuốt lỗi và trả "thành công giả".
 */

const TOKEN_KEY = 'accessToken';
const MOCK_KEY = 'longevity_fasting_mock_session';

// Giá trị `value` khớp enum FastingType phía backend.
export const FASTING_TYPES = [
  { value: 1, label: '12:12', hours: 12, title: 'Nhịn nhẹ 12 giờ', hint: 'Dễ bắt đầu, hợp nhịp sinh học' },
  { value: 7, label: '14:10', hours: 14, title: 'Nhịn 14 giờ, ăn trong 10 giờ', hint: 'Bước đệm lên 16:8' },
  { value: 2, label: '16:8', hours: 16, title: 'Nhịn 16 giờ, ăn trong 8 giờ', hint: 'Phổ biến nhất' },
  { value: 3, label: '18:6', hours: 18, title: 'Nhịn 18 giờ, ăn trong 6 giờ', hint: 'Tự thực bào rõ hơn' },
  { value: 4, label: '20:4', hours: 20, title: 'Nhịn 20 giờ, ăn trong 4 giờ (OMAD)', hint: 'Dành cho người đã quen' },
];

const TYPE_BY_NAME = {
  Circadian: 1,
  Intermittent14_10: 7,
  Intermittent16_8: 2,
  Intermittent18_6: 3,
  Intermittent20_4: 4,
  Extended: 5,
  FmdProtocol: 6,
};
const STATUS_BY_NUMBER = { 1: 'InProgress', 2: 'Completed', 3: 'Cancelled' };

export const typeLabel = (value) => FASTING_TYPES.find((t) => t.value === value)?.label ?? 'Tùy chỉnh';

export class FastingApiError extends Error {
  constructor(message, { status = 0, network = false } = {}) {
    super(message);
    this.name = 'FastingApiError';
    this.status = status;
    this.network = network;
  }
}

// ---------------------------------------------------------------- token / user

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(payload)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const NAME_ID_URI = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier';

/** Trả về { token, userId } nếu có token còn hạn, ngược lại null. */
function getSession() {
  let token = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
  if (!token || token.split('.').length !== 3) return null; // vd. 'demo-jwt-token' không phải JWT

  const claims = decodeJwt(token);
  if (!claims) return null;
  if (claims.exp && claims.exp * 1000 < Date.now()) return null;

  const userId = claims.nameid || claims[NAME_ID_URI] || claims.sub;
  return userId ? { token, userId } : null;
}

// apiClient mặc định timeout 5 giây: lần gọi đầu sau khi backend khởi động nguội (JIT, kết nối DB) có thể chậm hơn,
// và bị nhầm là "mất kết nối". Nới riêng cho các lời gọi Fasting.
const REQUEST_TIMEOUT_MS = 20000;

const authConfig = (token) => ({
  headers: { Authorization: `Bearer ${token}` },
  timeout: REQUEST_TIMEOUT_MS,
});

// ---------------------------------------------------------------- lỗi & chuẩn hóa

function toApiError(err) {
  if (!err?.response) {
    return new FastingApiError('Không kết nối được máy chủ.', { network: true });
  }
  const { status, data } = err.response;
  // Gateway trả 502/503/504 khi dịch vụ phía sau đang tắt: coi như mất kết nối.
  if (status === 502 || status === 503 || status === 504) {
    return new FastingApiError('Máy chủ tạm thời không phản hồi.', { status, network: true });
  }
  // Server trả lỗi ở 2 dạng: { Code, Message } (middleware) và { code, message, data } (validation).
  const serverMessage = data?.message ?? data?.Message;
  if (status === 401) {
    return new FastingApiError('Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.', { status });
  }
  if (status === 403) {
    return new FastingApiError(serverMessage || 'Bạn không có quyền thực hiện thao tác này.', { status });
  }
  return new FastingApiError(serverMessage || `Yêu cầu thất bại (HTTP ${status}).`, { status });
}

// Server không gắn "Z" cho một số trường hợp: coi chuỗi không có múi giờ là UTC.
const asIso = (v) => (v && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(v) ? `${v}Z` : v ?? null);

function normalize(raw) {
  if (!raw) return null;
  const type = typeof raw.fastingType === 'number' ? raw.fastingType : TYPE_BY_NAME[raw.fastingType] ?? 0;
  const status = typeof raw.status === 'number' ? STATUS_BY_NUMBER[raw.status] : String(raw.status);
  return {
    id: raw.id,
    userId: raw.userId,
    fastingType: type,
    typeLabel: typeLabel(type),
    startTimeUtc: asIso(raw.startTimeUtc),
    targetEndTimeUtc: asIso(raw.targetEndTimeUtc),
    actualEndTimeUtc: asIso(raw.actualEndTimeUtc),
    status,
    actualFastedHours: raw.actualFastedHours ?? null,
    moodNotes: raw.moodNotes ?? null,
    isPaused: raw.isPaused ?? !!raw.pausedAtUtc,
    pausedAtUtc: asIso(raw.pausedAtUtc),
  };
}

// ---------------------------------------------------------------- chế độ mô phỏng

const readMock = () => {
  try {
    return JSON.parse(localStorage.getItem(MOCK_KEY) || 'null');
  } catch {
    return null;
  }
};
const writeMock = (value) => {
  try {
    if (value) localStorage.setItem(MOCK_KEY, JSON.stringify(value));
    else localStorage.removeItem(MOCK_KEY);
  } catch {
    /* localStorage không khả dụng: bỏ qua */
  }
};

const mock = {
  async getActive() {
    const s = readMock();
    return s && s.status === 'InProgress' ? normalize(s) : null;
  },

  async start({ fastingType, durationHours, startTimeUtc }) {
    const current = readMock();
    if (current && current.status === 'InProgress') {
      throw new FastingApiError('Bạn đang có một phiên nhịn ăn đang chạy.', { status: 409 });
    }
    if (!(durationHours >= 0.5 && durationHours <= 168)) {
      throw new FastingApiError('Thời lượng phải từ 0.5 đến 168 giờ.', { status: 400 });
    }
    const start = startTimeUtc ? new Date(startTimeUtc) : new Date();
    const session = {
      id: `mock-${Date.now()}`,
      userId: DEMO_USER.id,
      fastingType,
      startTimeUtc: start.toISOString(),
      targetEndTimeUtc: new Date(start.getTime() + durationHours * 3600e3).toISOString(),
      actualEndTimeUtc: null,
      status: 'InProgress',
      actualFastedHours: null,
      moodNotes: null,
    };
    writeMock(session);
    return normalize(session);
  },

  async pause(sessionId) {
    const s = readMock();
    if (!s || s.id !== sessionId || s.status !== 'InProgress') throw new FastingApiError('Không tìm thấy phiên đang chạy.', { status: 404 });
    if (s.pausedAtUtc) throw new FastingApiError('Phiên đã đang tạm dừng.', { status: 400 });
    s.pausedAtUtc = new Date().toISOString();
    writeMock(s);
    return normalize(s);
  },

  async resume(sessionId) {
    const s = readMock();
    if (!s || s.id !== sessionId || s.status !== 'InProgress') throw new FastingApiError('Không tìm thấy phiên đang chạy.', { status: 404 });
    if (!s.pausedAtUtc) throw new FastingApiError('Phiên không ở trạng thái tạm dừng.', { status: 400 });
    const pausedMs = Date.now() - Date.parse(s.pausedAtUtc);
    s.targetEndTimeUtc = new Date(Date.parse(s.targetEndTimeUtc) + pausedMs).toISOString();
    s.totalPausedMs = (s.totalPausedMs || 0) + pausedMs;
    s.pausedAtUtc = null;
    writeMock(s);
    return normalize(s);
  },

  async finish(sessionId, status, note) {
    let s = readMock();
    if (!s || s.id !== sessionId) throw new FastingApiError('Không tìm thấy phiên nhịn ăn.', { status: 404 });
    if (s.pausedAtUtc) {
      // Kết thúc khi đang tạm dừng: tính nốt đoạn tạm dừng.
      s.totalPausedMs = (s.totalPausedMs || 0) + (Date.now() - Date.parse(s.pausedAtUtc));
      s.pausedAtUtc = null;
    }
    if (s.status !== 'InProgress') {
      throw new FastingApiError(`Không thể kết thúc phiên đang ở trạng thái '${s.status}'.`, { status: 400 });
    }
    s.status = status;
    s.actualEndTimeUtc = new Date().toISOString();
    s.actualFastedHours = Math.max(0, (Date.parse(s.actualEndTimeUtc) - Date.parse(s.startTimeUtc) - (s.totalPausedMs || 0)) / 3600e3);
    if (note) s.moodNotes = note;
    writeMock(s);
    return normalize(s);
  },
};

// ---------------------------------------------------------------- điều phối live / mô phỏng

/**
 * Chạy `liveFn(session)` nếu có token; mô phỏng nếu không có token hoặc mất kết nối.
 * Trả về { session, mock, reason } để giao diện hiển thị nhãn đúng.
 */
async function run(liveFn, mockFn) {
  const auth = getSession();
  if (!auth) return { session: await mockFn(), mock: true, reason: 'no-token' };

  try {
    return { session: await liveFn(auth), mock: false, reason: null };
  } catch (err) {
    const apiError = err instanceof FastingApiError ? err : toApiError(err);
    if (apiError.network) return { session: await mockFn(), mock: true, reason: 'offline' };
    throw apiError;
  }
}

export const fastingApi = {
  /** Phiên nhịn ăn đang chạy của người dùng hiện tại (hoặc null). */
  getActiveSession() {
    return run(
      async ({ token, userId }) => {
        const res = await apiClient.get(`/api/fasting/user/${userId}/active`, authConfig(token));
        return normalize(res.data?.data);
      },
      () => mock.getActive()
    );
  },

  /** Bắt đầu phiên mới. `durationHours` bắt buộc (0.5–168); `startTimeUtc` tùy chọn. */
  startFasting({ fastingType, durationHours, startTimeUtc }) {
    return run(
      async ({ token }) => {
        // Không gửi userId: server lấy từ JWT.
        const res = await apiClient.post(
          '/api/fasting/start',
          { fastingType, durationHours, ...(startTimeUtc ? { startTimeUtc } : {}) },
          authConfig(token)
        );
        return normalize(res.data?.data);
      },
      () => mock.start({ fastingType, durationHours, startTimeUtc })
    );
  },

  /** Kết thúc phiên (ghi nhận số giờ thực tế). */
  endFasting(sessionId, moodNotes) {
    return run(
      async ({ token }) => {
        const res = await apiClient.post(
          `/api/fasting/${sessionId}/end`,
          moodNotes ? { moodNotes } : {},
          authConfig(token)
        );
        return normalize(res.data?.data);
      },
      () => mock.finish(sessionId, 'Completed', moodNotes)
    );
  },

  /** Tạm dừng phiên (đồng hồ dừng, mốc kết thúc dời khi tiếp tục). */
  pauseFasting(sessionId) {
    return run(
      async ({ token }) => normalize((await apiClient.post(`/api/fasting/${sessionId}/pause`, {}, authConfig(token))).data?.data),
      () => mock.pause(sessionId)
    );
  },

  resumeFasting(sessionId) {
    return run(
      async ({ token }) => normalize((await apiClient.post(`/api/fasting/${sessionId}/resume`, {}, authConfig(token))).data?.data),
      () => mock.resume(sessionId)
    );
  },

  /** Lịch sử phiên đã kết thúc/hủy (chỉ có khi đã đăng nhập và kết nối được máy chủ). */
  async getHistory(limit = 10) {
    const auth = getSession();
    if (!auth) return [];
    try {
      const res = await apiClient.get(`/api/fasting/user/${auth.userId}/history?limit=${limit}`, authConfig(auth.token));
      return (res.data?.data ?? []).map(normalize);
    } catch {
      return [];
    }
  },

  /** Thống kê streak (chỉ khi đăng nhập thật). Trả null nếu không có. */
  async getStats() {
    const auth = getSession();
    if (!auth) return null;
    try {
      const res = await apiClient.get(`/api/fasting/user/${auth.userId}/stats`, authConfig(auth.token));
      return res.data?.data ?? null;
    } catch {
      return null;
    }
  },

  /** Hủy phiên đang chạy. */
  cancelFasting(sessionId, reason) {
    return run(
      async ({ token }) => {
        const res = await apiClient.post(
          `/api/fasting/${sessionId}/cancel`,
          reason ? { reason } : {},
          authConfig(token)
        );
        return normalize(res.data?.data);
      },
      () => mock.finish(sessionId, 'Cancelled', reason)
    );
  },
};
