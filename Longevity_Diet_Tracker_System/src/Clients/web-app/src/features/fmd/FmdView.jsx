import React, { useState, useEffect } from 'react';
import { Leaf, ShieldAlert, Mail, CheckCircle2, RefreshCw, Bell } from 'lucide-react';
import { fmdApi, DEFAULT_FMD_RULES } from './fmdApi';
import { DEMO_USER } from '../../shared/services/apiClient';

export default function FmdView() {
  const [activeCycle, setActiveCycle] = useState(null);
  const [rules, setRules] = useState(DEFAULT_FMD_RULES);
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState({
    emailNotificationsEnabled: true,
    fastingRemindersEnabled: true,
    nutritionistAdviceAlertsEnabled: true,
  });
  const [loading, setLoading] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('');

  const loadFmdData = async () => {
    const [cycleData, rulesData, notifData, prefData] = await Promise.all([
      fmdApi.getActiveCycle(DEMO_USER.id),
      fmdApi.getRules(),
      fmdApi.getUserNotifications(DEMO_USER.id),
      fmdApi.getPreferences(DEMO_USER.id),
    ]);
    if (cycleData) setActiveCycle(cycleData);
    if (Array.isArray(rulesData) && rulesData.length > 0) setRules(rulesData);
    if (Array.isArray(notifData)) setNotifications(notifData);
    if (prefData) setPreferences(prefData);
  };

  useEffect(() => {
    loadFmdData();
  }, []);

  const handleStartCycle = async () => {
    setLoading(true);
    setBannerMessage('');
    try {
      const created = await fmdApi.startCycle({
        userId: DEMO_USER.id,
        startDate: new Date().toISOString(),
      });
      if (created) {
        setActiveCycle(created);
        setBannerMessage(
          `Đã kích hoạt Chu kỳ FMD #${created.cycleNumber || 1} — Ngày hiện tại: Ngày ${created.currentDay || 1} (Định mức tối đa: ${created.targetCaloriesToday || 1100} kcal).`
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePreference = async (key) => {
    const updated = {
      ...preferences,
      [key]: !preferences[key],
    };
    setPreferences(updated);
    await fmdApi.updatePreferences(DEMO_USER.id, updated);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                Chế Độ Giả Nhịn Ăn FMD 5 Ngày (Dr. Valter Longo)
              </span>
              {activeCycle && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                  Đang chạy: Ngày {activeCycle.currentDay}/5 ({activeCycle.targetCaloriesToday || (activeCycle.currentDay === 1 ? 1100 : 725)} kcal)
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              Thanh Lọc Tế Bào & Cảnh Báo Định Mức Năng Lượng
            </h2>
          </div>
        </div>

        <button
          onClick={handleStartCycle}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all cursor-pointer"
        >
          <Leaf className="w-4 h-4 fill-white" />
          <span>{loading ? 'Đang kích hoạt...' : 'Bắt Đầu Chu Kỳ FMD 5 Ngày Mới'}</span>
        </button>
      </div>

      {bannerMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between">
          <span>✅ {bannerMessage}</span>
          <button
            onClick={() => setBannerMessage('')}
            className="text-emerald-700 hover:underline text-[11px]"
          >
            Đóng
          </button>
        </div>
      )}

      {/* 5-Day Protocol Roadmap */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-800">
            Lộ Trình 5 Ngày Thanh Lọc Tế Bào (FMD Protocol)
          </h3>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
            Tần suất: 1 chu kỳ mỗi 1 - 3 tháng
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {rules.map((r) => {
            const isCurrentDay = activeCycle?.currentDay === r.dayNumber;
            return (
              <div
                key={r.dayNumber}
                className={`p-3.5 rounded-2xl border text-center space-y-1 transition-all ${
                  isCurrentDay
                    ? 'bg-teal-50/90 border-teal-500 ring-2 ring-teal-500/20'
                    : 'bg-slate-50 border-slate-200/80'
                }`}
              >
                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">
                  Ngày {r.dayNumber} {isCurrentDay ? '• Hôm nay' : ''}
                </span>
                <span className="text-base font-extrabold text-teal-800 block">
                  {r.maxCalories} kcal
                </span>
                <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                  {r.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">Kiểm Soát Calo Tự Động</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Hệ thống tự động phát hiện nếu người dùng ghi nhận món ăn vượt quá định mức 1100/725 kcal trong ngày FMD và gửi thông báo nhắc nhở tức thì qua RabbitMQ & SMTP Mailpit.
          </p>
          <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold text-teal-700 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span>Trạng thái: Đã kết nối API FMD & RabbitMQ Alert</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            </span>
            <button
              onClick={loadFmdData}
              className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-900 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">Hộp Thư Thông Báo Sức Khỏe</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Gửi email hướng dẫn thực đơn chi tiết cho từng ngày FMD, cảnh báo vượt ngưỡng calo và nhận phiếu lời khuyên từ chuyên gia dinh dưỡng.
          </p>
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-[11px]">
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={!!preferences.emailNotificationsEnabled}
                onChange={() => handleTogglePreference('emailNotificationsEnabled')}
                className="accent-teal-600"
              />
              <span>Nhận Email SMTP</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={!!preferences.fastingRemindersEnabled}
                onChange={() => handleTogglePreference('fastingRemindersEnabled')}
                className="accent-teal-600"
              />
              <span>Nhắc nhịn ăn</span>
            </label>
            <label className="inline-flex items-center gap-1.5 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                checked={!!preferences.nutritionistAdviceAlertsEnabled}
                onChange={() => handleTogglePreference('nutritionistAdviceAlertsEnabled')}
                className="accent-teal-600"
              />
              <span>Lời khuyên Bác sĩ</span>
            </label>
          </div>
        </div>
      </div>

      {/* Notification History List */}
      {notifications.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-extrabold text-slate-800">
              Lịch Sử Thông Báo & Cảnh Báo Gần Đây ({notifications.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notifications.slice(0, 5).map((n) => (
              <div
                key={n.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-slate-800">{n.subject}</p>
                  <p className="text-slate-500 text-[11px]">
                    Kênh: {n.channel} • Người nhận: {n.recipient}
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200 font-bold text-[10px]">
                  {n.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 text-teal-900 text-xs flex items-center justify-between">
        <p>
          🌿 <strong>Giao thức FMD (Fasting Mimicking Diet):</strong> Được nghiên cứu bởi Viện Tuổi Thọ (Đại học Nam California - USC), chu kỳ giúp kích hoạt cơ chế tự thực bào và tái tạo tế bào gốc tự nhiên cho cơ thể.
        </p>
      </div>
    </div>
  );
}
