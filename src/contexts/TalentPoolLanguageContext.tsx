import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type TalentPoolLanguage = 'it' | 'en';

interface TalentPoolLanguageContextType {
  language: TalentPoolLanguage;
  setLanguage: (lang: TalentPoolLanguage) => void;
  t: (key: string) => string;
  /** Inline translation for strings that have no key in the locale files: tx('Save', 'Salva'). */
  tx: (en: string, it: string) => string;
}

const STORAGE_KEY = 'talentPoolLanguage';

const TalentPoolLanguageContext = createContext<TalentPoolLanguageContextType | undefined>(undefined);

export const getStoredTalentPoolLanguage = (): TalentPoolLanguage => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'it';
  } catch {
    return 'it';
  }
};

/**
 * Saves the language on the logged-in Talent Pool account, so automatic emails
 * (sent by other users, admin or companies) reach this person in their language.
 */
export const syncTalentPoolLanguageToAccount = async (lang: TalentPoolLanguage) => {
  try {
    const raw = localStorage.getItem('talentPoolUser');
    const userId = raw ? JSON.parse(raw)?.id : null;
    if (!userId) return;
    await supabase.rpc('talent_pool_set_language' as any, { p_user_id: userId, p_language: lang });
  } catch (error) {
    console.error('Error saving language preference:', error);
  }
};

export const TalentPoolLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Italian by default; English when chosen on the Talent Pool landing. Remembered across every Talent Pool page.
  const [language, setLanguageState] = useState<TalentPoolLanguage>(getStoredTalentPoolLanguage);

  const [translations, setTranslations] = useState<Record<string, any>>({});

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const module = await import(`../locales/talentpool/${language}.json`);
        setTranslations(module.default);
      } catch (error) {
        console.error('Error loading translations:', error);
      }
    };
    loadTranslations();
    document.documentElement.lang = language;
  }, [language]);

  // Keep providers on the same page (nested ones) in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setLanguageState(getStoredTalentPoolLanguage());
    };
    const onChange = () => setLanguageState(getStoredTalentPoolLanguage());
    window.addEventListener('storage', onStorage);
    window.addEventListener('talentpool-language-change', onChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('talentpool-language-change', onChange);
    };
  }, []);

  const setLanguage = (lang: TalentPoolLanguage) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // storage unavailable: keep the choice for this page only
    }
    setLanguageState(lang);
    window.dispatchEvent(new Event('talentpool-language-change'));
    syncTalentPoolLanguageToAccount(lang);
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let result: any = translations;

    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    return typeof result === 'string' ? result : key;
  };

  const tx = (en: string, it: string): string => (language === 'it' ? it : en);

  return (
    <TalentPoolLanguageContext.Provider value={{ language, setLanguage, t, tx }}>
      {children}
    </TalentPoolLanguageContext.Provider>
  );
};

export const useTalentPoolLanguage = () => {
  const context = useContext(TalentPoolLanguageContext);
  if (!context) {
    throw new Error('useTalentPoolLanguage must be used within TalentPoolLanguageProvider');
  }
  return context;
};
