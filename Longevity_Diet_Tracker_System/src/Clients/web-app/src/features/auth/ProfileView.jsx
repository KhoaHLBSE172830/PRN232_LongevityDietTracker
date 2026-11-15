import React from 'react';
import { UserCircle2, Shield, Settings, CheckCircle2, Flame, Award, Heart } from 'lucide-react';
import { DEMO_USER } from '../../shared/services/apiClient';

export default function ProfileView() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <UserCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-300">
                Hồ Sơ Sức Khỏe & Quản Trị Hệ Thống
              </span>
              
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              Bảo Mật Tài Khoản & Cài Đặt Hồ Sơ Sức Khỏe
            </h2>
          </div>
        </div>

        <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-800/20 transition-all">
          <Settings className="w-4 h-4" />
          <span>Cập Nhật Thông Tin</span>
        </button>
      </div>

      {/* User Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-3">
            <img
              src={DEMO_USER.avatar}
              alt={DEMO_USER.name}
              className="w-14 h-14 rounded-full object-cover ring-2 ring-emerald-500/40"
            />
            <div>
              <h4 className="font-extrabold text-slate-900 text-base">{DEMO_USER.name}</h4>
              <p className="text-xs text-slate-500">{DEMO_USER.email}</p>
              <span className="inline-block mt-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
                {DEMO_USER.tier}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Định mức Calo ngày:</span>
              <span className="font-bold text-slate-800">{DEMO_USER.caloricBudget} kcal</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Ngưỡng no 80% (Hara Hachi Bu):</span>
              <span className="font-bold text-emerald-700">{DEMO_USER.haraHachiBuThreshold} kcal</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Chuỗi sống khỏe:</span>
              <span className="font-bold text-amber-600">{DEMO_USER.streakDays} ngày liên tiếp</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Award className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">Huy Hiệu Sống Thọ</h4>
          <div className="space-y-2 text-xs">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span className="font-semibold text-slate-700">Chiến Binh 14 Ngày Kiên Trì</span>
            </div>
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500" />
              <span className="font-semibold text-slate-700">Bậc Thầy Hara Hachi Bu (No 80%)</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <Shield className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">Bảo Mật Identity & Gateway</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Hỗ trợ đăng nhập một chạm Google OAuth 2.0 và cơ chế mã hóa phiên làm việc an toàn, bảo vệ thông tin sức khỏe cá nhân.
          </p>
          <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold text-slate-700 flex items-center gap-1">
            <span>Trạng thái: Sẵn sàng kết nối giao diện</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 text-slate-800 text-xs flex items-center justify-between">
        <p>
          🛡️ <strong>Hệ thống quản trị an toàn:</strong> Dữ liệu hồ sơ người dùng được bảo vệ đa tầng, đảm bảo tính toàn vẹn và quyền riêng tư tuyệt đối trên toàn hệ thống.
        </p>
      </div>
    </div>
  );
}
