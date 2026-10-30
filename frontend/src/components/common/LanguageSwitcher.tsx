import React from 'react';
import { Languages, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

interface LanguageSwitcherProps {
  variant?: 'pill' | 'dropdown' | 'compact';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'pill', className = '' }) => {
  const { i18n } = useTranslation();
  const { language, setLanguage } = useTheme();

  const currentLang: 'en' | 'mr' = (language === 'mr' || i18n.language === 'mr') ? 'mr' : 'en';

  const handleSelect = (lang: 'en' | 'mr') => {
    if (lang !== 'en' && lang !== 'mr') return;
    if (lang === currentLang) return;
    setLanguage(lang);
  };

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs ${className}`}>
        <button
          type="button"
          onClick={() => handleSelect('en')}
          className={`px-2 py-1 rounded-md font-medium transition-all ${
            currentLang === 'en'
              ? 'bg-white text-legal-800 shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="Switch to English"
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => handleSelect('mr')}
          className={`px-2 py-1 rounded-md font-medium transition-all ${
            currentLang === 'mr'
              ? 'bg-legal-700 text-white shadow-xs font-semibold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
          title="मराठीत बदला"
        >
          मराठी
        </button>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200 shadow-xs ${className}`}>
      <Languages className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
      <button
        type="button"
        onClick={() => handleSelect('en')}
        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
          currentLang === 'en'
            ? 'bg-white text-legal-900 shadow-xs font-bold border border-slate-200'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <span>English</span>
        {currentLang === 'en' && <Check className="w-3 h-3 text-legal-700" />}
      </button>
      <button
        type="button"
        onClick={() => handleSelect('mr')}
        className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all flex items-center gap-1 ${
          currentLang === 'mr'
            ? 'bg-legal-800 text-white shadow-xs font-bold'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        <span>मराठी</span>
        {currentLang === 'mr' && <Check className="w-3 h-3 text-amber-300" />}
      </button>
    </div>
  );
};

