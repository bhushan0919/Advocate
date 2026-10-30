import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Filter,
  Search,
  X,
  Clock,
  Building2,
  Scale,
  User,
  ExternalLink,
  BookOpen,
  History,
  Edit3,
  CalendarDays,
  Columns3,
  ListFilter,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { calendarApi } from '../../api/calendar.api.ts';
import { CalendarEvent, CalendarFilterParams } from '../../types/calendar.ts';
import { EventDetailsModal } from './EventDetailsModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext';

type ViewMode = 'month' | 'week' | 'agenda';

export const HearingCalendar: React.FC = () => {
  const { workspace } = useAuth();
  const { language, formatDate } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Navigation State
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() =>
    new Date().toISOString().split('T')[0]
  );

  // Selected Event for Modal
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [courtFilter, setCourtFilter] = useState('');
  const [caseTypeFilter, setCaseTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);

  // Calculate Date Range based on view mode
  const { startDateStr, endDateStr, viewTitle } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    if (viewMode === 'month') {
      // Full grid covering Sunday of the first week through Saturday of the last week
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);

      const start = new Date(firstDayOfMonth);
      start.setDate(start.getDate() - start.getDay()); // Sunday start

      const end = new Date(lastDayOfMonth);
      end.setDate(end.getDate() + (6 - end.getDay())); // Saturday end

      const monthName = currentDate.toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', {
        month: 'long',
        year: 'numeric',
      });

      return {
        startDateStr: start.toISOString().split('T')[0],
        endDateStr: end.toISOString().split('T')[0],
        viewTitle: monthName,
      };
    } else if (viewMode === 'week') {
      // 7 days around currentDate starting from Sunday
      const start = new Date(currentDate);
      start.setDate(start.getDate() - start.getDay());

      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      const startTitle = start.toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', {
        day: '2-digit',
        month: 'short',
      });
      const endTitle = end.toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

      return {
        startDateStr: start.toISOString().split('T')[0],
        endDateStr: end.toISOString().split('T')[0],
        viewTitle: `${startTitle} – ${endTitle}`,
      };
    } else {
      // Agenda view: current month start to 45 days ahead
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 2, 0);

      const title = `${currentDate.toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', {
        month: 'short',
        year: 'numeric',
      })} – ${language === 'mr' ? 'आगामी सुनावणी अजेंडा' : 'Upcoming Agenda'}`;

      return {
        startDateStr: start.toISOString().split('T')[0],
        endDateStr: end.toISOString().split('T')[0],
        viewTitle: title,
      };
    }
  }, [currentDate, viewMode, language]);

  // Query Params
  const queryParams: CalendarFilterParams = useMemo(() => {
    const p: CalendarFilterParams = {
      startDate: startDateStr,
      endDate: endDateStr,
    };
    if (search.trim()) p.search = search.trim();
    if (courtFilter) p.court = courtFilter;
    if (caseTypeFilter) p.caseType = caseTypeFilter;
    if (statusFilter) p.status = statusFilter;
    if (includeArchived) p.includeArchived = true;
    return p;
  }, [startDateStr, endDateStr, search, courtFilter, caseTypeFilter, statusFilter, includeArchived]);

  // Fetch Calendar Events
  const {
    data: calendarData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['calendar', workspace?.id, queryParams],
    queryFn: () => calendarApi.getEvents(queryParams),
    enabled: !!workspace?.id,
  });

  // Fetch Calendar Summary Stats
  const { data: summaryData } = useQuery({
    queryKey: ['calendar-summary', workspace?.id, queryParams],
    queryFn: () => calendarApi.getSummary(queryParams),
    enabled: !!workspace?.id,
  });

  // Navigation Handlers
  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(today.toISOString().split('T')[0]);
  };

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setCurrentDate(next);
  };

  const handleDatePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const picked = new Date(e.target.value);
    if (!isNaN(picked.getTime())) {
      setCurrentDate(picked);
      setSelectedDateStr(e.target.value);
    }
  };

  const clearFilters = () => {
    setSearch('');
    setCourtFilter('');
    setCaseTypeFilter('');
    setStatusFilter('');
    setIncludeArchived(false);
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(courtFilter) ||
    Boolean(caseTypeFilter) ||
    Boolean(statusFilter) ||
    includeArchived;

  // Events map by YYYY-MM-DD
  const eventsByDate = calendarData?.eventsByDate || {};

  // Days array for Monthly Grid
  const monthDays = useMemo(() => {
    if (viewMode !== 'month') return [];

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const days: Array<{
      dateObj: Date;
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      events: CalendarEvent[];
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];
    const curr = new Date(start);

    while (curr <= end) {
      const dStr = curr.toISOString().split('T')[0];
      days.push({
        dateObj: new Date(curr),
        dateStr: dStr,
        dayNumber: curr.getDate(),
        isCurrentMonth: curr.getMonth() === currentDate.getMonth(),
        isToday: dStr === todayStr,
        events: eventsByDate[dStr] || [],
      });
      curr.setDate(curr.getDate() + 1);
    }

    return days;
  }, [viewMode, startDateStr, endDateStr, currentDate, eventsByDate]);

  // Days array for Weekly View
  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return [];

    const start = new Date(startDateStr);
    const days: Array<{
      dateObj: Date;
      dateStr: string;
      dayNumber: number;
      dayName: string;
      isToday: boolean;
      events: CalendarEvent[];
    }> = [];

    const todayStr = new Date().toISOString().split('T')[0];
    const curr = new Date(start);

    for (let i = 0; i < 7; i++) {
      const dStr = curr.toISOString().split('T')[0];
      days.push({
        dateObj: new Date(curr),
        dateStr: dStr,
        dayNumber: curr.getDate(),
        dayName: curr.toLocaleDateString('en-IN', { weekday: 'short' }),
        isToday: dStr === todayStr,
        events: eventsByDate[dStr] || [],
      });
      curr.setDate(curr.getDate() + 1);
    }

    return days;
  }, [viewMode, startDateStr, eventsByDate]);

  // Agenda Groups
  const agendaDates = useMemo(() => {
    if (viewMode !== 'agenda' && !calendarData?.events) return [];

    const dates = Object.keys(eventsByDate).sort();
    return dates.map((d) => ({
      dateStr: d,
      formattedDate: new Date(d).toLocaleDateString('en-IN', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      events: eventsByDate[d],
    }));
  }, [viewMode, eventsByDate, calendarData?.events]);

  const todayFormatted = new Date().toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-legal-800" />
              <span>{t('calendar.title')}</span>
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-legal-100 text-legal-800 border border-legal-200">
              Asia/Kolkata
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('calendar.subtitle')}. {t('common.today')}:{' '}
            <strong className="text-slate-700">{todayFormatted}</strong>.
          </p>
        </div>

        {/* View Switchers & Today Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Buttons */}
          <div className="flex items-center bg-white rounded-lg border border-slate-300 p-0.5 shadow-sm">
            <button
              onClick={() => setViewMode('month')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'month'
                  ? 'bg-legal-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>{t('calendar.views.month')}</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'week'
                  ? 'bg-legal-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>{t('calendar.views.week')}</span>
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'agenda'
                  ? 'bg-legal-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>{t('calendar.views.agenda')}</span>
            </button>
          </div>

          {/* Quick Date Stepper */}
          <div className="flex items-center bg-white rounded-lg border border-slate-300 p-0.5 shadow-sm">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title={t('common.previous')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={currentDate.toISOString().split('T')[0]}
              onChange={handleDatePick}
              className="px-2 py-1 text-xs font-mono font-medium text-slate-900 bg-transparent focus:outline-none"
            />
            <button
              onClick={handleNext}
              className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title={t('common.next')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
          >
            {t('common.today')}
          </button>

          <button
            onClick={() => navigate(`/diary?date=${selectedDateStr}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-legal-800 hover:bg-legal-700 text-white text-xs font-semibold shadow-sm transition-colors"
            title="Open Daily Diary for current selected date"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Open Diary ({selectedDateStr})</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Period Total
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {summaryData?.totalEvents ?? calendarData?.totalEvents ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Scheduled hearings in view</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Courts Active
          </div>
          <div className="text-xl font-bold font-mono text-legal-800 mt-1">
            {summaryData?.uniqueCourts ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Distinct forums scheduled</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Busiest Cause Day
          </div>
          <div className="text-sm font-bold text-amber-700 mt-1 truncate">
            {summaryData?.busiestDay
              ? `${new Date(summaryData.busiestDay.date).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                })} (${summaryData.busiestDay.count} cases)`
              : 'None'}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Peak court session board</div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Current Range
          </div>
          <div className="text-sm font-bold text-slate-900 mt-1 truncate">
            {viewTitle}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Selected schedule window</div>
        </div>
      </div>

      {/* 3. Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by case number, client, opponent, court, CNR..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-legal-800"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Court Filter */}
            <select
              value={courtFilter}
              onChange={(e) => setCourtFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-legal-800"
            >
              <option value="">All Courts</option>
              {summaryData?.courts?.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Case Type Filter */}
            <select
              value={caseTypeFilter}
              onChange={(e) => setCaseTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-legal-800"
            >
              <option value="">All Case Types</option>
              <option value="Civil">Civil</option>
              <option value="Criminal">Criminal</option>
              <option value="Family">Family</option>
              <option value="Property">Property</option>
              <option value="Consumer">Consumer</option>
              <option value="Labour">Labour</option>
              <option value="Other">Other</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-legal-800"
            >
              <option value="">Status: Active (Excl. Disposed)</option>
              <option value="Pending">Pending Only</option>
              <option value="Stayed">Stayed Only</option>
              <option value="Transferred">Transferred</option>
              <option value="Withdrawn">Withdrawn</option>
              <option value="Disposed">Disposed Only</option>
              <option value="all">All Statuses</option>
            </select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
                title="Reset all active filters"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Main Calendar Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2 shadow-sm">
          <div className="w-6 h-6 border-2 border-legal-800 border-t-transparent rounded-full animate-spin" />
          <span>Loading scheduled court hearings & cause board...</span>
        </div>
      ) : isError ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center text-xs text-rose-700 space-y-3">
          <AlertCircle className="w-6 h-6 mx-auto text-rose-500" />
          <div className="font-bold text-sm">Failed to load hearing calendar</div>
          <p className="text-slate-500 max-w-sm mx-auto">
            {(error as any)?.response?.data?.message || 'Error communicating with calendar API.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-legal-900 text-white text-xs font-semibold rounded-lg"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* ===================== VIEW 1: MONTHLY GRID ===================== */}
          {viewMode === 'month' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Day Name Headers */}
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center py-2.5 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <span className="text-rose-600">Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span className="text-slate-600">Sat</span>
              </div>

              {/* Month Grid Cells */}
              <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 bg-slate-100/50">
                {monthDays.map((d) => {
                  const isSelected = d.dateStr === selectedDateStr;
                  const hasHearings = d.events.length > 0;

                  return (
                    <div
                      key={d.dateStr}
                      onClick={() => setSelectedDateStr(d.dateStr)}
                      className={`min-h-[105px] sm:min-h-[120px] p-1.5 sm:p-2 bg-white flex flex-col transition-colors cursor-pointer group ${
                        !d.isCurrentMonth ? 'bg-slate-50/70 text-slate-300' : 'text-slate-800'
                      } ${isSelected ? 'ring-2 ring-inset ring-legal-800 bg-legal-50/20' : 'hover:bg-slate-50/80'}`}
                    >
                      {/* Day Number Header */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                            d.isToday
                              ? 'bg-legal-900 text-white font-extrabold shadow-sm'
                              : isSelected
                              ? 'bg-legal-100 text-legal-900 font-bold'
                              : d.isCurrentMonth
                              ? 'text-slate-800'
                              : 'text-slate-400'
                          }`}
                        >
                          {d.dayNumber}
                        </span>

                        {hasHearings && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-legal-100 text-legal-800">
                            {d.events.length}
                          </span>
                        )}
                      </div>

                      {/* Event Chips List */}
                      <div className="flex-1 space-y-1 overflow-hidden">
                        {d.events.slice(0, 2).map((ev) => (
                          <button
                            key={ev._id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(ev);
                            }}
                            className={`w-full text-left p-1 rounded text-[10px] truncate border block transition-transform group-hover:scale-[1.01] ${
                              ev.status === 'Pending'
                                ? 'bg-amber-50 text-amber-900 border-amber-200/80 hover:bg-amber-100'
                                : ev.status === 'Stayed'
                                ? 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
                                : ev.status === 'Disposed'
                                ? 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                            }`}
                            title={`${ev.caseNumber} - ${ev.clientName} (${ev.purpose})`}
                          >
                            <span className="font-bold font-mono">{ev.caseNumber}</span>
                            <span className="opacity-75 ml-1 hidden sm:inline">· {ev.purpose}</span>
                          </button>
                        ))}

                        {d.events.length > 2 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDateStr(d.dateStr);
                              setViewMode('agenda');
                            }}
                            className="w-full text-left text-[10px] text-legal-800 font-bold hover:underline pl-1"
                          >
                            +{d.events.length - 2} more...
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ===================== VIEW 2: WEEKLY SCHEDULE ===================== */}
          {viewMode === 'week' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <div className="min-w-[800px] grid grid-cols-7 divide-x divide-slate-200">
                {weekDays.map((d) => (
                  <div key={d.dateStr} className="flex flex-col min-h-[500px]">
                    {/* Day Column Header */}
                    <div
                      className={`p-3 border-b text-center border-slate-200 transition-colors ${
                        d.isToday ? 'bg-legal-900 text-white' : 'bg-slate-50 text-slate-800'
                      }`}
                    >
                      <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
                        {d.dayName}
                      </div>
                      <div className="text-lg font-bold font-mono mt-0.5">{d.dayNumber}</div>
                      <div className="text-[10px] mt-0.5 opacity-90 font-medium">
                        {d.events.length} {d.events.length === 1 ? 'hearing' : 'hearings'}
                      </div>
                    </div>

                    {/* Column Hearing Cards */}
                    <div className="p-2.5 flex-1 space-y-2.5 bg-slate-50/40">
                      {d.events.length === 0 ? (
                        <div className="text-center py-10 text-[11px] text-slate-400 italic">
                          No hearings
                        </div>
                      ) : (
                        d.events.map((ev) => (
                          <div
                            key={ev._id}
                            onClick={() => setSelectedEvent(ev)}
                            className="bg-white p-3 rounded-xl border border-slate-200 hover:border-slate-300 shadow-xs cursor-pointer transition-shadow space-y-2"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-mono font-bold text-xs text-slate-900">
                                {ev.caseNumber}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                  ev.status === 'Pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : ev.status === 'Disposed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {ev.status}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-700">
                              <div className="font-semibold text-slate-900 truncate">
                                {ev.clientName}
                              </div>
                              <div className="text-slate-400 text-[10px] truncate">
                                vs {ev.opponentName}
                              </div>
                            </div>

                            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                              <div className="flex items-center gap-1 truncate font-medium text-legal-900">
                                <Building2 className="w-3 h-3 text-legal-800 flex-shrink-0" />
                                <span className="truncate">{ev.courtName}</span>
                              </div>
                              <div className="text-slate-600 font-medium mt-0.5 truncate">
                                Purpose: {ev.purpose}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================== VIEW 3: AGENDA / LIST VIEW ===================== */}
          {viewMode === 'agenda' && (
            <div className="space-y-4">
              {agendaDates.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">No Scheduled Hearings Found</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    There are no upcoming court hearings scheduled in the selected date range
                    matching the current filters.
                  </p>
                  {hasActiveFilters && (
                    <button
                      onClick={clearFilters}
                      className="px-3.5 py-1.5 bg-legal-900 text-white rounded-lg text-xs font-semibold"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                agendaDates.map((group) => (
                  <div
                    key={group.dateStr}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    {/* Date Header */}
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-legal-800" />
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          {group.formattedDate}
                        </h3>
                        <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-legal-100 text-legal-800">
                          {group.events.length} {group.events.length === 1 ? 'hearing' : 'hearings'}
                        </span>
                      </div>

                      <button
                        onClick={() => navigate(`/diary?date=${group.dateStr}`)}
                        className="text-xs text-legal-800 font-semibold hover:underline flex items-center gap-1"
                      >
                        <span>Open Daily Diary</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Hearing Cards List */}
                    <div className="divide-y divide-slate-100">
                      {group.events.map((ev) => (
                        <div
                          key={ev._id}
                          className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="space-y-1.5 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-sm text-slate-900">
                                {ev.caseNumber}
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                  ev.status === 'Pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : ev.status === 'Disposed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ev.status === 'Stayed'
                                    ? 'bg-rose-100 text-rose-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {ev.status}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                {ev.caseType}
                              </span>
                            </div>

                            <div className="text-xs text-slate-800">
                              <span className="font-semibold text-slate-900">{ev.clientName}</span>
                              <span className="text-slate-400 mx-1.5 font-medium">vs</span>
                              <span className="text-slate-700 font-medium">{ev.opponentName}</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-1">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-legal-800" />
                                <span>{ev.courtName}</span>
                                {ev.courtRoom && <span>({ev.courtRoom})</span>}
                              </span>

                              <span className="flex items-center gap-1 font-medium text-legal-900">
                                <Clock className="w-3.5 h-3.5 text-legal-800" />
                                <span>Purpose: {ev.purpose}</span>
                              </span>
                            </div>
                          </div>

                          {/* Card Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => setSelectedEvent(ev)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>

                            <button
                              onClick={() => navigate(`/cases/${ev.caseId || ev._id}`)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Case</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* 5. Event Details Modal */}
      <EventDetailsModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['calendar'] });
          queryClient.invalidateQueries({ queryKey: ['calendar-summary'] });
          queryClient.invalidateQueries({ queryKey: ['daily-diary'] });
          queryClient.invalidateQueries({ queryKey: ['diary-summary'] });
        }}
      />
    </div>
  );
};

