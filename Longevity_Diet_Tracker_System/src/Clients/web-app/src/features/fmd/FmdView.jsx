import React from 'react';
import { Leaf, ShieldAlert, Mail, CheckCircle2 } from 'lucide-react';

export default function FmdView() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                Chế Độ Giả Nhịn Ăn FMD 5 Ngày (Dr. Valter Longo)
              </span>
              <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                Phụ trách: Trần Phạm Khánh Quốc
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              Thanh Lọc Tế Bào & Cảnh Báo Định Mức Năng Lượng
            </h2>
          </div>
        </div>

        <button className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all">
          <Leaf className="w-4 h-4 fill-white" />
          <span>Bắt Đầu Chu Kỳ FMD 5 Ngày Mới</span>
        </button>
      </div>

      {/* 5-Day Protocol Roadmap */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-800">
            Lộ Trình 5 Ngày Thanh Lọc Tế Bào (FMD Protocol)
          </h3>
          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
            Tần suất: 1 chu kỳ mỗi 1 - 3 tháng
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            { day: 1, cal: '1100 kcal', desc: 'Ngày Khởi Động: Chuẩn bị cơ thể chuyển đổi năng lượng' },
            { day: 2, cal: '725 kcal', desc: 'Đốt mỡ sâu & Kích hoạt tái sinh tế bào gốc' },
            { day: 3, cal: '725 kcal', desc: 'Thanh lọc tế bào lão hóa và giảm chỉ số viêm' },
            { day: 4, cal: '725 kcal', desc: 'Tái tạo hệ miễn dịch và trẻ hóa sinh học' },
            { day: 5, cal: '725 kcal', desc: 'Hoàn tất chu kỳ & Phục hồi cơ quan nội tạng' },
          ].map((d) => (
            <div key={d.day} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-center space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Ngày {d.day}</span>
              <span className="text-base font-extrabold text-teal-800 block">{d.cal}</span>
              <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">{d.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">Kiểm Soát Calo Tự Động</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Hệ thống tự động phát hiện nếu người dùng ghi nhận món ăn vượt quá định mức 1100/725 kcal trong ngày FMD và gửi thông báo nhắc nhở tức thì.
          </p>
          <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold text-teal-700 flex items-center gap-1">
            <span>Trạng thái: Sẵn sàng kết nối giao diện</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-2xs space-y-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-slate-800 text-sm">Hộp Thư Thông Báo Sức Khỏe</h4>
          <p className="text-xs text-slate-500 leading-relaxed">
            Gửi email hướng dẫn thực đơn chi tiết cho từng ngày FMD và nhắc nhở thời điểm kết thúc chu kỳ để tái nạp dinh dưỡng an toàn.
          </p>
          <div className="pt-2 border-t border-slate-100 text-[11px] font-semibold text-amber-700 flex items-center gap-1">
            <span>Trạng thái: Sẵn sàng kết nối giao diện</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 text-teal-900 text-xs flex items-center justify-between">
        <p>
          💡 <strong>Không gian làm việc của Quốc:</strong> Toàn bộ mã nguồn giao diện sẽ đặt tại <code className="bg-white px-2 py-0.5 rounded border border-teal-200 font-mono font-bold">src/features/fmd/FmdView.jsx</code>.
        </p>
      </div>
    </div>
  );
}
