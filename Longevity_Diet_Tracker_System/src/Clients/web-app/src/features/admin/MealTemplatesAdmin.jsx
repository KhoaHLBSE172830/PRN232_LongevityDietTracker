import React, { useCallback, useEffect, useState } from 'react';
import { Banner } from '../../shared/components/ui';
import { adminApi, FASTING_TYPE_OPTIONS } from './adminApi';
import AdminHeader, { inputCls, primaryBtn } from './AdminHeader';

const EMPTY = {
  name: '',
  description: '',
  associatedFastingType: 2,
  fmdDayNumber: '',
  totalCalories: '',
  totalProteinGrams: '',
  totalCarbsGrams: '',
  totalFatGrams: '',
  totalFiberGrams: '',
  isPlantSlantCompliant: true,
  isHaraHachiBuOptimized: true,
};

const NUMBER_FIELDS = [
  ['totalCalories', 'Năng lượng (kcal)'],
  ['totalProteinGrams', 'Đạm (g)'],
  ['totalCarbsGrams', 'Carb (g)'],
  ['totalFatGrams', 'Béo (g)'],
  ['totalFiberGrams', 'Chất xơ (g)'],
];

export default function MealTemplatesAdmin() {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      setTemplates(await adminApi.getTemplates());
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (k, v) => {
    setMessage('');
    setForm((f) => ({ ...f, [k]: v }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.name.trim().length < 3) return setError('Tên mẫu cần ít nhất 3 ký tự.');
    if (!(Number(form.totalCalories) > 0)) return setError('Năng lượng phải lớn hơn 0.');
    setBusy(true);
    try {
      await adminApi.createTemplate({
        name: form.name.trim(),
        description: form.description.trim(),
        associatedFastingType: Number(form.associatedFastingType),
        fmdDayNumber: form.fmdDayNumber === '' ? null : Number(form.fmdDayNumber),
        totalCalories: Number(form.totalCalories),
        totalProteinGrams: Number(form.totalProteinGrams) || 0,
        totalCarbsGrams: Number(form.totalCarbsGrams) || 0,
        totalFatGrams: Number(form.totalFatGrams) || 0,
        totalFiberGrams: Number(form.totalFiberGrams) || 0,
        isPlantSlantCompliant: form.isPlantSlantCompliant,
        isHaraHachiBuOptimized: form.isHaraHachiBuOptimized,
      });
      setMessage(`Đã tạo mẫu "${form.name.trim()}".`);
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const typeLabel = (v) => FASTING_TYPE_OPTIONS.find((o) => o.value === v || o.value === Number(v))?.label ?? String(v);

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12 animate-fade-in">
      <AdminHeader title="Mẫu bữa ăn Blue Zones" subtitle="Mẫu do Admin tạo, hội viên thêm nhanh vào nhật ký ở mục Bữa ăn." />
      {error && <Banner tone="offline">{error}</Banner>}
      {message && <Banner tone="success">{message}</Banner>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <form onSubmit={submit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="text-sm font-extrabold text-slate-900">Tạo mẫu mới</h3>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-600">Tên mẫu</span>
            <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] font-bold text-slate-600">Mô tả</span>
            <input className={inputCls} value={form.description} onChange={(e) => set('description', e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-slate-600">Chế độ nhịn ăn phù hợp</span>
              <select className={inputCls} value={form.associatedFastingType} onChange={(e) => set('associatedFastingType', e.target.value)}>
                {FASTING_TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold text-slate-600">Ngày FMD (tùy chọn)</span>
              <select className={inputCls} value={form.fmdDayNumber} onChange={(e) => set('fmdDayNumber', e.target.value)}>
                <option value="">Không</option>
                {[1, 2, 3, 4, 5].map((d) => (
                  <option key={d} value={d}>
                    Ngày {d}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {NUMBER_FIELDS.map(([k, label]) => (
              <label key={k} className="block">
                <span className="mb-1 block text-[11px] font-bold text-slate-600">{label}</span>
                <input type="number" min="0" className={inputCls} value={form[k]} onChange={(e) => set(k, e.target.value)} />
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={form.isPlantSlantCompliant} onChange={(e) => set('isPlantSlantCompliant', e.target.checked)} />
            Ưu tiên thực vật (Plant-Slant)
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input type="checkbox" checked={form.isHaraHachiBuOptimized} onChange={(e) => set('isHaraHachiBuOptimized', e.target.checked)} />
            Phù hợp nguyên tắc no 80% (Hara Hachi Bu)
          </label>
          <button type="submit" className={primaryBtn} disabled={busy}>
            {busy ? 'Đang tạo' : 'Tạo mẫu'}
          </button>
        </form>

        <div className="space-y-3 lg:col-span-3">
          <h3 className="text-sm font-extrabold text-slate-900">Danh sách mẫu ({templates.length})</h3>
          {templates.length === 0 && <p className="text-sm text-slate-500">Chưa có mẫu nào.</p>}
          {templates.map((t) => (
            <div key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">{t.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{t.description}</p>
                </div>
                <span className="shrink-0 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700">
                  {typeLabel(t.associatedFastingType)}
                  {t.fmdDayNumber ? ` · Ngày ${t.fmdDayNumber}` : ''}
                </span>
              </div>
              <p className="mt-2 text-xs font-bold text-emerald-700">
                {Math.round(t.totalCalories)} kcal · Đạm {Math.round(t.totalProteinGrams)}g · Carb {Math.round(t.totalCarbsGrams)}g · Béo{' '}
                {Math.round(t.totalFatGrams)}g · Xơ {Math.round(t.totalFiberGrams)}g
              </p>
            </div>
          ))}
          <p className="text-[11px] text-slate-400">API hiện chưa có sửa và xóa mẫu.</p>
        </div>
      </div>
    </div>
  );
}
