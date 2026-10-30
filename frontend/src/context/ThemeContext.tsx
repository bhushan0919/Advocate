import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import i18n from '../i18n/index.ts';
import { UserPreferences } from '../types/settings';
import { useAuth } from './AuthContext';
import { apiClient } from '../api/client.ts';

interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  isDarkMode: boolean;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  language: 'en' | 'mr';
  setLanguage: (lang: 'en' | 'mr') => Promise<void>;
  preferences: UserPreferences;
  updateLocalPreferences: (prefs: Partial<UserPreferences>) => void;
  formatDate: (date: string | Date | undefined | null) => string;
}

const defaultPreferences: UserPreferences = {
  theme: 'light',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12-hour',
  language: 'en',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateUserPreferences } = useAuth();
  const userHydratedRef = useRef<string | null>(null);

  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const savedTheme = (typeof localStorage !== 'undefined' ? localStorage.getItem('advd_theme') : null) as 'light' | 'dark' | 'system' | null;
    const savedDateFormat = (typeof localStorage !== 'undefined' ? localStorage.getItem('advd_date_format') : null) as any;
    const savedTimeFormat = (typeof localStorage !== 'undefined' ? localStorage.getItem('advd_time_format') : null) as any;
    const savedTimezone = typeof localStorage !== 'undefined' ? localStorage.getItem('advd_timezone') : null;
    const savedLang = ((typeof localStorage !== 'undefined' ? localStorage.getItem('advd_language') : null) as 'en' | 'mr') || 'en';

    if (typeof document !== 'undefined') {
      document.documentElement.lang = savedLang;
    }

    return {
      theme: savedTheme || 'light',
      timezone: savedTimezone || 'Asia/Kolkata',
      dateFormat: savedDateFormat || 'DD/MM/YYYY',
      timeFormat: savedTimeFormat || '12-hour',
      language: savedLang,
    };
  });

  // Hydrate preferences from authenticated user upon login or initial load
  useEffect(() => {
    if (user && user.id !== userHydratedRef.current) {
      userHydratedRef.current = user.id;

      if (user.preferences) {
        setPreferences((prev) => ({
          ...prev,
          ...user.preferences,
        }));

        const userLang = user.preferences.language;
        if (userLang === 'en' || userLang === 'mr') {
          if (userLang !== i18n.language) {
            i18n.changeLanguage(userLang);
          }
          localStorage.setItem('advd_language', userLang);
          if (typeof document !== 'undefined') {
            document.documentElement.lang = userLang;
          }
        }
      }
    } else if (!user) {
      userHydratedRef.current = null;
    }
  }, [user]);

  // Compute actual dark mode boolean
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (preferences.theme === 'dark') return true;
    if (preferences.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply dark class to documentElement whenever theme or system preference changes
  useEffect(() => {
    const root = document.documentElement;
    let dark = false;

    if (preferences.theme === 'dark') {
      dark = true;
    } else if (preferences.theme === 'system') {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    setIsDarkMode(dark);
    if (dark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('advd_theme', preferences.theme);
  }, [preferences.theme]);

  // Listen for system theme changes if theme is 'system'
  useEffect(() => {
    if (preferences.theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preferences.theme]);

  const setTheme = (theme: 'light' | 'dark' | 'system') => {
    setPreferences((prev) => ({ ...prev, theme }));
    localStorage.setItem('advd_theme', theme);
  };

  const setLanguage = async (lang: 'en' | 'mr'): Promise<void> => {
    if (lang !== 'en' && lang !== 'mr') return;

    // 1. Synchronously update HTML root document language attribute
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }

    // 2. Synchronously persist to browser localStorage for guests & reload persistence
    localStorage.setItem('advd_language', lang);

    // 3. Immediately update ThemeContext React state (triggers reactive re-renders across all consumers)
    setPreferences((prev) => ({ ...prev, language: lang }));

    // 4. Immediately update in-memory Auth user state to keep state consistent without reload
    updateUserPreferences({ language: lang });

    // 5. Immediately trigger i18next language switch (notifies all useTranslation hooks synchronously)
    await i18n.changeLanguage(lang);

    // 6. Asynchronously synchronize user preference to backend if authenticated
    const token = localStorage.getItem('advd_access_token');
    if (token) {
      try {
        await apiClient.patch('/settings/preferences', { language: lang });
      } catch (err) {
        console.warn('Failed to update language on server profile:', err);
      }
    }
  };

  const updateLocalPreferences = (newPrefs: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...newPrefs };
      if (updated.theme) localStorage.setItem('advd_theme', updated.theme);
      if (updated.dateFormat) localStorage.setItem('advd_date_format', updated.dateFormat);
      if (updated.timeFormat) localStorage.setItem('advd_time_format', updated.timeFormat);
      if (updated.timezone) localStorage.setItem('advd_timezone', updated.timezone);
      if (updated.language && (updated.language === 'en' || updated.language === 'mr')) {
        localStorage.setItem('advd_language', updated.language);
        if (typeof document !== 'undefined') {
          document.documentElement.lang = updated.language;
        }
        i18n.changeLanguage(updated.language);
      }
      return updated;
    });
  };

  const formatDate = (dateInput: string | Date | undefined | null): string => {
    if (!dateInput) return '-';
    try {
      const d = new Date(dateInput);
      if (isNaN(d.getTime())) return String(dateInput);

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();

      switch (preferences.dateFormat) {
        case 'MM/DD/YYYY':
          return `${month}/${day}/${year}`;
        case 'YYYY-MM-DD':
          return `${year}-${month}-${day}`;
        case 'DD/MM/YYYY':
        default:
          return `${day}/${month}/${year}`;
      }
    } catch {
      return String(dateInput);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: preferences.theme,
        isDarkMode,
        setTheme,
        language: (preferences.language as 'en' | 'mr') || 'en',
        setLanguage,
        preferences,
        updateLocalPreferences,
        formatDate,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
