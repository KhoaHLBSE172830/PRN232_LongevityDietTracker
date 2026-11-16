import React, { useState, useEffect } from 'react';
import LandingPage from './shared/pages/LandingPage';
import OverviewDashboard from './shared/pages/OverviewDashboard';
import Sidebar from './shared/components/Sidebar';
import Navbar from './shared/components/Navbar';
import Toast from './shared/components/Toast';
import AuthModal from './features/auth/AuthModal';
import { setCurrentUser, clearCurrentUser, hasStoredUser } from './shared/services/userStore';

// Features
import MealsView from './features/meals/MealsView';
import FastingView from './features/fasting/FastingView';
import FmdView from './features/fmd/FmdView';
import ConsultationView from './features/consultation/ConsultationView';
import ProfileView from './features/auth/ProfileView';
import AdminDashboard from './features/admin/AdminDashboard';
import FmdRulesAdmin from './features/admin/FmdRulesAdmin';
import MealTemplatesAdmin from './features/admin/MealTemplatesAdmin';
import UsersRolesAdmin from './features/admin/UsersRolesAdmin';
import NotifyAdmin from './features/admin/NotifyAdmin';
import { currentRole, portalFor, defaultTab, canAccessTab, roleLabel } from './app/roles';
import DoctorOverview from './features/doctor/DoctorOverview';
import DoctorSchedule from './features/doctor/DoctorSchedule';
import DoctorPatients from './features/doctor/DoctorPatients';
import DoctorAdvice from './features/doctor/DoctorAdvice';
import { DoctorProvider } from './features/doctor/DoctorData';
import { ADMIN_MENU, DOCTOR_MENU } from './app/menus';

export default function App() {
  // 'landing' (Trang chủ công khai giới thiệu) | 'dashboard' (Không gian làm việc bên trong)
  const [viewMode, setViewMode] = useState(() => (hasStoredUser() ? 'dashboard' : 'landing'));
  const [activeTab, setActiveTab] = useState(() => defaultTab(currentRole())); // hội viên: overview | meals | fasting | fmd | consultation | profile; admin: admin-*
  const [isAddMealModalOpen, setIsAddMealModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [patientFocus, setPatientFocus] = useState(null); // mã hội viên được mở từ trang Lịch hẹn của chuyên gia
  const [toast, setToast] = useState(null);

  // Trạng thái thu gọn Sidebar (Lưu vào localStorage để duy trì trạng thái)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('longevity_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('longevity_sidebar_collapsed', String(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const showToast = (toastObj) => {
    setToast(toastObj);
  };

  const closeToast = () => {
    setToast(null);
  };

  const handleLoginSuccess = (user, { demo = false } = {}) => {
    setCurrentUser(user);
    setViewMode('dashboard');
    setActiveTab(defaultTab(currentRole()));
    showToast({
      type: 'success',
      title: demo ? 'Đã vào chế độ demo' : 'Đăng nhập thành công',
      message: demo
        ? 'Máy chủ xác thực chưa sẵn sàng nên dữ liệu hiển thị là dữ liệu minh họa.'
        : `Chào mừng ${user.name} trở lại với Longevity Diet Tracker!`,
    });
  };

  const handleLogout = () => {
    clearCurrentUser();
    setViewMode('landing');
  };

  // Token hết hạn/không hợp lệ (401) => quay về trang chủ và mở form đăng nhập.
  useEffect(() => {
    const onUnauthorized = () => {
      clearCurrentUser();
      setViewMode('landing');
      setIsAuthModalOpen(true);
    };
    window.addEventListener('auth:unauthorized', onUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized);
  }, []);

  const role = currentRole();
  const portal = portalFor(role);
  // Tab không thuộc portal của role hiện tại (vd. vừa đổi tài khoản) thì quay về tab mặc định.
  const tab = canAccessTab(role, activeTab) ? activeTab : defaultTab(role);

  // 1. GIAO DIỆN TRANG CHỦ CÔNG KHAI (LANDING PAGE)
  if (viewMode === 'landing') {
    return (
      <>
        <LandingPage
          onGoToDashboard={() => setViewMode('dashboard')}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={handleLoginSuccess}
        />

        <Toast toast={toast} onClose={closeToast} />
      </>
    );
  }

  // 2. GIAO DIỆN BẢNG ĐIỀU KHIỂN BÊN TRONG (APP DASHBOARD)
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Sidebar bên trái */}
      <Sidebar
        activeTab={tab}
        onSelectTab={setActiveTab}
        menuItems={portal === 'admin' ? ADMIN_MENU : portal === 'doctor' ? DOCTOR_MENU : null}
        portalTitle={portal === 'admin' ? 'Khu vực quản trị' : portal === 'doctor' ? 'Cổng chuyên gia' : 'Không gian sức khỏe'}
        portalSubtitle={portal === 'admin' ? 'Cấu hình và giám sát hệ thống' : portal === 'doctor' ? 'Lịch hẹn và hồ sơ bệnh nhân' : 'Quản lý và theo dõi hằng ngày'}
        roleLabel={role !== 'User' ? roleLabel(role) : null}
        onBackToLanding={() => setViewMode('landing')}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
      />

      {/* Vùng nội dung chính (tự động co giãn theo sidebar) */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        <Navbar
          onOpenAddMeal={() => {
            setActiveTab('meals');
            setIsAddMealModalOpen(true);
          }}
          portal={portal}
          roleLabel={roleLabel(role)}
          onBackToLanding={() => setViewMode('landing')}
          onLogout={handleLogout}
          onNavigate={setActiveTab}
          onToggleCollapse={handleToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {portal === 'doctor' && (
            <DoctorProvider>
              {tab === 'doctor-overview' && <DoctorOverview onNavigate={setActiveTab} />}
              {tab === 'doctor-schedule' && (
                <DoctorSchedule
                  onOpenPatient={(session) => {
                    setPatientFocus(session.userId);
                    setActiveTab('doctor-patients');
                  }}
                />
              )}
              {tab === 'doctor-patients' && <DoctorPatients initialUserId={patientFocus} />}
              {tab === 'doctor-advice' && <DoctorAdvice />}
            </DoctorProvider>
          )}

          {portal === 'admin' && (
            <>
              {tab === 'admin-overview' && <AdminDashboard onNavigate={setActiveTab} />}
              {tab === 'admin-fmd' && <FmdRulesAdmin />}
              {tab === 'admin-templates' && <MealTemplatesAdmin />}
              {tab === 'admin-users' && <UsersRolesAdmin />}
              {tab === 'admin-notify' && <NotifyAdmin />}
            </>
          )}

          {portal === 'user' && tab === 'overview' && (
            <OverviewDashboard
              onNavigate={setActiveTab}
              onOpenAddMeal={() => {
                setActiveTab('meals');
                setIsAddMealModalOpen(true);
              }}
            />
          )}

          {portal === 'user' && tab === 'meals' && (
            <MealsView
              isAddModalOpen={isAddMealModalOpen}
              onOpenAddModal={() => setIsAddMealModalOpen(true)}
              onCloseAddModal={() => setIsAddMealModalOpen(false)}
              showToast={showToast}
            />
          )}

          {portal === 'user' && tab === 'fasting' && <FastingView />}

          {portal === 'user' && tab === 'fmd' && <FmdView />}

          {portal === 'user' && tab === 'consultation' && <ConsultationView />}

          {portal === 'user' && tab === 'profile' && <ProfileView />}
        </main>
      </div>

      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
