import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Calendar,
  CheckSquare,
  Clock,
  CheckCheck,
  Trash2,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { notificationsApi, GetNotificationsParams } from '../../api/notifications.api';
import { NotificationRecord, NotificationType } from '../../types/notification';

export const NotificationCenter: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isMr = i18n.language === 'mr';
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'hearings' | 'tasks' | 'reminders'>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const queryParams: GetNotificationsParams = {
    page,
    limit,
    unreadOnly: activeTab === 'unread' ? true : undefined,
    type:
      activeTab === 'hearings'
        ? 'upcoming_hearing,hearing_rescheduled,hearing_cancelled'
        : activeTab === 'tasks'
        ? 'task_assigned,task_deadline,task_overdue'
        : activeTab === 'reminders'
        ? 'reminder_alert'
        : undefined,
  };

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications-list', queryParams],
    queryFn: () => notificationsApi.getNotifications(queryParams),
    refetchInterval: 15000,
  });

  const invalidateNotifications = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: invalidateNotifications,
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: invalidateNotifications,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.deleteNotification(id),
    onSuccess: invalidateNotifications,
  });

  const handleNotificationClick = (item: NotificationRecord) => {
    if (!item.isRead) {
      markReadMutation.mutate(item._id);
    }
    const targetUrl = item.actionUrl || item.link;
    if (targetUrl) {
      navigate(targetUrl);
    }
  };

  const getIconForType = (type: NotificationType) => {
    switch (type) {
      case 'upcoming_hearing':
      case 'hearing_rescheduled':
      case 'hearing_cancelled':
        return <Calendar className="w-5 h-5 text-purple-600" />;
      case 'task_assigned':
      case 'task_deadline':
      case 'task_overdue':
        return <CheckSquare className="w-5 h-5 text-blue-600" />;
      case 'reminder_alert':
        return <Bell className="w-5 h-5 text-amber-600" />;
      default:
        return <Info className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{isMr ? 'सूचना केंद्र' : 'Notification Center'}</h1>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-legal-100 text-legal-800 border border-legal-200">
              {isMr ? 'थेट सूचना' : 'Live Feed'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isMr ? 'प्रणाली सूचना, सुनावणी वेळापत्रक, कामांचे वाटप व दिनदर्शिका अद्यतने.' : 'System alerts, hearing schedules, task assignments, and calendar updates.'}
          </p>
        </div>

        <button
          onClick={() => markAllReadMutation.mutate()}
          disabled={markAllReadMutation.isPending}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors disabled:opacity-50"
        >
          <CheckCheck className="w-4 h-4 text-emerald-600" />
          <span>{isMr ? 'सर्व वाचलेले म्हणून खूण करा' : 'Mark All as Read'}</span>
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 px-5 pt-3 flex flex-wrap items-center gap-2 bg-slate-50/40">
          {(
            [
              { id: 'all', label: isMr ? 'सर्व सूचना' : 'All Alerts' },
              { id: 'unread', label: isMr ? 'न वाचलेले' : 'Unread' },
              { id: 'hearings', label: isMr ? 'न्यायालयीन सुनावणी' : 'Court Hearings' },
              { id: 'tasks', label: isMr ? 'कार्यालयीन कामे' : 'Tasks & Filings' },
              { id: 'reminders', label: isMr ? 'स्मरणपत्रे' : 'Reminders' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-legal-900 text-legal-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications Feed */}
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="w-5 h-5 border-2 border-legal-900/20 border-t-legal-900 rounded-full animate-spin mx-auto mb-2" />
              {isMr ? 'सूचना लोड होत आहेत...' : 'Loading chamber alerts...'}
            </div>
          ) : !notificationsData?.notifications || notificationsData.notifications.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <Bell className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600 text-sm">{isMr ? 'कोणतीही सूचना आढळली नाही' : 'No notifications found'}</p>
              <p className="text-xs text-slate-400">
                {isMr ? 'आपल्या न्यायालयीन कामकाज व चेंबर कामांच्या सर्व सूचना अद्ययावत आहेत.' : 'You are all caught up with your court proceedings and chamber tasks.'}
              </p>
            </div>
          ) : (
            notificationsData.notifications.map((n) => {
              const targetUrl = n.actionUrl || n.link;

              return (
                <div
                  key={n._id}
                  className={`p-4 transition-colors flex items-start gap-3.5 ${
                    n.isRead ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/80 hover:bg-slate-100/70'
                  }`}
                >
                  {/* Type Icon Container */}
                  <div
                    onClick={() => handleNotificationClick(n)}
                    className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-xs cursor-pointer flex-shrink-0"
                  >
                    {getIconForType(n.type)}
                  </div>

                  {/* Body */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        onClick={() => handleNotificationClick(n)}
                        className={`text-xs font-bold cursor-pointer hover:underline truncate ${
                          n.isRead ? 'text-slate-800' : 'text-legal-950 font-extrabold'
                        }`}
                      >
                        {n.title}
                      </span>

                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" title="Unread" />
                      )}

                      <span className="text-[10px] uppercase font-bold text-slate-400 ml-auto whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })}{' '}
                        •{' '}
                        {new Date(n.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p
                      onClick={() => handleNotificationClick(n)}
                      className="text-xs text-slate-600 mt-1 cursor-pointer leading-relaxed"
                    >
                      {n.message}
                    </p>

                    {/* Action link if available */}
                    {targetUrl && (
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          onClick={() => handleNotificationClick(n)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-legal-800 hover:text-legal-900 bg-legal-50/80 hover:bg-legal-100/80 px-2 py-0.5 rounded-md border border-legal-200"
                        >
                          <span>Open Record</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.isRead && (
                      <button
                        onClick={() => markReadMutation.mutate(n._id)}
                        className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded transition-colors"
                        title="Mark as Read"
                      >
                        <CheckCheck className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => deleteMutation.mutate(n._id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Bar */}
        {notificationsData?.pagination && notificationsData.pagination.pages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/30">
            <div>
              {isMr
                ? `पृष्ठ ${notificationsData.pagination.page} पैकी ${notificationsData.pagination.pages}`
                : `Showing page ${notificationsData.pagination.page} of ${notificationsData.pagination.pages}`}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                {t('common.previous')}
              </button>
              <button
                disabled={page >= notificationsData.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

