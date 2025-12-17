import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SupportedLanguage = 'en' | 'ro';

const STORAGE_KEY = 'dashspect_language';

export const useLanguage = () => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const currentLanguage = i18n.language as SupportedLanguage;

  // Sync language from database on mount (when user is authenticated)
  useEffect(() => {
    const syncFromDatabase = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        const dbLang = (profile as any)?.preferred_language;
        if (dbLang && dbLang !== currentLanguage) {
          i18n.changeLanguage(dbLang);
          localStorage.setItem(STORAGE_KEY, dbLang);
        }
      } catch (error) {
        console.log('Could not sync language from database:', error);
      }
    };

    syncFromDatabase();
  }, [user, i18n, currentLanguage]);

  const changeLanguage = useCallback(async (lang: SupportedLanguage) => {
    setIsLoading(true);
    
    try {
      // Update i18n immediately for instant feedback
      await i18n.changeLanguage(lang);
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, lang);
      
      // Sync to database if user is authenticated
      if (user) {
        await supabase
          .from('profiles')
          .update({ preferred_language: lang } as any)
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsLoading(false);
    }
  }, [i18n, user]);

  return {
    currentLanguage,
    changeLanguage,
    isLoading,
    languages: [
      { code: 'en' as SupportedLanguage, label: 'English', flag: '🇬🇧' },
      { code: 'ro' as SupportedLanguage, label: 'Română', flag: '🇷🇴' },
    ],
  };
};
