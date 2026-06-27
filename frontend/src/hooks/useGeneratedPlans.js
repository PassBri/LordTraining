import { useState, useEffect } from 'react';

/**
 * useGeneratedPlans()
 *
 * Maneja la lista de planes generados por el Coach AI, persistida en localStorage.
 */
export const useGeneratedPlans = () => {
  const [generatedPlans, setGeneratedPlans] = useState([]);

  useEffect(() => {
    const savedPlans = localStorage.getItem('train_generated_plans');
    if (savedPlans) {
      setGeneratedPlans(JSON.parse(savedPlans));
    }
  }, []);

  const saveGeneratedPlan = (plan) => {
    const newPlan = {
      id: Date.now().toString(),
      ...plan,
      createdAt: new Date().toISOString()
    };
    const updatedPlans = [newPlan, ...generatedPlans];
    setGeneratedPlans(updatedPlans);
    localStorage.setItem('train_generated_plans', JSON.stringify(updatedPlans));
    return newPlan;
  };

  const deletePlan = (planId) => {
    const updatedPlans = generatedPlans.filter(p => p.id !== planId);
    setGeneratedPlans(updatedPlans);
    localStorage.setItem('train_generated_plans', JSON.stringify(updatedPlans));
  };

  return { generatedPlans, setGeneratedPlans, saveGeneratedPlan, deletePlan };
};

export default useGeneratedPlans;
