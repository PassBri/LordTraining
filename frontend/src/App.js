import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GlobalContextProvider } from './context/GlobalContext';
import { Toaster } from './components/ui/sonner';

// Pages
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import AthletesPage from './pages/AthletesPage';
import PlansPage from './pages/PlansPage';
import PlansHistoryPage from './pages/PlansHistoryPage';
import CalendarPage from './pages/CalendarPage';
import ExercisesPage from './pages/ExercisesPage';
import AIGeneratorPage from './pages/AIGeneratorPage';
import SubscriptionPage from './pages/SubscriptionPage';
import SessionViewPage from './pages/SessionViewPage';
import TournamentPublicPage from './pages/TournamentPublicPage';

// Protected Route wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
};

// Public Route (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-4 border-[#007AFF] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={
        <PublicRoute>
          <AuthPage />
        </PublicRoute>
      } />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/athletes" element={
        <ProtectedRoute>
          <AthletesPage />
        </ProtectedRoute>
      } />
      <Route path="/plans" element={
        <ProtectedRoute>
          <PlansPage />
        </ProtectedRoute>
      } />
      <Route path="/calendar" element={
        <ProtectedRoute>
          <CalendarPage />
        </ProtectedRoute>
      } />
      <Route path="/exercises" element={
        <ProtectedRoute>
          <ExercisesPage />
        </ProtectedRoute>
      } />
      <Route path="/ai-generator" element={
        <ProtectedRoute>
          <AIGeneratorPage />
        </ProtectedRoute>
      } />
      <Route path="/subscription" element={
        <ProtectedRoute>
          <SubscriptionPage />
        </ProtectedRoute>
      } />
      <Route path="/tournaments" element={
        <ProtectedRoute>
          <TournamentsPage />
        </ProtectedRoute>
      } />
      <Route path="/plans-history" element={
        <ProtectedRoute>
          <PlansHistoryPage />
        </ProtectedRoute>
      } />
      
      {/* Public session view (no auth required) */}
      <Route path="/session/view/:shareId" element={<SessionViewPage />} />
      
      {/* Public tournament view (no auth required) */}
      <Route path="/tournament/:shareId" element={<TournamentPublicPage />} />
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GlobalContextProvider>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </GlobalContextProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
