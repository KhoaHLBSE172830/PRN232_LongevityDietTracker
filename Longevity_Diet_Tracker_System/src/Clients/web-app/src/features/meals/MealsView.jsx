import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../../shared/services/userStore';
import { 
  ShieldCheck, 
  AlertCircle, 
  Sparkles, 
  PieChart, 
  Fish, 
  Wheat, 
  Droplets, 
  Sprout, 
  Plus, 
  SunMedium, 
  Sun, 
  Moon, 
  Coffee, 
  Quote, 
  RefreshCw, 
  MapPin 
} from 'lucide-react';
import AddMealModal from './AddMealModal';
import { useCurrentUser, isDemoMode } from '../../shared/services/userStore';
import { Banner } from '../../shared/components/ui';
import { mealsApi, localDateKey } from './mealsApi';

// Danh sách châm ngôn dinh dưỡng trường thọ
const LONGEVITY_QUOTES = [
  {
    rule: 'Quy Tắc No 80% (Hara Hachi Bu)',
    origin: 'Okinawa, Nhật Bản',
    text: 'Dừng ăn khi dạ dày đã đầy 80%. Khoảng trống 20% còn lại giúp các enzyme tiêu hóa hoạt động tối ưu và kích hoạt quá trình tự thực bào (Autophagy) trẻ hóa tế bào.',
  },
  {
    rule: 'Khẩu Phần Ưu Tiên Thực Vật (Plant-Slant)',
    origin: 'Địa Trung Hải & Ikaria, Hy Lạp',
    text: 'Hơn 90% khẩu phần đến từ các loại đậu đỗ, rau xanh sẫm màu, hạt ngũ cốc nguyên cám và dầu ô-liu ép lạnh. Đây là nguồn chất xơ quý giá nuôi hệ vi sinh đường ruột khỏe mạnh.',
  },
  {
    rule: 'Bữa Tối Thanh Nhẹ Trước Khi Mặt Trời Lặn',
    origin: 'Sardinia, Ý',
    text: 'Ăn bữa ăn nhỏ nhất vào buổi chiều muộn hoặc chớm tối. Không nạp calo nặng trước khi đi ngủ giúp cơ thể tập trung vào việc phục hồi cơ quan nội tạng suốt đêm.',
  },
];

