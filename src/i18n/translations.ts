import itTranslations from '../locales/it.json';
import enTranslations from '../locales/en.json';

export type Language = 'it' | 'en';

export interface Translations {
  [key: string]: any;
}

export const translations: Record<Language, Translations> = {
  it: itTranslations,
  en: enTranslations,
};

// Helper function to get nested translation value
export function getNestedTranslation(obj: any, path: string): string {
  const keys = path.split('.');
  let result = obj;
  
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = result[key];
    } else {
      return '';
    }
  }
  
  return typeof result === 'string' ? result : '';
}

// Helper function to replace placeholders in translations
export function replacePlaceholders(text: string, params?: Record<string, any>): string {
  if (!params) return text;
  
  let result = text;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  });
  
  return result;
}