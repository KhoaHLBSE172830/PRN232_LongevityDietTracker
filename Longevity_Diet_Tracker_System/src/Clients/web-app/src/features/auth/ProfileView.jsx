import React, { useEffect, useState } from 'react';
import { UserCircle2, Shield, Save, Flame, Heart, Award, CheckCircle2 } from 'lucide-react';
import { useCurrentUser, setCurrentUser, isDemoMode } from '../../shared/services/userStore';
import { Banner, Card } from '../../shared/components/ui';
import { fmdApi } from '../fmd/fmdApi';
import { FASTING_TYPES } from '../fasting/fastingApi';
import { authApi } from './authApi';

// Hồ sơ: Identity (Khoa) chưa có các trường mục tiêu/ưa thích => lưu cục bộ theo từng người dùng.
// Hai công tắc nhắc nhở (email, fasting) dùng API Notification có thật.

const DIET_OPTIONS = [
  { value: 'plant-slant', label: 'Ưu tiên thực vật (Plant-Slant)' },
  { value: 'mediterranean', label: 'Địa Trung Hải' },
  { value: 'okinawa', label: 'Okinawa' },
  { value: 'balanced', label: 'Cân bằng' },
];

const storageKey = (id) => `longevity_profile_${id}`;

function loadLocal(id) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(id)) || 'null') || {};
  } catch {
    return {};
  }
}

const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-bold text-slate-600">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
  </label>
);

const inputCls =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20';

const Toggle = ({ checked, onChange, label, note }) => (
  <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
    <div>
      <p className="text-xs font-bold text-slate-800">{label}</p>
      {note && <p className="mt-0.5 text-[11px] text-slate-500">{note}</p>}
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-emerald-600' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  </div>
);

