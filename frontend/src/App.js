import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GlobalContextProvider } from './context/GlobalContext';
import { UiModeProvider } from './context/UiModeContext';
import { Toaster } from './components/ui/sonner';
import { fetchActiveBranding, applyFavicon } from './utils/branding';
import initPageTranslator from './pageTranslator';

// Pages
import LandingPage from './pages/LandingPage';
import LegalPage from './pages/LegalPage';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import SubscriptionPage from './pages/SubscriptionPage';
import SessionViewPage from './pages/SessionViewPage';
import TournamentPublicPage from './pages/TournamentPublicPage';
import SharedPlanPage from './pages/SharedPlanPage';
import OrgTeamPage from './pages/OrgTeamPage';
import SuperAdminPage from './pages/SuperAdminPage';
import AthletePortalPublic from './pages/AthletePortalPublic';
import AthletePortalAuth from './pages/AthletePortalAuth';
import AthletePortalPanel from './pages/AthletePortalPanel';
import ThankYouPage from './pages/ThankYouPage';
import PublicScoutingProfile from './pages/PublicScoutingProfile';
import PublicShowcase from './pages/PublicShowcase';
import PublicProgress from './pages/PublicProgress';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import ApiDocsPage from './pages/ApiDocsPage';
import SupportPage from './pages/SupportPage';

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
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/docs" element={<ApiDocsPage />} />
      <Route path="/support" element={<SupportPage />} />
      <Route path="/terminos" element={<LegalPage />} />
      <Route path="/privacidad" element={<LegalPage />} />
      <Route path="/politicas" element={<LegalPage />} />
      <Route path="/terms" element={<LegalPage />} />
      <Route path="/privacy" element={<LegalPage />} />
      <Route path="/policies" element={<LegalPage />} />
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
      <Route path="/subscription" element={
        <ProtectedRoute>
          <SubscriptionPage />
        </ProtectedRoute>
      } />
      <Route path="/org/team" element={
        <ProtectedRoute>
          <OrgTeamPage />
        </ProtectedRoute>
      } />
      <Route path="/admin/super" element={
        <ProtectedRoute>
          <SuperAdminPage />
        </ProtectedRoute>
      } />
      
      {/* Public session view (no auth required) */}
      <Route path="/session/view/:shareId" element={<SessionViewPage />} />
      <Route path="/s/:shareId" element={<SessionViewPage />} />

      {/* Thank-you page after Hotmart purchase (no auth required) */}
      <Route path="/gracias" element={<ThankYouPage />} />
      
      {/* Public tournament view (no auth required) */}
      <Route path="/tournament/:shareId" element={<TournamentPublicPage />} />
      
      {/* Public shared plan view (no auth required) */}
      <Route path="/plan/shared/:shareToken" element={<SharedPlanPage />} />

      {/* Public scouting profile (no auth required) */}
      <Route path="/scouting/p/:shareId" element={<PublicScoutingProfile />} />
      <Route path="/cantera/:showcaseId" element={<PublicShowcase />} />
      <Route path="/progress/p/:shareId" element={<PublicProgress />} />
      
      {/* Athlete portal (public + athlete-auth, NOT coach auth) */}
      <Route path="/atleta/login" element={<AthletePortalAuth />} />
      <Route path="/atleta/registro" element={<AthletePortalAuth />} />
      <Route path="/atleta/panel" element={<AthletePortalPanel />} />
      <Route path="/atleta/:shareId" element={<AthletePortalPublic />} />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  React.useEffect(() => {
    fetchActiveBranding().then((b) => { if (b.favicon) applyFavicon(b.favicon); });
    initPageTranslator();
  }, []);
  return (
    <BrowserRouter>
      <AuthProvider>
        <GlobalContextProvider>
          <UiModeProvider>
            <AppRoutes />
            <Toaster position="top-right" richColors />
          </UiModeProvider>
        </GlobalContextProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
