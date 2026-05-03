import { useEffect, useState, useCallback } from 'react';
import { getPlanFeatures } from '../services/api';

/**
 * usePlanGate(featureKey?)
 *
 * Returns the user's plan-feature snapshot (cached for 60s in module scope).
 *  - allowed:        boolean (only meaningful when featureKey passed)
 *  - requiredPlan:   minimum plan name required for that feature
 *  - features:       full features map { feature_key: bool }
 *  - limits:         { athletes, plans, ai_generations, pdf_exports }
 *  - usage:          { athletes, plans, ai_generations }
 *  - plan:           current user plan ("free" | "starter" | "basic" | "pro" | "enterprise")
 *  - refresh():      force re-fetch
 */

let _cache = { data: null, ts: 0 };
const CACHE_MS = 60_000;

export const usePlanGate = (featureKey) => {
  const [data, setData] = useState(_cache.data);
  const [loading, setLoading] = useState(!_cache.data);

  const load = useCallback(async (force = false) => {
    const fresh = !force && _cache.data && (Date.now() - _cache.ts < CACHE_MS);
    if (fresh) { setData(_cache.data); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await getPlanFeatures();
      _cache = { data: res.data, ts: Date.now() };
      setData(res.data);
    } catch (e) {
      // Fail-open: if endpoint fails, treat as free plan
      const fallback = { plan: 'free', features: {}, feature_min_plan: {}, limits: {}, usage: {} };
      _cache = { data: fallback, ts: Date.now() };
      setData(fallback);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const allowed = featureKey ? Boolean(data?.features?.[featureKey]) : true;
  const requiredPlan = featureKey ? data?.feature_min_plan?.[featureKey] : null;

  return {
    allowed,
    requiredPlan,
    plan: data?.plan,
    planRank: data?.plan_rank ?? 0,
    features: data?.features || {},
    limits: data?.limits || {},
    usage: data?.usage || {},
    loading,
    refresh: () => load(true),
  };
};

export default usePlanGate;
