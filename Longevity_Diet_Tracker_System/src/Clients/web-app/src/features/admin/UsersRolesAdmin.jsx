import React, { useState } from 'react';
import { Banner } from '../../shared/components/ui';
import { getSession } from '../../shared/services/session';
import { adminApi, ROLE_OPTIONS } from './adminApi';
import AdminHeader, { inputCls, primaryBtn, ghostBtn } from './AdminHeader';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function UsersRolesAdmin() {
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('Nutritionist');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);
  const myId = getSession()?.userId;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const id = userId.trim();
    if (!GUID.test(id)) return setError('Mã người dùng phải là GUID, ví dụ 3fa85f64-5717-4562-b3fc-2c963f66afa6.');
    if (id.toLowerCase() === String(myId).toLowerCase() && role !== 'Admin') {
      if (!window.confirm('Bạn đang hạ quyền Admin của chính mình. Sau khi đăng nhập lại bạn sẽ mất quyền quản trị. Tiếp tục?')) return;
    }
    setBusy(true);
    try {
      await adminApi.setUserRole(id, role);
      setMessage(`Đã đặt role ${role} cho ${id}. Role mới có hiệu lực khi người đó đăng nhập lại.`);
      setHistory((h) => [{ id, role, at: new Date() }, ...h].slice(0, 10));
    } catch (err) {
      setError(err.status === 404 ? 'Không tìm thấy người dùng với mã này.' : err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-12 animate-fade-in">
      <AdminHeader title="Phân quyền người dùng" subtitle="Cấp vai trò Hội viên, Chuyên gia hoặc Admin cho một tài khoản." />
      <Banner tone="info">
        API hiện chưa có danh sách người dùng, nên cần nhập mã người dùng (GUID). Mã nằm trong mục Hồ sơ của người đó ("Mã người dùng") hoặc trong bản ghi bảng users.
      </Banner>
      {error && <Banner tone="offline">{error}</Banner>}
      {message && <Banner tone="success">{message}</Banner>}

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-slate-600">Mã người dùng (GUID)</span>
          <div className="flex gap-2">
            <input className={inputCls} value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="3fa85f64-5717-4562-b3fc-2c963f66afa6" />
            <button type="button" className={ghostBtn} onClick={() => setUserId(String(myId || ''))}>
              Mã của tôi
            </button>
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-slate-600">Vai trò mới</span>
          <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={primaryBtn} disabled={busy}>
          {busy ? 'Đang lưu' : 'Đổi vai trò'}
        </button>
      </form>

      {history.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-2 text-sm font-extrabold text-slate-900">Thay đổi trong phiên này</h3>
          <ul className="divide-y divide-slate-100 text-xs">
            {history.map((h, i) => (
              <li key={i} className="flex items-center justify-between py-2">
                <span className="font-mono text-slate-700">{h.id}</span>
                <span className="font-bold text-indigo-700">{h.role}</span>
                <span className="text-slate-400">{h.at.toLocaleTimeString('vi-VN')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
