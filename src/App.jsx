import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Onboarding from './components/Onboarding';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/Confirm';
import { LoginModalProvider } from './components/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Dashboard from './pages/Dashboard';
import Manage from './pages/Manage';
import Reset from './pages/Reset';
import Community from './pages/Community';
import MyPage from './pages/MyPage';
import Achievements from './pages/Achievements';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function AppContent() {
  const { profile, loading } = useAuth();

  useEffect(() => {
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  // Show onboarding only for logged-in users who haven't completed it
  const onboardingDone = profile?.onboarding_done || localStorage.getItem('onboarding_done') === 'true';
  if (!loading && profile && !onboardingDone) {
    return <Onboarding onComplete={() => window.location.reload()} />;
  }

  return (
    <DataProvider>
    <ConfirmProvider>
    <LoginModalProvider>
      <BrowserRouter>
        <div className="app">
          <a href="#main-content" className="sr-only">본문으로 건너뛰기</a>
          <main id="main-content" className="app-content">
            <ErrorBoundary>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/manage" element={<Manage />} />
              <Route path="/rest" element={<Reset />} />
              <Route path="/community" element={<Community />} />
              <Route path="/mypage" element={<MyPage />} />
              <Route path="/achievements" element={<Achievements />} />
            </Routes>
            </ErrorBoundary>
          </main>
          <BottomNav />
        </div>
      </BrowserRouter>
    </LoginModalProvider>
    </ConfirmProvider>
    </DataProvider>
  );
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
