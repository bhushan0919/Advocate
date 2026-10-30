import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  FileText,
  Download,
  Calendar,
  Briefcase,
  Users,
  CheckSquare,
  Clock,
  Filter,
  RefreshCw,
  Building2,
  PieChart,
  TrendingUp,
  FileSpreadsheet,
  AlertTriangle,
  UserCheck,
  Search,
} from 'lucide-react';
import { reportsApi } from '../../api/reports.api';
import { ReportFilterParams } from '../../types/report';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';

export const ReportsPage: React.FC = () => {
  const { formatDate, language } = useTheme();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'cases' | 'hearings' | 'diary' | 'tasks' | 'clients' | 'staff'
  >('overview');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [court, setCourt] = useState('');
  const [caseType, setCaseType] = useState('All');
  const [status, setStatus] = useState('All');
  const [diaryDate, setDiaryDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const filterParams: ReportFilterParams = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    court: court.trim() || undefined,
    caseType: caseType !== 'All' ? caseType : undefined,
    status: status !== 'All' ? status : undefined,
    date: activeTab === 'diary' ? diaryDate : undefined,
  };

  // 1. Overview Query
  const { data: overviewData, isLoading: isLoadingOverview, refetch: refetchOverview } = useQuery({
    queryKey: ['report-overview'],
    queryFn: () => reportsApi.getOverview(),
    enabled: activeTab === 'overview',
  });

  // 2. Cases Query
  const { data: casesData, isLoading: isLoadingCases, refetch: refetchCases } = useQuery({
    queryKey: ['report-cases', filterParams],
    queryFn: () => reportsApi.getCasesReport(filterParams),
    enabled: activeTab === 'cases',
  });

  // 3. Hearings Query
  const { data: hearingsData, isLoading: isLoadingHearings, refetch: refetchHearings } = useQuery({
    queryKey: ['report-hearings', filterParams],
    queryFn: () => reportsApi.getHearingsReport(filterParams),
    enabled: activeTab === 'hearings',
  });

  // 4. Diary Query
  const { data: diaryData, isLoading: isLoadingDiary, refetch: refetchDiary } = useQuery({
    queryKey: ['report-diary', filterParams],
    queryFn: () => reportsApi.getDiaryReport(filterParams),
    enabled: activeTab === 'diary',
  });

  // 5. Tasks Query
  const { data: tasksData, isLoading: isLoadingTasks, refetch: refetchTasks } = useQuery({
    queryKey: ['report-tasks', filterParams],
    queryFn: () => reportsApi.getTasksReport(filterParams),
    enabled: activeTab === 'tasks',
  });

  // 6. Clients Query
  const { data: clientsData, isLoading: isLoadingClients, refetch: refetchClients } = useQuery({
    queryKey: ['report-clients'],
    queryFn: () => reportsApi.getClientsReport(),
    enabled: activeTab === 'clients',
  });

  // 7. Staff Query
  const { data: staffData, isLoading: isLoadingStaff, refetch: refetchStaff } = useQuery({
    queryKey: ['report-staff'],
    queryFn: () => reportsApi.getStaffReport(),
    enabled: activeTab === 'staff',
  });

  const resetFilters = () => {
    setStartDate('');
    setEndDate('');
    setCourt('');
    setCaseType('All');
    setStatus('All');
    setDiaryDate(new Date().toISOString().slice(0, 10));
  };

  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      let reportType = 'case-register';
      if (activeTab === 'hearings') reportType = 'hearing-history';
      else if (activeTab === 'diary') reportType = 'daily-diary';
      else if (activeTab === 'tasks') reportType = 'task-report';
      else if (activeTab === 'clients') reportType = 'client-report';
      else if (activeTab === 'staff') reportType = 'staff-report';

      await reportsApi.exportPdf(reportType, { ...filterParams, lang: language });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate PDF report.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      let reportType = 'case-register';
      if (activeTab === 'hearings') reportType = 'hearing-history';
      else if (activeTab === 'diary') reportType = 'daily-diary';
      else if (activeTab === 'tasks') reportType = 'task-report';
      else if (activeTab === 'clients') reportType = 'client-list';
      else if (activeTab === 'staff') reportType = 'staff-workload';

      await reportsApi.exportExcel(reportType, { ...filterParams, lang: language });
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to export Excel spreadsheet.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const tabs = [
    { id: 'overview', label: t('reports.tabs.overview'), icon: BarChart3 },
    { id: 'cases', label: t('reports.tabs.cases'), icon: Briefcase },
    { id: 'hearings', label: t('reports.tabs.hearings'), icon: Calendar },
    { id: 'diary', label: t('reports.tabs.diary'), icon: Clock },
    { id: 'tasks', label: t('reports.tabs.tasks'), icon: CheckSquare },
    { id: 'clients', label: t('reports.tabs.clients'), icon: Users },
    { id: 'staff', label: t('reports.tabs.staff'), icon: UserCheck },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('reports.title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('reports.subtitle')}
          </p>
        </div>

        {/* Global Export Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs tracking-wide shadow-xs transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            {isExportingPdf ? (
              <div className="w-3.5 h-3.5 border-2 border-legal-900 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText className="w-4 h-4 text-rose-600" />
            )}
            <span>{isExportingPdf ? t('common.loading') : t('reports.exportPdf')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExportingExcel}
            className="px-3.5 py-2 rounded-xl bg-legal-900 hover:bg-legal-800 text-white font-semibold text-xs tracking-wide shadow-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            {isExportingExcel ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            )}
            <span>{isExportingExcel ? t('common.loading') : t('reports.exportExcel')}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 overflow-x-auto scrollbar-none">
        <nav className="flex space-x-2 pb-px min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 font-medium text-xs transition-all ${
                  isActive
                    ? 'border-legal-900 text-legal-900 font-bold bg-white'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-legal-900' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filter Toolbar (Applicable to filtered tabs) */}
      {activeTab !== 'overview' && activeTab !== 'clients' && activeTab !== 'staff' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-100 text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-legal-700" />
              Report Parameters & Filters
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="text-[11px] text-slate-500 hover:text-legal-900 hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {activeTab === 'diary' ? (
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Court Diary Date
                </label>
                <input
                  type="date"
                  value={diaryDate}
                  onChange={(e) => setDiaryDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">From Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">To Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Court Name</label>
              <input
                type="text"
                value={court}
                onChange={(e) => setCourt(e.target.value)}
                placeholder="e.g. High Court, Sessions"
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900"
              />
            </div>

            {activeTab === 'cases' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Case Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 bg-white"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="Disposed">Disposed</option>
                  <option value="Stayed">Stayed</option>
                  <option value="Transferred">Transferred</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 1. OVERVIEW TAB */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {isLoadingOverview ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-4 border-legal-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-3 text-xs text-slate-500">Compiling chamber analytics...</p>
            </div>
          ) : overviewData ? (
            <>
              {/* Metric KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Active Caseload</span>
                    <div className="w-8 h-8 rounded-xl bg-legal-50 text-legal-800 flex items-center justify-center">
                      <Briefcase className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{overviewData.cases.active}</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {overviewData.cases.total} total cases recorded
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Upcoming (30d)</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {overviewData.hearings.upcomingNext30Days}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {overviewData.hearings.total} total hearings conducted
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Task Completion</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                      <CheckSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {overviewData.tasks.completionRate}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {overviewData.tasks.completed} of {overviewData.tasks.total} tasks resolved
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase">Overdue Tasks</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-extrabold text-rose-600">{overviewData.tasks.overdue}</div>
                  <div className="text-[11px] text-slate-400 mt-1">Requires immediate follow-up</div>
                </div>
              </div>

              {/* Monthly Hearing Trends & Status Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hearing Trend Visual Bar Chart */}
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-legal-800" />
                        Monthly Hearing Volume (Last 6 Months)
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Courtroom appearances trend</p>
                    </div>
                  </div>

                  {overviewData.hearings.monthlyTrends.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      No hearings recorded in the last 6 months.
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      {overviewData.hearings.monthlyTrends.map((trend) => {
                        const maxVal = Math.max(
                          ...overviewData.hearings.monthlyTrends.map((t) => t.count),
                          1
                        );
                        const pct = Math.max(8, Math.round((trend.count / maxVal) * 100));

                        return (
                          <div key={trend.label} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="font-semibold text-slate-700">{trend.label}</span>
                              <span className="font-bold text-slate-900">{trend.count} hearings</span>
                            </div>
                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className="h-full bg-legal-900 rounded-full transition-all duration-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Case Status Distribution */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-1">
                      <PieChart className="w-4 h-4 text-legal-800" />
                      Caseload Status Breakdown
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">Proportion of pending vs disposed matters</p>

                    <div className="space-y-3">
                      {overviewData.cases.statusBreakdown.map((item) => {
                        const total = overviewData.cases.total || 1;
                        const pct = Math.round((item.count / total) * 100);

                        return (
                          <div key={item.status} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex justify-between items-center text-xs mb-1.5">
                              <span className="font-semibold text-slate-800">{item.status}</span>
                              <span className="font-bold text-slate-900">
                                {item.count} ({pct}%)
                              </span>
                            </div>
                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className={`h-full rounded-full ${
                                  item.status === 'Disposed' ? 'bg-emerald-500' : 'bg-legal-700'
                                }`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>Client Database</span>
                    <strong className="text-slate-900">{overviewData.clients.total} clients</strong>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 2. CASES TAB */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'cases' && (
        <div className="space-y-6">
          {isLoadingCases ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-4 border-legal-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-3 text-xs text-slate-500">Compiling case reports...</p>
            </div>
          ) : casesData ? (
            <>
              {/* Cases Summary Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Total Filtered Cases</span>
                  <span className="text-2xl font-bold text-slate-900">{casesData.summary.totalCases}</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Active Proceedings</span>
                  <span className="text-2xl font-bold text-emerald-600">{casesData.summary.activeCases}</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Disposed Matters</span>
                  <span className="text-2xl font-bold text-slate-600">{casesData.summary.disposedCases}</span>
                </div>
              </div>

              {/* Court Distribution & Case Type Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Court Distribution */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-legal-800" />
                    Top Forum & Court Venues
                  </h3>
                  <div className="space-y-2.5">
                    {casesData.casesByCourt.map((c) => (
                      <div key={c.court} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50">
                        <span className="font-semibold text-slate-800 truncate max-w-xs">{c.court}</span>
                        <span className="font-bold text-legal-900 px-2 py-0.5 rounded bg-legal-100">
                          {c.count} cases
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Case Type Distribution */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                    <Briefcase className="w-4 h-4 text-legal-800" />
                    Caseload by Subject Category
                  </h3>
                  <div className="space-y-2.5">
                    {casesData.casesByCaseType.map((t) => (
                      <div key={t.caseType} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-50">
                        <span className="font-semibold text-slate-800">{t.caseType}</span>
                        <span className="font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-200">
                          {t.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 3. HEARINGS TAB */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'hearings' && (
        <div className="space-y-6">
          {isLoadingHearings ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-4 border-legal-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-3 text-xs text-slate-500">Compiling hearing reports...</p>
            </div>
          ) : hearingsData ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Total Hearings Logged</span>
                  <span className="text-2xl font-bold text-slate-900">{hearingsData.summary.totalHearings}</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Conducted in Past</span>
                  <span className="text-2xl font-bold text-legal-800">{hearingsData.summary.conductedHearings}</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Upcoming Scheduled</span>
                  <span className="text-2xl font-bold text-purple-600">{hearingsData.summary.upcomingHearings}</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Missing Next Date</span>
                  <span className="text-2xl font-bold text-amber-600">
                    {hearingsData.summary.casesMissingNextDateCount}
                  </span>
                </div>
              </div>

              {/* Cases with No Next Date Warning */}
              {hearingsData.casesWithNoNextDate.length > 0 && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Active Cases with No Scheduled Next Hearing Date
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {hearingsData.casesWithNoNextDate.map((c) => (
                      <div key={c._id} className="p-3 rounded-xl bg-white border border-amber-200/80 text-xs shadow-2xs">
                        <div className="font-bold text-slate-900">{c.caseNumber}</div>
                        <div className="text-[11px] text-slate-500 truncate">{c.courtName}</div>
                        <div className="text-[10px] text-amber-700 mt-1">Status: {c.status}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 4. DIARY TAB */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'diary' && (
        <div className="space-y-6">
          {isLoadingDiary ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-4 border-legal-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-3 text-xs text-slate-500">Loading daily court diary roster...</p>
            </div>
          ) : diaryData ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Daily Court Roster for {formatDate(diaryDate)}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Total {diaryData.totalScheduled} cases scheduled for hearing on this date
                  </p>
                </div>
              </div>

              {diaryData.cases.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No cases scheduled on {formatDate(diaryDate)}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                        <th className="px-4 py-3">Case Number</th>
                        <th className="px-4 py-3">Court / Room</th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">Opponent</th>
                        <th className="px-4 py-3">Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {diaryData.cases.map((c) => (
                        <tr key={c._id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{c.caseNumber}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {c.courtName} {c.courtRoomNumber ? `(Room ${c.courtRoomNumber})` : ''}
                          </td>
                          <td className="px-4 py-3 text-slate-700">{c.clientName || '-'}</td>
                          <td className="px-4 py-3 text-slate-700">{c.opponentName || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              {c.nextHearingPurpose || 'Hearing'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 5. TASKS TAB */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'tasks' && (
        <div className="space-y-6">
          {isLoadingTasks ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-4 border-legal-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-3 text-xs text-slate-500">Compiling task analytics...</p>
            </div>
          ) : tasksData ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Total Chamber Tasks</span>
                  <span className="text-2xl font-bold text-slate-900">{tasksData.summary.totalTasks}</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Completed</span>
                  <span className="text-2xl font-bold text-emerald-600">{tasksData.summary.completedTasks}</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">In Progress / Pending</span>
                  <span className="text-2xl font-bold text-amber-600">{tasksData.summary.pendingTasks}</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Overdue</span>
                  <span className="text-2xl font-bold text-rose-600">{tasksData.summary.overdueTasks}</span>
                </div>
              </div>

              {/* Staff Workload Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">Task Allocation by Staff Member</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                        <th className="px-4 py-3">Staff Member</th>
                        <th className="px-4 py-3">Total Assigned</th>
                        <th className="px-4 py-3">Completed</th>
                        <th className="px-4 py-3">Pending</th>
                        <th className="px-4 py-3">Overdue</th>
                        <th className="px-4 py-3">Completion Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {tasksData.staffWorkload.map((staff) => (
                        <tr key={staff.userId} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{staff.userName}</td>
                          <td className="px-4 py-3 font-mono">{staff.total}</td>
                          <td className="px-4 py-3 text-emerald-600 font-bold">{staff.completed}</td>
                          <td className="px-4 py-3 text-amber-600">{staff.pending}</td>
                          <td className="px-4 py-3 text-rose-600 font-semibold">{staff.overdue}</td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-legal-900">{staff.rate}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 6. CLIENTS TAB */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'clients' && (
        <div className="space-y-6">
          {isLoadingClients ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-4 border-legal-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-3 text-xs text-slate-500">Compiling client statistics...</p>
            </div>
          ) : clientsData ? (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Total Clients</span>
                  <span className="text-2xl font-bold text-slate-900">{clientsData.summary.totalClients}</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Individual Clients</span>
                  <span className="text-2xl font-bold text-legal-800">{clientsData.summary.individualClients}</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Corporate Clients</span>
                  <span className="text-2xl font-bold text-purple-700">{clientsData.summary.corporateClients}</span>
                </div>
                <div className="p-4 rounded-xl bg-white border border-slate-200">
                  <span className="text-xs text-slate-500 block mb-1">Multiple Matters</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {clientsData.summary.clientsWithMultipleCases}
                  </span>
                </div>
              </div>

              {/* Top Clients Table */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900">Key Chamber Clients by Case Volume</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                        <th className="px-4 py-3">Client Name</th>
                        <th className="px-4 py-3">Mobile Contact</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Active Cases</th>
                        <th className="px-4 py-3">Total Cases</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientsData.topClients.map((cl) => (
                        <tr key={cl.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{cl.fullName}</td>
                          <td className="px-4 py-3 text-slate-600 font-mono">{cl.mobile}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700">
                              {cl.clientType}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-bold text-emerald-600">{cl.activeCases}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">{cl.totalCases}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 7. STAFF TAB */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {isLoadingStaff ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-4 border-legal-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-3 text-xs text-slate-500">Compiling chamber staff workload...</p>
            </div>
          ) : staffData ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">
                  Chamber Team Workload & Task Performance ({staffData.members.length})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-500 text-[10px] uppercase font-semibold">
                      <th className="px-4 py-3">Team Member</th>
                      <th className="px-4 py-3">Chamber Role</th>
                      <th className="px-4 py-3">Assigned Cases</th>
                      <th className="px-4 py-3">Total Tasks</th>
                      <th className="px-4 py-3">Completed Tasks</th>
                      <th className="px-4 py-3">Task Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffData.members.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{member.fullName}</div>
                          <div className="text-[11px] text-slate-400">{member.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                            {member.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{member.assignedCases}</td>
                        <td className="px-4 py-3 font-mono">{member.totalTasks}</td>
                        <td className="px-4 py-3 text-emerald-600 font-bold">{member.completedTasks}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-legal-900">{member.completionRate}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