export default function MealsView({ isAddModalOpen, onOpenAddModal, onCloseAddModal, showToast }) {
  const [meals, setMeals] = useState([]);
  const [selectedMealType, setSelectedMealType] = useState(1);
  const [editingMeal, setEditingMeal] = useState(null);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const user = useCurrentUser();
  const [date, setDate] = useState(() => new Date());
  const [templates, setTemplates] = useState([]);
  const isToday = localDateKey(date) === localDateKey(new Date());

  useEffect(() => {
    loadMeals();
  }, [date, user.id]);

  useEffect(() => {
    mealsApi.getTemplates().then(setTemplates);
  }, []);

  const shiftDay = (delta) =>
    setDate((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + delta);
      return n;
    });

  const loadMeals = async () => {
    try {
      const data = await mealsApi.getUserMeals(user.id, date);
      setMeals(data);
    } catch (err) {
      console.error('[MealsView]:', err);
    }
  };

  const handleOpenAddForMeal = (type) => {
    setEditingMeal(null);
    setSelectedMealType(type);
    onOpenAddModal();
  };

  const handleEditMeal = (meal) => {
    setEditingMeal(meal);
    setSelectedMealType(meal.mealType);
    onOpenAddModal();
  };

  const handleApplyTemplate = async (template, mealType) => {
    try {
      const created = await mealsApi.applyTemplate(template, { mealType, date });
      if (created && localDateKey(new Date(created.loggedAt)) === localDateKey(date)) {
        setMeals((prev) => [created, ...prev.filter((m) => m.id !== created.id)]);
      } else {
        await loadMeals();
      }
      showToast({ type: 'success', title: 'Đã thêm mẫu vào nhật ký', message: `${template.name} (${Math.round(template.totalCalories || 0)} kcal).` });
    } catch (err) {
      showToast({ type: 'error', title: 'Không thêm được mẫu', message: err.message });
    }
  };

  const handleDeleteMeal = async (meal) => {
    if (!window.confirm('Xóa bữa ăn này khỏi nhật ký?')) return;
    try {
      await mealsApi.deleteMeal(meal.id);
      setMeals((prev) => prev.filter((m) => m.id !== meal.id));
      showToast({ type: 'success', title: 'Đã xóa bữa ăn', message: `${meal.mealTypeName || 'Bữa ăn'} đã được xóa khỏi nhật ký.` });
    } catch (err) {
      showToast({ type: 'error', title: 'Không xóa được', message: err.message });
    }
  };

  const handleMealAdded = (newMeal) => {
    if (localDateKey(new Date(newMeal.loggedAt)) !== localDateKey(date)) return;
    const existingIdx = meals.findIndex(m => m.id === newMeal.id);
    if (existingIdx >= 0) {
      const updated = [...meals];
      updated[existingIdx] = newMeal;
      setMeals(updated);
    } else {
      setMeals([newMeal, ...meals]);
    }

    showToast({
      type: 'success',
      title: 'Đã lưu bữa ăn',
      message: `Đã ghi nhận ${newMeal.mealTypeName || 'bữa ăn'} (${newMeal.totalCalories} kcal). Mức no đạt ${newMeal.satietyPercentage || 80}%.`,
    });
  };

  // Tính tổng dinh dưỡng trong ngày
  const totalCal = meals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (m.totalProteinGrams || 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (m.totalCarbsGrams || 0), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.totalFatGrams || 0), 0);
  const totalFiber = meals.reduce((sum, m) => sum + (m.totalFiberGrams || 0), 0);

  // Tính toán Gauge 80% Hara Hachi Bu
  const budget = user.caloricBudget;
  const haraHachiBuLimit = user.haraHachiBuThreshold;
  const calPercent = Math.min(Math.round((totalCal / budget) * 100), 100);
  const isOver80 = totalCal > haraHachiBuLimit;

  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (calPercent / 100) * circumference;

  const currentQuote = LONGEVITY_QUOTES[quoteIdx];

  const mealSlots = [
    { type: 1, name: 'Bữa Sáng', en: 'Breakfast', icon: SunMedium, color: 'text-amber-500 bg-amber-50 border-amber-200' },
    { type: 2, name: 'Bữa Trưa', en: 'Lunch', icon: Sun, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { type: 3, name: 'Bữa Tối', en: 'Dinner', icon: Moon, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { type: 4, name: 'Bữa Phụ / Trà', en: 'Snack & Tea', icon: Coffee, color: 'text-teal-600 bg-teal-50 border-teal-200' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {isDemoMode() && (
        <Banner tone="demo">Chế độ trải nghiệm: các món ăn đang được lưu tạm thời trên máy của bạn.</Banner>
      )}

      {/* CHỌN NGÀY */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3">
        <button type="button" onClick={() => shiftDay(-1)} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
          ← Hôm trước
        </button>
        <div className="text-center">
          <p className="text-sm font-extrabold capitalize text-slate-800">
            {new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)}
          </p>
          {!isToday && (
            <button type="button" onClick={() => setDate(new Date())} className="text-[11px] font-bold text-emerald-700 hover:underline">
              Về hôm nay
            </button>
          )}
        </div>
        <button type="button" onClick={() => shiftDay(1)} disabled={isToday} className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40">
          Hôm sau →
        </button>
      </div>

      {/* 1. THƯỚC ĐO NO 80% HARA HACHI BU & CALORIC GAUGE */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 -mr-16 -mt-16 pointer-events-none ${
          isOver80 ? 'bg-amber-400' : 'bg-emerald-400'
        }`} />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Vòng tròn tiến độ SVG */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg className="w-44 h-44 transform -rotate-90">
              <circle cx="88" cy="88" r={radius} className="text-slate-100" strokeWidth="12" stroke="currentColor" fill="transparent" />
              <circle cx="88" cy="88" r={radius} className="text-amber-200" strokeWidth="12" strokeDasharray="2 8" stroke="currentColor" fill="transparent" />
              <circle
                cx="88"
                cy="88"
                r={radius}
                className={`transition-all duration-1000 ease-out ${isOver80 ? 'text-amber-500' : 'text-emerald-500'}`}
                strokeWidth="12"
                strokeDasharray={circumference}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-3xl font-extrabold text-slate-800 tracking-tight">{totalCal}</span>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">/ {budget} kcal</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 mt-1 rounded-full ${
                isOver80 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {calPercent}% Khẩu phần
              </span>
            </div>
          </div>

          {/* Thông tin chẩn đoán dinh dưỡng */}
          <div className="flex-1 space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                    Nguyên Tắc Dinh Dưỡng
                  </span>
                  <span className="text-xs text-slate-400">• Hôm nay đã ghi nhận {meals.length} bữa</span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                  Thước Đo No 80% (Quy Tắc Hara Hachi Bu)
                </h2>
              </div>
              
              <div className="text-right hidden sm:block">
                <span className="text-[11px] text-slate-400 block font-medium">Ngưỡng dừng ăn khuyến nghị</span>
                <span className="text-sm font-bold text-slate-700">{haraHachiBuLimit} kcal</span>
              </div>
            </div>

            {/* Khuyến nghị thông minh */}
            {!isOver80 ? (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 text-emerald-900">
                <ShieldCheck className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-900">
                    Trạng thái: Vùng Dinh Dưỡng Lý Tưởng
                  </p>
                  <p className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                    Bạn đang duy trì lượng nạp dưới mức 80% no. Dạ dày có khoảng trống giúp kích hoạt quá trình tự thực bào (Autophagy) trẻ hóa tế bào.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    Lưu ý: Đã đạt ngưỡng no 80%
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Bạn đã nạp đủ năng lượng cho hôm nay. Hãy uống thêm nước lọc hoặc trà thảo mộc để cơ thể tiêu hóa nhẹ nhàng.
                  </p>
                </div>
              </div>
            )}

            {/* Chỉ số chất xơ & nguồn thực vật */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chất xơ nạp vào</p>
                  <p className="text-base font-extrabold text-slate-800">{totalFiber.toFixed(1)}g <span className="text-xs font-normal text-emerald-600">/ 35g mục tiêu</span></p>
                </div>
                <Sparkles className="w-5 h-5 text-emerald-600 opacity-80" />
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tỉ lệ Thực Vật Lành Mạnh</p>
                  <p className="text-base font-extrabold text-emerald-700">89% <span className="text-[10px] font-semibold text-slate-500">Đạt chuẩn</span></p>
                </div>
                <PieChart className="w-5 h-5 text-emerald-600 opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BẢNG 4 BENTO MACROS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {[
          { label: 'Chất Đạm (Protein)', amount: totalProtein.toFixed(1), unit: 'g', goal: '65g', icon: Fish, color: 'text-blue-700 bg-blue-100 border-blue-200/80', desc: 'Đậu nành, cá hồi, đậu gà' },
          { label: 'Tinh Bột Chậm (Carbs)', amount: totalCarbs.toFixed(1), unit: 'g', goal: '180g', icon: Wheat, color: 'text-amber-800 bg-amber-100 border-amber-200/80', desc: 'Yến mạch, khoai lang tím' },
          { label: 'Chất Béo Tốt (Healthy Fat)', amount: totalFat.toFixed(1), unit: 'g', goal: '45g', icon: Droplets, color: 'text-teal-800 bg-teal-100 border-teal-200/80', desc: 'Dầu ô-liu, quả bơ, óc chó' },
          { label: 'Chất Xơ (Dietary Fiber)', amount: totalFiber.toFixed(1), unit: 'g', goal: '35g', icon: Sprout, color: 'text-emerald-900 bg-emerald-200 border-emerald-300 ring-2 ring-emerald-500/20', desc: 'Nuôi hệ vi sinh đường ruột', badge: 'Chìa khóa sống khỏe' },
        ].map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className={`p-4 rounded-3xl border bg-white shadow-2xs relative flex flex-col justify-between transition-all hover:-translate-y-0.5 ${m.color.includes('ring-2') ? 'ring-2 ring-emerald-500/20' : ''}`}>
              {m.badge && (
                <span className="absolute -top-2.5 right-3 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs tracking-wider">
                  {m.badge}
                </span>
              )}
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700">{m.label}</span>
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${m.color.split(' ')[1]} ${m.color.split(' ')[0]}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold tracking-tight text-slate-900">{m.amount}</span>
                  <span className="text-xs font-semibold text-slate-500">{m.unit}</span>
                  <span className="text-[10px] text-slate-400 ml-auto font-medium">Mục tiêu: {m.goal}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 line-clamp-1 leading-tight">{m.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. BÍ QUYẾT DINH DƯỠNG TRƯỜNG THỌ */}
      <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl absolute -right-20 -bottom-20 pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Góc Triết Lý Sống Thọ
              </h4>
              <div className="flex items-center gap-1 text-[11px] text-slate-300 font-medium">
                <MapPin className="w-3 h-3 text-amber-400 inline" />
                <span>{currentQuote.origin}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setQuoteIdx((prev) => (prev + 1) % LONGEVITY_QUOTES.length)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold text-slate-200 transition-all border border-white/10 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Châm ngôn khác</span>
          </button>
        </div>
        <div className="relative pl-6 border-l-2 border-emerald-500/50 my-2">
          <Quote className="w-4 h-4 text-emerald-400/40 absolute -left-2.5 -top-1 fill-emerald-400/40" />
          <h5 className="font-extrabold text-sm text-emerald-200 mb-1">{currentQuote.rule}</h5>
          <p className="text-xs text-slate-300 leading-relaxed font-normal">"{currentQuote.text}"</p>
        </div>
      </div>

      {/* 4. TIMELINE 4 BỮA ĂN TRONG NGÀY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              Nhật Ký Các Bữa Ăn Hôm Nay
            </h3>
            <p className="text-xs text-slate-500">
              Theo dõi chi tiết số calo và chất xơ nạp vào theo từng khung giờ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mealSlots
            .flatMap((slot) => {
              const list = meals.filter((m) => m.mealType === slot.type);
              return list.length ? list.map((logged) => ({ slot, logged })) : [{ slot, logged: null }];
            })
            .map(({ slot, logged }) => {
            const Icon = slot.icon;

            if (logged) {
              return (
                <div key={`${slot.type}-${logged.id}`} className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-2xl flex items-center justify-center border ${slot.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-extrabold text-slate-800 leading-none">{slot.name}</h4>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(logged.loggedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-extrabold text-slate-900">
                          {logged.totalCalories} <span className="text-xs font-normal text-slate-400">kcal</span>
                        </span>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                            Mức no {logged.satietyPercentage || 80}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {logged.notes && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100 mb-3 italic">
                        "{logged.notes}"
                      </p>
                    )}

                    <div className="space-y-1.5 divide-y divide-slate-100">
                      {logged.foodItems?.map((food, idx) => (
                        <div key={idx} className="pt-1.5 first:pt-0 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                            <span className="font-semibold text-slate-800 line-clamp-1">{food.foodName}</span>
                            <span className="text-[10px] text-slate-400">({food.servingSize}{food.servingUnit})</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-[11px]">
                            <span className="font-bold text-slate-700">{food.calories} kcal</span>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                              {food.fiberGrams || 0}g xơ
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Đạm: {logged.totalProteinGrams}g • Xơ: {logged.totalFiberGrams}g
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDeleteMeal(logged)}
                        className="text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Xóa
                      </button>
                      <button
                        onClick={() => handleEditMeal(logged)}
                        className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Sửa / thêm món</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={slot.type} className="bg-slate-50/60 rounded-3xl p-5 border border-dashed border-slate-300 hover:border-emerald-400 hover:bg-emerald-50/20 transition-all flex flex-col items-center justify-center text-center group min-h-[160px]">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border ${slot.color} mb-2`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Chưa ghi nhận {slot.name}</h4>
                <p className="text-[11px] text-slate-400 max-w-[200px] mt-0.5 mb-3">
                  Ghi nhận để theo dõi chính xác mức năng lượng
                </p>
                <button
                  onClick={() => handleOpenAddForMeal(slot.type)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 group-hover:border-emerald-500 group-hover:text-emerald-700 group-hover:bg-emerald-50 text-xs font-semibold shadow-2xs transition-all"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                  <span>+ Ghi nhận {slot.name}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* MẪU BỮA ĂN (GET /api/mealtemplates) */}
      {templates.length > 0 && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5">
          <h3 className="mb-3 text-sm font-extrabold text-slate-800">Mẫu bữa ăn gợi ý</h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {templates.slice(0, 6).map((t) => (
              <div key={t.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-xs font-bold text-slate-800">{t.name}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">{t.description}</p>
                <p className="mt-2 text-[11px] font-bold text-emerald-700">
                  {Math.round(t.totalCalories || 0)} kcal • Đạm {Math.round(t.totalProteinGrams || 0)}g
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {[
                    [1, 'Sáng'],
                    [2, 'Trưa'],
                    [3, 'Tối'],
                    [4, 'Phụ'],
                  ].map(([type, label]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleApplyTemplate(t, type)}
                      className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      + {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL THÊM MÓN ĂN */}
      <AddMealModal
        isOpen={isAddModalOpen}
        onClose={onCloseAddModal}
        defaultMealType={selectedMealType}
        date={date}
        editingMeal={editingMeal}
        onMealAdded={handleMealAdded}
      />
    </div>
  );
}
