import React from 'react';
import { Banner, Card } from '../../shared/components/ui';
import { useDoctor } from './DoctorData';
import { summarize } from './doctorLogic';
import { useSessionActions } from './useSessionActions';
import { DoctorHeader, DoctorGate, SessionRow, AdviceModal, ghostBtn } from './DoctorParts';

export default function DoctorOverview({ onNavigate }) {
  const { profile, sessions, loading, reload } = useDoctor();
  const actions = useSessionActions();
  const gate = DoctorGate();
  const s = summarize(sessions);

  const tiles = [
    ['Chờ xác nhận', s.pending, 'doctor-schedule'],
    ['Lịch hôm nay', s.today, 'doctor-schedule'],
    ['Hội viên', s.patients, 'doctor-patients'],
    ['Đã hoàn thành', s.completed, 'doctor-advice'],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12 animate-fade-in">
      <DoctorHeader
        title="Tổng quan chuyên gia"
        subtitle="Lịch hẹn, hội viên và công việc cần xử lý hôm nay."
        action={
          <button type="button" onClick={reload} disabled={loading} className={ghostBtn}>
            Làm mới
          </button>
        }
      />
      {gate}
      {actions.error && <Banner tone="offline">{actions.error}</Banner>}
      {actions.message && <Banner tone="success">{actions.message}</Banner>}

      {profile && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {tiles.map(([label, value, tab]) => (
              <button key={label} type="button" onClick={() => onNavigate?.(tab)} className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-purple-300 hover:shadow-md">
                <p className="text-xs font-bold text-slate-500">{label}</p>
                <p className="mt-1 text-4xl font-extrabold text-slate-900">{value}</p>
              </button>
            ))}
          </div>

          <Card title="Lịch hẹn sắp tới">
            <div className="space-y-3">
              {s.upcoming.length === 0 && <p className="text-sm text-slate-500">Không có lịch hẹn sắp tới.</p>}
              {s.upcoming.map((x) => (
                <SessionRow key={x.id} session={x} busy={actions.busy} onConfirm={actions.confirm} onCancel={actions.cancel} onAdvice={actions.openAdvice} />
              ))}
            </div>
          </Card>

          <Card title="Hồ sơ chuyên gia">
            <div className="space-y-1 text-xs text-slate-600">
              <p className="text-sm font-extrabold text-slate-900">{profile.fullName}</p>
              <p className="font-bold text-purple-700">{profile.certification}</p>
              <p>
                <b>Chuyên môn:</b> {profile.specialization}
              </p>
              <p>{profile.bio}</p>
              {Array.isArray(profile.tags) && profile.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {profile.tags.map((t) => (
                    <span key={t} className="rounded-full border border-purple-100 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <p className="pt-2 text-[11px] text-slate-400">API chưa cho chuyên gia tự sửa hồ sơ; liên hệ Admin để cập nhật.</p>
            </div>
          </Card>
        </>
      )}
      {actions.adviceSession && <AdviceModal session={actions.adviceSession} onClose={actions.closeAdvice} onSent={actions.afterAdvice} />}
    </div>
  );
}
