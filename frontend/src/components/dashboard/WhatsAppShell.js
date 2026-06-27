import React, { Suspense } from 'react';
import {
  LayoutDashboard, Clipboard, Target, FileBarChart2, CalendarDays, Plus,
  Search, PanelLeftClose, PanelLeftOpen, ChevronRight, LogOut, CheckCircle, Brain,
} from 'lucide-react';
import { toast } from 'sonner';
import BrandLogo from '../BrandLogo';
import LanguageSelector from '../LanguageSelector';
import ThemeToggle from '../ThemeToggle';
import SectionSkeleton from '../SectionSkeleton';

// Layout presentacional del Modo Pro (WhatsApp Web): sidebar navy 30% + contenido claro 70%.
// Extraído de DashboardPage.js. Recibe todo el estado/handlers vía `ctx`.
const WhatsAppShell = ({ ctx }) => {
  const {
    t, user, logout,
    activePanel, setActivePanel, activeDataSection, setActiveDataSection,
    activePlan, trainingPlans, loadingPlans, athletes, planSections, navItems,
    proSearch, setProSearch, proSidebarCollapsed, setProSidebarCollapsed,
    setIsMasterReportOpen, setIsSessionsExportOpen, setIsCoachDrawerOpen,
    handleSetActivePlan, renderMainContent,
  } = ctx;

  const navIconCls = 'w-[18px] h-[18px] shrink-0';
  const primaryItems = [
    { key: 'panel', label: t('dashboard.nav.panel'), icon: LayoutDashboard, active: activePanel === 'panel', onClick: () => setActivePanel('panel') },
    { key: 'datos', label: t('dashboard.nav.data'), icon: Clipboard, active: activePanel === 'datos' && activeDataSection !== 'scouting', onClick: () => { setActivePanel('datos'); if (!activePlan) setActiveDataSection(null); } },
    { key: 'scouting', label: 'Scouting', icon: Target, active: activePanel === 'datos' && activeDataSection === 'scouting', onClick: () => { setActivePanel('datos'); setActiveDataSection('scouting'); } },
  ];
  const actionItems = [
    { key: 'report', label: t('dashboard.nav.report'), icon: FileBarChart2, onClick: () => setIsMasterReportOpen(true) },
    { key: 'sessions', label: t('dashboard.nav.sessions'), icon: CalendarDays, onClick: () => { if (!activePlan?.id) { toast.warning(t('data.selecciona_un_plan_activo_primero')); return; } setIsSessionsExportOpen(true); } },
  ];
  const activeNavLabel = navItems.find((n) => n.id === activeDataSection)?.label;
  const headerTitle = activePanel === 'panel'
    ? t('dashboard.controlPanel.title', { defaultValue: 'Panel de Control' })
    : activeDataSection === 'scouting'
      ? 'Recruiting & Talent ID'
      : (activeNavLabel || (activePlan ? activePlan.name : t('dashboard.nav.data', { defaultValue: 'Datos del Atleta' })));

  const q = proSearch.trim().toLowerCase();
  const match = (txt) => !q || (txt || '').toLowerCase().includes(q);
  const fPrimary = primaryItems.filter((it) => match(it.label));
  const fActions = actionItems.filter((it) => match(it.label));
  const collapsed = proSidebarCollapsed;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F0F2F5]" data-testid="whatsapp-layout">
      {/* ===== SIDEBAR (navy) ===== */}
      <aside className={`shrink-0 h-full bg-[#0A0F1E] text-white flex flex-col transition-all duration-300 ${collapsed ? 'w-[72px] min-w-[72px]' : 'w-[30%] min-w-[280px] max-w-[360px]'}`} data-testid="whatsapp-sidebar">
        {/* Brand + collapse */}
        <div className={`flex items-center h-[60px] border-b border-white/10 shrink-0 ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
          {!collapsed && (
            <div className="flex items-center gap-2 min-w-0">
              <BrandLogo variant="full" theme="light" size={32} />
            </div>
          )}
          <button
            onClick={() => setProSidebarCollapsed((v) => !v)}
            data-testid="wa-collapse-toggle"
            className="text-white/60 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors shrink-0"
            title={collapsed ? t('common.expand', { defaultValue: 'Expandir' }) : t('common.collapse', { defaultValue: 'Colapsar' })}
          >
            {collapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
          </button>
        </div>

        {!collapsed && (
          <>
            {/* Theme toggle + language */}
            <div className="px-4 py-3 border-b border-white/10 shrink-0 flex items-center gap-2">
              <ThemeToggle variant="dark" className="flex-1 justify-center" />
              <LanguageSelector variant="dark" compact />
            </div>
            {/* Search */}
            <div className="px-3 pt-3 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={proSearch}
                  onChange={(e) => setProSearch(e.target.value)}
                  placeholder={t('common.search_placeholder', { defaultValue: 'Buscar módulo o plan...' })}
                  data-testid="wa-search"
                  className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-white/35 focus:outline-none focus:border-[#CCFF00]/50 focus:bg-white/10 transition-colors"
                />
              </div>
            </div>
          </>
        )}

        {/* Nav list */}
        <nav className={`flex-1 overflow-y-auto py-3 space-y-1 scrollbar-hide ${collapsed ? 'px-2' : 'px-3'}`} data-testid="whatsapp-nav">
          {!collapsed && <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">{t('dashboard.nav.panel')}</p>}
          {fPrimary.map((it) => {
            const Icon = it.icon;
            return (
              <button
                key={it.key}
                onClick={it.onClick}
                data-testid={`wa-nav-${it.key}`}
                title={it.label}
                className={`w-full flex items-center rounded-lg text-sm font-medium transition-all duration-200 ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'} ${
                  it.active ? `bg-[#CCFF00]/10 text-[#CCFF00] ${collapsed ? 'ring-1 ring-[#CCFF00]/40' : 'border-l-4 border-[#CCFF00] pl-2'}` : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className={navIconCls} strokeWidth={it.active ? 2.4 : 1.9} />
                {!collapsed && <span className="truncate">{it.label}</span>}
              </button>
            );
          })}

          {!collapsed && <div className="h-px bg-white/10 my-3" />}
          {!collapsed && fActions.length > 0 && <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">{t('dashboard.sections.tools', { defaultValue: 'Acciones' })}</p>}
          {fActions.map((it) => {
            const Icon = it.icon;
            return (
              <button
                key={it.key}
                onClick={it.onClick}
                data-testid={`wa-action-${it.key}`}
                title={it.label}
                className={`w-full flex items-center rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 ${collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5'}`}
              >
                <Icon className={navIconCls} strokeWidth={1.9} />
                {!collapsed && <span className="truncate">{it.label}</span>}
              </button>
            );
          })}

          {/* Resultados de atletas (cuando hay búsqueda) */}
          {!collapsed && q && (() => {
            const fAthletes = athletes.filter((a) => match(a.name) || match(a.sport) || match(a.email));
            if (fAthletes.length === 0) return null;
            return (
              <div className="mt-2">
                <div className="h-px bg-white/10 my-3" />
                <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-white/40">{t('data.atletas', { defaultValue: 'Atletas' })}</p>
                <div className="space-y-1 max-h-[26vh] overflow-y-auto scrollbar-hide pr-1">
                  {fAthletes.slice(0, 12).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => { setActivePanel('datos'); setActiveDataSection('athletes'); }}
                      data-testid={`wa-athlete-${a.id}`}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/10 transition-all duration-200"
                    >
                      <span className="w-7 h-7 rounded-full bg-white/10 text-white/80 flex items-center justify-center text-[11px] font-bold shrink-0">
                        {a.name?.charAt(0)?.toUpperCase() || 'A'}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-white/85 truncate">{a.name}</span>
                        {a.sport && <span className="block text-[10px] text-white/40 truncate">{a.sport}</span>}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-white/30 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Lista de planes de entrenamiento (solo en Datos, expandido) */}
          {!collapsed && activePanel === 'datos' && activeDataSection !== 'scouting' && (
            <div className="mt-4">
              <div className="h-px bg-white/10 my-3" />
              <div className="flex items-center justify-between px-3 pb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                  {t('data.planes_de_entrenamiento', { defaultValue: 'Planes de Entrenamiento' })}
                </p>
                <button
                  onClick={() => setActiveDataSection('create-plan')}
                  data-testid="wa-create-plan"
                  className="inline-flex items-center gap-1 text-[10px] font-bold text-[#CCFF00] hover:text-white transition-colors"
                >
                  <Plus className="w-3 h-3" /> {t('data.nuevo', { defaultValue: 'Nuevo' })}
                </button>
              </div>
              {loadingPlans ? (
                <p className="px-3 py-2 text-xs text-white/40">{t('common.loading', { defaultValue: 'Cargando...' })}</p>
              ) : trainingPlans.length === 0 ? (
                <p className="px-3 py-2 text-xs text-white/40">{t('data.sin_planes', { defaultValue: 'Sin planes aún' })}</p>
              ) : (
                <div className="space-y-1 max-h-[34vh] overflow-y-auto scrollbar-hide pr-1">
                  {trainingPlans.filter((p) => match(p.name) || match(p.sport)).map((plan) => {
                    const isActive = activePlan?.id === plan.id;
                    return (
                      <button
                        key={plan.id}
                        onClick={() => handleSetActivePlan(plan)}
                        data-testid={`wa-plan-${plan.id}`}
                        className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 ${
                          isActive ? 'bg-[#CCFF00]/10 border-l-4 border-[#CCFF00] pl-2' : 'hover:bg-white/10'
                        }`}
                      >
                        <Clipboard className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#CCFF00]' : 'text-white/50'}`} strokeWidth={isActive ? 2.4 : 1.8} />
                        <span className="min-w-0 flex-1">
                          <span className={`block text-[13px] font-semibold truncate ${isActive ? 'text-[#CCFF00]' : 'text-white/85'}`}>{plan.name}</span>
                          <span className="block text-[10px] text-white/40 truncate">
                            {[plan.sport, plan.total_weeks ? `${plan.total_weeks} ${t('periodization.weeksLower', { defaultValue: 'sem' })}` : null].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Secciones del plan (solo en Datos con plan activo, expandido) */}
          {!collapsed && activePanel === 'datos' && activePlan && activeDataSection !== 'scouting' && (
            <div className="mt-4">
              <div className="h-px bg-white/10 my-3" />
              {planSections.map((section) => {
                const items = navItems.filter((n) => n.section === section.key && match(n.label));
                if (items.length === 0) return null;
                return (
                  <div key={section.key} className="mb-2">
                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-white/40 truncate">{section.title}</p>
                    {items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeDataSection === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => setActiveDataSection(item.id)}
                          data-testid={`wa-section-${item.id}`}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                            isActive ? 'bg-[#CCFF00]/10 text-[#CCFF00] border-l-4 border-[#CCFF00] pl-2' : 'text-white/70 hover:bg-white/10 hover:text-white'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" strokeWidth={isActive ? 2.4 : 1.8} />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </nav>

        {/* Footer user */}
        <div className={`py-3 border-t border-white/10 flex items-center shrink-0 ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`} data-testid="whatsapp-user">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#CCFF00] to-emerald-400 text-slate-900 flex items-center justify-center font-bold text-sm shrink-0" title={user?.name}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-white/50 truncate">{user?.email}</p>
              </div>
              <button onClick={logout} className="text-white/60 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10" data-testid="wa-logout" title={t('dashboard.nav.logout', { defaultValue: 'Salir' })}>
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ===== MAIN PANEL (light) ===== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <header className="shrink-0 flex items-center justify-between px-6 h-[60px] bg-white shadow-sm z-10" data-testid="whatsapp-header">
          <h1 className="text-base md:text-lg font-bold text-slate-900 truncate">{headerTitle}</h1>
          <div className="flex items-center gap-3">
            {activePlan && (
              <span className="hidden sm:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                <CheckCircle className="w-3.5 h-3.5" /> {activePlan?.name || t('data.plan_activo_2')}
              </span>
            )}
            <button onClick={() => setIsCoachDrawerOpen(true)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-[#CCFF00] text-xs font-semibold hover:bg-[#151b2b] transition-colors" data-testid="wa-coach-ai">
              <Brain className="w-4 h-4" /> Coach AI
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto" data-testid="whatsapp-main">
          <Suspense fallback={<SectionSkeleton />}>
            {renderMainContent()}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default WhatsAppShell;
