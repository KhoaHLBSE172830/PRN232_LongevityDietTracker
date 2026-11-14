import { apiClient, DEMO_USER, LONGEVITY_SUPERFOODS } from '../../shared/services/apiClient';

let localMealsStorage = [
  {
    id: 'meal-01',
    userId: DEMO_USER.id,
    mealType: 1, // Sáng
    mealTypeName: 'Bữa Sáng',
    loggedAt: new Date().toISOString(),
    totalCalories: 380,
    totalProteinGrams: 16.5,
    totalCarbsGrams: 52.0,
    totalFatGrams: 8.5,
    totalFiberGrams: 12.0,
    isHaraHachiBuCompliant: true,
    satietyPercentage: 75,
    notes: 'Yến mạch nấu sữa đậu nành, hạt chia và việt quất tươi',
    foodItems: [
      { externalFoodId: 'f-1', foodName: 'Yến Mạch Hạt Nguyên Cám', servingSize: 60, servingUnit: 'g', calories: 230, proteinGrams: 8.0, carbsGrams: 39.0, fatGrams: 4.0, fiberGrams: 6.5 },
      { externalFoodId: 'f-2', foodName: 'Sữa Đậu Nành Tươi Không Đường', servingSize: 200, servingUnit: 'ml', calories: 90, proteinGrams: 7.0, carbsGrams: 4.0, fatGrams: 3.5, fiberGrams: 1.5 },
      { externalFoodId: 'f-3', foodName: 'Việt Quất Tươi & Hạt Chia', servingSize: 50, servingUnit: 'g', calories: 60, proteinGrams: 1.5, carbsGrams: 9.0, fatGrams: 1.0, fiberGrams: 4.0 },
    ],
  },
  {
    id: 'meal-02',
    userId: DEMO_USER.id,
    mealType: 2, // Trưa
    mealTypeName: 'Bữa Trưa',
    loggedAt: new Date().toISOString(),
    totalCalories: 540,
    totalProteinGrams: 28.0,
    totalCarbsGrams: 64.0,
    totalFatGrams: 14.0,
    totalFiberGrams: 18.5,
    isHaraHachiBuCompliant: true,
    satietyPercentage: 80,
    notes: 'Salad đậu gà Địa Trung Hải, rau chân vịt, dầu ô-liu nguyên chất',
    foodItems: [
      { externalFoodId: 'f-4', foodName: 'Đậu Gà Hầm Thảo Mộc', servingSize: 150, servingUnit: 'g', calories: 240, proteinGrams: 13.0, carbsGrams: 40.0, fatGrams: 3.5, fiberGrams: 11.0 },
      { externalFoodId: 'f-5', foodName: 'Đậu Phụ Áp Chảo Thảo Mộc', servingSize: 120, servingUnit: 'g', calories: 160, proteinGrams: 12.0, carbsGrams: 3.0, fatGrams: 8.0, fiberGrams: 2.5 },
      { externalFoodId: 'f-6', foodName: 'Salad Rau Bina & Dầu Ô-liu Ép Lạnh', servingSize: 100, servingUnit: 'g', calories: 140, proteinGrams: 3.0, carbsGrams: 21.0, fatGrams: 2.5, fiberGrams: 5.0 },
    ],
  },
];

export const mealsApi = {
  // Lấy danh sách bữa ăn của người dùng
  async getUserMeals(userId = DEMO_USER.id, date = new Date()) {
    try {
      const formattedDate = date.toISOString().split('T')[0];
      const res = await apiClient.get(`/api/meals/user/${userId}?date=${formattedDate}`);
      if (res.data?.data) {
        return res.data.data;
      }
      return localMealsStorage;
    } catch (err) {
      console.warn('[Meals API]: Đang sử dụng dữ liệu mẫu:', err.message);
      return localMealsStorage;
    }
  },

  // Ghi nhận bữa ăn mới
  async logMeal(mealPayload) {
    try {
      const res = await apiClient.post('/api/meals', mealPayload);
      if (res.data?.data) {
        return res.data.data;
      }
    } catch (err) {
      console.warn('[Meals API]: Lưu cục bộ:', err.message);
    }

    const newMeal = {
      id: `meal-${Date.now()}`,
      userId: mealPayload.userId,
      mealType: mealPayload.mealType,
      mealTypeName: mealPayload.mealType === 1 ? 'Bữa Sáng' : mealPayload.mealType === 2 ? 'Bữa Trưa' : mealPayload.mealType === 3 ? 'Bữa Tối' : 'Bữa Phụ',
      loggedAt: mealPayload.loggedAt || new Date().toISOString(),
      totalCalories: mealPayload.foodItems.reduce((acc, f) => acc + (f.calories || 0), 0),
      totalProteinGrams: mealPayload.foodItems.reduce((acc, f) => acc + (f.proteinGrams || 0), 0),
      totalCarbsGrams: mealPayload.foodItems.reduce((acc, f) => acc + (f.carbsGrams || 0), 0),
      totalFatGrams: mealPayload.foodItems.reduce((acc, f) => acc + (f.fatGrams || 0), 0),
      totalFiberGrams: mealPayload.foodItems.reduce((acc, f) => acc + (f.fiberGrams || 0), 0),
      isHaraHachiBuCompliant: mealPayload.isHaraHachiBuCompliant ?? true,
      satietyPercentage: mealPayload.satietyPercentage ?? 80,
      notes: mealPayload.notes || '',
      foodItems: mealPayload.foodItems,
    };

    localMealsStorage.unshift(newMeal);
    return newMeal;
  },

  // Tra cứu thực phẩm USDA
  async searchFood(query) {
    if (!query || query.trim() === '') return LONGEVITY_SUPERFOODS;

    try {
      const res = await apiClient.get(`/api/nutrition/search?query=${encodeURIComponent(query)}`);
      if (res.data?.data && res.data.data.length > 0) {
        return res.data.data;
      }
    } catch (err) {
      console.info('[Nutrition API]: Dùng kho dữ liệu ngoại tuyến:', err.message);
    }

    const q = query.toLowerCase().trim();
    return LONGEVITY_SUPERFOODS.filter(item =>
      item.foodName.toLowerCase().includes(q) ||
      (item.category && item.category.toLowerCase().includes(q))
    );
  },
};
