import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Bell,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  Trash2,
  Briefcase,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { remindersApi, GetRemindersParams } from '../../api/reminders.api';
import { ReminderRecord, ReminderFormData, ReminderPriority } from '../../types/reminder';
import { ReminderModal } from './ReminderModal';
import { useTranslation } from 'react-i18next';

export const ReminderManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const isMr = i18n.language === 'mr';

  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming' | 'hearing' | 'custom' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderRecord | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Build query parameters
  const queryParams: GetRemindersParams = {
    page,
    limit,
    search: search.trim() || undefined,
    priority: priorityFilter || undefined,
    type: activeTab === 'hearing' ? 'hearing' : activeTab === 'custom' ? 'custom' : undefined,
    dueToday: activeTab === 'today' ? true : undefined,
    upcoming: activeTab === 'upcoming' ? true : undefined,
    status: activeTab === 'completed' ? 'Completed' : undefined,
  };

  const { data: remindersData, isLoading } = useQuery({
    queryKey: ['reminders-list', queryParams],
    queryFn: () => remindersApi.getReminders(queryParams),
    refetchInterval: 20000,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['reminders-list'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };

  // Create or Update mutation
  const saveMutation = useMutation({
    mutationFn: (data: ReminderFormData) => {
      if (editingReminder) {
        return remindersApi.updateReminder(editingReminder._id, data);
      }
      return remindersApi.createReminder(data);
    },
    onSuccess: () => {
      invalidateAll();
      setIsModalOpen(false);
      setEditingReminder(null);
    },
  });

  // Action mutations
  const completeMutation = useMutation({
    mutationFn: (id: string) => remindersApi.completeReminder(id),
    onSuccess: invalidateAll,
  });

  const dismissMutation = useMutation({
    mutationFn: (id: string) => remindersApi.dismissReminder(id),
    onSuccess: invalidateAll,
  });

  const snoozeMutation = useMutation({
    mutationFn: ({ id, minutes }: { id: string; minutes: number }) =>
      remindersApi.snoozeReminder(id, minutes),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remindersApi.deleteReminder(id),
    onSuccess: invalidateAll,
  });

  const handleManualScan = async () => {
    try {
      setIsScanning(true);
      const res = await remindersApi.processDueNow();
      setScanMessage(`Scanner triggered! Processed ${res.triggered} due reminder notification(s).`);
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      setTimeout(() => setScanMessage(null), 5000);
    } catch (err) {
      console.error('Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const priorityPills: Record<ReminderPriority, string> = {
    Low: 'bg-slate-100 text-slate-700 border-slate-200',
    Medium: 'bg-blue-50 text-blue-700 border-blue-200',
    High: 'bg-amber-50 text-amber-700 border-amber-200',
    Urgent: 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse',
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{t('reminders.title')}</h1>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-legal-100 text-legal-800 border border-legal-200">
              {isMr ? 'स्वयंचलित सूचना' : 'Automated Alerts'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('reminders.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleManualScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all disabled:opacity-50"
            title={isMr ? 'अलार्म तपासणी सुरू करा' : 'Scan database for due reminders right now'}
          >
            <Play className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? (isMr ? 'तपासत आहे...' : 'Scanning...') : (isMr ? 'अलार्म तपासा' : 'Scan Due Alarms')}</span>
          </button>

          <button
            onClick={() => {
              setEditingReminder(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-legal-900 text-white hover:bg-legal-800 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('reminders.newReminder')}</span>
          </button>
        </div>
      </div>

      {/* Trigger Notification Alert */}
      {scanMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 px-5 pt-3 flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: isMr ? 'सर्व स्मरणपत्रे' : 'All Reminders' },
              { id: 'today', label: isMr ? 'आजचे अलार्म' : "Today's Alarms" },
              { id: 'upcoming', label: isMr ? 'पुढील' : 'Upcoming' },
              { id: 'hearing', label: isMr ? 'सुनावणी स्मरणपत्रे' : 'Hearing Reminders' },
              { id: 'custom', label: isMr ? 'इतर स्मरणपत्रे' : 'Custom Activities' },
              { id: 'completed', label: isMr ? 'पूर्ण / रद्द' : 'Completed / Dismissed' },
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

        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={isMr ? 'स्मरणपत्रे, प्रकरणे, न्यायालये शोधा...' : 'Search reminders, cases, courts...'}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-legal-700/20"
            >
              <option value="">{isMr ? 'सर्व प्राधान्य' : 'All Priorities'}</option>
              <option value="Low">{isMr ? 'कमी' : 'Low'}</option>
              <option value="Medium">{isMr ? 'मध्यम' : 'Medium'}</option>
              <option value="High">{isMr ? 'उच्च' : 'High'}</option>
              <option value="Urgent">{isMr ? 'तातडीचे' : 'Urgent'}</option>
            </select>
          </div>
        </div>

        {/* Reminders List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">{isMr ? 'शीर्षक व तपशील' : 'Title & Details'}</th>
                <th className="py-3 px-4">{isMr ? 'प्रकार' : 'Type'}</th>
                <th className="py-3 px-4">{isMr ? 'अलार्म वेळ' : 'Alarm Time'}</th>
                <th className="py-3 px-4">{isMr ? 'नेमलेले सदस्य' : 'Assigned Member'}</th>
                <th className="py-3 px-4">{isMr ? 'प्राधान्य' : 'Priority'}</th>
                <th className="py-3 px-4">{isMr ? 'स्थिती' : 'Status'}</th>
                <th className="py-3 px-4 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="w-5 h-5 border-2 border-legal-900/20 border-t-legal-900 rounded-full animate-spin mx-auto mb-2" />
                    {isMr ? 'स्मरणपत्रे लोड होत आहेत...' : 'Loading chamber reminders...'}
                  </td>
                </tr>
              ) : !remindersData?.reminders || remindersData.reminders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 space-y-2">
                    <Bell className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-600 text-sm">{t('reminders.noReminders')}</p>
                    <p className="text-xs text-slate-400">
                      {search || priorityFilter
                        ? (isMr ? 'शोध किंवा फिल्टर्स बदलून पहा.' : 'Try clearing the search or filters.')
                        : (isMr ? 'नवीन स्मरणपत्र जोडा किंवा सुनावणी नोंदवून स्वयंचलित सूचना मिळवा.' : 'Set a new reminder or register a case hearing to schedule automated alerts.')}
                    </p>
                  </td>
                </tr>
              ) : (
                remindersData.reminders.map((rem) => {
                  const isDue =
                    new Date(rem.reminderDate).getTime() <= Date.now() && rem.status === 'Pending';

                  const caseIdStr =
                    typeof rem.caseId === 'object' ? rem.caseId?._id : rem.caseId;
                  const caseNumStr =
                    typeof rem.caseId === 'object'
                      ? rem.caseId?.caseNumber
                      : rem.caseNumber;

                  return (
                    <tr
                      key={rem._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        rem.status === 'Completed' || rem.status === 'Dismissed'
                          ? 'bg-slate-50/40 text-slate-400'
                          : isDue
                          ? 'bg-amber-50/30'
                          : ''
                      }`}
                    >
                      {/* Title & Case */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <div
                          className={`font-semibold ${
                            rem.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-900'
                          }`}
                        >
                          {rem.title}
                        </div>
                        {rem.description && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {rem.description}
                          </div>
                        )}
                        {caseIdStr && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-1">
                            <Briefcase className="w-3 h-3 text-legal-700 flex-shrink-0" />
                            <Link
                              to={`/cases/${caseIdStr}`}
                              className="text-legal-800 hover:underline font-mono truncate"
                            >
                              {caseNumStr}
                            </Link>
                          </div>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            rem.reminderType === 'hearing'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {rem.reminderType === 'hearing'
                            ? (isMr ? 'सुनावणी सूचना' : 'Court Hearing')
                            : (isMr ? 'इतर सूचना' : 'Custom Activity')}
                        </span>
                        {rem.intervalType && rem.intervalType !== 'custom' && (
                          <div className="text-[9px] text-slate-400 capitalize mt-0.5">
                            {rem.intervalType.replace(/_/g, ' ')}
                          </div>
                        )}
                      </td>

                      {/* Alarm Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div
                          className={`font-medium ${
                            isDue
                              ? 'text-rose-600 font-bold flex items-center gap-1'
                              : 'text-slate-800'
                          }`}
                        >
                          {isDue && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                          {new Date(rem.reminderDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(rem.reminderDate).toLocaleTimeString(isMr ? 'mr-IN' : 'en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Assignee */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-slate-800 font-medium">
                          {rem.assignedTo?.fullName || (isMr ? 'चेंबर सदस्य' : 'Chamber Member')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isMr ? 'नोंदवणारे' : 'Set by'} {rem.createdBy?.fullName || (isMr ? 'वकील' : 'Advocate')}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            priorityPills[rem.priority]
                          }`}
                        >
                          {isMr
                            ? rem.priority === 'Low'
                              ? 'कमी'
                              : rem.priority === 'Medium'
                              ? 'मध्यम'
                              : rem.priority === 'High'
                              ? 'उच्च'
                              : 'तातडीचे'
                            : rem.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            rem.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rem.status === 'Dismissed'
                              ? 'bg-slate-100 text-slate-400 line-through'
                              : rem.status === 'Snoozed'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : isDue
                              ? 'bg-rose-100 text-rose-800 font-bold'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}
                        >
                          {isMr
                            ? rem.status === 'Completed'
                              ? 'पूर्ण'
                              : rem.status === 'Dismissed'
                              ? 'रद्द'
                              : rem.status === 'Snoozed'
                              ? 'पुढे ढकलले'
                              : 'प्रलंबित'
                            : rem.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {rem.status === 'Pending' || rem.status === 'Snoozed' ? (
                            <>
                              <button
                                onClick={() => completeMutation.mutate(rem._id)}
                                className="p-1 rounded text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                title={isMr ? 'पूर्ण म्हणून चिन्हांकित करा' : 'Mark Complete'}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => snoozeMutation.mutate({ id: rem._id, minutes: 60 })}
                                className="p-1 rounded text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                                title={isMr ? '१ तास पुढे ढकला' : 'Snooze 1 Hour'}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => dismissMutation.mutate(rem._id)}
                                className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                title={isMr ? 'रद्द करा' : 'Dismiss'}
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          ) : null}

                          <button
                            onClick={() => {
                              if (window.confirm(isMr ? 'हे स्मरणपत्र कायमचे हटवायचे का?' : 'Delete this reminder permanently?')) {
                                deleteMutation.mutate(rem._id);
                              }
                            }}
                            className="p-1 rounded text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {remindersData?.pagination && remindersData.pagination.pages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              {isMr
                ? `पृष्ठ ${remindersData.pagination.page} पैकी ${remindersData.pagination.pages} (एकूण ${remindersData.pagination.total} स्मरणपत्रे)`
                : `Showing page ${remindersData.pagination.page} of ${remindersData.pagination.pages} (${remindersData.pagination.total} total reminders)`}
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
                disabled={page >= remindersData.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reminder Modal */}
      <ReminderModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingReminder(null);
        }}
        onSubmit={async (data) => {
          await saveMutation.mutateAsync(data);
        }}
        initialData={editingReminder}
        isSubmitting={saveMutation.isPending}
      />
    </div>
  );
};

