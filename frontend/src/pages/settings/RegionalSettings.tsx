import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Globe, Calendar, Clock, Languages, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { settingsApi } from '../../api/settings.api';
import { useTheme } from '../../context/ThemeContext';
import { UserPreferences } from '../../types/settings';

export const RegionalSettings: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { preferences, updateLocalPreferences, setLanguage } = useTheme();

  const [formData, setFormData] = useState<Partial<UserPreferences>>({
    timezone: preferences.timezone || 'Asia/Kolkata',
    dateFormat: preferences.dateFormat || 'DD/MM/YYYY',
    timeFormat: preferences.timeFormat || '12-hour',
    language: preferences.language || 'en',
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const { data: serverPrefs } = useQuery({
    queryKey: ['settings-preferences'],
    queryFn: async () => {
      const data = await settingsApi.getPreferences();
      setFormData(data);
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<UserPreferences>) => settingsApi.updatePreferences(data),
    onSuccess: (saved) => {
      updateLocalPreferences(saved);
      if (saved.language && (saved.language === 'en' || saved.language === 'mr')) {
        setLanguage(saved.language);
      }
      setFeedback({ type: 'success', message: t('settings.language.savedSuccess') });
      queryClient.invalidateQueries({ queryKey: ['settings-preferences'] });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || t('common.somethingWentWrong');
      setFeedback({ type: 'error', message: msg });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    updateMutation.mutate(formData);
  };

  const today = new Date();
  const getSampleFormattedDate = (format: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD') => {
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    if (format === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
    if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-sm font-medium">{feedback.message}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-1">
          {t('settings.regional.title')}
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          {t('settings.regional.description')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Language */}
          <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <label className="block text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Languages className="w-4 h-4 text-legal-800" />
              {t('settings.language.select')}
            </label>
            <p className="text-xs text-slate-500 mb-3">
              {t('settings.language.description')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  formData.language === 'en'
                    ? 'border-legal-800 bg-white shadow-xs text-legal-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="language"
                  value="en"
                  checked={formData.language === 'en'}
                  onChange={() => setFormData({ ...formData, language: 'en' })}
                  className="w-4 h-4 text-legal-700 focus:ring-legal-500"
                />
                <div>
                  <div className="text-sm font-medium">English</div>
                  <div className="text-[11px] text-slate-400 font-normal">Official Court Standard</div>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  formData.language === 'mr'
                    ? 'border-legal-800 bg-white shadow-xs text-legal-900 font-bold'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="language"
                  value="mr"
                  checked={formData.language === 'mr'}
                  onChange={() => setFormData({ ...formData, language: 'mr' })}
                  className="w-4 h-4 text-legal-700 focus:ring-legal-500"
                />
                <div>
                  <div className="text-sm font-medium">मराठी (Marathi)</div>
                  <div className="text-[11px] text-slate-400 font-normal">देवनागरी न्यायालयीन मानक</div>
                </div>
              </label>
            </div>
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-legal-700" />
              {t('settings.regional.timezone')}
            </label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 bg-white"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST - UTC+05:30) [Standard India]</option>
              <option value="UTC">UTC (Universal Coordinated Time)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST - UTC+04:00)</option>
              <option value="Asia/Singapore">Asia/Singapore (SGT - UTC+08:00)</option>
              <option value="Europe/London">Europe/London (GMT/BST - UTC+00:00)</option>
              <option value="America/New_York">America/New_York (EST/EDT - UTC-05:00)</option>
            </select>
          </div>

          {/* Date Format */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-legal-700" />
              {t('settings.regional.dateFormat')}
            </label>
            <select
              value={formData.dateFormat}
              onChange={(e) =>
                setFormData({ ...formData, dateFormat: e.target.value as any })
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 bg-white"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (Indian Standard: {getSampleFormattedDate('DD/MM/YYYY')})</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (US Format: {getSampleFormattedDate('MM/DD/YYYY')})</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Format: {getSampleFormattedDate('YYYY-MM-DD')})</option>
            </select>
            <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
              <span>{t('settings.regional.preview')}:</span>
              <strong className="font-mono text-legal-900 font-bold">
                {getSampleFormattedDate((formData.dateFormat as any) || 'DD/MM/YYYY')}
              </strong>
            </div>
          </div>

          {/* Time Format */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-legal-700" />
              {t('settings.regional.timeFormat')}
            </label>
            <select
              value={formData.timeFormat}
              onChange={(e) =>
                setFormData({ ...formData, timeFormat: e.target.value as any })
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 bg-white"
            >
              <option value="12-hour">12-Hour Format (e.g. 10:30 AM)</option>
              <option value="24-hour">24-Hour Military Format (e.g. 10:30 / 14:30)</option>
            </select>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-5 py-2.5 rounded-lg bg-legal-800 hover:bg-legal-900 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{updateMutation.isPending ? t('common.saving') : t('common.save')}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
