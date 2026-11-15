import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, Calendar, FileText, CheckCircle2, UserCheck, 
  Activity, Send, Clock, ShieldCheck, HeartPulse, User, 
  Award, ArrowRight, X, Sparkles, MessageSquareHeart, AlertCircle
} from 'lucide-react';
import { consultationApi } from './consultationApi';
import { DEMO_USER } from '../../shared/services/apiClient';

export default function ConsultationView() {
  const [activeTab, setActiveTab] = useState('member'); // 'member' | 'nutritionist'
  const [nutritionists, setNutritionists] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [advices, setAdvices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedNutritionist, setSelectedNutritionist] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('09:00');
  const [bookingNotes, setBookingNotes] = useState('');

  // gRPC Review Modal State
  const [isGrpcModalOpen, setIsGrpcModalOpen] = useState(false);
  const [grpcReviewData, setGrpcReviewData] = useState(null);
  const [loadingGrpc, setLoadingGrpc] = useState(false);

  // Advice Form State (Doctor Portal)
  const [isAdviceModalOpen, setIsAdviceModalOpen] = useState(false);
  const [selectedSessionForAdvice, setSelectedSessionForAdvice] = useState(null);
  const [adviceSummary, setAdviceSummary] = useState('');
  const [dietaryRec, setDietaryRec] = useState('');
  const [fastingRec, setFastingRec] = useState('');

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [nutriList, userSessions, userAdvices] = await Promise.all([
        consultationApi.getNutritionists(),
        consultationApi.getUserSessions(DEMO_USER.id),
        consultationApi.getUserAdvices(DEMO_USER.id)
      ]);
      setNutritionists(nutriList || []);
      setSessions(userSessions || []);
      setAdvices(userAdvices || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBookModal = (nutri) => {
    setSelectedNutritionist(nutri);
    setIsBookModalOpen(true);
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedNutritionist) return;

    const scheduledDateTime = bookingDate ? `${bookingDate}T${bookingTime}:00Z` : new Date(Date.now() + 86400000).toISOString();
    
    const payload = {
      userId: DEMO_USER.id,
      nutritionistId: selectedNutritionist.id,
      scheduledAtUtc: scheduledDateTime,
      notes: bookingNotes || 'Tư vấn phác đồ ăn thực vật và lịch nhịn ăn 16/8'
    };

    const res = await consultationApi.bookSession(payload);
    if (res?.isSuccess !== false) {
      showToast(`🎉 Đã đặt lịch thành công với ${selectedNutritionist.fullName}!`);
      setIsBookModalOpen(false);
      setBookingNotes('');
      // Reload or append session
      const newSession = {
        id: res?.data?.id || 'new-' + Date.now(),
        userId: DEMO_USER.id,
        nutritionistId: selectedNutritionist.id,
        nutritionistName: selectedNutritionist.fullName,
        scheduledAtUtc: scheduledDateTime,
        durationMinutes: 45,
        status: 2, // Confirmed
        notes: payload.notes
      };
      setSessions(prev => [newSession, ...prev]);
    }
  };

  const handleReviewGrpc = async (userId = DEMO_USER.id) => {
    setLoadingGrpc(true);
    setIsGrpcModalOpen(true);
    try {
      const data = await consultationApi.reviewUserProgress(userId);
      setGrpcReviewData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGrpc(false);
    }
  };

  const handleOpenAdviceModal = (session) => {
    setSelectedSessionForAdvice(session);
    setAdviceSummary('Bệnh nhân thích nghi tốt với 16/8, calo kiểm soát dưới mức mục tiêu. Cần tăng cường chất xơ từ đậu nành và hạt.');
    setDietaryRec('Tăng cường thực phẩm giàu polyphenol (trà xanh, dầu oliu nguyên chất), ăn no 80% (Hara Hachi Bu).');
    setFastingRec('Duy trì khung giờ nhịn 16/8 từ 20:00 tối hôm trước đến 12:00 trưa hôm sau. Uống đủ 2.5 lít nước khoáng.');
    setIsAdviceModalOpen(true);
  };

  const handleSendAdvice = async (e) => {
    e.preventDefault();
    if (!selectedSessionForAdvice) return;

    const payload = {
      consultationSessionId: selectedSessionForAdvice.id,
      adviceSummary,
      dietaryRecommendations: dietaryRec,
      fastingRecommendations: fastingRec
    };

    const res = await consultationApi.sendAdvice(payload);
    if (res?.isSuccess !== false) {
      showToast('💌 Đã gửi phiếu lời khuyên & Bắn sự kiện RabbitMQ thành công!');
      setIsAdviceModalOpen(false);
      
      // Update local session status to Completed (3)
      setSessions(prev => prev.map(s => s.id === selectedSessionForAdvice.id ? { ...s, status: 3 } : s));

      // Append new advice to local state
      const newAdvice = {
        id: 'adv-' + Date.now(),
        consultationSessionId: selectedSessionForAdvice.id,
        adviceSummary,
        dietaryRecommendations: dietaryRec,
        fastingRecommendations: fastingRec,
        createdAt: new Date().toISOString()
      };
      setAdvices(prev => [newAdvice, ...prev]);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 1:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">Chờ xác nhận</span>;
      case 2:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">Đã xác nhận</span>;
      case 3:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Đã hoàn thành</span>;
      case 4:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">Đã hủy</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">Lịch hẹn</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 animate-fade-in text-slate-800">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Role Switcher */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-purple-800/50">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-purple-300 bg-purple-950/80 px-3 py-1 rounded-full border border-purple-700/60 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              Microservice Domain 2: Consultation Service
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Tư Vấn Bác Sĩ Dinh Dưỡng Trường Thọ
          </h1>
          <p className="text-xs md:text-sm text-purple-200/80 max-w-2xl leading-relaxed">
            Kết nối trực tiếp chuyên gia Blue Zones, đồng bộ hồ sơ qua gRPC cổng 7002 và nhận phiếu lời khuyên y khoa cá nhân hóa.
          </p>
        </div>

        {/* Switch Portal Tabs */}
        <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl flex items-center border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab('member')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'member'
                ? 'bg-white text-purple-950 shadow-md font-extrabold'
                : 'text-purple-200 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Dành Cho Hội Viên</span>
          </button>
          <button
            onClick={() => setActiveTab('nutritionist')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'nutritionist'
                ? 'bg-purple-500 text-white shadow-md font-extrabold'
                : 'text-purple-200 hover:text-white'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Cổng Bác Sĩ & gRPC</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DÀNH CHO HỘI VIÊN (MEMBER PORTAL) */}
      {/* ========================================================================= */}
      {activeTab === 'member' && (
        <div className="space-y-8 animate-fade-in">
          {/* Section: Danh Sách Bác Sĩ */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  Đội Ngũ Chuyên Gia Dinh Dưỡng Blue Zones
                </h2>
                <p className="text-xs text-slate-500">
                  Các chuyên gia y học trường thọ hàng đầu được cấp chứng chỉ y khoa quốc tế.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 rounded-3xl bg-slate-100 animate-pulse border border-slate-200" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {nutritionists.map((nutri) => (
                  <div
                    key={nutri.id}
                    className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group hover:border-purple-300"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-100 to-indigo-50 text-purple-700 flex items-center justify-center font-black text-base shadow-xs">
                          {nutri.fullName?.charAt(0) || 'B'}
                        </div>
                        {nutri.isVerified && (
                          <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Đã Xác Minh
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-purple-700 transition-colors">
                          {nutri.fullName}
                        </h3>
                        <p className="text-[11px] font-bold text-purple-600 mt-0.5 line-clamp-1">
                          {nutri.specialization}
                        </p>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">
                        {nutri.bio}
                      </p>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600 flex items-center gap-2">
                        <Award className="w-4 h-4 text-purple-500 shrink-0" />
                        <span className="truncate">{nutri.certification}</span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-semibold">Tư vấn 45 phút</span>
                      <button
                        onClick={() => handleOpenBookModal(nutri)}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Đặt Lịch</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: 2 Cột: Lịch hẹn của tôi & Lời khuyên nhận được */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cột 1: Lịch hẹn đã đặt */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">Lịch Hẹn Của Bạn</h3>
                </div>
                <span className="text-xs text-slate-400 font-bold">{sessions.length} phiên</span>
              </div>

              {sessions.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Bạn chưa có lịch hẹn tư vấn nào. Hãy chọn bác sĩ ở trên để đặt lịch!
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map(s => (
                    <div key={s.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">{s.nutritionistName || 'Bác sĩ dinh dưỡng'}</span>
                          {getStatusBadge(s.status)}
                        </div>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(s.scheduledAtUtc).toLocaleString('vi-VN')}
                        </p>
                        {s.notes && (
                          <p className="text-[11px] text-slate-600 italic">"{s.notes}"</p>
                        )}
                      </div>
                      <span className="text-xs font-extrabold text-purple-700 bg-purple-100/60 px-2.5 py-1 rounded-xl shrink-0">
                        {s.durationMinutes || 45} phút
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cột 2: Phiếu Lời Khuyên Y Khoa */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">Phiếu Lời Khuyên (Advice Notes)</h3>
                </div>
                <span className="text-xs text-slate-400 font-bold">{advices.length} phiếu</span>
              </div>

              {advices.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Chưa có phiếu lời khuyên nào từ bác sĩ. Phiếu sẽ xuất hiện sau khi hoàn tất buổi tư vấn.
                </div>
              ) : (
                <div className="space-y-3">
                  {advices.map(a => (
                    <div key={a.id} className="p-4 rounded-2xl bg-purple-50/50 border border-purple-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-purple-900 flex items-center gap-1.5">
                          <MessageSquareHeart className="w-4 h-4 text-purple-600" />
                          Lời khuyên từ Bác sĩ
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(a.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium leading-relaxed">
                        {a.adviceSummary}
                      </p>
                      {a.dietaryRecommendations && (
                        <div className="text-[11px] text-indigo-900 bg-white/80 p-2 rounded-xl border border-indigo-100">
                          <strong>🥗 Dinh dưỡng:</strong> {a.dietaryRecommendations}
                        </div>
                      )}
                      {a.fastingRecommendations && (
                        <div className="text-[11px] text-purple-900 bg-white/80 p-2 rounded-xl border border-purple-100">
                          <strong>⏱️ Nhịn ăn:</strong> {a.fastingRecommendations}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CỔNG BÁC SĨ & gRPC CLIENT (NUTRITIONIST PORTAL) */}
      {/* ========================================================================= */}
      {activeTab === 'nutritionist' && (
        <div className="space-y-6 animate-fade-in">
          {/* Banner Doctor Role */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Bạn đang ở chế độ <strong>Bác Sĩ Dinh Dưỡng</strong> (Đặng Minh Tuấn). Tại đây bạn có thể <strong>gọi gRPC sang cổng 7002</strong> để soi tiến độ sức khỏe của hội viên và kê đơn gửi sự kiện qua <strong>RabbitMQ</strong>.
              </span>
            </div>
          </div>

          {/* Danh Sách Bệnh Nhân Hẹn Khám */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-600" />
                Danh Sách Hội Viên Chờ Khám & Đánh Giá
              </h3>
              <span className="text-xs text-purple-700 font-bold bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                Tích hợp gRPC Client cổng :7002
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {sessions.map(s => (
                <div key={s.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        {DEMO_USER.fullName} ({DEMO_USER.email})
                      </span>
                      {getStatusBadge(s.status)}
                    </div>
                    <p className="text-xs text-slate-500">
                      Thời gian hẹn: <strong>{new Date(s.scheduledAtUtc).toLocaleString('vi-VN')}</strong> • {s.durationMinutes || 45} phút
                    </p>
                    <p className="text-xs text-slate-600 italic">
                      Ghi chú ban đầu: "{s.notes || 'Hội viên quan tâm đến tối ưu năng lượng và chế độ ăn Okinawa'}"
                    </p>
                  </div>

                  {/* Doctor Action Buttons */}
                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => handleReviewGrpc(s.userId)}
                      className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-all"
                    >
                      <Activity className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Soi Dữ Liệu Sức Khỏe (gRPC)</span>
                    </button>

                    <button
                      onClick={() => handleOpenAdviceModal(s)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kê Đơn Lời Khuyên (RabbitMQ)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: FORM ĐẶT LỊCH HẸN VỚI CHUYÊN GIA */}
      {/* ========================================================================= */}
      {isBookModalOpen && selectedNutritionist && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-base">Đặt Lịch Tư Vấn</h3>
              <button onClick={() => setIsBookModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-purple-50 p-3 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-200 text-purple-800 font-black flex items-center justify-center text-sm">
                {selectedNutritionist.fullName.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-xs text-purple-950">{selectedNutritionist.fullName}</h4>
                <p className="text-[11px] text-purple-700">{selectedNutritionist.specialization}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Chọn ngày tư vấn</label>
                <input
                  type="date"
                  required
                  defaultValue={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-purple-600 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Khung giờ phù hợp</label>
                <select
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-purple-600 font-medium"
                >
                  <option value="09:00">09:00 - 09:45 Sáng</option>
                  <option value="10:30">10:30 - 11:15 Sáng</option>
                  <option value="14:00">14:00 - 14:45 Chiều</option>
                  <option value="15:30">15:30 - 16:15 Chiều</option>
                  <option value="19:30">19:30 - 20:15 Tối</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mục tiêu & ghi chú cho Bác sĩ</label>
                <textarea
                  rows={3}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Ví dụ: Cần tư vấn cách phân bổ đạm thực vật khi nhịn ăn 16/8..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-purple-600 resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md"
                >
                  Xác Nhận Đặt Lịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SOI DỮ LIỆU SỨC KHỎE QUA gRPC CỔNG 7002 */}
      {/* ========================================================================= */}
      {isGrpcModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Hồ Sơ Sức Khỏe Đồng Bộ gRPC (Cổng 7002)</h3>
              </div>
              <button onClick={() => setIsGrpcModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-indigo-900 bg-indigo-50/70 p-3 rounded-2xl flex items-center justify-between border border-indigo-100">
              <span className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Dữ liệu được truy vấn Inter-Service đồng bộ qua giao thức HTTP/2 Protobuf
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                Độ trễ &lt; 5ms
              </span>
            </div>

            {loadingGrpc ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Đang gọi gRPC Client sang cổng 7002 của DietFasting Service...
              </div>
            ) : grpcReviewData ? (
              <div className="space-y-4 text-xs">
                {/* 1. Fasting Summary */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    Trụ Cột 1: Tiến Trình Nhịn Ăn Gián Đoạn (Fasting)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>Trạng thái: <strong className="text-purple-700">{grpcReviewData.fastingSummary?.isCurrentlyFasting ? 'Đang Nhịn Ăn (Active)' : 'Đã dừng'}</strong></div>
                    <div>Chế độ: <strong>{grpcReviewData.fastingSummary?.currentFastingType || '16/8'}</strong></div>
                    <div>Tổng phiên hoàn thành: <strong>{grpcReviewData.fastingSummary?.totalCompletedFasts || 24} phiên</strong></div>
                    <div>Tổng giờ nhịn tích lũy: <strong>{grpcReviewData.fastingSummary?.totalFastedHours || 384} giờ</strong></div>
                  </div>
                </div>

                {/* 2. Nutrition Summary */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-rose-600" />
                    Trụ Cột 2: Cân Bằng Dinh Dưỡng Trung Bình (Macros 30 Ngày)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>Nạp trung bình: <strong className="text-slate-900">{grpcReviewData.nutritionSummary?.averageCalories || 1850} kcal/ngày</strong></div>
                    <div>Đạm thực vật (Protein): <strong>{grpcReviewData.nutritionSummary?.averageProtein || 85} g</strong></div>
                    <div>Tinh bột chậm (Carbs): <strong>{grpcReviewData.nutritionSummary?.averageCarbs || 210} g</strong></div>
                    <div>Chất béo tốt (Fat): <strong>{grpcReviewData.nutritionSummary?.averageFat || 55} g</strong></div>
                  </div>
                </div>

                {/* 3. FMD Status */}
                <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 text-teal-950 space-y-1">
                  <h4 className="font-extrabold text-xs text-teal-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    Trụ Cột 3: Chu Kỳ Giả Nhịn Ăn FMD 5 Ngày
                  </h4>
                  <p className="text-[11px] text-teal-800">
                    Bệnh nhân đang ở <strong>Chu kỳ {grpcReviewData.fmdCycleStatus?.cycleNumber || 2} - Ngày {grpcReviewData.fmdCycleStatus?.currentDay || 3}</strong> (Trạng thái: {grpcReviewData.fmdCycleStatus?.status || 'Active'}).
                  </p>
                  <div className="text-[10px] text-teal-700 italic">
                    Chuyên gia lưu ý: Ngày thứ 3 là giai đoạn quá trình tự thực bào (Autophagy) đạt đỉnh, khuyến nghị calo hôm nay được kiểm soát dưới 725 kcal.
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsGrpcModalOpen(false)}
                className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: KÊ ĐƠN LỜI KHUYÊN & BẮN SỰ KIỆN RABBITMQ */}
      {/* ========================================================================= */}
      {isAdviceModalOpen && selectedSessionForAdvice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-scale-up space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <h3 className="font-extrabold text-slate-900 text-base">Kê Phiếu Lời Khuyên Y Khoa</h3>
              </div>
              <button onClick={() => setIsAdviceModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-purple-900 bg-purple-50 p-3 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-purple-600 shrink-0" />
              <span>Thao tác này sẽ hoàn tất buổi khám và kích hoạt <strong>RabbitMQ Publisher</strong> gửi thông báo đến người dùng!</span>
            </div>

            <form onSubmit={handleSendAdvice} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tóm tắt đánh giá y khoa</label>
                <textarea
                  rows={2}
                  required
                  value={adviceSummary}
                  onChange={(e) => setAdviceSummary(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-purple-600 resize-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Khuyến nghị dinh dưỡng Blue Zones</label>
                <textarea
                  rows={2}
                  required
                  value={dietaryRec}
                  onChange={(e) => setDietaryRec(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-purple-600 resize-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Khuyến nghị nhịn ăn gián đoạn (IF / FMD)</label>
                <textarea
                  rows={2}
                  required
                  value={fastingRec}
                  onChange={(e) => setFastingRec(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-purple-600 resize-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdviceModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Gửi Phiếu Lời Khuyên & Bắn RabbitMQ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
