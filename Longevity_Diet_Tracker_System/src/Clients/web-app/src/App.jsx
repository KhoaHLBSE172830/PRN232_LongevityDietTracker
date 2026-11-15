import React, { useState } from 'react';
import LandingPage from './shared/pages/LandingPage';
import OverviewDashboard from './shared/pages/OverviewDashboard';
import Sidebar from './shared/components/Sidebar';
import Navbar from './shared/components/Navbar';
import Toast from './shared/components/Toast';
import AuthModal from './features/auth/AuthModal';

// Features
import MealsView from './features/meals/MealsView';
import FastingView from './features/fasting/FastingView';
import FmdView from './features/fmd/FmdView';
import ConsultationView from './features/consultation/ConsultationView';
import ProfileView from './features/auth/ProfileView';

export default function App() {
  // 'landing' (Trang chủ công khai giới thiệu) | 'dashboard' (Không gian làm việc bên trong)
  const [viewMode, setViewMode] = useState('landing');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'meals' | 'fasting' | 'fmd' | 'consultation' | 'profile'
  const [isAddMealModalOpen, setIsAddMealModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
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

  const handleLoginSuccess = (user) => {
    setViewMode('dashboard');
    showToast({
      type: 'success',
      title: 'Đăng nhập thành công',
      message: `Chào mừng ${user.name} trở lại với Longevity Diet Tracker!`,
    });
  };

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
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onBackToLanding={() => setViewMode('landing')}
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
          onBackToLanding={() => setViewMode('landing')}
          onToggleCollapse={handleToggleSidebar}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {activeTab === 'overview' && (
            <OverviewDashboard
              onNavigate={setActiveTab}
              onOpenAddMeal={() => {
                setActiveTab('meals');
                setIsAddMealModalOpen(true);
              }}
            />
          )}

          {activeTab === 'meals' && (
            <MealsView
              isAddModalOpen={isAddMealModalOpen}
              onOpenAddModal={() => setIsAddMealModalOpen(true)}
              onCloseAddModal={() => setIsAddMealModalOpen(false)}
              showToast={showToast}
            />
          )}

          {activeTab === 'fasting' && <FastingView />}

          {activeTab === 'fmd' && <FmdView />}

          {activeTab === 'consultation' && <ConsultationView />}

          {activeTab === 'profile' && <ProfileView />}
        </main>
      </div>

      <Toast toast={toast} onClose={closeToast} />
    </div>
  );
}
