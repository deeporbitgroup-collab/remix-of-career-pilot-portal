// Central export for i18n
export { LanguageProvider, useI18n, type Language } from './LanguageProvider';
export { translations } from './translations';

// Helper function for direct translation access (for non-component code)
import { translations, getNestedTranslation, replacePlaceholders, Language } from './translations';

export function t(key: string, language: Language = 'it', params?: Record<string, any>): string {
  const translation = getNestedTranslation(translations[language], key);
  
  if (!translation) {
    console.error(`[i18n] Missing translation key: ${key} for language: ${language}`);
    return `[${key}]`;
  }
  
  return replacePlaceholders(translation, params);
}