import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Banner, Card } from '../../shared/components/ui';
import { adminApi, DESIGN_FMD_KCAL } from './adminApi';
import AdminHeader, { ghostBtn } from './AdminHeader';

// Bảng phân quyền của nhóm (khớp [Authorize] ở backend).
const MATRIX = [
  ['Đăng ký tài khoản (luôn role User)', 'POST /api/auth/register', true, false, false],
  ['Ghi bữa ăn, nhịn ăn, FMD, đặt lịch tư vấn', '/api/meals, /api/fasting, /api/fmd, POST /api/consultations/book', true, false, false],
  ['Xem hồ sơ bệnh nhân (gRPC), kê lời khuyên', 'GET review-user/{id}, POST advice', false, true, true],
  ['Quản trị quy tắc FMD', 'PUT /api/admin/fmd-rules/{day}', false, false, true],
  ['Quản trị mẫu bữa ăn', 'POST /api/mealtemplates', false, false, true],
  ['Đổi role người dùng', 'PUT /api/users/{id}/role', false, false, true],
];

const Mark = ({ ok }) =>
  ok ? <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-600" aria-label="Được phép" /> : <XCircle className="mx-auto h-5 w-5 text-slate-300" aria-label="Không được phép" />;

export default function AdminDashboard({ onNavigate }) {
  const [stats, setStats] = useState({ rules: null, templates: null, nutri: null, verified: null });
  const [userStats, setUserStats] = useState(null);
  const [probes, setProbes] = useState([]);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [rules, templates, nutri, users] = await Promise.allSettled([adminApi.getFmdRules(), adminApi.getTemplates(), adminApi.getNutritionists(), adminApi.getUserStats()]);
    setUserStats(users.status === 'fulfilled' ? users.value : null);
    setStats({
      rules: rules.status === 'fulfilled' ? rules.value : null,
      templates: templates.status === 'fulfilled' ? templates.value.length : null,
      nutri: nutri.status === 'fulfilled' ? nutri.value.length : null,
      verified: nutri.status === 'fulfilled' ? nutri.value.filter((n) => n.isVerified).length : null,
    });
    if ([rules, templates, nutri, users].some((r) => r.status === 'rejected')) setError('Một số dữ liệu không tải được (dịch vụ chưa sẵn sàng hoặc không có quyền).');
    else setError('');
  }, []);

  const check = useCallback(async () => {
    setChecking(true);
    setProbes(await adminApi.probeServices());
    setChecking(false);
  }, []);

  useEffect(() => {
    load();
    check();
  }, [load, check]);

  const drift = Array.isArray(stats.rules) && stats.rules.some((r) => DESIGN_FMD_KCAL[r.dayNumber] && r.maxCalories !== DESIGN_FMD_KCAL[r.dayNumber]);

  const tiles = [
    ['Quy tắc FMD', Array.isArray(stats.rules) ? stats.rules.length : '—', 'ngày', 'admin-fmd'],
    ['Mẫu bữa ăn', stats.templates ?? '—', 'mẫu', 'admin-templates'],
    ['Chuyên gia', stats.nutri ?? '—', stats.verified != null ? `${stats.verified} đã xác thực` : '', null],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 pb-12 animate-fade-in">
      <AdminHeader title="Tổng quan quản trị" subtitle="Trạng thái dịch vụ, dữ liệu danh mục và bảng phân quyền của hệ thống." />
      {error && <Banner tone="demo">{error}</Banner>}
      {drift && <Banner tone="demo">Quy tắc FMD đang khác thiết kế 1100/780/760/760/780 kcal. Vào mục Quy tắc FMD để chỉnh.</Banner>}

      {userStats && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              ['Tổng người dùng', userStats.userStats.totalUsers, 'tài khoản', 'admin-users'],
              ['Đang hoạt động', userStats.userStats.activeUsers, 'tài khoản', 'admin-users'],
              ['Đã khóa', userStats.userStats.lockedUsers, 'tài khoản', 'admin-users'],
              ['Email đã xác thực', userStats.userStats.emailVerifiedUsers, 'tài khoản', null],
            ].map(([label, value, unit, tab]) => (
              <button
                key={label}
                type="button"
                disabled={!tab}
                onClick={() => tab && onNavigate?.(tab)}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all enabled:hover:border-indigo-300 enabled:hover:shadow-md"
              >
                <p className="text-xs font-bold text-slate-500">{label}</p>
                <p className="mt-1 text-3xl font-extrabold text-slate-900">{value}</p>
                <p className="text-xs font-semibold text-indigo-700">{unit}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card title="Theo vai trò">
              {[
                ['Hội viên', userStats.roleStats.regularUsers, 'bg-emerald-500'],
                ['Chuyên gia', userStats.roleStats.nutritionists, 'bg-purple-500'],
                ['Quản trị', userStats.roleStats.administrators, 'bg-indigo-500'],
              ].map(([label, n, color]) => {
                const total = Math.max(1, userStats.userStats.totalUsers);
                return (
                  <div key={label} className="mb-2.5 last:mb-0">
                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                      <span>{label}</span>
                      <span>{n}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round((n / total) * 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </Card>
            <Card title="Đăng ký mới">
              <ul className="space-y-1.5 text-xs font-semibold text-slate-700">
                <li className="flex justify-between"><span>Hôm nay</span><b>{userStats.registrationTrends.newUsersToday}</b></li>
                <li className="flex justify-between"><span>7 ngày qua</span><b>{userStats.registrationTrends.newUsersThisWeek}</b></li>
                <li className="flex justify-between"><span>30 ngày qua</span><b>{userStats.registrationTrends.newUsersThisMonth}</b></li>
              </ul>
            </Card>
            <Card title="Hồ sơ sức khỏe">
              <ul className="space-y-1.5 text-xs font-semibold text-slate-700">
                <li className="flex justify-between"><span>Hồ sơ hoàn thiện</span><b>{userStats.longevityProfileStats.completedProfilesCount} ({Math.round(userStats.longevityProfileStats.profileCompletionRatePercent)}%)</b></li>
                <li className="flex justify-between"><span>Kcal mục tiêu trung bình</span><b>{userStats.longevityProfileStats.averageDailyCalorieTarget ? Math.round(userStats.longevityProfileStats.averageDailyCalorieTarget) : '—'}</b></li>
                <li className="flex justify-between"><span>Bật nhắc nước / bữa tối</span><b>{userStats.longevityProfileStats.waterReminderEnabledCount} / {userStats.longevityProfileStats.eveningReminderEnabledCount}</b></li>
              </ul>
              {Object.keys(userStats.longevityProfileStats.fastingTypePreferences || {}).length > 0 && (
                <p className="mt-2 text-[11px] text-slate-500">
                  Nhịn ăn ưa thích: {Object.entries(userStats.longevityProfileStats.fastingTypePreferences).map(([k, v]) => `${k} (${v})`).join(', ')}
                </p>
              )}
            </Card>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {tiles.map(([label, value, unit, tab]) => (
          <button
            key={label}
            type="button"
            disabled={!tab}
            onClick={() => tab && onNavigate?.(tab)}
            className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all enabled:hover:border-indigo-300 enabled:hover:shadow-md"
          >
            <p className="text-xs font-bold text-slate-500">{label}</p>
            <p className="mt-1 text-4xl font-extrabold text-slate-900">{value}</p>
            <p className="text-xs font-semibold text-indigo-700">{unit}</p>
          </button>
        ))}
      </div>

      <Card
        title="Trạng thái dịch vụ (qua Gateway)"
        action={
          <button type="button" className={ghostBtn} onClick={check} disabled={checking}>
            {checking ? 'Đang kiểm tra' : 'Kiểm tra lại'}
          </button>
        }
      >
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {probes.map((p) => (
            <li key={p.name} className={`rounded-xl border p-3 ${p.ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <p className="text-xs font-bold text-slate-800">{p.name}</p>
              <p className={`mt-1 text-xs font-semibold ${p.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                {p.ok ? `Hoạt động · ${p.ms} ms` : `Lỗi · ${p.note}`}
              </p>
            </li>
          ))}
          {probes.length === 0 && <li className="text-xs text-slate-500">Đang kiểm tra...</li>}
        </ul>
      </Card>

      <Card title="Bảng phân quyền theo vai trò">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">Chức năng</th>
                <th className="py-2 pr-3">Endpoint</th>
                <th className="px-3 py-2 text-center">User</th>
                <th className="px-3 py-2 text-center">Nutritionist</th>
                <th className="px-3 py-2 text-center">Admin</th>
              </tr>
            </thead>
            <tbody>
              {MATRIX.map(([name, endpoint, u, n, a]) => (
                <tr key={name} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-3 font-semibold text-slate-800">{name}</td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-slate-500">{endpoint}</td>
                  <td className="px-3 py-2"><Mark ok={u} /></td>
                  <td className="px-3 py-2"><Mark ok={n} /></td>
                  <td className="px-3 py-2"><Mark ok={a} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
