import React from 'react';
import {
  Home,
  UtensilsCrossed,
  Timer,
  Leaf,
  Stethoscope,
  UserCircle2,
  Globe,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';
import { useCurrentUser } from '../services/userStore';

export default function Sidebar({
  activeTab,
  onSelectTab,
  onBackToLanding,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
}) {
  const user = useCurrentUser();

  const menuItems = [
    {
      id: 'overview',
      label: 'Tổng quan',
      icon: Home,
    },
    {
      id: 'meals',
      label: 'Dinh dưỡng & Bữa ăn',
      icon: UtensilsCrossed,
    },
    {
      id: 'fasting',
      label: 'Nhịn ăn gián đoạn',
      icon: Timer,
    },
    {
      id: 'fmd',
      label: 'Chu kỳ FMD 5 ngày',
      icon: Leaf,
    },
    {
      id: 'consultation',
      label: 'Tư vấn chuyên gia',
      icon: Stethoscope,
    },
    {
      id: 'profile',
      label: 'Hồ sơ & Bảo mật',
      icon: UserCircle2,
    },
  ];

  return (
    <aside
      className={`
        sticky top-0 z-40
        flex h-screen shrink-0
        flex-col
        overflow-x-hidden overflow-y-auto
        border-r border-[#DCE6DC]
        bg-[#E7F0E6]
        text-[#24352B]
        shadow-[2px_0_12px_rgba(36,83,55,0.04)]
        select-none
        transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-[76px]' : 'w-[280px]'}
      `}
    >
      {/* BRAND & TOGGLE HEADER */}
      <div
        className={`
          flex shrink-0 items-center
          border-b border-[#D6E3D5]
          py-4 transition-all duration-300
          ${isCollapsed ? 'flex-col justify-center gap-3 px-2' : 'justify-between px-5'}
        `}
      >
        {!isCollapsed ? (
          <>
            {/* Expanded Brand Info */}
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="
                  flex h-11 w-11 shrink-0
                  items-center justify-center
                  rounded-2xl
                  bg-[#28734D]
                  text-white
                  shadow-md shadow-[#28734D]/15
                "
              >
                <Leaf size={25} strokeWidth={1.8} />
              </div>

              <div className="min-w-0">
                <h1
                  className="
                    text-[17px] font-extrabold
                    leading-tight tracking-[-0.04em]
                    text-[#244C35]
                  "
                >
                  LONGEVITY
                </h1>

                <p
                  className="
                    mt-1 text-[10px]
                    font-semibold uppercase
                    tracking-[0.12em]
                    text-[#52765D]
                  "
                >
                  Health & Longevity
                </p>
              </div>
            </div>

            {/* Action Buttons: Back to landing + Collapse Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => onBackToLanding?.()}
                title="Quay lại trang giới thiệu"
                aria-label="Quay lại trang giới thiệu"
                className="
                  flex h-9 w-9 shrink-0
                  items-center justify-center
                  rounded-xl border border-[#D5E2D4]
                  bg-white/80
                  text-[#52765D]
                  transition-all duration-200
                  hover:border-[#A9C8AC]
                  hover:bg-white
                  hover:text-[#28734D]
                  hover:shadow-sm
                  active:scale-95
                "
              >
                <Globe size={16} strokeWidth={1.8} />
              </button>

              <button
                type="button"
                onClick={() => onToggleCollapse?.()}
                title="Thu gọn thanh bên"
                aria-label="Thu gọn thanh bên"
                className="
                  flex h-9 w-9 shrink-0
                  items-center justify-center
                  rounded-xl border border-[#D5E2D4]
                  bg-white/80
                  text-[#52765D]
                  transition-all duration-200
                  hover:border-[#A9C8AC]
                  hover:bg-white
                  hover:text-[#28734D]
                  hover:shadow-sm
                  active:scale-95
                "
              >
                <PanelLeftClose size={17} strokeWidth={1.8} />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Collapsed Brand Icon */}
            <div
              className="
                flex h-11 w-11 shrink-0
                items-center justify-center
                rounded-2xl
                bg-[#28734D]
                text-white
                shadow-md shadow-[#28734D]/15
              "
              title="LONGEVITY Health & Longevity"
            >
              <Leaf size={24} strokeWidth={1.8} />
            </div>

            {/* Expand Toggle Button */}
            <button
              type="button"
              onClick={() => onToggleCollapse?.()}
              title="Mở rộng thanh bên"
              aria-label="Mở rộng thanh bên"
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-xl border border-[#D5E2D4]
                bg-white/90
                text-[#28734D]
                shadow-xs
                transition-all duration-200
                hover:border-[#A9C8AC]
                hover:bg-white
                hover:shadow-sm
                active:scale-95
              "
            >
              <PanelLeftOpen size={17} strokeWidth={2} />
            </button>
          </>
        )}
      </div>

      {/* NAVIGATION */}
      <nav className={`flex-1 py-4 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-3.5'}`}>
        {!isCollapsed && (
          <div className="mb-3 px-3">
            <p
              className="
                text-[10px] font-bold
                uppercase tracking-[0.16em]
                text-[#718675]
              "
            >
              Không gian sức khỏe
            </p>

            <p
              className="
                mt-1 text-[11px]
                font-medium text-[#718675]
              "
            >
              Quản lý và theo dõi hằng ngày
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            if (isCollapsed) {
              // Collapsed Item: Centered Icon with Sleek Tooltip
              return (
                <div key={item.id} className="relative group flex justify-center">
                  <button
                    type="button"
                    onClick={() => onSelectTab?.(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    aria-label={item.label}
                    className={`
                      relative flex h-11 w-11
                      items-center justify-center
                      rounded-xl
                      transition-all duration-200
                      ${isActive
                        ? 'bg-[#28734D] text-white shadow-md shadow-[#28734D]/25 ring-2 ring-[#28734D]/20'
                        : 'bg-[#DCE9DA]/60 text-[#526A59] hover:bg-white hover:text-[#28734D] hover:shadow-xs'
                      }
                    `}
                  >
                    <Icon size={19} strokeWidth={isActive ? 2.2 : 1.9} />

                    {isActive && (
                      <span
                        className="
                          absolute -right-1 top-1/2 -translate-y-1/2
                          h-2 w-1 rounded-l-full
                          bg-[#28734D]
                        "
                      />
                    )}
                  </button>

                  {/* Floating Tooltip on Hover */}
                  <div
                    className="
                      pointer-events-none absolute left-full top-1/2 ml-3 -translate-y-1/2
                      whitespace-nowrap rounded-lg bg-[#244C35] px-2.5 py-1.5
                      text-[11px] font-bold text-white shadow-xl
                      opacity-0 group-hover:opacity-100
                      transition-opacity duration-150 z-50
                    "
                  >
                    <span>{item.label}</span>
                    
                  </div>
                </div>
              );
            }

            // Expanded Item
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab?.(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`
                  group relative flex w-full
                  items-center justify-between
                  gap-2 rounded-xl
                  px-3 py-2.5
                  text-left
                  transition-all duration-200
                  ${isActive
                    ? `
                        border border-[#D6E6D5]
                        bg-white
                        text-[#24583E]
                        shadow-[0_2px_8px_rgba(36,83,55,0.06)]
                      `
                    : `
                        border border-transparent
                        text-[#526A59]
                        hover:border-[#D9E5D7]
                        hover:bg-white/65
                        hover:text-[#24583E]
                      `
                  }
                `}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {/* Icon */}
                  <div
                    className={`
                      flex h-9 w-9 shrink-0
                      items-center justify-center
                      rounded-xl
                      transition-all duration-200
                      ${isActive
                        ? `
                            bg-[#28734D]
                            text-white
                            shadow-sm shadow-[#28734D]/20
                          `
                        : `
                            bg-[#DCE9DA]
                            text-[#58745D]
                            group-hover:bg-[#D3E4D1]
                            group-hover:text-[#28734D]
                          `
                      }
                    `}
                  >
                    <Icon size={18} strokeWidth={1.9} />
                  </div>

                  {/* Label */}
                  <span
                    className={`
                      min-w-0 text-[11.5px]
                      leading-snug
                      ${isActive
                        ? 'font-bold text-[#24583E]'
                        : 'font-medium'
                      }
                    `}
                  >
                    {item.label}
                  </span>
                </div>

                {/* Active Indicator Chevron */}
                {isActive && (
                  <ChevronRight
                    size={16}
                    strokeWidth={2.2}
                    className="text-[#28734D] shrink-0 transition-transform duration-200"
                  />
                )}

                {/* Active Indicator */}
                {isActive && (
                  <span
                    className="
                      absolute bottom-2.5 left-0 top-2.5
                      w-[3px] rounded-r-full
                      bg-[#28734D]
                    "
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* USER PROFILE */}
      <div
        className={`
          shrink-0
          border-t border-[#D6E3D5]
          transition-all duration-300
          ${isCollapsed ? 'p-2 flex justify-center' : 'p-3'}
        `}
      >
        {isCollapsed ? (
          <div
            className="relative cursor-pointer group"
            title={`${user.name} (${user.tier})`}
          >
            <img
              src={user.avatar}
              alt={user.name}
              className="
                h-10 w-10 rounded-full
                border-2 border-[#DCEBDA]
                object-cover shadow-xs
              "
            />
            <span
              className="
                absolute bottom-0 right-0
                h-3 w-3 rounded-full
                border-2 border-white
                bg-[#3DAD69]
              "
            />
          </div>
        ) : (
          <div
            className="
              flex items-center gap-3
              rounded-2xl
              border border-[#D6E5D5]
              bg-white/90
              p-2.5
              shadow-sm shadow-[#244C35]/[0.03]
              transition-all duration-200
              hover:bg-white
            "
          >
            <div className="relative shrink-0">
              <img
                src={user.avatar}
                alt={user.name}
                className="
                  h-9 w-9 rounded-full
                  border-2 border-[#DCEBDA]
                  object-cover
                "
              />

              <span
                className="
                  absolute bottom-0 right-0
                  h-3 w-3 rounded-full
                  border-2 border-white
                  bg-[#3DAD69]
                "
              />
            </div>

            <div className="min-w-0 flex-1">
              <p
                className="
                  truncate text-xs
                  font-bold text-[#24352B]
                "
              >
                {user.name}
              </p>

              <p
                className="
                  mt-0.5 truncate text-[10px]
                  font-medium text-[#718675]
                "
              >
                {user.tier}
              </p>
            </div>

            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Đăng xuất"
                aria-label="Đăng xuất"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[#718675] transition-colors hover:bg-[#EEF4EE] hover:text-[#B3402F]"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
