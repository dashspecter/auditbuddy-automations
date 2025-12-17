import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import ro from './locales/ro.json';

// Get saved language from localStorage
const savedLanguage = localStorage.getItem('dashspect_language');

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ro: { translation: ro },
    },
    lng: savedLanguage || undefined, // Use saved language or let detector decide
    fallbackLng: 'en',
    supportedLngs: ['en', 'ro'],
    
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'dashspect_language',
      caches: ['localStorage'],
    },
    
    interpolation: {
      escapeValue: false,
    },
    
    react: {
      useSuspense: false,
    },
  });

export default i18n;
