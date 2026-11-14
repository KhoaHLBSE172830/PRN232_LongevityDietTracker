import React from 'react';
import { Stethoscope, Calendar, FileText, CheckCircle2, UserCheck } from 'lucide-react';

export default function ConsultationView() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                Tư Vấn Chuyên Gia & Bác Sĩ Dinh Dưỡng
              </span>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                Phụ trách: Dương Đình Khôi
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              Đặt Lịch Khám & Nhận Lời Khuyên Sống Thọ Cá Nhân Hóa
            </h2>
          </div>
        </div>

        <button className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/20 transition-all">
          <Calendar className="w-4 h-4" />
          <span>Đặt Lịch Tư Vấn Mới</span>
        </button>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">Đội Ngũ Bác Sĩ Dinh Dưỡng</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Danh sách các chuyên gia hàng đầu về y học lão khoa và dinh dưỡng trường thọ, sẵn sàng hỗ trợ trực tuyến.
          </p>
          <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold text-purple-700 flex items-center gap-1">
            <span>Trạng thái: Sẵn sàng kết nối giao diện</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">Hồ Sơ Sức Khỏe Đồng Bộ</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Bác sĩ xem được biểu đồ calo, chất xơ và lịch sử nhịn ăn 7 ngày qua của người dùng để đưa ra lời khuyên chính xác nhất.
          </p>
          <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
            <span>Trạng thái: Sẵn sàng kết nối</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-3">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">Phiếu Lời Khuyên (Advice Notes)</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Lưu trữ toàn bộ hướng dẫn dinh dưỡng, bài tập và đơn thuốc thực phẩm chức năng sau mỗi buổi khám.
          </p>
          <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold text-teal-700 flex items-center gap-1">
            <span>Trạng thái: Sẵn sàng kết nối</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200 text-purple-900 text-xs flex items-center justify-between">
        <p>
          💡 <strong>Không gian làm việc của Khôi:</strong> Toàn bộ mã nguồn giao diện sẽ đặt tại <code className="bg-white px-2 py-0.5 rounded border border-purple-200 font-mono font-bold">src/features/consultation/ConsultationView.jsx</code>.
        </p>
      </div>
    </div>
  );
}
