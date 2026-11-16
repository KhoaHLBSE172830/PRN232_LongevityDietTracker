import React, { useCallback, useEffect, useState } from 'react';
import { Banner } from '../../shared/components/ui';
import { adminApi, DESIGN_FMD_KCAL } from './adminApi';
import AdminHeader, { inputCls, primaryBtn, ghostBtn } from './AdminHeader';

const FIELDS = [
  ['maxCalories', 'Tối đa (kcal)'],
  ['targetProteinPercent', 'Đạm %'],
  ['targetFatPercent', 'Béo %'],
  ['targetCarbPercent', 'Carb %'],
];

function validate(r) {
  const kcal = Number(r.maxCalories);
  if (!(kcal >= 200 && kcal <= 3000)) return 'Kcal phải từ 200 đến 3000.';
  const sum = Number(r.targetProteinPercent) + Number(r.targetFatPercent) + Number(r.targetCarbPercent);
  if (Math.round(sum) !== 100) return `Tổng macro phải bằng 100% (hiện ${Math.round(sum)}%).`;
  if (!String(r.description || '').trim()) return 'Mô tả không được để trống.';
  return '';
}

export default function FmdRulesAdmin() {
  const [rules, setRules] = useState([]);
  const [dirty, setDirty] = useState({});
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const list = await adminApi.getFmdRules();
      setRules([...list].sort((a, b) => a.dayNumber - b.dayNumber));
      setDirty({});
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const edit = (day, key, value) => {
    setMessage('');
    setRules((list) => list.map((r) => (r.dayNumber === day ? { ...r, [key]: value } : r)));
    setDirty((d) => ({ ...d, [day]: true }));
  };

  const save = async (rule) => {
    const problem = validate(rule);
    if (problem) return setError(`Ngày ${rule.dayNumber}: ${problem}`);
    setBusy(rule.dayNumber);
    setError('');
    try {
      await adminApi.updateFmdRule(rule.dayNumber, {
        maxCalories: Number(rule.maxCalories),
        targetProteinPercent: Number(rule.targetProteinPercent),
        targetFatPercent: Number(rule.targetFatPercent),
        targetCarbPercent: Number(rule.targetCarbPercent),
        description: String(rule.description).trim(),
      });
      setDirty((d) => ({ ...d, [rule.dayNumber]: false }));
      setMessage(`Đã lưu quy tắc ngày ${rule.dayNumber}.`);
    } catch (err) {
      setError(`Ngày ${rule.dayNumber}: ${err.message}`);
    } finally {
      setBusy(null);
    }
  };

  const applyDesign = () => {
    setMessage('');
    setRules((list) => list.map((r) => ({ ...r, maxCalories: DESIGN_FMD_KCAL[r.dayNumber] ?? r.maxCalories })));
    setDirty(Object.fromEntries(rules.map((r) => [r.dayNumber, true])));
  };

  const drift = rules.some((r) => DESIGN_FMD_KCAL[r.dayNumber] && Number(r.maxCalories) !== DESIGN_FMD_KCAL[r.dayNumber]);

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12 animate-fade-in">
      <AdminHeader
        title="Quy tắc định mức FMD"
        subtitle="Ngưỡng kcal và macro từng ngày của chu kỳ 5 ngày. Vượt ngưỡng sẽ kích hoạt cảnh báo cho hội viên."
        action={
          <button type="button" onClick={applyDesign} className={ghostBtn}>
            Đặt theo thiết kế (1100/780/760/760/780)
          </button>
        }
      />
      {error && <Banner tone="offline">{error}</Banner>}
      {message && <Banner tone="success">{message}</Banner>}
      {drift && <Banner tone="demo">Định mức hiện tại khác thiết kế 1100/780/760/760/780 kcal.</Banner>}

      <div className="space-y-3">
        {rules.map((r) => (
          <div key={r.dayNumber} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
              <div className="md:col-span-1">
                <p className="text-[11px] font-bold uppercase text-slate-500">Ngày</p>
                <p className="text-2xl font-extrabold text-slate-900">{r.dayNumber}</p>
              </div>
              {FIELDS.map(([key, label]) => (
                <label key={key} className="md:col-span-2">
                  <span className="mb-1 block text-[11px] font-bold text-slate-600">{label}</span>
                  <input type="number" className={inputCls} value={r[key]} onChange={(e) => edit(r.dayNumber, key, e.target.value)} />
                </label>
              ))}
              <div className="md:col-span-1">
                <button type="button" className={primaryBtn} disabled={!dirty[r.dayNumber] || busy === r.dayNumber} onClick={() => save(r)}>
                  {busy === r.dayNumber ? 'Đang lưu' : 'Lưu'}
                </button>
              </div>
            </div>
            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] font-bold text-slate-600">Mô tả</span>
              <input className={inputCls} value={r.description || ''} onChange={(e) => edit(r.dayNumber, 'description', e.target.value)} />
            </label>
          </div>
        ))}
        {rules.length === 0 && !error && <p className="text-sm text-slate-500">Đang tải quy tắc...</p>}
      </div>
    </div>
  );
}
