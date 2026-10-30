import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  KeyRound,
  Building2,
  Palette,
  Globe,
  ShieldCheck,
  Smartphone,
  Database,
} from 'lucide-react';

export interface SettingsTabItem {
  id: string;
  nameKey: string;
  descKey: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SETTINGS_TABS: SettingsTabItem[] = [
  {
    id: 'profile',
    nameKey: 'settings.tabs.profile',
    descKey: 'settings.profile.title',
    icon: User,
  },
  {
    id: 'account',
    nameKey: 'settings.tabs.account',
    descKey: 'settings.account.title',
    icon: KeyRound,
  },
  {
    id: 'workspace',
    nameKey: 'settings.tabs.workspace',
    descKey: 'settings.tabs.workspace',
    icon: Building2,
  },
  {
    id: 'appearance',
    nameKey: 'settings.tabs.appearance',
    descKey: 'settings.appearance.title',
    icon: Palette,
  },
  {
    id: 'regional',
    nameKey: 'settings.tabs.regional',
    descKey: 'settings.regional.title',
    icon: Globe,
  },
  {
    id: 'security',
    nameKey: 'settings.tabs.security',
    descKey: 'settings.tabs.security',
    icon: ShieldCheck,
  },
  {
    id: 'sessions',
    nameKey: 'settings.tabs.sessions',
    descKey: 'settings.tabs.sessions',
    icon: Smartphone,
  },
  {
    id: 'privacy',
    nameKey: 'settings.tabs.dataPrivacy',
    descKey: 'settings.tabs.dataPrivacy',
    icon: Database,
  },
];

interface SettingsLayoutProps {
  activeTab: string;
  onSelectTab: (tabId: string) => void;
  children: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  activeTab,
  onSelectTab,
  children,
}) => {
  const { t } = useTranslation();
  const currentTab = SETTINGS_TABS.find((t) => t.id === activeTab) || SETTINGS_TABS[0];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t('settings.title')}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Main Grid: Responsive Nav Tabs Sidebar (Desktop) / Horizontal Tabs (Mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <nav className="p-2 space-y-1">
            {SETTINGS_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left ${
                    isActive
                      ? 'bg-legal-800 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-amber-300' : 'text-slate-400'
                    }`}
                  />
                  <div className="flex-1 truncate">
                    <div>{t(tab.nameKey)}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content Pane */}
        <div className="lg:col-span-3">
          {children}
        </div>
      </div>
    </div>
  );
};
