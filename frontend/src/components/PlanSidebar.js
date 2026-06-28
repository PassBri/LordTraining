import React, { useState } from 'react';
import { Plus, RefreshCw, Copy, Share2, Trash2, Clipboard, Loader2, Printer, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { PlanBadge } from './PlanIconPicker';
import { resolvePlanBadge } from '../lib/planIcons';

const PlanSidebar = ({
  trainingPlans,
  loadingPlans,
  activePlan,
  onSelectPlan,
  onDuplicatePlan,
  onSharePlan,
  onDeletePlan,
  onExportPDF,
  onRefresh,
  onCreatePlan,
  getSportName,
  t
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const filteredPlans = searchQuery
    ? trainingPlans.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.sport && p.sport.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : trainingPlans;

  if (isCollapsed) {
    return (
      <div className="w-[52px] border-r border-slate-200 bg-white flex flex-col shrink-0 h-full" data-testid="plans-sidebar-collapsed">
        <div className="flex flex-col items-center py-3 gap-2">
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center hover:bg-slate-800 transition-colors"
            title={t('dashboard.plans.expandPanel')}
          >
            <ChevronRight className="w-4 h-4 text-[#CCFF00]" />
          </button>
          <div className="w-px h-4 bg-slate-200" />
          <button
            onClick={onCreatePlan}
            className="w-9 h-9 bg-[#007AFF] rounded-lg flex items-center justify-center hover:bg-[#0066dd] transition-colors"
            title={t('dashboard.plans.newPlan')}
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col items-center py-2 gap-1">
          {trainingPlans.map((plan) => {
            const isActive = activePlan?.id === plan.id;
            const badge = resolvePlanBadge(plan, getSportName ? getSportName(plan.sport) : '');
            return (
              <button
                key={plan.id}
                onClick={() => onSelectPlan(plan)}
                className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                  isActive ? 'ring-2 ring-[#007AFF] ring-offset-1' : 'opacity-80 hover:opacity-100'
                }`}
                title={plan.name}
                data-testid={`sidebar-collapsed-plan-${plan.id}`}
              >
                <PlanBadge icon={badge.icon} color={badge.color} size={36} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[272px] border-r border-slate-200 bg-white flex flex-col shrink-0 h-full" data-testid="plans-sidebar">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-900 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clipboard className="w-4 h-4 text-[#CCFF00]" />
            <h2 className="text-[13px] font-semibold text-white">{t('dashboard.plans.title')}</h2>
            {trainingPlans.length > 0 && (
              <span className="px-1.5 py-0.5 bg-white/15 text-white/80 text-[10px] font-medium rounded-full">
                {trainingPlans.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title={t('dashboard.plans.refresh')}
              data-testid="sidebar-refresh-btn"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title={t('dashboard.plans.collapse')}
              data-testid="sidebar-collapse-btn"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Create + Search */}
      <div className="p-3 border-b border-slate-100 shrink-0 space-y-2">
        <Button
          onClick={onCreatePlan}
          className="w-full bg-[#007AFF] hover:bg-[#0066dd] text-white text-xs h-9 rounded-lg shadow-sm"
          data-testid="sidebar-create-plan-btn"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {t('dashboard.plans.newPlan')}
        </Button>
        {trainingPlans.length > 3 && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('dashboard.plans.searchPlan')}
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#007AFF] focus:border-[#007AFF] text-slate-700 placeholder:text-slate-400"
              data-testid="sidebar-search-input"
            />
          </div>
        )}
      </div>

      {/* Plans List */}
      <div className="flex-1 overflow-y-auto" data-testid="sidebar-plans-list">
        {loadingPlans ? (
          <div className="flex flex-col items-center justify-center h-32 p-4">
            <Loader2 className="w-5 h-5 animate-spin text-slate-300 mb-2" />
            <p className="text-[11px] text-slate-400">{t('dashboard.plans.loading')}</p>
          </div>
        ) : filteredPlans.length > 0 ? (
          <div className="py-1">
            {filteredPlans.map((plan) => {
              const isActive = activePlan?.id === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`group px-3 py-2.5 cursor-pointer transition-all ${
                    isActive
                      ? 'bg-blue-50/80 border-l-[3px] border-l-[#007AFF]'
                      : 'border-l-[3px] border-l-transparent hover:bg-slate-50'
                  }`}
                  onClick={() => onSelectPlan(plan)}
                  data-testid={`sidebar-plan-${plan.id}`}
                >
                  <div className="flex items-start justify-between gap-1">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    {(() => { const b = resolvePlanBadge(plan, getSportName ? getSportName(plan.sport) : ''); return <PlanBadge icon={b.icon} color={b.color} size={34} className="mt-0.5" />; })()}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className={`text-[13px] font-medium truncate leading-tight ${isActive ? 'text-[#007AFF]' : 'text-slate-700'}`}>
                          {plan.name}
                        </h4>
                        {isActive && (
                          <Badge className="bg-[#007AFF] text-white text-[8px] px-1 py-0 h-3.5 shrink-0 rounded">
                            {t('dashboard.plans.active')}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-slate-400 truncate max-w-[80px]">{plan.sport ? (getSportName ? getSportName(plan.sport) : t('catalog.sport_'+plan.sport,{defaultValue:plan.sport})) : t('dashboard.plans.sportGeneral')}</span>
                        <span className="text-slate-200 text-[8px]">|</span>
                        <span className="text-[10px] text-slate-400">{plan.total_weeks} {t('dashboard.plans.weeksShort')}</span>
                        <span className="text-slate-200 text-[8px]">|</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[70px]">{plan.model_name || t('models.'+(plan.model||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_').replace(/^_+|_+$/g,'').toLowerCase(),{defaultValue:plan.model})}</span>
                      </div>
                    </div>
                  </div>
                    {/* Hover actions */}
                    <div className="flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -mr-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); onDuplicatePlan(plan.id); }}
                        className="p-1 rounded text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title={t('dashboard.plans.duplicate')}
                        data-testid={`sidebar-dup-${plan.id}`}
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onSharePlan(plan.id); }}
                        className="p-1 rounded text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title={t('dashboard.plans.share')}
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onExportPDF(plan.id); }}
                        className="p-1 rounded text-slate-300 hover:text-violet-600 hover:bg-violet-50 transition-colors"
                        title={t('dashboard.plans.print')}
                      >
                        <Printer className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeletePlan(plan.id); }}
                        className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title={t('dashboard.plans.delete')}
                        data-testid={`sidebar-del-${plan.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : searchQuery ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <Search className="w-8 h-8 text-slate-200 mb-2" />
            <p className="text-[11px] text-slate-400">{t('dashboard.plans.noResultsFor')} "{searchQuery}"</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center h-48">
            <Clipboard className="w-10 h-10 text-slate-200 mb-3" />
            <p className="text-xs font-medium text-slate-500 mb-1">{t('dashboard.plans.noPlans')}</p>
            <p className="text-[10px] text-slate-400 mb-3">{t('dashboard.plans.noPlansDesc')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlanSidebar;
