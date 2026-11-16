import React, { useCallback, useEffect, useState } from 'react';
import { Banner } from '../../shared/components/ui';
import { getSession } from '../../shared/services/session';
import { adminApi, ROLE_OPTIONS } from './adminApi';
import AdminHeader, { inputCls, primaryBtn, ghostBtn } from './AdminHeader';

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  ['', 'Mọi trạng thái'],
  ['true', 'Đang hoạt động'],
  ['false', 'Đã khóa'],
];

const roleLabel = (v) => ROLE_OPTIONS.find((o) => o.value === v)?.label ?? v;
const fmtDate = (v) => (v ? new Date(v).toLocaleDateString('vi-VN') : '—');

function LockDialog({ user, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locking = user.isActive;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await adminApi.setUserStatus(user.id, !locking, reason.trim());
      onDone(r?.message || (locking ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.'));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <form onSubmit={submit} className="w-full max-w-md space-y-3 rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="text-base font-extrabold text-slate-900">{locking ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}</h3>
        <p className="text-xs text-slate-600">
          {user.fullName} ({user.email})
          {locking && '. Khóa sẽ thu hồi mọi phiên đăng nhập và chặn đăng nhập lại cho đến khi mở khóa.'}
        </p>
        {error && <Banner tone="offline">{error}</Banner>}
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-slate-600">Lý do (tùy chọn)</span>
          <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className={ghostBtn} onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className={primaryBtn} disabled={busy}>
            {busy ? 'Đang xử lý' : locking ? 'Khóa tài khoản' : 'Mở khóa'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function UsersRolesAdmin() {
  const myId = String(getSession()?.userId || '').toLowerCase();
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [role, setRole] = useState('');
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [pending, setPending] = useState({}); // userId -> role đang chọn nhưng chưa lưu
  const [busyId, setBusyId] = useState(null);
  const [lockTarget, setLockTarget] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Debounce ô tìm kiếm 350ms.
  useEffect(() => {
    const t = setTimeout(() => {
      setTerm(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    try {
      setData(await adminApi.listUsers({ pageNumber: page, pageSize: PAGE_SIZE, searchTerm: term, role, isActive: active }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [page, term, role, active]);

  useEffect(() => {
    load();
  }, [load]);

  const saveRole = async (u) => {
    const next = pending[u.id];
    if (!next || next === u.role) return;
    if (u.id.toLowerCase() === myId && next !== 'Admin' && !window.confirm('Bạn đang hạ quyền Admin của chính mình. Sau khi đăng nhập lại bạn sẽ mất quyền quản trị. Tiếp tục?')) return;
    setBusyId(u.id);
    setError('');
    setMessage('');
    try {
      await adminApi.setUserRole(u.id, next);
      setMessage(`Đã đổi ${u.email} sang ${roleLabel(next)}. Role mới có hiệu lực khi người đó đăng nhập lại.`);
      setPending((p) => {
        const { [u.id]: _drop, ...rest } = p;
        return rest;
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12 animate-fade-in">
      <AdminHeader title="Người dùng và phân quyền" subtitle="Tìm kiếm tài khoản, đổi vai trò, khóa hoặc mở khóa. Dữ liệu lấy trực tiếp từ dịch vụ Identity." />
      {error && <Banner tone="offline">{error}</Banner>}
      {message && <Banner tone="success">{message}</Banner>}

      <div className="flex flex-wrap items-center gap-3">
        <input className={`${inputCls} !w-72`} placeholder="Tìm theo email hoặc họ tên" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={`${inputCls} !w-auto`} aria-label="Lọc vai trò" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">Mọi vai trò</option>
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select className={`${inputCls} !w-auto`} aria-label="Lọc trạng thái" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}>
          {STATUS_FILTERS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <span className="text-xs font-semibold text-slate-500">{data ? `${data.totalCount} người dùng` : 'Đang tải...'}</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <th className="px-4 py-3">Người dùng</th>
              <th className="px-4 py-3">Vai trò</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => {
              const isMe = u.id.toLowerCase() === myId;
              const selected = pending[u.id] ?? u.role;
              return (
                <tr key={u.id} className="border-b border-slate-100 align-middle">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900">
                      {u.fullName} {isMe && <span className="ml-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">Bạn</span>}
                    </p>
                    <p className="text-slate-500">{u.email}</p>
                    <p className="font-mono text-[10px] text-slate-400">{u.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        aria-label={`Vai trò của ${u.email}`}
                        className={`${inputCls} !w-44`}
                        value={selected}
                        onChange={(e) => setPending((p) => ({ ...p, [u.id]: e.target.value }))}
                      >
                        {ROLE_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                      {selected !== u.role && (
                        <button type="button" className={primaryBtn} disabled={busyId === u.id} onClick={() => saveRole(u)}>
                          Lưu
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${u.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                      {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                    {u.isEmailVerified && <span className="ml-1.5 text-[10px] font-semibold text-slate-400">Email đã xác thực</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{fmtDate(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={isMe && u.isActive}
                      title={isMe ? 'Không thể tự khóa tài khoản của chính mình' : ''}
                      className={u.isActive ? 'rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40' : ghostBtn}
                      onClick={() => setLockTarget(u)}
                    >
                      {u.isActive ? 'Khóa' : 'Mở khóa'}
                    </button>
                  </td>
                </tr>
              );
            })}
            {data && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Không có người dùng phù hợp bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <button type="button" className={ghostBtn} disabled={!data.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>
            ← Trang trước
          </button>
          <span>
            Trang {data.pageNumber}/{data.totalPages}
          </span>
          <button type="button" className={ghostBtn} disabled={!data.hasNextPage} onClick={() => setPage((p) => p + 1)}>
            Trang sau →
          </button>
        </div>
      )}

      {lockTarget && (
        <LockDialog
          user={lockTarget}
          onClose={() => setLockTarget(null)}
          onDone={(msg) => {
            setLockTarget(null);
            setMessage(msg);
            load();
          }}
        />
      )}
    </div>
  );
}
