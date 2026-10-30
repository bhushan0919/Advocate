import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Calendar as CalendarIcon,
  AlertTriangle,
  BookOpen,
  Plus,
  ArrowRight,
  ShieldCheck,
  Building,
  UserCheck,
  Bell,
  CheckSquare,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext';
import { dashboardApi } from '../../api/dashboard.api';

export const Dashboard: React.FC = () => {
  const { user, workspace } = useAuth();
  const { language } = useTheme();
  const { t } = useTranslation();

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats(),
    refetchInterval: 20000,
  });

  const metrics = dashboardData?.metrics || {
    activeCases: 0,
    hearingsToday: 0,
    upcomingHearingsWeek: 0,
    tasksDueToday: 0,
    overdueTasks: 0,
    remindersToday: 0,
    pendingTasksAssignedToMe: 0,
    unreadNotifications: 0,
  };

  const stats = [
    {
      label: t('dashboard.stats.activeCases'),
      value: metrics.activeCases,
      icon: Briefcase,
      color: 'text-legal-900',
      bg: 'bg-legal-50',
      path: '/cases',
    },
    {
      label: t('dashboard.stats.todayHearings'),
      value: metrics.hearingsToday,
      icon: BookOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      path: '/diary',
    },
    {
      label: t('dashboard.stats.upcomingHearings'),
      value: metrics.upcomingHearingsWeek,
      icon: CalendarIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      path: '/calendar',
    },
    {
      label: t('dashboard.stats.pendingTasks'),
      value: metrics.tasksDueToday,
      icon: CheckSquare,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      path: '/tasks',
    },
    {
      label: t('dashboard.stats.overdueTasks'),
      value: metrics.overdueTasks,
      icon: AlertTriangle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      path: '/tasks',
    },
    {
      label: t('reminders.title'),
      value: metrics.remindersToday,
      icon: Bell,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      path: '/reminders',
    },
  ];

  const quickActions = [
    { label: t('dashboard.viewDiary'), path: '/diary', icon: BookOpen, primary: true },
    { label: t('dashboard.addCase'), path: '/cases', icon: Plus, primary: false },
    { label: t('tasks.newTask'), path: '/tasks', icon: Plus, primary: false },
    { label: t('dashboard.scheduleReminder'), path: '/reminders', icon: Bell, primary: false },
    { label: t('staff.title'), path: '/staff', icon: UserCheck, primary: false },
  ];

  return (
    <div className="space-y-6">
      {/* Top Welcome & Chamber Status Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              {t('dashboard.welcomeBack')}, {user?.fullName}
            </h1>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-legal-100 text-legal-800 border border-legal-200">
              {workspace?.role === 'clerk' ? t('nav.clerkRole') : t('nav.advocateRole')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <Building className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {t('nav.activeChamber')}: <strong>{workspace?.name}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Isolated
            </span>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {quickActions.map((action) => (
            <Link
              key={action.path + action.label}
              to={action.path}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                action.primary
                  ? 'bg-legal-900 text-white hover:bg-legal-800 shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <action.icon className="w-3.5 h-3.5" />
              <span>{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            to={stat.path}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all group block"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 group-hover:text-slate-800">
                {stat.label}
              </span>
              <div className={`p-1.5 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-2">
              {isLoading ? '...' : stat.value}
            </div>
          </Link>
        ))}
      </div>

      {/* Main Sections: Today's Hearings & Chamber Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Court Diary Preview */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-legal-800" />
              <h2 className="text-sm font-bold text-slate-900">{t('dashboard.todayDiaryTitle')}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                {dashboardData?.hearingsToday?.length || 0} {t('diary.scheduledHearings')}
              </span>
            </div>
            <Link
              to="/diary"
              className="text-xs font-semibold text-legal-800 hover:text-legal-900 flex items-center gap-1"
            >
              <span>{t('dashboard.viewDiary')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4">{t('cases.courtName')}</th>
                  <th className="py-2.5 px-4">{t('cases.caseNumber')}</th>
                  <th className="py-2.5 px-4">{t('cases.client')}</th>
                  <th className="py-2.5 px-4">{t('diary.purpose')}</th>
                  <th className="py-2.5 px-4 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : !dashboardData?.hearingsToday || dashboardData.hearingsToday.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 space-y-1">
                      <BookOpen className="w-7 h-7 text-slate-300 mx-auto mb-1" />
                      <p className="font-semibold text-slate-600 text-xs">
                        {t('dashboard.noHearingsToday')}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {t('dashboard.tagline')}
                      </p>
                    </td>
                  </tr>
                ) : (
                  dashboardData.hearingsToday.map((h) => (
                    <tr key={h._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{h.courtName}</div>
                        <div className="text-[10px] text-slate-500">
                          {h.courtRoomNumber ? `${t('diary.room')} ${h.courtRoomNumber}` : ''}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-legal-900">
                        <Link to={`/cases/${h._id}`} className="hover:underline">
                          {h.caseNumber}
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900">{h.clientName}</div>
                        <div className="text-[10px] text-slate-500">vs. {h.opponentName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium text-[11px]">
                          {h.nextHearingPurpose || t('hearings.businessTransacted')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          to={`/cases/${h._id}`}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-legal-900 font-semibold text-[11px] inline-flex items-center gap-1"
                        >
                          <span>{t('common.view')}</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Today's Reminders & Tasks Due Today */}
        <div className="space-y-6">
          {/* Today's Reminders Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900">{t('reminders.title')}</h2>
              </div>
              <Link to="/reminders" className="text-xs font-semibold text-legal-800 hover:underline">
                {t('common.viewAll')}
              </Link>
            </div>

            <div className="space-y-2">
              {!dashboardData?.todayReminders || dashboardData.todayReminders.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <Bell className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                  {t('reminders.noReminders')}
                </div>
              ) : (
                dashboardData.todayReminders.slice(0, 4).map((rem) => (
                  <div
                    key={rem._id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 truncate">{rem.title}</span>
                      <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        {rem.priority}
                      </span>
                    </div>
                    {rem.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1">{rem.description}</p>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span>{rem.reminderType === 'hearing' ? t('reminders.hearingAlert') : t('reminders.customAlert')}</span>
                      <span>
                        {new Date(rem.reminderDate).toLocaleTimeString(language === 'mr' ? 'mr-IN' : 'en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Overdue & Tasks Due Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-legal-800" />
                <h2 className="text-sm font-bold text-slate-900">{t('tasks.title')}</h2>
              </div>
              <Link to="/tasks" className="text-xs font-semibold text-legal-800 hover:underline">
                {t('common.viewAll')}
              </Link>
            </div>

            <div className="space-y-2">
              {dashboardData?.overdueTasks && dashboardData.overdueTasks.length > 0 ? (
                dashboardData.overdueTasks.slice(0, 3).map((task) => (
                  <div
                    key={task._id}
                    className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-rose-900 truncate">{task.title}</span>
                      <span className="text-[10px] font-bold text-rose-700 uppercase bg-rose-100 px-1.5 py-0.5 rounded">
                        {t('common.overdue')}
                      </span>
                    </div>
                    <div className="text-[10px] text-rose-600">
                      {t('tasks.assignedTo')}: {task.assignedTo?.fullName || t('nav.clerkRole')}
                    </div>
                  </div>
                ))
              ) : dashboardData?.tasksDueToday && dashboardData.tasksDueToday.length > 0 ? (
                dashboardData.tasksDueToday.slice(0, 3).map((task) => (
                  <div
                    key={task._id}
                    className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 truncate">{task.title}</span>
                      <span className="text-[10px] font-bold text-slate-700 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                        {t('common.today')}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {t('tasks.assignedTo')}: {task.assignedTo?.fullName || t('nav.clerkRole')}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  <CheckSquare className="w-5 h-5 text-slate-300 mx-auto mb-1" />
                  {t('dashboard.noPendingTasks')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
