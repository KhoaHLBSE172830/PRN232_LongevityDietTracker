
import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  UtensilsCrossed,
  Timer,
  Leaf,
  Stethoscope,
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Heart,
  Droplets,
  Sprout
} from 'lucide-react';

import { useCurrentUser, isDemoMode } from '../services/userStore';
import { loadOverview } from '../services/overviewData';
import { Banner } from '../components/ui';
import { habitsApi, WATER_STEP_ML, MOVEMENT_STEP_MIN } from '../../features/habits/habitsApi';

// ==========================================
// COMPONENT: PILLAR CARD
// ==========================================

function PillarCard({
  onClick,
  icon: Icon,
  color,
  owner,
  title,
  value,
  unit,
  status,
  description,
  link
}) {
  const colors = {
    green: {
      icon: 'bg-[#E8F4EB] text-[#24734F]',
      badge: 'bg-[#F0F7F1] text-[#24734F] border-[#DCEBDD]',
      value: 'text-[#24734F]',
      status: 'text-[#347C53]',
      hover: 'hover:border-[#B8D8C0]',
      link: 'text-[#24734F]',
      bar: 'bg-[#24734F]'
    },
    blue: {
      icon: 'bg-[#EAF1FD] text-[#4775C5]',
      badge: 'bg-[#F0F4FC] text-[#4775C5] border-[#DCE6F8]',
      value: 'text-[#4169B5]',
      status: 'text-[#5479BA]',
      hover: 'hover:border-[#C6D7F3]',
      link: 'text-[#4169B5]',
      bar: 'bg-[#6489CB]'
    },
    sage: {
      icon: 'bg-[#E8F3F0] text-[#397C70]',
      badge: 'bg-[#EFF7F4] text-[#397C70] border-[#D7EAE3]',
      value: 'text-[#397C70]',
      status: 'text-[#397C70]',
      hover: 'hover:border-[#C1DED3]',
      link: 'text-[#397C70]',
      bar: 'bg-[#579788]'
    },
    purple: {
      icon: 'bg-[#F2ECFA] text-[#8157B4]',
      badge: 'bg-[#F7F2FC] text-[#8157B4] border-[#E9DDF6]',
      value: 'text-[#8157B4]',
      status: 'text-[#8157B4]',
      hover: 'hover:border-[#DECCEF]',
      link: 'text-[#8157B4]',
      bar: 'bg-[#9874C2]'
    }
  };

  const theme = colors[color];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group flex min-w-0 w-full flex-col justify-between
        rounded-[22px] border border-[#E7EDE8]
        bg-white p-5 text-left
        shadow-[0_2px_10px_rgba(31,55,39,0.025)]
        transition-all duration-300
        hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(31,55,39,0.07)]
        ${theme.hover}
        focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-[#24734F] focus-visible:ring-offset-2
      `}
    >
      <div className="w-full">
        {/* Icon and owner */}
        <div className="mb-5 flex items-center justify-between gap-2">
          <div className={`flex h-11 w-11 items-center justify-center rounded-[15px] ${theme.icon}`}>
            <Icon size={21} strokeWidth={1.8} />
          </div>

          <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-bold ${theme.badge}`}>
            {owner}
          </span>
        </div>

        {/* Content */}
        <h4 className="text-[13px] font-bold leading-snug text-[#29352D]">
          {title}
        </h4>

        <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
          <span className={`text-[27px] font-extrabold leading-tight tracking-tight ${theme.value}`}>
            {value}
          </span>

          {unit && (
            <span className="text-[11px] font-medium text-[#94A198]">
              {unit}
            </span>
          )}
        </div>

        <p className={`mt-2 text-[11px] font-semibold leading-relaxed ${theme.status}`}>
          {status}
        </p>

        <p className="mt-1.5 min-h-[32px] text-[11px] leading-relaxed text-[#87938A]">
          {description}
        </p>
      </div>

      {/* Footer */}
      <div className={`mt-5 flex w-full items-center justify-between border-t border-[#EDF0EC] pt-4 text-[11px] font-bold ${theme.link}`}>
        <span>{link}</span>
        <ArrowRight
          size={16}
          className="transition-transform duration-300 group-hover:translate-x-1"
        />
      </div>
    </button>
  );
}

// ==========================================
// MAIN COMPONENT: OVERVIEW DASHBOARD
// ==========================================

