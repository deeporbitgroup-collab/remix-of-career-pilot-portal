import React, { createContext, useContext, useState, useEffect } from "react";

export type TalentPoolLanguage = 'it' | 'en';

interface TalentPoolLanguageContextType {
  language: TalentPoolLanguage;
  setLanguage: (lang: TalentPoolLanguage) => void;
  t: (key: string) => string;
}

const TalentPoolLanguageContext = createContext<TalentPoolLanguageContextType | undefined>(undefined);

export const TalentPoolLanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Talent Pool is English-only across the whole product.
  const [language] = useState<TalentPoolLanguage>('en');

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
  }, [language]);

  // English-only: kept for API compatibility, but language never changes.
  const setLanguage = (_lang: TalentPoolLanguage) => {};

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

  return (
    <TalentPoolLanguageContext.Provider value={{ language, setLanguage, t }}>
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
