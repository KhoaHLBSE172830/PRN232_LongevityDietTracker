import React, { useEffect, useState } from 'react';
import { Banner, Card } from '../../shared/components/ui';
import { useDoctor } from './DoctorData';
import { groupPatients, shortId, formatVnDateTime } from './doctorLogic';
import { useSessionActions } from './useSessionActions';
import { DoctorHeader, DoctorGate, SessionRow, AdviceModal, PatientHealthPanel } from './DoctorParts';

export default function DoctorPatients({ initialUserId = null }) {
  const { profile, sessions } = useDoctor();
  const actions = useSessionActions();
  const [selected, setSelected] = useState(initialUserId);
  const gate = DoctorGate();
  const patients = groupPatients(sessions);
  const current = patients.find((p) => p.userId === selected) || null;

  useEffect(() => {
    if (initialUserId) setSelected(initialUserId);
  }, [initialUserId]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12 animate-fade-in">
      <DoctorHeader title="Hồ sơ bệnh nhân" subtitle="Hội viên đã đặt lịch với bạn. Số liệu sức khỏe và nhật ký dinh dưỡng của hội viên." />
      {gate}
      {actions.error && <Banner tone="offline">{actions.error}</Banner>}
      {actions.message && <Banner tone="success">{actions.message}</Banner>}

      {profile && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-1">
            <h3 className="text-sm font-extrabold text-slate-900">Hội viên ({patients.length})</h3>
            {patients.length === 0 && <p className="text-sm text-slate-500">Chưa có hội viên nào đặt lịch.</p>}
            {patients.map((p) => (
              <button
                key={p.userId}
                type="button"
                onClick={() => setSelected(p.userId)}
                className={`w-full rounded-2xl border p-3 text-left transition-all ${
                  selected === p.userId ? 'border-purple-600 bg-purple-50' : 'border-slate-200 bg-white hover:border-purple-300'
                }`}
              >
                <p className="text-sm font-extrabold text-slate-900">{shortId(p.userId)}</p>
                <p className="text-[11px] text-slate-500">
                  {p.count} buổi · {p.active} đang chờ · gần nhất {formatVnDateTime(p.last.scheduledAtUtc)}
                </p>
              </button>
            ))}
            <p className="pt-1 text-[11px] text-slate-400">Tên hội viên chưa có trong dữ liệu lịch hẹn nên hiển thị mã rút gọn.</p>
          </div>

          <div className="space-y-4 lg:col-span-2">
            {!current && <p className="text-sm text-slate-500">Chọn một hội viên để xem hồ sơ sức khỏe.</p>}
            {current && (
              <>
                <Card title={`Sức khỏe: ${shortId(current.userId)}`}>
                  <PatientHealthPanel userId={current.userId} />
                </Card>
                <Card title="Các buổi tư vấn">
                  <div className="space-y-3">
                    {current.sessions.map((x) => (
                      <SessionRow key={x.id} session={x} busy={actions.busy} onConfirm={actions.confirm} onCancel={actions.cancel} onAdvice={actions.openAdvice} />
                    ))}
                  </div>
                </Card>
              </>
            )}
          </div>
        </div>
      )}
      {actions.adviceSession && <AdviceModal session={actions.adviceSession} onClose={actions.closeAdvice} onSent={actions.afterAdvice} />}
    </div>
  );
}
