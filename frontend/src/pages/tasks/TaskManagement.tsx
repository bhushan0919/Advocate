import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  User,
  Briefcase,
  MessageSquare,
  MoreVertical,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { tasksApi, GetTasksParams } from '../../api/tasks.api';
import { TaskRecord, TaskFormData, TaskStatus, TaskPriority } from '../../types/task';
import { TaskModal } from './TaskModal';
import { TaskDetailModal } from './TaskDetailModal';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export const TaskManagement: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isMr = i18n.language === 'mr';

  const [activeTab, setActiveTab] = useState<'all' | 'my' | 'assigned_by_me' | 'pending' | 'overdue' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [selectedTask, setSelectedTask] = useState<TaskRecord | null>(null);

  // Fetch summary metrics
  const { data: summary } = useQuery({
    queryKey: ['tasks-summary'],
    queryFn: () => tasksApi.getTaskSummary(),
    refetchInterval: 30000,
  });

  // Fetch tasks list
  const queryParams: GetTasksParams = {
    page,
    limit,
    search: search.trim() || undefined,
    view: activeTab,
    priority: priorityFilter || undefined,
  };

  const { data: tasksData, isLoading, refetch } = useQuery({
    queryKey: ['tasks-list', queryParams],
    queryFn: () => tasksApi.getTasks(queryParams),
  });

  // Mutation to create task
  const createMutation = useMutation({
    mutationFn: (data: TaskFormData) => tasksApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setIsCreateModalOpen(false);
    },
  });

  // Mutation to update task
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TaskFormData> }) =>
      tasksApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setEditingTask(null);
    },
  });

  // Mutation to quick update status
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksApi.updateTaskStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      queryClient.invalidateQueries({ queryKey: ['tasks-summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  const handleCreateSubmit = async (data: TaskFormData) => {
    if (editingTask) {
      await updateMutation.mutateAsync({ id: editingTask._id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleToggleComplete = (task: TaskRecord) => {
    const nextStatus: TaskStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
    statusMutation.mutate({ id: task._id, status: nextStatus });
  };

  const priorityPills: Record<TaskPriority, string> = {
    Low: 'bg-slate-100 text-slate-700 border-slate-200',
    Medium: 'bg-blue-50 text-blue-700 border-blue-200',
    High: 'bg-amber-50 text-amber-700 border-amber-200',
    Urgent: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const statusPills: Record<TaskStatus, string> = {
    Pending: 'bg-slate-100 text-slate-700',
    'To Do': 'bg-sky-50 text-sky-700 border border-sky-200',
    'In Progress': 'bg-amber-50 text-amber-700 border border-amber-200',
    Completed: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    Cancelled: 'bg-slate-100 text-slate-400 line-through',
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{t('tasks.title')}</h1>
            <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-legal-100 text-legal-800 border border-legal-200">
              {isMr ? 'कार्यालयीन कार्य वाटप' : 'Chamber Staff & Filing Pipeline'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('tasks.subtitle')}
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTask(null);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-legal-900 text-white hover:bg-legal-800 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t('tasks.newTask')}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">{isMr ? 'एकूण कामे' : 'Total Tasks'}</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
              <ListTodo className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">{summary?.total ?? 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">{isMr ? 'प्रलंबित / करावयाचे' : 'Pending / To Do'}</span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-sky-600 mt-2">{summary?.pending ?? 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">{isMr ? 'प्रगतीपथावर' : 'In Progress'}</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{summary?.inProgress ?? 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">{isMr ? 'पूर्ण झालेली' : 'Completed'}</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">{summary?.completed ?? 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-medium">{isMr ? 'मुदत उलटलेली' : 'Overdue'}</span>
            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-2">{summary?.overdue ?? 0}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm bg-amber-50/20">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-medium">{isMr ? 'उच्च प्राधान्य' : 'High Priority'}</span>
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">{summary?.highPriority ?? 0}</div>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 px-5 pt-3 flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'all', label: isMr ? 'सर्व कामे' : 'All Tasks' },
              { id: 'my', label: isMr ? 'माझी कामे' : 'My Tasks' },
              { id: 'assigned_by_me', label: isMr ? 'मी दिलेली कामे' : 'Assigned By Me' },
              { id: 'pending', label: isMr ? 'प्रलंबित व चालू' : 'Pending & Active' },
              { id: 'overdue', label: isMr ? 'मुदत उलटलेली' : 'Overdue' },
              { id: 'completed', label: isMr ? 'पूर्ण झालेली' : 'Completed' },
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

        {/* Search & Filters Bar */}
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
              placeholder={isMr ? 'कामे, वर्णन, प्रकरणे शोधा...' : 'Search tasks, descriptions, cases...'}
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

        {/* Tasks Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4 w-10">{isMr ? 'पूर्ण' : 'Done'}</th>
                <th className="py-3 px-4">{isMr ? 'कामाचे नाव व प्रकरण' : 'Task Title & Case'}</th>
                <th className="py-3 px-4">{isMr ? 'नेमलेली व्यक्ती' : 'Assigned To'}</th>
                <th className="py-3 px-4">{isMr ? 'अंतिम मुदत' : 'Due Date'}</th>
                <th className="py-3 px-4">{isMr ? 'प्राधान्य' : 'Priority'}</th>
                <th className="py-3 px-4">{isMr ? 'स्थिती' : 'Status'}</th>
                <th className="py-3 px-4 text-center">{isMr ? 'नोंद' : 'Log'}</th>
                <th className="py-3 px-4 text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="w-5 h-5 border-2 border-legal-900/20 border-t-legal-900 rounded-full animate-spin mx-auto mb-2" />
                    {isMr ? 'कामे लोड होत आहेत...' : 'Loading chamber tasks...'}
                  </td>
                </tr>
              ) : !tasksData?.tasks || tasksData.tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 space-y-2">
                    <CheckSquare className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-600 text-sm">{t('tasks.noTasks')}</p>
                    <p className="text-xs text-slate-400">
                      {search || priorityFilter
                        ? (isMr ? 'शोध किंवा फिल्टर्स बदलून पहा.' : 'Try clearing the search or filters.')
                        : (isMr ? 'चेंबर आणि न्यायालयीन कामांचे वाटप करण्यासाठी नवीन काम तयार करा.' : 'Create a new task to allocate chamber and court work.')}
                    </p>
                  </td>
                </tr>
              ) : (
                tasksData.tasks.map((task) => {
                  const isOverdue =
                    new Date(task.dueDate).getTime() < Date.now() &&
                    task.status !== 'Completed' &&
                    task.status !== 'Cancelled';

                  const caseIdStr =
                    typeof task.caseId === 'object' ? task.caseId?._id : task.caseId;
                  const caseNumStr =
                    typeof task.caseId === 'object'
                      ? task.caseId?.caseNumber
                      : task.caseNumber;

                  return (
                    <tr
                      key={task._id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        task.status === 'Completed' ? 'bg-slate-50/40 text-slate-500' : ''
                      }`}
                    >
                      {/* Checkbox toggle */}
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={task.status === 'Completed'}
                          onChange={() => handleToggleComplete(task)}
                          className="w-4 h-4 rounded text-legal-900 focus:ring-legal-700/20 cursor-pointer"
                        />
                      </td>

                      {/* Title & Case */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div
                          onClick={() => setSelectedTask(task)}
                          className={`font-semibold cursor-pointer hover:text-legal-900 transition-colors ${
                            task.status === 'Completed'
                              ? 'line-through text-slate-400'
                              : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </div>
                        {caseIdStr ? (
                          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500">
                            <Briefcase className="w-3 h-3 text-legal-700 flex-shrink-0" />
                            <Link
                              to={`/cases/${caseIdStr}`}
                              className="text-legal-800 hover:underline font-mono truncate"
                            >
                              {caseNumStr}
                            </Link>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 mt-0.5">{isMr ? 'चेंबर प्रशासकीय' : 'Chamber Administrative'}</div>
                        )}
                      </td>

                      {/* Assignee */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                            {task.assignedTo?.fullName?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900">
                              {task.assignedTo?.fullName || (isMr ? 'नेमलेली व्यक्ती' : 'Assignee')}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {isMr ? 'देणारे:' : 'By'} {task.createdBy?.fullName || (isMr ? 'वकील' : 'Advocate')}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div
                          className={`font-medium ${
                            isOverdue
                              ? 'text-rose-600 font-bold flex items-center gap-1'
                              : 'text-slate-700'
                          }`}
                        >
                          {isOverdue && <AlertTriangle className="w-3 h-3 text-rose-500" />}
                          {new Date(task.dueDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(task.dueDate).toLocaleTimeString(isMr ? 'mr-IN' : 'en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            priorityPills[task.priority]
                          }`}
                        >
                          {isMr
                            ? task.priority === 'Low'
                              ? 'कमी'
                              : task.priority === 'Medium'
                              ? 'मध्यम'
                              : task.priority === 'High'
                              ? 'उच्च'
                              : 'तातडीचे'
                            : task.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            statusPills[task.status]
                          }`}
                        >
                          {isMr
                            ? task.status === 'Completed'
                              ? 'पूर्ण'
                              : task.status === 'In Progress'
                              ? 'प्रगतीपथावर'
                              : task.status === 'Cancelled'
                              ? 'रद्द'
                              : task.status === 'To Do'
                              ? 'करावयाचे'
                              : 'प्रलंबित'
                            : task.status}
                        </span>
                      </td>

                      {/* Comments count */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-legal-900"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>{task.comments?.length || 0}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedTask(task)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-legal-800 hover:text-legal-900 hover:bg-slate-100 rounded-md transition-colors"
                        >
                          {isMr ? 'तपशील' : 'Details'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {tasksData?.pagination && tasksData.pagination.pages > 1 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div>
              {isMr
                ? `पृष्ठ ${tasksData.pagination.page} पैकी ${tasksData.pagination.pages} (एकूण ${tasksData.pagination.total} कामे)`
                : `Showing page ${tasksData.pagination.page} of ${tasksData.pagination.pages} (${tasksData.pagination.total} total tasks)`}
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
                disabled={page >= tasksData.pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isCreateModalOpen || editingTask !== null}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleCreateSubmit}
        initialData={editingTask}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {/* Task Detail & Comments Modal */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={() => {
          queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
          queryClient.invalidateQueries({ queryKey: ['tasks-summary'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
          // refresh selected task
          if (selectedTask) {
            tasksApi.getTask(selectedTask._id).then(setSelectedTask).catch(() => {});
          }
        }}
        onEdit={(task) => {
          setSelectedTask(null);
          setEditingTask(task);
        }}
      />
    </div>
  );
};

