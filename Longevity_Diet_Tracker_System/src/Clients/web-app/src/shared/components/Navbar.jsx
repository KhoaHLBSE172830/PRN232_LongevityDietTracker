import React, { useEffect, useRef, useState } from 'react';
import {
  Flame,
  CalendarDays,
  Plus,
  Globe,
  PanelLeftOpen,
  Bell,
  LogOut,
  UserCircle2,
} from 'lucide-react';
import { useCurrentUser } from '../services/userStore';
import { fmdApi } from '../../features/fmd/fmdApi';
import { fastingApi } from '../../features/fasting/fastingApi';

export default function Navbar({ 
  onOpenAddMeal, 
  portal = 'user',
  roleLabel = null,
  onBackToLanding,
  onLogout,
  onNavigate,
  onToggleCollapse,
  isSidebarCollapsed = false,
}) {
  const user = useCurrentUser();
  const [notifs, setNotifs] = useState([]);
  const unread = notifs.filter((n) => n.isRead === false || (n.isRead === undefined && !n.readAtUtc)).length;
  const [bellOpen, setBellOpen] = useState(false);
  const [streak, setStreak] = useState(null);
  const bellRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const load = () => fmdApi.getUserNotifications(user.id).then((d) => alive && Array.isArray(d) && setNotifs(d));
    load();
    // Tự làm mới mỗi 10 giây để chuông hiện thông báo mới (cảnh báo đến qua RabbitMQ sau vài giây).
    const timer = setInterval(load, 10000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [user.id]);

  useEffect(() => {
    let alive = true;
    fastingApi.getStats().then((st) => alive && st && setStreak(st.currentStreakDays));
    return () => {
      alive = false;
    };
  }, [user.id]);

  useEffect(() => {
    const close = (e) => bellRef.current && !bellRef.current.contains(e.target) && setBellOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 w-full border-b border-[#E4EAE3] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center justify-between gap-4 px-5 py-3 sm:px-7 lg:px-9">

        {/* LEFT: TOGGLE & DATE */}
        <div className="flex min-w-0 items-center gap-3">
          {isSidebarCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Mở rộng thanh bên"
              aria-label="Mở rộng thanh bên"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#DFE9DF] bg-[#F1F6F0] text-[#28734D] hover:bg-[#E4EFE3] hover:border-[#A9C8AC] transition-all shadow-2xs active:scale-95"
            >
              <PanelLeftOpen size={19} strokeWidth={2} />
            </button>
          )}

          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#DFE9DF] bg-[#F1F6F0] text-[#28734D]">
            <CalendarDays size={19} strokeWidth={1.9} />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#829185]">
              Hôm nay
            </p>

            <p className="mt-1 truncate text-sm font-semibold capitalize text-[#24352B]">
              {today}
            </p>
          </div>
        </div>

        {/* RIGHT: QUICK ACTIONS */}
        <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">

          {portal === 'user' ? (
            <>
          {/* HEALTH STREAK */}
          <div className="hidden items-center gap-2.5 rounded-xl border border-[#F0E5D2] bg-[#FBF7EF] px-3.5 py-2 sm:flex">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F7EBD5]">
              <Flame
                size={17}
                className="text-[#C18435]"
                strokeWidth={2}
              />
            </div>

            <div>
              <p className="text-[10px] font-medium text-[#957C58]">
                Chuỗi sống khỏe
              </p>

              <p className="text-xs font-bold text-[#76552E]">
                {streak ?? user.streakDays} ngày
              </p>
            </div>
          </div>

          {/* ADD MEAL BUTTON */}
          <button
            type="button"
            onClick={onOpenAddMeal}
            className="
              flex h-11 items-center gap-2
              rounded-2xl bg-[#28734D]
              px-4 sm:px-5
              text-xs font-bold text-white
              shadow-sm shadow-[#28734D]/25
              transition-all duration-200
              hover:bg-[#215E3F]
              hover:shadow-md hover:shadow-[#28734D]/30
              active:scale-95
            "
          >
            <Plus size={16} strokeWidth={2.4} />
            <span className="hidden sm:inline">Ghi nhận bữa ăn</span>
            <span className="sm:hidden">Thêm</span>
          </button>

            </>
          ) : (
            <span className="hidden rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-bold text-indigo-800 sm:inline">
              {roleLabel}
            </span>
          )}

          {/* CHUÔNG THÔNG BÁO: huy hiệu = số thông báo chưa đọc (BE lưu readAtUtc) */}
          <div className="relative" ref={bellRef}>
            <button
              type="button"
              onClick={() => {
                const opening = !bellOpen;
                setBellOpen(opening);
                if (opening && unread > 0) {
                  // Mở chuông = đã xem: đánh dấu đã đọc trên máy chủ rồi cập nhật cục bộ.
                  fmdApi.markAllNotificationsRead(user.id).then((ok) => {
                    if (ok) setNotifs((list) => list.map((n) => ({ ...n, isRead: true })));
                  });
                }
              }}
              title="Thông báo"
              aria-label="Thông báo"
              className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DCE6DC] bg-[#F8FAF8] text-[#55725A] transition-all hover:border-[#B7D2BA] hover:bg-white hover:text-[#28734D] active:scale-95"
            >
              <Bell size={18} strokeWidth={1.8} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#C2503A] px-1 text-[10px] font-bold text-white">
                  {Math.min(unread, 9)}
                  {unread > 9 ? '+' : ''}
                </span>
              )}
            </button>
            {bellOpen && (
              <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-[#E4EAE3] bg-white shadow-xl">
                <p className="border-b border-[#EEF2EE] px-4 py-3 text-xs font-bold text-[#24352B]">Thông báo gần đây</p>
                <ul className="max-h-72 overflow-y-auto">
                  {notifs.length === 0 && <li className="px-4 py-6 text-center text-xs text-[#849087]">Chưa có thông báo.</li>}
                  {notifs.slice(0, 8).map((x, i) => (
                    <li key={x.id || i} className="border-b border-[#F3F6F3] px-4 py-3 last:border-0">
                      <p className="text-xs font-semibold text-[#24352B]">{x.subject || 'Thông báo'}</p>
                      {(x.sentAtUtc || x.createdAt) && <p className="mt-0.5 text-[10px] text-[#94A198]">{new Date(x.sentAtUtc || x.createdAt).toLocaleString('vi-VN')}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {onNavigate && portal === 'user' && (
            <button type="button" onClick={() => onNavigate('profile')} title="Hồ sơ" aria-label="Hồ sơ" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DCE6DC] bg-[#F8FAF8] text-[#55725A] transition-all hover:border-[#B7D2BA] hover:bg-white hover:text-[#28734D] active:scale-95">
              <UserCircle2 size={18} strokeWidth={1.8} />
            </button>
          )}

          {/* RETURN TO LANDING */}
          <button
            type="button"
            onClick={onBackToLanding}
            title="Quay lại trang giới thiệu"
            aria-label="Quay lại trang giới thiệu"
            className="
              flex h-11 w-11 items-center justify-center
              rounded-2xl border border-[#DCE6DC]
              bg-[#F8FAF8] text-[#55725A]
              transition-all duration-200
              hover:border-[#B7D2BA]
              hover:bg-white
              hover:text-[#28734D]
              hover:shadow-sm
              active:scale-95
            "
          >
            <Globe size={18} strokeWidth={1.8} />
          </button>

          {onLogout && (
            <button type="button" onClick={onLogout} title="Đăng xuất" aria-label="Đăng xuất" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#DCE6DC] bg-[#F8FAF8] text-[#55725A] transition-all hover:border-[#B7D2BA] hover:bg-white hover:text-[#28734D] active:scale-95">
              <LogOut size={18} strokeWidth={1.8} />
            </button>
          )}

        </div>
      </div>
    </header>
  );
}
