import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  BookOpen,
  Briefcase,
  Users,
  Calendar,
  History,
  FileText,
  CheckSquare,
  BarChart3,
  UserCheck,
  Settings,
  Scale,
  ShieldCheck,
  Bell,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { workspace } = useAuth();
  const { t } = useTranslation();

  const navItems = [
    { name: t('nav.dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('nav.diary'), path: '/diary', icon: BookOpen, badge: 'Core' },
    { name: t('nav.cases'), path: '/cases', icon: Briefcase },
    { name: t('nav.clients'), path: '/clients', icon: Users },
    { name: t('nav.calendar'), path: '/calendar', icon: Calendar },
    { name: t('nav.hearings'), path: '/hearings', icon: History },
    { name: t('nav.tasks'), path: '/tasks', icon: CheckSquare },
    { name: t('nav.reminders'), path: '/reminders', icon: Bell },
    { name: t('nav.documents'), path: '/documents', icon: FileText },
    { name: t('nav.reports'), path: '/reports', icon: BarChart3 },
    { name: t('nav.staff'), path: '/staff', icon: UserCheck },
    { name: t('nav.settings'), path: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-legal-900 text-white flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-6 flex items-center border-b border-legal-800/80 gap-3">
          <div className="w-9 h-9 rounded-lg bg-legal-700/60 border border-legal-600 flex items-center justify-center text-amber-300">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="text-lg font-bold tracking-tight flex items-center gap-1.5">
              <span>AdvD</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-legal-800 text-legal-300 border border-legal-700 font-semibold">
                SaaS
              </span>
            </div>
            <div className="text-[11px] text-legal-300 tracking-tight">{t('common.appTagline')}</div>
          </div>
        </div>

        {/* Current Workspace Pill */}
        <div className="p-3 mx-3 my-3 rounded-lg bg-legal-950/60 border border-legal-800/80">
          <div className="text-[10px] uppercase font-bold tracking-wider text-legal-400 flex items-center justify-between">
            <span>{t('nav.activeChamber')}</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <ShieldCheck className="w-3 h-3" />
              Isolated
            </span>
          </div>
          <div className="text-sm font-semibold truncate text-white mt-1">
            {workspace?.name || 'Chambers Workspace'}
          </div>
          <div className="text-[11px] text-legal-400 capitalize mt-0.5">
            {workspace?.role === 'clerk' ? t('nav.clerkRole') : t('nav.advocateRole')}
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-legal-700/80 text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-legal-800 hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4 text-legal-300" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-legal-800 text-amber-300 border border-legal-700">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-legal-800 text-[11px] text-legal-400 flex flex-col gap-1">
          <div className="font-medium text-slate-300">AdvD Legal Court Diary</div>
          <div className="text-slate-400">Maharashtra & India Chambers</div>
        </div>
      </aside>
    </>
  );
};
