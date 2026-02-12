import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import TopContextBar from './TopContextBar';
import { 
  LayoutDashboard, Users, Calendar, Dumbbell, BarChart3, Settings, 
  LogOut, Menu, X, ChevronRight, Sparkles, FileText, CreditCard, History
} from 'lucide-react';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/plans', label: 'Planes', icon: FileText },
  { path: '/plans-history', label: 'Historial', icon: History },
  { path: '/calendar', label: 'Calendario', icon: Calendar },
  { path: '/exercises', label: 'Ejercicios', icon: Dumbbell },
  { path: '/ai-generator', label: 'Generar con IA', icon: Sparkles },
  { path: '/subscription', label: 'Suscripción', icon: CreditCard },
];

const DashboardLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* TOP CONTEXT BAR - Fixed at very top, above everything */}
      <TopContextBar />

      {/* Mobile menu toggle */}
      <button 
        className="menu-toggle top-context-offset"
        onClick={() => setSidebarOpen(true)}
        data-testid="sidebar-toggle"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay */}
      <div 
        className={`overlay ${sidebarOpen ? 'visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar - offset by context bar height */}
      <aside className={`sidebar sidebar-with-context ${sidebarOpen ? 'open' : ''}`}>
        <div className="p-6 border-b border-slate-200">
          <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
            <div>
              <div className="font-bold text-xl tracking-tight">
                <span className="text-gray-800">Tr</span>
                <span className="text-blue-600">AI</span>
                <span className="text-gray-800">n</span>
              </div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Pro System</div>
            </div>
          </Link>
        </div>

        <nav className="py-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
              data-testid={`nav-${item.path.slice(1)}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
              {isActive(item.path) && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 bg-[#007AFF] text-white flex items-center justify-center rounded-full font-bold" style={{ fontFamily: 'Barlow Condensed' }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-900 truncate">{user?.name}</div>
              <div className="text-xs text-slate-500 uppercase tracking-wide">
                {user?.subscription || 'Free'}
              </div>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-slate-600 hover:text-slate-900"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main content - offset by context bar height */}
      <main className="main-content main-with-context">
        <div className="p-4 md:p-8 lg:p-12">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
