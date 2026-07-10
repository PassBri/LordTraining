import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Sparkles, ArrowRight, X } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import usePlanGate from '../hooks/usePlanGate';

const PLAN_LABELS = {
  free: 'Gratis',
  starter: 'Starter',
  basic: 'Pro',
  pro: 'Club / Academia',
  enterprise: 'Institucional',
};

const PLAN_COLORS = {
  free: '#94A3B8',
  starter: '#64748B',
  basic: '#D4AF37',
  pro: '#10B981',
  enterprise: '#EF9F27',
};

/**
 * <PlanGate feature="tactical_board">
 *    <SomePremiumComponent />
 * </PlanGate>
 *
 * If user's plan doesn't include the feature, renders an overlay-locked card
 * (mode="overlay") or a lock icon with click-to-upgrade modal.
 *
 * Modes:
 *   - "overlay" (default): renders children blurred + lock CTA on top
 *   - "block": renders nothing if not allowed (use for buttons/menus)
 *   - "softblock": renders children but intercepts clicks to show modal
 */
const PlanGate = ({
  feature,
  mode = 'overlay',
  children,
  fallback = null,
  upgradeMessage,
  className = '',
}) => {
  const { allowed, requiredPlan, loading } = usePlanGate(feature);
  const [showModal, setShowModal] = useState(false);

  if (loading) return <div className={className}>{children}</div>;
  if (allowed) return <>{children}</>;

  const planLabel = PLAN_LABELS[requiredPlan] || 'superior';
  const planColor = PLAN_COLORS[requiredPlan] || '#10B981';

  const UpgradeModal = () => (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="max-w-md" data-testid="plan-gate-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" style={{ color: planColor }} />
            Función premium
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            {upgradeMessage || `Esta función está disponible a partir del plan `}
            <strong style={{ color: planColor }}>{planLabel}</strong>.
            {' '}Mejora tu suscripción para desbloquear todas sus capacidades.
          </p>
          <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: `${planColor}10`, border: `1px solid ${planColor}30` }}>
            <Lock className="w-4 h-4" style={{ color: planColor }} />
            <span className="text-xs font-medium" style={{ color: planColor }}>
              Plan requerido: {planLabel}
            </span>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={() => setShowModal(false)}
              data-testid="plan-gate-cancel"
            >
              Más tarde
            </Button>
            <Link to="/subscription" className="flex-1">
              <Button
                className="w-full text-white"
                style={{ background: planColor }}
                data-testid="plan-gate-upgrade"
              >
                Mejorar plan
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  if (mode === 'block') {
    return fallback;
  }

  if (mode === 'softblock') {
    return (
      <>
        <div
          className={className}
          onClickCapture={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowModal(true);
          }}
          style={{ cursor: 'pointer' }}
          data-testid={`plan-gate-soft-${feature}`}
        >
          {children}
        </div>
        <UpgradeModal />
      </>
    );
  }

  // overlay
  return (
    <>
      <div className={`relative ${className}`} data-testid={`plan-gate-overlay-${feature}`}>
        <div className="pointer-events-none select-none filter blur-[3px] opacity-50">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm rounded-lg">
          <button
            onClick={() => setShowModal(true)}
            className="flex flex-col items-center gap-2 px-6 py-4 rounded-xl bg-white shadow-lg border border-slate-200 hover:shadow-xl transition-all"
            data-testid={`plan-gate-cta-${feature}`}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: `${planColor}15` }}>
              <Lock className="w-5 h-5" style={{ color: planColor }} />
            </div>
            <div className="text-center">
              <p className="text-[12px] font-bold text-slate-800">Función Premium</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Plan {planLabel}</p>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: planColor }}
            >
              Desbloquear
            </span>
          </button>
        </div>
      </div>
      <UpgradeModal />
    </>
  );
};

export default PlanGate;
