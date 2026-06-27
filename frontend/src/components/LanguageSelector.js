import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const LANGUAGES = [
  { code: 'es', label: 'Espanol', flag: 'ES' },
  { code: 'en', label: 'English', flag: 'EN' },
  { code: 'pt', label: 'Portugues', flag: 'PT' },
  { code: 'fr', label: 'Francais', flag: 'FR' },
  { code: 'de', label: 'Deutsch', flag: 'DE' },
  { code: 'ar', label: 'العربية', flag: 'AR' },
  { code: 'hi', label: 'हिन्दी', flag: 'HI' },
  { code: 'id', label: 'Indonesia', flag: 'ID' },
  { code: 'ja', label: '日本語', flag: 'JA' },
  { code: 'ko', label: '한국어', flag: 'KO' },
  { code: 'ru', label: 'Русский', flag: 'RU' },
  { code: 'zh', label: '中文', flag: 'ZH' },
];

export const LanguageSelector = ({ variant = 'light', compact = false, fabStyle = false }) => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];
  const isDark = variant === 'dark';

  const handleChange = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref} data-testid="language-selector">
      {fabStyle ? (
        <button
          onClick={() => setOpen(!open)}
          className="group flex flex-col items-center gap-1 shrink-0 outline-none"
          data-testid="language-selector-trigger"
        >
          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ease-out ${
            open
              ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30'
              : 'bg-white text-slate-500 shadow-md border border-slate-100 hover:shadow-lg'
          }`}>
            <Globe className={`w-[18px] h-[18px] transition-transform duration-300 ${open ? 'text-white' : 'group-hover:text-teal-500'}`} strokeWidth={open ? 2.5 : 1.8} />
          </div>
          <span className={`text-[8px] font-bold tracking-wide leading-tight text-center transition-colors duration-300 ${
            open ? 'text-teal-600' : 'text-slate-400 group-hover:text-teal-500'
          }`}>
            {currentLang.code.toUpperCase()}
          </span>
        </button>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
            isDark
              ? 'text-slate-300 hover:text-white hover:bg-white/10'
              : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
          }`}
          data-testid="language-selector-trigger"
        >
          <Globe className="w-3.5 h-3.5" />
          {!compact && <span>{currentLang.flag}</span>}
        </button>
      )}

      {open && (
        <div
          className={`absolute top-full mt-1 rounded-xl border shadow-xl z-[100] min-w-[160px] py-1 ${
            isDark
              ? 'bg-slate-800 border-slate-700'
              : 'bg-white border-slate-200'
          }`}
          style={{ [document.documentElement.dir === 'rtl' ? 'left' : 'right']: 0 }}
          data-testid="language-selector-dropdown"
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors ${
                i18n.language === lang.code
                  ? isDark ? 'bg-white/10 text-white font-semibold' : 'bg-slate-50 text-slate-900 font-semibold'
                  : isDark ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-50'
              }`}
              data-testid={`lang-option-${lang.code}`}
            >
              <span className={`text-[10px] font-bold uppercase w-5 text-center ${
                isDark ? 'text-slate-500' : 'text-slate-400'
              }`}>{lang.flag}</span>
              <span>{lang.label}</span>
              {i18n.language === lang.code && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#007AFF]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
