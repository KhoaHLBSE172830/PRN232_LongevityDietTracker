import React from 'react';
import { Banner, Card } from '../../shared/components/ui';
import { useDoctor } from './DoctorData';
import { canGiveAdvice, filterSessions, STATUS, shortId, formatVnDateTime } from './doctorLogic';
import { useSessionActions } from './useSessionActions';
import { DoctorHeader, DoctorGate, SessionRow, AdviceModal, StatusBadge } from './DoctorParts';

export default function DoctorAdvice() {
  const { profile, sessions } = useDoctor();
  const actions = useSessionActions();
  const gate = DoctorGate();
  const waiting = filterSessions(sessions).filter(canGiveAdvice);
  const done = filterSessions(sessions, STATUS.COMPLETED).reverse();

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12 animate-fade-in">
      <DoctorHeader title="Kê lời khuyên" subtitle="Gửi phiếu lời khuyên cho buổi tư vấn; hội viên nhận thông báo và email." />
      {gate}
      {actions.error && <Banner tone="offline">{actions.error}</Banner>}
      {actions.message && <Banner tone="success">{actions.message}</Banner>}

      {profile && (
        <>
          <Card title={`Buổi cần kê lời khuyên (${waiting.length})`}>
            <div className="space-y-3">
              {waiting.length === 0 && <p className="text-sm text-slate-500">Không có buổi nào đang chờ lời khuyên.</p>}
              {waiting.map((x) => (
                <SessionRow key={x.id} session={x} busy={actions.busy} onConfirm={actions.confirm} onCancel={actions.cancel} onAdvice={actions.openAdvice} />
              ))}
            </div>
          </Card>

          <Card title={`Đã hoàn thành (${done.length})`}>
            <ul className="divide-y divide-slate-100 text-xs">
              {done.length === 0 && <li className="py-3 text-slate-500">Chưa có buổi nào hoàn thành.</li>}
              {done.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="font-bold text-slate-800">
                    {shortId(x.userId)} · {formatVnDateTime(x.scheduledAtUtc)}
                  </span>
                  <StatusBadge status={x.status} />
                </li>
              ))}
            </ul>
            <p className="pt-2 text-[11px] text-slate-400">API chưa trả nội dung phiếu đã kê của bác sĩ; hội viên xem phiếu ở mục "Ghi Chú Tư Vấn".</p>
          </Card>
        </>
      )}
      {actions.adviceSession && <AdviceModal session={actions.adviceSession} onClose={actions.closeAdvice} onSent={actions.afterAdvice} />}
    </div>
  );
}
