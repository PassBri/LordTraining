import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'lordtraining_theme'; // values: 'classic' | 'whatsapp'
const UiModeContext = createContext({ uiMode: 'classic', toggleUiMode: () => {}, setUiMode: () => {} });

export const UiModeProvider = ({ children }) => {
  const [uiMode, setUiModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved === 'whatsapp' ? 'whatsapp' : 'classic';
    } catch {
      return 'classic';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, uiMode);
      document.documentElement.setAttribute('data-ui-mode', uiMode);
    } catch {
      /* ignore */
    }
  }, [uiMode]);

  const setUiMode = useCallback((mode) => {
    setUiModeState(mode === 'whatsapp' ? 'whatsapp' : 'classic');
  }, []);

  const toggleUiMode = useCallback(() => {
    setUiModeState((prev) => (prev === 'whatsapp' ? 'classic' : 'whatsapp'));
  }, []);

  return (
    <UiModeContext.Provider value={{ uiMode, toggleUiMode, setUiMode }}>
      {children}
    </UiModeContext.Provider>
  );
};

export const useUiMode = () => useContext(UiModeContext);

export default UiModeContext;
