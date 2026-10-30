import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, BookOpen, Briefcase, Calendar, MoreHorizontal } from 'lucide-react';

interface MobileNavProps {
  onOpenMore: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenMore }) => {
  const { t } = useTranslation();

  const items = [
    { name: t('nav.dashboard'), path: '/', icon: LayoutDashboard },
    { name: t('nav.diary'), path: '/diary', icon: BookOpen },
    { name: t('nav.cases'), path: '/cases', icon: Briefcase },
    { name: t('nav.calendar'), path: '/calendar', icon: Calendar },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-1 flex items-center justify-around z-30 shadow-lg">
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) =>
            `flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium transition-colors ${
              isActive ? 'text-legal-900 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`
          }
        >
          <item.icon className="w-5 h-5 mb-0.5" />
          <span>{item.name}</span>
        </NavLink>
      ))}

      <button
        onClick={onOpenMore}
        className="flex flex-col items-center py-1.5 px-3 rounded-lg text-[10px] font-medium text-slate-500 hover:text-slate-900"
      >
        <MoreHorizontal className="w-5 h-5 mb-0.5" />
        <span>{t('common.viewAll')}</span>
      </button>
    </nav>
  );
};
