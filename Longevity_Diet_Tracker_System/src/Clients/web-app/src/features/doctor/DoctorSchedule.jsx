import React, { useState } from 'react';
import { Banner } from '../../shared/components/ui';
import { useDoctor } from './DoctorData';
import { filterSessions, STATUS_LABELS } from './doctorLogic';
import { useSessionActions } from './useSessionActions';
import { DoctorHeader, DoctorGate, SessionRow, AdviceModal, inputCls } from './DoctorParts';

const FILTERS = [['all', 'Tất cả'], [1, STATUS_LABELS[1]], [2, STATUS_LABELS[2]], [3, STATUS_LABELS[3]], [4, STATUS_LABELS[4]]];

export default function DoctorSchedule({ onOpenPatient }) {
  const { profile, sessions } = useDoctor();
  const actions = useSessionActions();
  const [status, setStatus] = useState('all');
  const [date, setDate] = useState('');
  const gate = DoctorGate();
  const list = filterSessions(sessions, status, date);

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12 animate-fade-in">
      <DoctorHeader title="Lịch hẹn" subtitle="Xác nhận, hủy và kê lời khuyên cho từng buổi tư vấn. Giờ hiển thị theo giờ Việt Nam." />
      {gate}
      {actions.error && <Banner tone="offline">{actions.error}</Banner>}
      {actions.message && <Banner tone="success">{actions.message}</Banner>}

      {profile && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {FILTERS.map(([value, label]) => (
              <button
                key={label}
                type="button"
                onClick={() => setStatus(value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                  status === value ? 'border-purple-700 bg-purple-700 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {label}
              </button>
            ))}
            <input type="date" aria-label="Lọc theo ngày" className={`${inputCls} !w-auto`} value={date} onChange={(e) => setDate(e.target.value)} />
            {date && (
              <button type="button" onClick={() => setDate('')} className="text-xs font-bold text-purple-700 hover:underline">
                Xóa lọc ngày
              </button>
            )}
          </div>

          <div className="space-y-3">
            {list.length === 0 && <p className="text-sm text-slate-500">Không có lịch hẹn phù hợp bộ lọc.</p>}
            {list.map((x) => (
              <SessionRow key={x.id} session={x} busy={actions.busy} onConfirm={actions.confirm} onCancel={actions.cancel} onAdvice={actions.openAdvice} onPatient={onOpenPatient} />
            ))}
          </div>
        </>
      )}
      {actions.adviceSession && <AdviceModal session={actions.adviceSession} onClose={actions.closeAdvice} onSent={actions.afterAdvice} />}
    </div>
  );
}
