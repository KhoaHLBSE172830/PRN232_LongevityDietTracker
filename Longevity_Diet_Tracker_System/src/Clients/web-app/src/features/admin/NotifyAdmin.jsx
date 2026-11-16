import React, { useState } from 'react';
import { Banner } from '../../shared/components/ui';
import { adminApi, NOTIFICATION_CHANNELS } from './adminApi';
import AdminHeader, { inputCls, primaryBtn } from './AdminHeader';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function NotifyAdmin() {
  const [form, setForm] = useState({ userId: '', recipient: '', subject: '', body: '', channel: 2 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const set = (k, v) => {
    setMessage('');
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!GUID.test(form.userId.trim())) return setError('Mã người dùng phải là GUID.');
    const channel = Number(form.channel);
    if (channel === 1 && !form.recipient.includes('@')) return setError('Kênh Email cần địa chỉ email người nhận.');
    if (form.subject.trim().length < 3 || form.body.trim().length < 3) return setError('Tiêu đề và nội dung cần ít nhất 3 ký tự.');
    setBusy(true);
    try {
      const r = await adminApi.sendNotification({
        userId: form.userId.trim(),
        recipient: form.recipient.trim() || form.userId.trim(),
        subject: form.subject.trim(),
        body: form.body.trim(),
        channel,
        eventId: crypto.randomUUID(),
      });
      setMessage(`Đã xử lý thông báo (trạng thái: ${r?.status ?? 'đã ghi'}). Xem email ở Mailpit nếu chọn kênh Email.`);
      setForm((f) => ({ ...f, subject: '', body: '' }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-12 animate-fade-in">
      <AdminHeader title="Thông báo hệ thống" subtitle="Gửi thông báo thủ công tới một người dùng (chỉ Admin). Các dịch vụ khác gửi tự động qua RabbitMQ." />
      {error && <Banner tone="offline">{error}</Banner>}
      {message && <Banner tone="success">{message}</Banner>}
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-600">Mã người nhận (GUID)</span>
            <input className={inputCls} value={form.userId} onChange={(e) => set('userId', e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-600">Kênh</span>
            <select className={inputCls} value={form.channel} onChange={(e) => set('channel', e.target.value)}>
              {NOTIFICATION_CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-slate-600">Email người nhận (bắt buộc với kênh Email)</span>
          <input className={inputCls} value={form.recipient} onChange={(e) => set('recipient', e.target.value)} placeholder="ten@example.com" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-slate-600">Tiêu đề</span>
          <input className={inputCls} value={form.subject} onChange={(e) => set('subject', e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold text-slate-600">Nội dung</span>
          <textarea rows={4} className={inputCls} value={form.body} onChange={(e) => set('body', e.target.value)} />
        </label>
        <button type="submit" className={primaryBtn} disabled={busy}>
          {busy ? 'Đang gửi' : 'Gửi thông báo'}
        </button>
      </form>
    </div>
  );
}
