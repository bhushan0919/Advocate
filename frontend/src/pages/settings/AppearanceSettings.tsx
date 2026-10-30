import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sun, Moon, Laptop, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { settingsApi } from '../../api/settings.api';

export const AppearanceSettings: React.FC = () => {
  const { theme, setTheme, isDarkMode } = useTheme();
  const queryClient = useQueryClient();
  const [successToast, setSuccessToast] = useState(false);

  const updatePrefMutation = useMutation({
    mutationFn: (newTheme: 'light' | 'dark' | 'system') =>
      settingsApi.updatePreferences({ theme: newTheme }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-preferences'] });
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
    },
  });

  const handleSelectTheme = (selectedTheme: 'light' | 'dark' | 'system') => {
    setTheme(selectedTheme);
    updatePrefMutation.mutate(selectedTheme);
  };

  const themes = [
    {
      id: 'light',
      title: 'Courtroom Light',
      description: 'Crisp high-contrast daylight theme tailored for daytime hearing sessions and printing.',
      icon: Sun,
      previewBg: 'bg-slate-50',
      previewCard: 'bg-white border-slate-200 text-slate-800',
      previewHeader: 'bg-white border-slate-200',
      previewAccent: 'bg-legal-900',
    },
    {
      id: 'dark',
      title: 'Midnight Docket',
      description: 'Deep navy & charcoal palette reducing eye strain during late-night case preparation.',
      icon: Moon,
      previewBg: 'bg-slate-900',
      previewCard: 'bg-slate-800 border-slate-700 text-slate-200',
      previewHeader: 'bg-slate-900 border-slate-800',
      previewAccent: 'bg-blue-500',
    },
    {
      id: 'system',
      title: 'System Automatic',
      description: 'Automatically switches to match your operating system day and night schedule.',
      icon: Laptop,
      previewBg: 'bg-gradient-to-r from-slate-100 to-slate-900',
      previewCard: 'bg-white/80 backdrop-blur border-slate-300 text-slate-800',
      previewHeader: 'bg-white/90 border-slate-200',
      previewAccent: 'bg-legal-800',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-semibold text-slate-900">Appearance & Visual Theme</h3>
          {successToast && (
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Theme preference saved
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-6">
          Customize your AdvD digital diary interface to suit your lighting environment.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {themes.map((t) => {
            const isSelected = theme === t.id;
            const Icon = t.icon;

            return (
              <div
                key={t.id}
                onClick={() => handleSelectTheme(t.id as any)}
                className={`group cursor-pointer rounded-2xl border-2 transition-all overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'border-legal-900 shadow-md ring-2 ring-legal-900/10'
                    : 'border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                {/* Visual UI Preview Box */}
                <div className={`p-4 h-36 ${t.previewBg} flex flex-col gap-2 relative overflow-hidden select-none`}>
                  {/* Mock App Bar */}
                  <div className={`h-6 rounded-md border ${t.previewHeader} flex items-center justify-between px-2 shadow-xs`}>
                    <div className="w-10 h-2 bg-slate-300 rounded-full"></div>
                    <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                  </div>

                  {/* Mock Cards */}
                  <div className="flex gap-2 flex-1">
                    <div className="w-1/3 rounded-md bg-slate-200/50 p-1 flex flex-col gap-1">
                      <div className="w-full h-1.5 bg-slate-300 rounded"></div>
                      <div className="w-3/4 h-1.5 bg-slate-300 rounded"></div>
                    </div>
                    <div className={`flex-1 rounded-md border p-2 flex flex-col justify-between shadow-xs ${t.previewCard}`}>
                      <div className="space-y-1">
                        <div className="w-12 h-2 rounded bg-current opacity-80"></div>
                        <div className="w-20 h-1.5 rounded bg-current opacity-40"></div>
                      </div>
                      <div className={`w-8 h-2 rounded ${t.previewAccent}`}></div>
                    </div>
                  </div>

                  {/* Radio Indicator */}
                  <div className="absolute top-3 right-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'border-legal-900 bg-legal-900 text-white'
                          : 'border-slate-400 bg-white/80'
                      }`}
                    >
                      {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                    </div>
                  </div>
                </div>

                {/* Text Content */}
                <div className="p-4 bg-white flex-1 flex flex-col justify-between border-t border-slate-100">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-legal-700" />
                      <span className="text-sm font-semibold text-slate-900">{t.title}</span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">{t.description}</p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      {isSelected ? 'Active Theme' : 'Click to Apply'}
                    </span>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Active Status Note */}
        <div className="mt-8 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>
            Current mode:{' '}
            <strong className="text-slate-900 capitalize">{theme}</strong> (Rendering as{' '}
            <strong className="text-legal-900">{isDarkMode ? 'Dark Navy' : 'Light'}</strong>)
          </span>
          <span className="text-slate-400">Immediate CSS toggle enabled</span>
        </div>
      </div>
    </div>
  );
};

