import { LayoutDashboard, SlidersHorizontal, ChefHat, ShieldCheck, Send } from 'lucide-react';

export const ADMIN_MENU = [
  { id: 'admin-overview', label: 'Tổng quan quản trị', icon: LayoutDashboard },
  { id: 'admin-fmd', label: 'Quy tắc FMD', icon: SlidersHorizontal },
  { id: 'admin-templates', label: 'Mẫu bữa ăn', icon: ChefHat },
  { id: 'admin-users', label: 'Phân quyền người dùng', icon: ShieldCheck },
  { id: 'admin-notify', label: 'Thông báo hệ thống', icon: Send },
];
