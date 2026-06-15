// Compatibility layer - redirects to new i18n system
import { useI18n } from '@/i18n';

export type Language = 'it' | 'en';

// Legacy hook for backwards compatibility
export const useLanguage = () => {
  const { language, setLanguage: setLang } = useI18n();
  
  return {
    language,
    toggleLanguage: () => setLang(language === 'it' ? 'en' : 'it')
  };
};

// Re-export provider from new i18n system
export { LanguageProvider } from '@/i18n';