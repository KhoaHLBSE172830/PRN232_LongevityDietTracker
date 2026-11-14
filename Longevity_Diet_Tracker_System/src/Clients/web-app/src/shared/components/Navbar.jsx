import React from 'react';
import {
  Flame,
  CalendarDays,
  Plus,
  Globe,
  PanelLeftOpen,
} from 'lucide-react';
import { DEMO_USER } from '../services/apiClient';

export default function Navbar({ 
  onOpenAddMeal, 
  onBackToLanding,
  onToggleCollapse,
  isSidebarCollapsed = false,
}) {
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
                {DEMO_USER.streakDays} ngày
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

        </div>
      </div>
    </header>
  );
}
