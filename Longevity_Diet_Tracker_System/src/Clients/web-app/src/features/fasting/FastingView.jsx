import React from 'react';
import { Timer, Play, Clock, Sparkles, CheckCircle2 } from 'lucide-react';

export default function FastingView() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                Nhịn Ăn Gián Đoạn (Intermittent Fasting)
              </span>
              
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              Bộ Đếm Giờ Fasting 16/8 & Tự Động Hóa Nhắc Nhở
            </h2>
          </div>
        </div>

        <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all">
          <Play className="w-4 h-4 fill-white" />
          <span>Bắt Đầu Phiên Nhịn Ăn Mới</span>
        </button>
      </div>

      {/* Feature Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Timer className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">Chế Độ 16/8 & 20/4 (OMAD)</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Hỗ trợ theo dõi thời gian nhịn ăn, tự động tính toán thời gian bước vào trạng thái Đốt Mỡ (Ketosis) và Tự Thực Bào (Autophagy).
          </p>
          <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold text-blue-700 flex items-center gap-1">
            <span>Trạng thái: Sẵn sàng kết nối giao diện</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">Đồng Bộ Hồ Sơ Cho Chuyên Gia</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tự động tổng hợp dữ liệu số giờ nhịn ăn trung bình 7 ngày qua để chia sẻ cho bác sĩ trong các phiên tư vấn sức khỏe.
          </p>
          <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
            <span>Trạng thái: Sẵn sàng kết nối</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">Nhắc Nhở Uống Nước & Kết Thúc</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tác vụ nền tự động gửi thông báo nhắc nhở người dùng bổ sung nước điện giải trong suốt thời gian nhịn ăn.
          </p>
          <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
            <span>Trạng thái: Sẵn sàng kết nối</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
        <p>
          💧 <strong>Lưu ý trong thời gian nhịn ăn:</strong> Trong khung giờ nhịn ăn 16 tiếng, duy trì uống đủ nước lọc, trà thảo mộc không đường để cơ thể đào thải độc tố và tối ưu hóa chuyển hóa năng lượng.
        </p>
      </div>
    </div>
  );
}
