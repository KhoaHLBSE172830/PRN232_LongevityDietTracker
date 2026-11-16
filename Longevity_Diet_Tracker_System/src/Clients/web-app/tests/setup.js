// localStorage giả lập cho môi trường Node (mã nguồn FE dùng localStorage bọc try/catch).
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => store.clear(),
};

/** Tạo JWT không ký (FE chỉ giải mã payload, không kiểm chữ ký). */
export function fakeJwt(claims = {}) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const payload = { exp: Math.floor(Date.now() / 1000) + 3600, ...claims };
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.sig`;
}

export const resetStorage = () => globalThis.localStorage.clear();
