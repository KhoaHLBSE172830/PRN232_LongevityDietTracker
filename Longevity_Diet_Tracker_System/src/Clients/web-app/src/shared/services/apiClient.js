import axios from 'axios';
import { getSession } from './session';

// YARP Gateway (Mặc định kết nối cổng 7159 HTTPS hoặc 5000 HTTP)
export const GATEWAY_BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'https://localhost:7159';

export const apiClient = axios.create({
  baseURL: GATEWAY_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự gắn Bearer token (nếu có JWT hợp lệ). Request nào đã tự đặt Authorization thì giữ nguyên.
apiClient.interceptors.request.use((config) => {
  const session = getSession();
  if (session && !config.headers?.Authorization) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }
  return config;
});

// 401 => báo cho UI (AuthModal có thể lắng nghe sự kiện này để mở lại form đăng nhập).
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(err);
  }
);

// Tài khoản người dùng thử nghiệm
export const DEMO_USER = {
  id: 'e0e7a1b3-4f8a-493e-9b62-7a4c9f1e8201',
  name: 'Minh Anh',
  email: 'minhanh.lifestyle@longevity.app',
  streakDays: 14,
  caloricBudget: 1850,
  haraHachiBuThreshold: 1480, // 80% định mức calo
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
  tier: 'Hội Viên Sống Khỏe',
};

// Danh mục thực phẩm lành mạnh chuẩn bị sẵn để tra cứu nhanh
export const LONGEVITY_SUPERFOODS = [
  { externalFoodId: 'bz-01', foodName: 'Đậu Nành Nhật Edamame', category: 'Các loại Đậu', servingSize: 100, servingUnit: 'g', calories: 121, proteinGrams: 11.9, carbsGrams: 8.9, fatGrams: 5.2, fiberGrams: 5.2, plantScore: 98 },
  { externalFoodId: 'bz-02', foodName: 'Đậu Đen Hầm Truyền Thống', category: 'Các loại Đậu', servingSize: 100, servingUnit: 'g', calories: 132, proteinGrams: 8.9, carbsGrams: 23.7, fatGrams: 0.5, fiberGrams: 8.7, plantScore: 99 },
  { externalFoodId: 'bz-03', foodName: 'Rau Chân Vịt (Spinach) Hấp', category: 'Rau Xanh Sẫm', servingSize: 100, servingUnit: 'g', calories: 23, proteinGrams: 2.9, carbsGrams: 3.6, fatGrams: 0.4, fiberGrams: 2.2, plantScore: 95 },
  { externalFoodId: 'bz-04', foodName: 'Khoai Lang Tím Hấp', category: 'Củ & Ngũ Cốc', servingSize: 100, servingUnit: 'g', calories: 86, proteinGrams: 1.6, carbsGrams: 20.1, fatGrams: 0.1, fiberGrams: 3.0, plantScore: 96 },
  { externalFoodId: 'bz-05', foodName: 'Dầu Ô-liu Nguyên Chất Ép Lạnh', category: 'Chất Béo Lành Mạnh', servingSize: 15, servingUnit: 'ml', calories: 119, proteinGrams: 0.0, carbsGrams: 0.0, fatGrams: 13.5, fiberGrams: 0.0, plantScore: 94 },
  { externalFoodId: 'bz-06', foodName: 'Quả Bơ Sáp', category: 'Trái Cây & Béo Tốt', servingSize: 100, servingUnit: 'g', calories: 160, proteinGrams: 2.0, carbsGrams: 8.5, fatGrams: 14.7, fiberGrams: 6.7, plantScore: 92 },
  { externalFoodId: 'bz-07', foodName: 'Trà Xanh Thảo Mộc Tự Nhiên', category: 'Đồ Uống Chống Oxy Hóa', servingSize: 250, servingUnit: 'ml', calories: 5, proteinGrams: 0.5, carbsGrams: 0.8, fatGrams: 0.1, fiberGrams: 0.5, plantScore: 97 },
  { externalFoodId: 'bz-08', foodName: 'Hạt Óc Chó Nguyên Hạt', category: 'Các Loại Hạt', servingSize: 30, servingUnit: 'g', calories: 196, proteinGrams: 4.6, carbsGrams: 4.1, fatGrams: 19.6, fiberGrams: 2.0, plantScore: 93 },
  { externalFoodId: 'bz-09', foodName: 'Cá Hồi Tự Nhiên Áp Chảo', category: 'Hải Sản Lành Mạnh', servingSize: 100, servingUnit: 'g', calories: 182, proteinGrams: 25.4, carbsGrams: 0.0, fatGrams: 8.1, fiberGrams: 0.0, plantScore: 82 },
  { externalFoodId: 'bz-10', foodName: 'Gạo Lứt Huyết Rồng Nấu Mềm', category: 'Ngũ Cốc Nguyên Cám', servingSize: 100, servingUnit: 'g', calories: 123, proteinGrams: 2.7, carbsGrams: 25.6, fatGrams: 1.0, fiberGrams: 2.8, plantScore: 91 },
];