export default function OverviewDashboard({
  onNavigate,
  onOpenAddMeal
}) {
  const user = useCurrentUser();
  const demo = isDemoMode();
  const [data, setData] = useState(null);
  const [habit, setHabit] = useState(null);

  useEffect(() => {
    habitsApi.getDay().then(setHabit);
  }, [user.id]);

  const bumpHabit = async (delta) => {
    const next = await habitsApi.add(delta);
    setHabit(next);
  };

  useEffect(() => {
    let alive = true;
    loadOverview(user).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [user.id]);

  const n = data?.nutrition;
  const f = data?.fasting;
  const fm = data?.fmd;
  const c = data?.consultation;
  const pct = n && n.budget ? Math.round((n.calories / n.budget) * 100) : 0;
  const hour = new Date().getHours();
  const greeting = hour < 11 ? 'Chào buổi sáng,' : hour < 18 ? 'Chào buổi chiều,' : 'Chào buổi tối,';

  const tips = [
    {
      icon: CheckCircle2,
      color: 'green',
      title: 'Quy tắc Hara Hachi Bu',
      description: 'Dừng ăn khi cảm thấy vừa đủ no, khoảng 80% sức chứa của dạ dày.'
    },
    {
      icon: Droplets,
      color: 'amber',
      title: 'Uống nước đều đặn',
      description: 'Duy trì thói quen uống nước trong ngày và bổ sung đủ lượng nước phù hợp.'
    },
    {
      icon: Heart,
      color: 'sage',
      title: 'Vận động nhẹ nhàng',
      description: 'Dành thời gian đi bộ, vận động và duy trì hoạt động thể chất mỗi ngày.'
    }
  ];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-7 pb-10 animate-fade-in">
      {demo && (
        <Banner tone="demo">
          Chế độ demo: chưa đăng nhập bằng tài khoản thật, dữ liệu hiển thị là dữ liệu minh họa/cục bộ.
        </Banner>
      )}

      {/* =====================================
          1. WELCOME HERO
      ====================================== */}

      <section className="relative isolate overflow-hidden rounded-[26px] bg-[#18583F] px-6 py-8 text-white shadow-[0_12px_32px_rgba(24,88,63,0.13)] md:px-9 md:py-9">

        {/* Decorative shapes */}
        <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full border border-white/[0.08]" />
        <div className="pointer-events-none absolute -right-5 -top-20 h-64 w-64 rounded-full border border-white/[0.08]" />
        <div className="pointer-events-none absolute -bottom-32 right-1/4 h-64 w-64 rounded-full bg-[#75B88B]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between gap-7 lg:flex-row lg:items-center">

          <div className="max-w-[690px]">

            {/* Badge */}
            <div className="mb-5 flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-[#D4EEDB]">
                <Sparkles size={13} />
                LONGEVITY HEALTH & LONGEVITY
              </span>

              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#E6D8A8]">
                <Flame size={14} className="fill-[#E6B95B] text-[#E6B95B]" />
                Chuỗi {data?.streak ?? user.streakDays} ngày liên tiếp{data?.streak == null ? ' (Minh họa)' : ''}
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-[28px] font-extrabold leading-tight tracking-tight md:text-[36px]">
              {greeting}
              <span className="text-[#A8D9B7]"> {user.name}!</span>
            </h2>

            <p className="mt-3 max-w-[640px] text-[13px] leading-[1.9] text-[#D3E4D9] md:text-[14px]">
              Hãy tiếp tục duy trì những thói quen tích cực mỗi ngày.
              Nhớ áp dụng nguyên tắc <strong className="font-bold text-white">Hara Hachi Bu</strong>:
              ăn chậm, cảm nhận cơ thể và dừng lại khi vừa đủ no.
            </p>
          </div>

          {/* CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={onOpenAddMeal}
              className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#A9D9B8] px-5 py-3.5 text-[12px] font-extrabold text-[#174D35] shadow-lg shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:scale-[0.98]"
            >
              <UtensilsCrossed size={17} />
              Ghi nhận bữa ăn
              <ArrowRight size={15} />
            </button>
          </div>

        </div>
      </section>

      {/* =====================================
          2. FOUR PILLARS
      ====================================== */}

      <section>

        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="h-5 w-1 rounded-full bg-[#24734F]" />
              <h3 className="text-[17px] font-extrabold tracking-tight text-[#25342A]">
                Tổng quan sức khỏe hôm nay
              </h3>
            </div>

            <p className="pl-3 text-[11px] text-[#849087]">
              Theo dõi các hoạt động và thói quen sống khỏe của bạn
            </p>
          </div>

          <span className="pl-3 text-[10px] font-medium text-[#9AA49B] sm:pl-0">
            4 lĩnh vực đồng hành cùng bạn
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* MEALS */}
          <PillarCard
            onClick={() => onNavigate('meals')}
            icon={UtensilsCrossed}
            color="green"
            owner="Dinh Dưỡng"
            title="Dinh dưỡng hôm nay"
            value={n ? String(n.calories) : '—'}
            unit={n ? `/ ${n.budget} kcal` : ''}
            status={n ? `● Mức năng lượng đã ghi nhận: ${pct}%` : '● Đang tải...'}
            description={n ? `Chất xơ: ${n.fiber}g • Đạm: ${n.protein}g • Carb: ${n.carbs}g • Béo: ${n.fat}g` : ''}
            link="Xem chi tiết bữa ăn"
          />

          {/* FASTING */}
          <PillarCard
            onClick={() => onNavigate('fasting')}
            icon={Timer}
            color="blue"
            owner="Nhịp Sinh Học"
            title="Nhịn ăn gián đoạn"
            value={f?.state === 'active' ? f.elapsedText : f?.state === 'error' ? 'Không tải được' : 'Chưa bắt đầu'}
            unit={f?.state === 'active' ? `/ ${f.targetHours}g` : ''}
            status={
              f?.state === 'active'
                ? `● Đang theo dõi chu kỳ ${f.label}`
                : f?.state === 'error'
                ? '● Không kết nối được máy chủ nhịn ăn'
                : '● Chưa có phiên nhịn ăn đang chạy'
            }
            description={f?.state === 'active' ? `Thời gian kết thúc dự kiến: ${f.endClock}` : 'Bắt đầu một phiên để theo dõi.'}
            link="Xem đồng hồ nhịn ăn"
          />

          {/* FMD */}
          <PillarCard
            onClick={() => onNavigate('fmd')}
            icon={Leaf}
            color="sage"
            owner="Thanh Lọc"
            title="Chu kỳ FMD 5 ngày"
            value={fm?.state === 'active' ? `Ngày ${fm.day}/5` : 'Nghỉ giữa'}
            unit={fm?.state === 'active' ? '' : 'chu kỳ'}
            status={fm?.state === 'active' ? `● Chu kỳ #${fm.number || 1} đang chạy` : '● Chưa có chu kỳ đang chạy'}
            description={fm?.state === 'active' ? `Định mức hôm nay: ${fm.kcal} kcal` : 'Bắt đầu chu kỳ mới trong mục FMD.'}
            link="Xem lộ trình 5 ngày"
          />

          {/* CONSULTATION */}
          <PillarCard
            onClick={() => onNavigate('consultation')}
            icon={Stethoscope}
            color="purple"
            owner="Chuyên Gia"
            title="Chuyên gia đồng hành"
            value={c?.next?.who || (c?.state === 'guest' ? 'Chưa đăng nhập' : 'Chưa có lịch')}
            status={c?.next ? `● Lịch hẹn: ${c.next.when}` : '● Chưa có lịch hẹn sắp tới'}
            description={
              c?.advice
                ? `Lời khuyên: ${c.advice}`
                : c?.state === 'guest'
                ? 'Đăng nhập bằng tài khoản thật để xem lịch và lời khuyên.'
                : 'Chưa có lời khuyên nào.'
            }
            link="Xem thông tin tư vấn"
          />

        </div>
      </section>

      {/* BỮA ĂN HÔM NAY */}
      {n && n.meals.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-[16px] font-extrabold tracking-tight text-[#25342A]">Bữa ăn hôm nay</h3>
            <button type="button" onClick={() => onNavigate('meals')} className="text-[11px] font-bold text-[#24734F]">
              Xem tất cả
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {n.meals.slice(0, 4).map((m) => (
              <div key={m.id} className="rounded-[18px] border border-[#E7EDE8] bg-white p-4">
                <p className="text-[12px] font-bold text-[#2B392F]">{m.mealTypeName || 'Bữa ăn'}</p>
                <p className="mt-1 text-[20px] font-extrabold text-[#24734F]">
                  {Math.round(m.totalCalories || 0)} <span className="text-[11px] font-medium text-[#94A198]">kcal</span>
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] text-[#849087]">{m.notes || ''}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* =====================================
          3. WELLNESS TIPS
      ====================================== */}

      <section>

        <div className="mb-4">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="h-5 w-1 rounded-full bg-[#24734F]" />
            <h3 className="text-[16px] font-extrabold tracking-tight text-[#25342A]">
              Thói quen sống khỏe mỗi ngày
            </h3>
          </div>

          <p className="pl-3 text-[11px] text-[#849087]">
            Những điều nhỏ tạo nên sự thay đổi tích cực lâu dài
          </p>
        </div>

        {habit && (
          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {[
              {
                key: 'water',
                title: 'Uống nước',
                value: habit.waterMl,
                goal: habit.waterGoalMl,
                unit: 'ml',
                step: WATER_STEP_ML,
                up: { waterMl: WATER_STEP_ML },
                down: { waterMl: -WATER_STEP_ML },
                color: 'bg-[#4B9CD3]',
                icon: Droplets,
              },
              {
                key: 'move',
                title: 'Vận động',
                value: habit.movementMinutes,
                goal: habit.movementGoalMinutes,
                unit: 'phút',
                step: MOVEMENT_STEP_MIN,
                up: { movementMinutes: MOVEMENT_STEP_MIN },
                down: { movementMinutes: -MOVEMENT_STEP_MIN },
                color: 'bg-[#438477]',
                icon: Heart,
              },
            ].map((h) => {
              const Icon = h.icon;
              const pct = Math.min(100, Math.round((h.value / h.goal) * 100));
              return (
                <div key={h.key} className="rounded-[20px] border border-[#E7EDE8] bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[#EAF3F0] text-[#438477]">
                        <Icon size={19} strokeWidth={1.8} />
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-[#2B392F]">{h.title}</p>
                        <p className="text-[11px] text-[#849087]">
                          {h.value} / {h.goal} {h.unit}
                          {habit.source === 'local' && ' · lưu cục bộ'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => bumpHabit(h.down)} aria-label={`Giảm ${h.title}`} className="h-8 w-8 rounded-lg border border-[#E1E8E2] text-[#55725A] hover:bg-[#F3F7F3]">−</button>
                      <button type="button" onClick={() => bumpHabit(h.up)} aria-label={`Tăng ${h.title}`} className="h-8 rounded-lg bg-[#24734F] px-3 text-[11px] font-bold text-white hover:bg-[#1d5f40]">+{h.step}</button>
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#EEF2EE]">
                    <div className={`h-full rounded-full ${h.color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">

          {tips.map((tip, index) => {
            const Icon = tip.icon;

            const iconColors = {
              green: 'bg-[#EAF4EC] text-[#347C53]',
              amber: 'bg-[#FBF3E5] text-[#B17A2E]',
              sage: 'bg-[#EAF3F0] text-[#438477]'
            };

            return (
              <div
                key={index}
                className="flex items-start gap-3.5 rounded-[20px] border border-[#E7EDE8] bg-white p-4 shadow-[0_2px_10px_rgba(31,55,39,0.02)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${iconColors[tip.color]}`}>
                  <Icon size={20} strokeWidth={1.8} />
                </div>

                <div className="min-w-0 pt-0.5">
                  <h4 className="text-[12px] font-bold text-[#2B392F]">
                    {tip.title}
                  </h4>

                  <p className="mt-1 text-[11px] leading-relaxed text-[#849087]">
                    {tip.description}
                  </p>
                </div>
              </div>
            );
          })}

        </div>
      </section>

      {/* =====================================
          4. CLOSING MESSAGE
      ====================================== */}

      <div className="flex flex-col items-center justify-center gap-2 border-t border-[#E7EDE8] pt-6 text-center sm:flex-row">
        <Sprout size={16} className="text-[#4D8963]" />

        <p className="text-[10px] font-medium tracking-wide text-[#89958C]">
          LONGEVITY — Sống khỏe hơn mỗi ngày, bền vững theo thời gian.
        </p>
      </div>

    </div>
  );
}