export default function ProfileView() {
  const user = useCurrentUser();
  const demo = isDemoMode();

  const [form, setForm] = useState(() => ({
    name: user.name,
    caloricBudget: user.caloricBudget,
    proteinPct: 20,
    carbsPct: 50,
    fatPct: 30,
    preferredFasting: '16:8',
    diet: 'plant-slant',
    waterReminder: true,
    eveningReminder: false,
    ...loadLocal(user.id),
  }));
  const [prefs, setPrefs] = useState({ emailNotificationsEnabled: true, fastingRemindersEnabled: true });
  const [saved, setSaved] = useState('');
  const [saveError, setSaveError] = useState('');

  const [syncState, setSyncState] = useState(demo ? 'local' : 'loading'); // local | loading | server | error

  useEffect(() => {
    let alive = true;
    fmdApi.getPreferences(user.id).then((p) => alive && p && setPrefs(p));
    if (!demo) {
      authApi.getProfile(user.id).then((p) => {
        if (!alive) return;
        if (!p) return setSyncState('error');
        setSyncState('server');
        setForm((f) => ({
          ...f,
          caloricBudget: p.dailyCalorieTarget ?? f.caloricBudget,
          proteinPct: p.proteinPercent ?? f.proteinPct,
          carbsPct: p.carbsPercent ?? f.carbsPct,
          fatPct: p.fatPercent ?? f.fatPct,
          preferredFasting: p.preferredFastingType ?? f.preferredFasting,
          diet: p.dietaryPreference ?? f.diet,
          waterReminder: p.waterReminderEnabled ?? f.waterReminder,
          eveningReminder: p.eveningReminderEnabled ?? f.eveningReminder,
        }));
      });
    }
    return () => {
      alive = false;
    };
  }, [user.id, demo]);

  const set = (k, v) => {
    setSaved('');
    setForm((f) => ({ ...f, [k]: v }));
  };

  const macroSum = Number(form.proteinPct) + Number(form.carbsPct) + Number(form.fatPct);
  const macroOk = macroSum === 100;
  const kcal = Number(form.caloricBudget);
  const kcalOk = kcal >= 800 && kcal <= 5000;
  const canSave = macroOk && kcalOk && form.name.trim().length > 0;

  const save = async () => {
    if (!canSave) return;
    if (!demo) {
      try {
        await authApi.updateProfile(user.id, {
          dailyCalorieTarget: kcal,
          proteinPercent: Number(form.proteinPct),
          carbsPercent: Number(form.carbsPct),
          fatPercent: Number(form.fatPct),
          preferredFastingType: form.preferredFasting,
          dietaryPreference: form.diet,
          waterReminderEnabled: !!form.waterReminder,
          eveningReminderEnabled: !!form.eveningReminder,
        });
        setSyncState('server');
      } catch (err) {
        setSyncState('error');
        setSaved('');
        setSaveError(err.message);
        return;
      }
    }
    setSaveError('');
    try {
      localStorage.setItem(storageKey(user.id), JSON.stringify(form));
    } catch {
      /* bỏ qua */
    }
    setCurrentUser({
      ...user,
      name: form.name.trim(),
      caloricBudget: kcal,
      haraHachiBuThreshold: Math.round(kcal * 0.8),
    });
    setSaved('Đã lưu hồ sơ.');
    // Notification service có thể chậm/ngoại tuyến: không chặn thông báo lưu hồ sơ.
    fmdApi.updatePreferences(user.id, { ...prefs, userId: user.id });
  };

  const togglePref = (key) => {
    setSaved('');
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12 animate-fade-in">
      {demo && <Banner tone="demo">Chế độ trải nghiệm: thông tin hồ sơ đang được lưu tạm trên thiết bị này.</Banner>}
      {!demo && syncState === 'server' && (
        <Banner tone="success">Hồ sơ sức khỏe của bạn đã được cập nhật và lưu trữ an toàn.</Banner>
      )}
      {!demo && syncState === 'error' && (
        <Banner tone="offline">Đang xem dữ liệu ngoại tuyến trên máy của bạn.</Banner>
      )}
      {saveError && <Banner tone="offline">{saveError}</Banner>}

      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <img src={user.avatar} alt={user.name} className="h-14 w-14 rounded-full object-cover ring-2 ring-emerald-500/40" />
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{user.name}</h2>
            <p className="text-xs text-slate-500">{user.email}</p>
            <span className="mt-1 inline-block rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
              {user.role && user.role !== 'User' ? user.role : user.tier}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className="flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-700/20 transition-all hover:bg-emerald-800 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>Lưu thay đổi</span>
        </button>
      </div>

      {saved && <Banner tone="success">{saved}</Banner>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Thông tin cá nhân">
          <div className="space-y-4">
            <Field label="Họ và tên">
              <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} />
            </Field>
            <Field label="Email">
              <input className={`${inputCls} opacity-70`} value={user.email} disabled />
            </Field>
          </div>
        </Card>

        <Card title="Mục tiêu dinh dưỡng">
          <div className="space-y-4">
            <Field
              label="Định mức năng lượng mỗi ngày (kcal)"
              hint={kcalOk ? `Ngưỡng no 80% (Hara Hachi Bu): ${Math.round(kcal * 0.8)} kcal` : 'Nhập từ 800 đến 5000 kcal'}
            >
              <input type="number" className={inputCls} value={form.caloricBudget} onChange={(e) => set('caloricBudget', e.target.value)} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Đạm %">
                <input type="number" className={inputCls} value={form.proteinPct} onChange={(e) => set('proteinPct', e.target.value)} />
              </Field>
              <Field label="Carb %">
                <input type="number" className={inputCls} value={form.carbsPct} onChange={(e) => set('carbsPct', e.target.value)} />
              </Field>
              <Field label="Béo %">
                <input type="number" className={inputCls} value={form.fatPct} onChange={(e) => set('fatPct', e.target.value)} />
              </Field>
            </div>
            <p className={`text-[11px] font-semibold ${macroOk ? 'text-emerald-700' : 'text-red-600'}`}>
              Tổng macro: {macroSum}% {macroOk ? '' : '(phải bằng 100%)'}
            </p>
          </div>
        </Card>

        <Card title="Sở thích">
          <div className="space-y-4">
            <Field label="Chế độ nhịn ăn ưa thích">
              <select className={inputCls} value={form.preferredFasting} onChange={(e) => set('preferredFasting', e.target.value)}>
                {FASTING_TYPES.map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.label} — {t.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Định hướng ăn uống">
              <select className={inputCls} value={form.diet} onChange={(e) => set('diet', e.target.value)}>
                {DIET_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Card>

        <Card title="Nhắc nhở">
          <div className="space-y-3">
            <Toggle
              checked={!!prefs.emailNotificationsEnabled}
              onChange={() => togglePref('emailNotificationsEnabled')}
              label="Thông báo qua email"
              note="Nhận email nhắc nhở lối sống và tổng kết tuần."
            />
            <Toggle
              checked={!!prefs.fastingRemindersEnabled}
              onChange={() => togglePref('fastingRemindersEnabled')}
              label="Nhắc nhịn ăn"
              note="Nhận thông báo khi gần đến giờ kết thúc nhịn ăn."
            />
            <Toggle checked={form.waterReminder} onChange={(v) => set('waterReminder', v)} label="Nhắc uống nước" note="Nhắc nhở uống đủ nước đều đặn trong ngày." />
            <Toggle checked={form.eveningReminder} onChange={(v) => set('eveningReminder', v)} label="Nhắc bữa tối nhẹ" note="Nhắc duy trì thói quen ăn tối thanh nhẹ theo Blue Zones." />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="Huy hiệu (Minh họa)">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2">
              <Flame className="h-4 w-4 text-amber-500" />
              <span className="font-semibold text-slate-700">Chuỗi {user.streakDays} ngày kiên trì</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2">
              <Heart className="h-4 w-4 text-rose-500" />
              <span className="font-semibold text-slate-700">Bậc thầy Hara Hachi Bu (no 80%)</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2">
              <Award className="h-4 w-4 text-emerald-600" />
              <span className="font-semibold text-slate-700">Thực vật là chính</span>
            </div>
          </div>
        </Card>

        <Card title="Tài khoản & bảo mật">
          <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
            {demo
              ? 'Bạn đang dùng tài khoản demo, không có phiên đăng nhập thật.'
              : 'Phiên đăng nhập được xác thực bằng JWT qua Gateway.'}
          </p>
          <p className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-slate-700">
            <UserCircle2 className="h-3.5 w-3.5" />
            <span>Mã người dùng: {String(user.id).slice(0, 8)}…</span>
            {!demo && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
          </p>
        </Card>
      </div>
    </div>
  );
}
