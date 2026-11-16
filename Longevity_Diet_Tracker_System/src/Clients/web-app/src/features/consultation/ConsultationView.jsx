import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, Calendar, FileText, CheckCircle2, UserCheck, 
  Activity, Send, Clock, ShieldCheck, HeartPulse, User, 
  Award, ArrowRight, X, Sparkles, MessageSquareHeart, AlertCircle
} from 'lucide-react';
import { consultationApi, getConsultationAuthSession, isOfflineError, SAMPLE_NUTRITIONISTS } from './consultationApi';
import { DEMO_USER } from '../../shared/services/apiClient';

export default function ConsultationView() {
  const [activeTab, setActiveTab] = useState('member'); // 'member' | 'nutritionist'
  const [nutritionists, setNutritionists] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [doctorSessions, setDoctorSessions] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('11111111-1111-1111-1111-111111111111');
  const [advices, setAdvices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedNutritionist, setSelectedNutritionist] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('09:00');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState('');
  const [bookingSlot, setBookingSlot] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');

  // gRPC Review Modal State
  const [isGrpcModalOpen, setIsGrpcModalOpen] = useState(false);
  const [grpcReviewData, setGrpcReviewData] = useState(null);
  const [grpcError, setGrpcError] = useState(null);
  const [grpcLatencyMs, setGrpcLatencyMs] = useState(null);

  // Lỗi tải dữ liệu (hiện banner thay vì chỉ ghi console) và cờ "đang dùng danh sách bác sĩ mẫu"
  const [loadErrors, setLoadErrors] = useState([]);
  const [offlineSample, setOfflineSample] = useState(false);
  const [loadingGrpc, setLoadingGrpc] = useState(false);

  // Advice Form State (Doctor Portal)
  const [isAdviceModalOpen, setIsAdviceModalOpen] = useState(false);
  const [selectedSessionForAdvice, setSelectedSessionForAdvice] = useState(null);
  const [adviceSummary, setAdviceSummary] = useState('');
  const [dietaryRec, setDietaryRec] = useState('');
  const [fastingRec, setFastingRec] = useState('');

  // Toast notification
  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('info'); // 'info' | 'success' | 'warning' | 'error'

  const showToast = (msg, type = 'info') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 5000);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Thông tin đăng nhập (đọc từ JWT). Bác sĩ (Nutritionist) chỉ thao tác với hồ sơ của chính mình; Admin xem được mọi bác sĩ.
  const authInfo = getConsultationAuthSession();
  const isAdmin = authInfo?.role === 'Admin';
  const isDoctor = isAdmin || authInfo?.role === 'Nutritionist';
  const doctorOptions = isAdmin ? nutritionists : nutritionists.filter(n => n.userId === authInfo?.userId);

  // N1: mỗi phần dữ liệu được tải độc lập (Promise.allSettled): một phần lỗi không làm trống cả trang.
  // API của bác sĩ chỉ được gọi khi người dùng là Nutritionist/Admin (hội viên sẽ bị 403).
  const loadData = async () => {
    setLoading(true);
    const errors = [];
    const session = getConsultationAuthSession();
    const doctor = session?.role === 'Nutritionist' || session?.role === 'Admin';

    const [nutriResult, sessionsResult, advicesResult] = await Promise.allSettled([
      consultationApi.getNutritionists(),
      session ? consultationApi.getUserSessions(session.userId) : Promise.resolve([]),
      session ? consultationApi.getUserAdvices(session.userId) : Promise.resolve([])
    ]);

    let nutriList = [];
    if (nutriResult.status === 'fulfilled') {
      nutriList = nutriResult.value || [];
      setOfflineSample(false);
    } else if (isOfflineError(nutriResult.reason)) {
      // Chỉ khi KHÔNG kết nối được máy chủ mới hiện danh sách mẫu, và phải gắn nhãn (N7)
      nutriList = SAMPLE_NUTRITIONISTS;
      setOfflineSample(true);
    } else {
      setOfflineSample(false);
      errors.push(`Không tải được danh sách bác sĩ: ${nutriResult.reason?.message}`);
    }
    setNutritionists(nutriList);

    if (sessionsResult.status === 'fulfilled') setSessions(sessionsResult.value || []);
    else { setSessions([]); errors.push(`Không tải được lịch hẹn của bạn: ${sessionsResult.reason?.message}`); }

    if (advicesResult.status === 'fulfilled') setAdvices(advicesResult.value || []);
    else { setAdvices([]); errors.push(`Không tải được phiếu lời khuyên: ${advicesResult.reason?.message}`); }

    // Chỉ xác định hồ sơ bác sĩ khi danh sách bác sĩ lấy được từ server (danh sách mẫu không có userId thật)
    if (session && doctor && nutriResult.status === 'fulfilled') {
      const ownProfile = nutriList.find(n => n.userId === session.userId);
      const targetId = session.role === 'Admin' ? (selectedDoctorId || nutriList[0]?.id) : ownProfile?.id;
      if (!targetId) {
        setDoctorSessions([]);
        errors.push('Tài khoản bác sĩ của bạn chưa được gắn với hồ sơ bác sĩ dinh dưỡng nào.');
      } else {
        setSelectedDoctorId(targetId);
        try {
          setDoctorSessions((await consultationApi.getNutritionistSessions(targetId)) || []);
        } catch (err) {
          setDoctorSessions([]);
          errors.push(`Không tải được danh sách hội viên của bác sĩ: ${err.message}`);
        }
      }
    } else {
      setDoctorSessions([]);
    }

    setLoadErrors(errors);
    setLoading(false);
  };

  const handleDoctorChange = async (docId) => {
    setSelectedDoctorId(docId);
    try {
      const docSessions = await consultationApi.getNutritionistSessions(docId);
      setDoctorSessions(docSessions || []);
    } catch (err) {
      showToast(`Không thể tải lịch của bác sĩ: ${err.message}`, 'error');
    }
  };

  const tomorrowKey = () => new Date(Date.now() + 7 * 3600e3 + 86400000).toISOString().split('T')[0];

  const handleOpenBookModal = (nutri) => {
    setSelectedNutritionist(nutri);
    setBookingDate(tomorrowKey());
    setBookingSlot('');
    setIsBookModalOpen(true);
  };

  useEffect(() => {
    if (!isBookModalOpen || !selectedNutritionist || !bookingDate) return undefined;
    let alive = true;
    setSlotsLoading(true);
    setSlotsError('');
    setBookingSlot('');
    consultationApi
      .getAvailability(selectedNutritionist.id, bookingDate)
      .then((list) => alive && setSlots(list))
      .catch((err) => {
        if (!alive) return;
        setSlots([]);
        setSlotsError(err.network ? 'Không kết nối được máy chủ để lấy khung giờ trống.' : err.message);
      })
      .finally(() => alive && setSlotsLoading(false));
    return () => {
      alive = false;
    };
  }, [isBookModalOpen, selectedNutritionist, bookingDate]);

  const refreshAfterChange = async () => {
    await loadData();
  };

  const handleCancelSession = async (sessionId) => {
    if (!window.confirm('Bạn chắc chắn muốn hủy lịch hẹn này?')) return;
    try {
      await consultationApi.cancelSession(sessionId);
      showToast('Đã hủy lịch tư vấn.', 'success');
      await refreshAfterChange();
    } catch (err) {
      showToast(`❌ Không hủy được lịch: ${err.message}`, 'error');
    }
  };

  const handleConfirmSession = async (sessionId) => {
    try {
      await consultationApi.confirmSession(sessionId);
      showToast('Đã xác nhận lịch tư vấn.', 'success');
      await refreshAfterChange();
    } catch (err) {
      showToast(`❌ Không xác nhận được lịch: ${err.message}`, 'error');
    }
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedNutritionist) return;

    if (!bookingSlot) {
      showToast('Vui lòng chọn một khung giờ trống.', 'error');
      return;
    }
    const scheduledDateTime = bookingSlot;
    
    const authSession = getConsultationAuthSession();
    const effectiveUserId = authSession?.userId || DEMO_USER.id;

    const payload = {
      userId: effectiveUserId,
      nutritionistId: selectedNutritionist.id,
      scheduledAtUtc: scheduledDateTime,
      notes: bookingNotes || 'Tư vấn phác đồ ăn thực vật và lịch nhịn ăn 16/8'
    };

    try {
      await consultationApi.bookSession(payload);
      showToast(`🎉 Đã đặt lịch thành công với ${selectedNutritionist.fullName}!`, 'success');
      setIsBookModalOpen(false);
      setBookingNotes('');
      await loadData();
    } catch (err) {
      showToast(`❌ Lỗi đặt lịch: ${err.message}`, 'error');
    }
  };

  const handleReviewGrpc = async (userId) => {
    const targetUserId = userId || DEMO_USER.id;
    setLoadingGrpc(true);
    setGrpcError(null);
    setGrpcReviewData(null);
    setGrpcLatencyMs(null);
    setIsGrpcModalOpen(true);
    const startedAt = performance.now();
    try {
      const data = await consultationApi.reviewUserProgress(targetUserId);
      setGrpcLatencyMs(Math.round(performance.now() - startedAt));
      setGrpcReviewData(data);
    } catch (err) {
      setGrpcError(err.message || 'Không thể đồng bộ dữ liệu qua gRPC cổng 7002.');
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

    try {
      const res = await consultationApi.sendAdvice(payload);
      showToast('💌 Đã gửi phiếu lời khuyên & Bắn sự kiện RabbitMQ thành công!', 'success');
      setIsAdviceModalOpen(false);
      await loadData();
    } catch (err) {
      showToast(`❌ Lỗi gửi phiếu lời khuyên: ${err.message}`, 'error');
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
        <div className={`fixed bottom-6 right-6 z-50 text-white text-xs px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2 border animate-slide-up ${
          toastType === 'error'
            ? 'bg-rose-900 border-rose-700'
            : toastType === 'warning'
            ? 'bg-amber-900 border-amber-700'
            : 'bg-slate-900 border-slate-700'
        }`}>
          {toastType === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : toastType === 'warning' ? (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          )}
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
          {isDoctor && (
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
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DÀNH CHO HỘI VIÊN (MEMBER PORTAL) */}
      {/* ========================================================================= */}
      {/* Banner trạng thái tải dữ liệu (N1/N7): lỗi được hiển thị rõ thay vì chỉ ghi console */}
      {!loading && (loadErrors.length > 0 || offlineSample || !authInfo) && (
        <div className="space-y-2">
          {offlineSample && (
            <div role="alert" className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
              <span>
                <strong>Chế độ xem trước.</strong> Đang hiển thị danh sách chuyên gia mẫu. Bạn vui lòng đăng nhập để tiến hành đặt lịch tư vấn nhé.
              </span>
            </div>
          )}
          {!authInfo && (
            <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
              <span>Bạn chưa đăng nhập. Hãy đăng nhập để đặt lịch và xem lịch hẹn, phiếu lời khuyên của mình.</span>
            </div>
          )}
          {loadErrors.map((message, i) => (
            <div key={i} role="alert" className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start justify-between gap-2">
              <span className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
                <span>{message}</span>
              </span>
              {i === 0 && (
                <button onClick={() => loadData()} className="font-bold underline shrink-0">Thử lại</button>
              )}
            </div>
          ))}
        </div>
      )}

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
                        {nutri.avatarUrl ? (
                          <img src={nutri.avatarUrl} alt={nutri.fullName} className="w-12 h-12 rounded-2xl object-cover shadow-xs" />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-100 to-indigo-50 text-purple-700 flex items-center justify-center font-black text-base shadow-xs">
                            {nutri.fullName?.charAt(0) || 'B'}
                          </div>
                        )}
                        {nutri.isVerified && (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Đã Xác Thực
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-purple-700 transition-colors">
                          {nutri.fullName}
                        </h3>
                        <p className="text-[11px] text-purple-700 font-bold mt-0.5">
                          {nutri.certification}
                        </p>
                      </div>

                      <div className="text-xs text-slate-600 space-y-1">
                        <div className="font-medium text-slate-800">
                          <strong>Chuyên môn:</strong> {nutri.specialization}
                        </div>
                        {Array.isArray(nutri.tags) && nutri.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {nutri.tags.map((t) => (
                              <span key={t} className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-bold">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="line-clamp-2 text-slate-500 text-[11px] leading-relaxed">
                          {nutri.bio}
                        </p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-4">
                      <button
                        onClick={() => handleOpenBookModal(nutri)}
                        className="w-full py-2.5 px-4 rounded-xl bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Đặt Lịch Tư Vấn</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Lịch Hẹn Đã Đặt & Phiếu Lời Khuyên */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cột 1: Lịch Hẹn Tư Vấn Của Tôi */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">Lịch Hẹn Của Tôi</h3>
                </div>
                <span className="text-xs text-slate-400 font-bold">{sessions.length} buổi</span>
              </div>

              {sessions.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Bạn chưa có lịch hẹn tư vấn nào. Hãy chọn bác sĩ ở trên để đặt lịch!
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sessions.map(s => (
                    <div key={s.id} className="py-3 flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">
                            {s.nutritionistName || 'Bác sĩ Dinh dưỡng'}
                          </span>
                          {getStatusBadge(s.status)}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(s.scheduledAtUtc).toLocaleString('vi-VN')} ({s.durationMinutes || 45} phút)</span>
                        </div>
                        {s.notes && (
                          <p className="text-[11px] text-slate-500 italic">
                            "{s.notes}"
                          </p>
                        )}
                      </div>
                      {(s.status === 1 || s.status === 2) && (
                        <button
                          onClick={() => handleCancelSession(s.id)}
                          className="shrink-0 px-3 py-1.5 text-[11px] font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl"
                        >
                          Hủy lịch
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cột 2: Phiếu Lời Khuyên Nhận Được (Advice Notes) */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  <h3 className="font-extrabold text-slate-900 text-sm">Ghi Chú Tư Vấn</h3>
                </div>
                <span className="text-xs text-slate-400 font-bold">{advices.length} ghi chú</span>
              </div>

              {advices.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Chưa có ghi chú tư vấn nào từ chuyên gia. Ghi chú sẽ xuất hiện sau khi hoàn tất buổi tư vấn.
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
      {isDoctor && activeTab === 'nutritionist' && (
        <div className="space-y-6 animate-fade-in">
          {/* Banner Doctor Role */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Bạn đang ở chế độ <strong>Cổng Bác Sĩ Dinh Dưỡng</strong>. Tại đây bạn có thể <strong>gọi gRPC sang cổng 7002</strong> để soi tiến độ sức khỏe của hội viên và kê đơn gửi sự kiện qua <strong>RabbitMQ</strong>.
              </span>
            </div>
            {/* Doctor Picker */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-slate-700">Bác sĩ:</span>
              <select
                value={selectedDoctorId}
                onChange={(e) => handleDoctorChange(e.target.value)}
                className="bg-white border border-amber-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-purple-600"
              >
                {doctorOptions.map(n => (
                  <option key={n.id} value={n.id}>{n.fullName}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Danh Sách Bệnh Nhân Hẹn Khám */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-purple-600" />
                Danh Sách Hội Viên Chờ Khám & Đánh Giá ({doctorSessions.length})
              </h3>
              <span className="text-xs text-purple-700 font-bold bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200">
                Tích hợp gRPC Client cổng :7002
              </span>
            </div>

            {!isDoctor ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Cổng này chỉ dành cho tài khoản <strong>Bác sĩ dinh dưỡng</strong> hoặc <strong>Admin</strong>. Hãy đăng nhập bằng tài khoản phù hợp để xem hội viên và kê đơn.
              </div>
            ) : doctorSessions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                Chưa có hội viên nào đặt lịch với chuyên gia này. Hãy sang tab "Dành Cho Hội Viên" để đặt lịch thử nghiệm!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {doctorSessions.map(s => (
                  <div key={s.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-slate-900">
                          {s.userName || 'Hội viên (' + (s.userId ? s.userId.substring(0, 8) : DEMO_USER.name) + ')'}
                        </span>
                        {getStatusBadge(s.status)}
                      </div>
                      <p className="text-xs text-slate-500">
                        Thời gian hẹn: <strong>{new Date(s.scheduledAtUtc).toLocaleString('vi-VN')}</strong> • {s.durationMinutes || 45} phút
                      </p>
                      <p className="text-xs text-slate-600 italic">
                        Ghi chú: "{s.notes || 'Hội viên quan tâm đến tối ưu năng lượng và chế độ ăn Okinawa'}"
                      </p>
                    </div>

                    {/* Doctor Action Buttons */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {s.status === 1 && (
                        <button
                          onClick={() => handleConfirmSession(s.id)}
                          className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-all"
                        >
                          Xác nhận lịch
                        </button>
                      )}
                      {(s.status === 1 || s.status === 2) && (
                        <button
                          onClick={() => handleCancelSession(s.id)}
                          className="px-4 py-2 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-all"
                        >
                          Hủy lịch
                        </button>
                      )}
                      <button
                        onClick={() => handleReviewGrpc(s.userId)}
                        className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-all"
                      >
                        <Activity className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Soi Dữ Liệu Sức Khỏe (gRPC)</span>
                      </button>

                      {s.status !== 3 ? (
                        <button
                          onClick={() => handleOpenAdviceModal(s)}
                          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Kê Đơn Lời Khuyên (RabbitMQ)</span>
                        </button>
                      ) : (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã Kê Đơn
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                <label className="font-bold text-slate-700 block mb-1">Chọn ngày tư vấn (giờ Việt Nam, trong tương lai)</label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  min={tomorrowKey()}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-purple-600 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Khung giờ trống</label>
                {slotsLoading ? (
                  <p className="text-slate-500">Đang tải khung giờ...</p>
                ) : slotsError ? (
                  <p className="text-rose-700 font-semibold">{slotsError}</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((sl) => {
                      const label = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(sl.startUtc));
                      const active = bookingSlot === sl.startUtc;
                      return (
                        <button
                          key={sl.startUtc}
                          type="button"
                          disabled={!sl.isAvailable}
                          onClick={() => setBookingSlot(sl.startUtc)}
                          className={`py-2 rounded-xl border font-bold transition-all ${
                            active
                              ? 'bg-purple-600 text-white border-purple-600'
                              : sl.isAvailable
                              ? 'bg-white text-slate-700 border-slate-200 hover:border-purple-400'
                              : 'bg-slate-100 text-slate-300 border-slate-100 line-through cursor-not-allowed'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mục tiêu & Vấn đề cần tư vấn</label>
                <textarea
                  rows={3}
                  value={bookingNotes}
                  onChange={(e) => setBookingNotes(e.target.value)}
                  placeholder="Ví dụ: Tư vấn thích nghi với chế độ ăn Blue Zones, kiểm soát cơn đói khi nhịn 16/8..."
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-purple-600 font-medium resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md"
                >
                  Xác Nhận Đặt Lịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: SOI TIẾN ĐỘ SỨC KHỎE ĐỒNG BỘ gRPC (:7002) */}
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
              {grpcLatencyMs != null && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px]" title="Đo thực tế từ trình duyệt, gồm Gateway, Consultation và gRPC">
                  Phản hồi {grpcLatencyMs} ms
                </span>
              )}
            </div>

            {loadingGrpc ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Đang gọi gRPC Client sang cổng 7002 của DietFasting Service...
              </div>
            ) : grpcError ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-extrabold text-rose-900">Không thể kết nối đến DietFasting gRPC Service (:7002):</div>
                  <div>{grpcError}</div>
                  <div className="text-[11px] text-rose-700 mt-1">
                    💡 Hãy đảm bảo tiến trình <code>DietFasting.API</code> đang chạy và lắng nghe gRPC trên cổng <code>7002</code> (HTTP/2 cleartext).
                  </div>
                </div>
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
                    <div>Chế độ: <strong>{grpcReviewData.fastingSummary?.isCurrentlyFasting ? (grpcReviewData.fastingSummary?.currentFastingType || '—') : 'Không có phiên đang chạy'}</strong></div>
                    <div>Tổng phiên hoàn thành: <strong>{grpcReviewData.fastingSummary?.totalCompletedFasts ?? 0} phiên</strong></div>
                    <div>Tổng giờ nhịn tích lũy: <strong>{grpcReviewData.fastingSummary?.totalFastedHours ?? 0} giờ</strong></div>
                  </div>
                </div>

                {/* 2. Nutrition Summary */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                    <HeartPulse className="w-4 h-4 text-rose-600" />
                    Trụ Cột 2: Cân Bằng Dinh Dưỡng Trung Bình (Macros 30 Ngày)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>Nạp trung bình: <strong className="text-slate-900">{grpcReviewData.nutritionSummary?.averageCalories ?? 0} kcal/ngày</strong></div>
                    <div>Đạm thực vật (Protein): <strong>{grpcReviewData.nutritionSummary?.averageProtein ?? 0} g</strong></div>
                    <div>Tinh bột chậm (Carbs): <strong>{grpcReviewData.nutritionSummary?.averageCarbs ?? 0} g</strong></div>
                    <div>Chất béo tốt (Fat): <strong>{grpcReviewData.nutritionSummary?.averageFat ?? 0} g</strong></div>
                  </div>
                </div>

                {/* 3. FMD Status */}
                <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 text-teal-950 space-y-1">
                  <h4 className="font-extrabold text-xs text-teal-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    Trụ Cột 3: Chu Kỳ Giả Nhịn Ăn FMD 5 Ngày
                  </h4>
                  {grpcReviewData.fmdCycleStatus?.hasActiveCycle ? (
                    <>
                      <p className="text-[11px] text-teal-800">
                        Bệnh nhân đang ở <strong>Chu kỳ {grpcReviewData.fmdCycleStatus?.cycleNumber ?? 1} - Ngày {grpcReviewData.fmdCycleStatus?.currentDay ?? 1}</strong> (Trạng thái: {grpcReviewData.fmdCycleStatus?.status || 'Active'}).
                      </p>
                      <div className="text-[10px] text-teal-700 italic">
                        Định mức calo hôm nay theo giao thức FMD: tối đa {(grpcReviewData.fmdCycleStatus?.currentDay ?? 1) === 1 ? 1100 : 725} kcal.
                      </div>
                    </>
                  ) : (
                    <p className="text-[11px] text-teal-800">
                      Hiện tại hội viên chưa có chu kỳ FMD 5 ngày đang hoạt động.
                    </p>
                  )}
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
                <label className="text-xs font-bold text-slate-700 block mb-1">Tóm tắt đánh giá y khoa (Tối thiểu 5 ký tự)</label>
                <textarea
                  rows={2}
                  required
                  minLength={5}
                  maxLength={2000}
                  value={adviceSummary}
                  onChange={(e) => setAdviceSummary(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-purple-600 resize-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Khuyến nghị dinh dưỡng Blue Zones (Tối thiểu 5 ký tự)</label>
                <textarea
                  rows={2}
                  required
                  minLength={5}
                  maxLength={2000}
                  value={dietaryRec}
                  onChange={(e) => setDietaryRec(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-purple-600 resize-none font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Khuyến nghị nhịn ăn gián đoạn (IF / FMD) (Tối thiểu 5 ký tự)</label>
                <textarea
                  rows={2}
                  required
                  minLength={5}
                  maxLength={2000}
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
