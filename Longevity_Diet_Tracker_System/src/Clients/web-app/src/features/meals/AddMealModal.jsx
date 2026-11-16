import React, { useState, useEffect } from 'react';
import { getCurrentUser } from '../../shared/services/userStore';
import { 
  X, 
  Search, 
  Plus, 
  Trash2, 
  Sparkles, 
  Check, 
  Leaf, 
  Info,
  Scale
} from 'lucide-react';
import { DEMO_USER, LONGEVITY_SUPERFOODS } from '../../shared/services/apiClient';
import { mealsApi } from './mealsApi';

export default function AddMealModal({ isOpen, onClose, defaultMealType = 1, onMealAdded, date, editingMeal = null }) {

  const [mealType, setMealType] = useState(defaultMealType);
  const [satiety, setSatiety] = useState(80);
  const [notes, setNotes] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(LONGEVITY_SUPERFOODS);
  const [selectedFoods, setSelectedFoods] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'custom'

  // Custom food fields
  const [customName, setCustomName] = useState('');
  const [customServing, setCustomServing] = useState(100);
  const [customCalories, setCustomCalories] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');
  const [customFiber, setCustomFiber] = useState('');

  useEffect(() => {
    setMealType(defaultMealType);
  }, [defaultMealType]);

  // Mở ở chế độ sửa: nạp sẵn món/ghi chú/mức no của bữa đang sửa; mở để thêm mới: làm trống.
  useEffect(() => {
    if (!isOpen) return;
    if (editingMeal) {
      const per100 = (v, size) => (Number(v) || 0) * (100 / (Number(size) || 100));
      setMealType(editingMeal.mealType);
      setSatiety(editingMeal.satietyPercentage || 80);
      setNotes(editingMeal.notes || '');
      setSelectedFoods(
        (editingMeal.foodItems || []).map((f) => ({
          ...f,
          originalCalories: per100(f.calories, f.servingSize),
          originalProtein: per100(f.proteinGrams, f.servingSize),
          originalCarbs: per100(f.carbsGrams, f.servingSize),
          originalFat: per100(f.fatGrams, f.servingSize),
          originalFiber: per100(f.fiberGrams, f.servingSize),
        }))
      );
    } else {
      setSelectedFoods([]);
      setNotes('');
      setSatiety(80);
    }
  }, [isOpen, editingMeal]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      const results = await mealsApi.searchFood(searchQuery);
      setSearchResults(results);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Add food from catalog
  const handleAddFoodFromCatalog = (food) => {
    const existingIndex = selectedFoods.findIndex(f => f.externalFoodId === food.externalFoodId);
    if (existingIndex >= 0) {
      // Increase serving size
      const updated = [...selectedFoods];
      updated[existingIndex].servingSize += 50;
      recalculateItem(updated[existingIndex], food);
      setSelectedFoods(updated);
    } else {
      setSelectedFoods([
        ...selectedFoods,
        {
          ...food,
          originalCalories: food.calories,
          originalProtein: food.proteinGrams,
          originalCarbs: food.carbsGrams,
          originalFat: food.fatGrams,
          originalFiber: food.fiberGrams,
          servingSize: food.servingSize || 100,
          servingUnit: food.servingUnit || 'g',
        }
      ]);
    }
  };

  const recalculateItem = (item, baseRef) => {
    const ratio = item.servingSize / (baseRef.servingSize || 100);
    item.calories = Math.round((baseRef.originalCalories || baseRef.calories) * ratio);
    item.proteinGrams = Number(((baseRef.originalProtein || baseRef.proteinGrams) * ratio).toFixed(1));
    item.carbsGrams = Number(((baseRef.originalCarbs || baseRef.carbsGrams) * ratio).toFixed(1));
    item.fatGrams = Number(((baseRef.originalFat || baseRef.fatGrams) * ratio).toFixed(1));
    item.fiberGrams = Number(((baseRef.originalFiber || baseRef.fiberGrams) * ratio).toFixed(1));
  };

  const handleUpdateServing = (idx, newServing) => {
    const val = Math.max(10, parseInt(newServing) || 10);
    const updated = [...selectedFoods];
    const item = updated[idx];
    item.servingSize = val;
    const ratio = val / 100;
    item.calories = Math.round((item.originalCalories || item.calories) * ratio);
    item.proteinGrams = Number(((item.originalProtein || item.proteinGrams) * ratio).toFixed(1));
    item.carbsGrams = Number(((item.originalCarbs || item.carbsGrams) * ratio).toFixed(1));
    item.fatGrams = Number(((item.originalFat || item.fatGrams) * ratio).toFixed(1));
    item.fiberGrams = Number(((item.originalFiber || item.fiberGrams) * ratio).toFixed(1));
    setSelectedFoods(updated);
  };

  const handleRemoveFood = (idx) => {
    setSelectedFoods(selectedFoods.filter((_, i) => i !== idx));
  };

  // Add custom food
  const handleAddCustomFood = (e) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newCustom = {
      externalFoodId: `custom-${Date.now()}`,
      foodName: customName.trim(),
      servingSize: Number(customServing) || 100,
      servingUnit: 'g',
      calories: Number(customCalories) || 120,
      proteinGrams: Number(customProtein) || 5,
      carbsGrams: Number(customCarbs) || 15,
      fatGrams: Number(customFat) || 2,
      fiberGrams: Number(customFiber) || 4,
    };

    setSelectedFoods([...selectedFoods, newCustom]);
    setCustomName('');
    setCustomCalories('');
    setCustomProtein('');
    setCustomCarbs('');
    setCustomFat('');
    setCustomFiber('');
    setActiveTab('catalog');
  };

  // Totals of basket
  const totalCal = selectedFoods.reduce((sum, f) => sum + (f.calories || 0), 0);
  const totalProtein = selectedFoods.reduce((sum, f) => sum + (f.proteinGrams || 0), 0);
  const totalCarbs = selectedFoods.reduce((sum, f) => sum + (f.carbsGrams || 0), 0);
  const totalFat = selectedFoods.reduce((sum, f) => sum + (f.fatGrams || 0), 0);
  const totalFiber = selectedFoods.reduce((sum, f) => sum + (f.fiberGrams || 0), 0);

  // Submit
  const handleSubmit = async () => {
    if (selectedFoods.length === 0) return;

    // Ghi vào ngày đang xem (giữ giờ hiện tại) để bữa hiện đúng ngày sau khi tải lại.
    const loggedAtIso = (() => {
      if (!date) return new Date().toISOString();
      const d = new Date(date);
      const now = new Date();
      d.setHours(now.getHours(), now.getMinutes(), 0, 0);
      return d.toISOString();
    })();

    setIsSubmitting(true);
    const payload = {
      userId: getCurrentUser().id,
      mealType: Number(mealType),
      loggedAt: loggedAtIso,
      utcOffsetMinutes: -new Date().getTimezoneOffset(),
      isHaraHachiBuCompliant: satiety <= 80,
      satietyPercentage: Number(satiety),
      notes: notes.trim() || undefined,
      foodItems: selectedFoods.map(f => ({
        externalFoodId: f.externalFoodId,
        foodName: f.foodName,
        servingSize: f.servingSize,
        servingUnit: f.servingUnit,
        calories: f.calories,
        proteinGrams: f.proteinGrams,
        carbsGrams: f.carbsGrams,
        fatGrams: f.fatGrams,
        fiberGrams: f.fiberGrams,
      })),
    };

    try {
      const created = editingMeal
        ? await mealsApi.updateMeal(editingMeal.id, payload)
        : await mealsApi.logMeal(payload);
      onMealAdded(created);
      onClose();
    } catch (err) {
      console.error('[Meal Submission Error]:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">
                Ghi Nhận Bữa Ăn Trường Thọ
              </h3>
              <p className="text-xs text-slate-500">
                Tra cứu dinh dưỡng USDA & Tự động cân bằng chuẩn Blue Zones
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Config Row: Meal Type & Satiety Slider */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/70">
            {/* Meal Type Selector */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-2">
                Loại Bữa Ăn
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 1, name: 'Sáng' },
                  { id: 2, name: 'Trưa' },
                  { id: 3, name: 'Tối' },
                  { id: 4, name: 'Phụ' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setMealType(t.id)}
                    className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all ${
                      mealType === t.id
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Satiety Percentage Slider (Hara Hachi Bu) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Mức Độ No (Satiety):
                </label>
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${
                  satiety <= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {satiety}% {satiety === 80 && '★ Chuẩn Hara Hachi Bu'}
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="100"
                step="5"
                value={satiety}
                onChange={(e) => setSatiety(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                <span>Hơi đói (50%)</span>
                <span className="text-emerald-700 font-bold">80% No (Dừng ăn)</span>
                <span>No căng (100%)</span>
              </div>
            </div>
          </div>

          {/* Two-Column Workspace: Food Picker (Left) & Basket Summary (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 cols: Search or Custom Tab */}
            <div className="lg:col-span-7 space-y-3">
              {/* Tab Header */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  onClick={() => setActiveTab('catalog')}
                  className={`text-xs font-bold pb-1 transition-colors ${
                    activeTab === 'catalog'
                      ? 'text-emerald-700 border-b-2 border-emerald-600'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Thư Viện Thực Phẩm Lành Mạnh & USDA
                </button>
                <button
                  onClick={() => setActiveTab('custom')}
                  className={`text-xs font-bold pb-1 transition-colors ${
                    activeTab === 'custom'
                      ? 'text-emerald-700 border-b-2 border-emerald-600'
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  + Món Ăn Tuỳ Chỉnh
                </button>
              </div>

              {activeTab === 'catalog' ? (
                <>
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Tìm thực phẩm: Đậu nành, bơ, yến mạch, cá hồi..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  {/* Food List */}
                  <div className="max-h-[280px] overflow-y-auto space-y-2 pr-1">
                    {searchResults.map((food) => (
                      <div
                        key={food.externalFoodId}
                        className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all text-xs"
                      >
                        <div className="flex-1 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800">{food.foodName}</span>
                            {food.plantSlantScore && (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                                {food.plantSlantScore}% thực vật
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {food.category || 'Dinh dưỡng tiêu chuẩn'} • {food.servingSize}{food.servingUnit}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500">
                            <span>🔥 {food.calories} kcal</span>
                            <span>Đạm: {food.proteinGrams}g</span>
                            <span className="text-emerald-700 font-bold">Xơ: {food.fiberGrams}g</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddFoodFromCatalog(food)}
                          className="shrink-0 w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition-all shadow-xs"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Custom Food Form */
                <form onSubmit={handleAddCustomFood} className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Tên Món Ăn
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="VD: Canh rong biển đậu hũ non"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">Khối lượng (g)</label>
                      <input
                        type="number"
                        min="1"
                        value={customServing}
                        onChange={(e) => setCustomServing(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">Calo (kcal)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="150"
                        value={customCalories}
                        onChange={(e) => setCustomCalories(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">Chất xơ (g)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="4.5"
                        value={customFiber}
                        onChange={(e) => setCustomFiber(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">Đạm Protein (g)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="8.0"
                        value={customProtein}
                        onChange={(e) => setCustomProtein(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">Tinh bột Carbs (g)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="20.0"
                        value={customCarbs}
                        onChange={(e) => setCustomCarbs(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-slate-500 block mb-1">Chất béo Fat (g)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="3.0"
                        value={customFat}
                        onChange={(e) => setCustomFat(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    + Thêm Món Vào Bữa Ăn
                  </button>
                </form>
              )}
            </div>

            {/* Right 5 cols: Basket Summary */}
            <div className="lg:col-span-5 bg-slate-50/70 rounded-2xl p-4 border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Món Đã Chọn ({selectedFoods.length})
                  </h4>
                  <span className="text-[10px] text-slate-400 font-medium">Bấm để chỉnh gram</span>
                </div>

                {selectedFoods.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">
                    <Scale className="w-8 h-8 mx-auto mb-1.5 opacity-40 text-slate-400" />
                    <p className="text-xs">Chưa có món ăn nào trong bữa</p>
                    <p className="text-[10px] mt-0.5">Chọn từ danh mục bên trái để thêm</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {selectedFoods.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 line-clamp-1">{item.foodName}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFood(idx)}
                            className="text-slate-400 hover:text-red-500 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="10"
                              max="1000"
                              step="10"
                              value={item.servingSize}
                              onChange={(e) => handleUpdateServing(idx, e.target.value)}
                              className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-center font-bold text-slate-800 text-xs"
                            />
                            <span className="text-slate-400 font-medium">{item.servingUnit}</span>
                          </div>

                          <div className="flex items-center gap-2 font-semibold">
                            <span className="text-slate-700">{item.calories} kcal</span>
                            <span className="text-emerald-700 bg-emerald-50 px-1 rounded">{item.fiberGrams}g xơ</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Basket Total Card */}
              <div className="pt-3 mt-3 border-t border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Tổng Năng Lượng Bữa Này:</span>
                  <span className="text-base text-emerald-800 font-extrabold">{totalCal} kcal</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[10px] text-center font-semibold bg-white p-2 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400 block">Đạm</span>
                    <span className="text-blue-700">{totalProtein.toFixed(1)}g</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Carbs</span>
                    <span className="text-amber-700">{totalCarbs.toFixed(1)}g</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Béo</span>
                    <span className="text-teal-700">{totalFat.toFixed(1)}g</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Chất Xơ</span>
                    <span className="text-emerald-700 font-bold">{totalFiber.toFixed(1)}g</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block mb-1">
              Ghi Chú Bữa Ăn (Tùy chọn)
            </label>
            <input
              type="text"
              placeholder="VD: Bữa trưa ăn thanh đạm cùng gia đình, no vừa vặn..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium hidden sm:block">
            {satiety <= 80 ? '✓ Đạt chuẩn no 80% của người Okinawa' : '⚠️ Vượt mức no 80% Hara Hachi Bu'}
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
            >
              Hủy
            </button>
            <button
              type="button"
              disabled={selectedFoods.length === 0 || isSubmitting}
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Đang lưu...' : editingMeal ? 'Lưu Thay Đổi Bữa Ăn' : 'Ghi Nhận Vào Nhật Ký'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
