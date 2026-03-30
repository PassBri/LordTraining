import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';
import id from './locales/id.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ru from './locales/ru.json';
import zh from './locales/zh.json';

const RTL_LANGUAGES = ['ar'];

const updateDocumentDirection = (lng) => {
  const dir = RTL_LANGUAGES.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', lng);
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      pt: { translation: pt },
      ar: { translation: ar },
      hi: { translation: hi },
      id: { translation: id },
      fr: { translation: fr },
      de: { translation: de },
      ja: { translation: ja },
      ko: { translation: ko },
      ru: { translation: ru },
      zh: { translation: zh },
    },
    fallbackLng: 'es',
    supportedLngs: ['en', 'es', 'pt', 'ar', 'hi', 'id', 'fr', 'de', 'ja', 'ko', 'ru', 'zh'],
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'train_language',
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

updateDocumentDirection(i18n.language);
i18n.on('languageChanged', updateDocumentDirection);

export { RTL_LANGUAGES };
export default i18n;
