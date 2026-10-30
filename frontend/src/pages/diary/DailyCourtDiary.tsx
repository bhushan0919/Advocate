import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Printer,
  Download,
  Building2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit3,
  User,
  Scale,
  FileText,
} from 'lucide-react';
import { diaryApi } from '../../api/diary.api.ts';
import { DiaryEntry } from '../../types/diary.ts';
import { CaseRecord } from '../../types/case.ts';
import { UpdateHearingModal } from './UpdateHearingModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext';

export const DailyCourtDiary: React.FC = () => {
  const { workspace } = useAuth();
  const { language, formatDate } = useTheme();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Selected Diary Date in YYYY-MM-DD
  const dateFromUrl = searchParams.get('date');
  const getTodayISO = () => new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(() => dateFromUrl || getTodayISO());

  useEffect(() => {
    if (dateFromUrl && dateFromUrl !== selectedDate) {
      setSelectedDate(dateFromUrl);
    }
  }, [dateFromUrl]);

  const updateSelectedDate = (newDate: string) => {
    setSelectedDate(newDate);
    setSearchParams({ date: newDate });
  };

  // Update Hearing Modal State
  const [selectedCaseForUpdate, setSelectedCaseForUpdate] = useState<CaseRecord | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  // Fetch Daily Diary Cases
  const {
    data: diaryData,
    isLoading: isDiaryLoading,
    isError: isDiaryError,
    error: diaryError,
    refetch: refetchDiary,
  } = useQuery({
    queryKey: ['daily-diary', workspace?.id, selectedDate],
    queryFn: () => diaryApi.getDailyDiary(selectedDate),
    enabled: !!workspace?.id,
  });

  // Fetch Diary Summary Stats
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['diary-summary', workspace?.id, selectedDate],
    queryFn: () => diaryApi.getDiarySummary(selectedDate),
    enabled: !!workspace?.id,
  });

  // Date Navigation Handlers
  const handlePrevDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() - 1);
    updateSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + 1);
    updateSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    updateSelectedDate(getTodayISO());
  };

  const handleOpenUpdateModal = (c: CaseRecord) => {
    setSelectedCaseForUpdate(c);
    setIsUpdateModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const cases = diaryData?.cases || [];
  const formattedSelectedDate = new Date(selectedDate).toLocaleDateString(language === 'mr' ? 'mr-IN' : 'en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Print-only Cause List Header */}
      <div className="hidden print:block mb-6 border-b border-slate-900 pb-3">
        <div className="text-center">
          <h1 className="text-lg font-bold uppercase tracking-wider text-slate-900">
            AdvD • {t('diary.title')}
          </h1>
          <div className="text-sm font-semibold text-slate-800 mt-0.5">
            {workspace?.name || 'Advocate Chambers'}
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {t('common.date')}: <strong>{formattedSelectedDate}</strong> • {t('diary.scheduledHearings')}: {cases.length}
          </div>
        </div>
      </div>

      {/* Screen Header & Date Selector Toolbar */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-legal-800" />
              <span>{t('diary.title')}</span>
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-legal-100 text-legal-800 border border-legal-200">
              {formattedSelectedDate}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('diary.subtitle')}
          </p>
        </div>

        {/* Date Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Navigator */}
          <div className="flex items-center bg-white rounded-lg border border-slate-300 p-0.5 shadow-sm">
            <button
              onClick={handlePrevDay}
              className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title={t('common.previous')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => updateSelectedDate(e.target.value)}
              className="px-2 py-1 text-xs font-mono font-medium text-slate-900 bg-transparent focus:outline-none"
            />
            <button
              onClick={handleNextDay}
              className="p-1.5 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title={t('common.next')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-semibold bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors shadow-sm"
          >
            {t('common.today')}
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-sm"
            title={t('common.print')}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('common.print')}</span>
          </button>

          <a
            href={`/api/reports/export/pdf?reportType=daily-diary&startDate=${selectedDate}&endDate=${selectedDate}&lang=${language}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-legal-900 hover:bg-legal-800 text-white text-xs font-semibold transition-colors shadow-sm"
            title={t('common.exportPdf')}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('common.exportPdf')}</span>
          </a>
        </div>
      </div>

      {/* Diary Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 print:hidden">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Total Hearings</span>
            <div className="p-1.5 rounded-lg bg-legal-50 text-legal-800">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {isSummaryLoading ? '...' : summaryData?.totalHearings ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Listed for {formattedSelectedDate}</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Pending Updates</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-2">
            {isSummaryLoading ? '...' : summaryData?.pendingUpdates ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Proceedings awaiting entry</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Completed Updates</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            {isSummaryLoading ? '...' : summaryData?.completedUpdates ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Recorded and next date fixed</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Courts Scheduled</span>
            <div className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-2">
            {isSummaryLoading ? '...' : summaryData?.uniqueCourts ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5 truncate" title={summaryData?.courts?.join(', ')}>
            {summaryData?.courts?.length ? summaryData.courts.slice(0, 2).join(', ') : 'None'}
          </div>
        </div>
      </div>

      {/* Main Table: Daily Diary Court Register */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-legal-800" />
            <h2 className="text-sm font-bold text-slate-900">
              Court Board & Daily Proceedings ({cases.length})
            </h2>
          </div>
          <span className="text-xs font-mono text-slate-500">{selectedDate}</span>
        </div>

        {isDiaryLoading ? (
          <div className="p-14 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2 print:hidden">
            <div className="w-5 h-5 border-2 border-legal-800 border-t-transparent rounded-full animate-spin" />
            <span>Loading daily court diary for {formattedSelectedDate}...</span>
          </div>
        ) : isDiaryError ? (
          <div className="p-10 text-center text-xs text-rose-600 flex flex-col items-center gap-2 print:hidden">
            <AlertCircle className="w-6 h-6" />
            <span>Failed to load daily diary: {(diaryError as any)?.message || 'Server error'}</span>
            <button
              onClick={() => refetchDiary()}
              className="mt-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
            >
              Retry
            </button>
          </div>
        ) : cases.length === 0 ? (
          <div className="p-14 text-center print:hidden">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Cases Scheduled For This Date</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              There are no court hearings fixed for {formattedSelectedDate}. You can navigate to other dates or check the complete cases register.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={handleToday}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Go to Today
              </button>
              <Link
                to="/cases"
                className="px-3 py-1.5 rounded-lg bg-legal-900 text-white text-xs font-semibold hover:bg-legal-800"
              >
                View All Cases
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs print:text-[10px]">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px] print:bg-slate-100 print:text-black">
                  <th className="py-2.5 px-3 w-10 text-center">Sr.</th>
                  <th className="py-2.5 px-3">Court Name & Location</th>
                  <th className="py-2.5 px-3">Room</th>
                  <th className="py-2.5 px-3">Case Number</th>
                  <th className="py-2.5 px-3">Client Name</th>
                  <th className="py-2.5 px-3">Opponent Party</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-3">Prev Date</th>
                  <th className="py-2.5 px-3">Next Date</th>
                  <th className="py-2.5 px-4 min-w-[200px]">Today's Proceedings</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right print:hidden">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                {cases.map((entry: DiaryEntry, index: number) => {
                  const c = entry.case;
                  const clientObj = typeof c.clientId === 'object' && c.clientId !== null ? c.clientId : null;
                  const clientName = clientObj?.fullName || c.clientName || 'Client';
                  const clientIdStr = clientObj?._id || (typeof c.clientId === 'string' ? c.clientId : '');

                  return (
                    <tr
                      key={c._id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        entry.isCompleted ? 'bg-emerald-50/20' : ''
                      }`}
                    >
                      {/* 1. Sr. No. */}
                      <td className="py-3 px-3 text-center font-mono text-slate-400 font-semibold text-[11px] print:text-black">
                        {index + 1}
                      </td>

                      {/* 2. Court Name */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 print:text-black">
                          {entry.courtName}
                        </div>
                        {c.courtLocation && (
                          <div className="text-[10px] text-slate-400 print:text-slate-600">
                            {c.courtLocation}
                          </div>
                        )}
                      </td>

                      {/* 3. Court Room */}
                      <td className="py-3 px-3 font-mono text-slate-700 font-medium">
                        {entry.courtRoom || <span className="text-slate-400 italic">—</span>}
                      </td>

                      {/* 4. Case Number */}
                      <td className="py-3 px-3 font-mono font-bold text-legal-900 print:text-black">
                        <Link
                          to={`/cases/${c._id}`}
                          className="hover:underline flex items-center gap-1 print:no-underline"
                        >
                          <span>{c.caseNumber}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400 print:hidden" />
                        </Link>
                        {c.cnrNumber && (
                          <div className="text-[9px] text-slate-400 font-normal">
                            {c.cnrNumber}
                          </div>
                        )}
                      </td>

                      {/* 5. Client Name */}
                      <td className="py-3 px-3">
                        {clientIdStr ? (
                          <Link
                            to={`/clients/${clientIdStr}`}
                            className="font-semibold text-slate-900 hover:text-legal-800 print:text-black print:no-underline"
                          >
                            {clientName}
                          </Link>
                        ) : (
                          <span className="font-semibold text-slate-900">{clientName}</span>
                        )}
                      </td>

                      {/* 6. Opponent Name */}
                      <td className="py-3 px-3 font-medium text-slate-800 print:text-black">
                        <div>{c.opponentName}</div>
                        {c.opponentAdvocate && (
                          <div className="text-[10px] text-slate-400 print:text-slate-600">
                            Adv. {c.opponentAdvocate}
                          </div>
                        )}
                      </td>

                      {/* 7. Purpose of Hearing */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium text-[11px] print:border-none print:p-0">
                          {entry.scheduledPurpose}
                        </span>
                      </td>

                      {/* 8. Previous Hearing Date */}
                      <td className="py-3 px-3 font-mono text-slate-600 text-[11px]">
                        {c.previousHearingDate ? (
                          new Date(c.previousHearingDate).toLocaleDateString('en-IN')
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* 9. Next Hearing Date */}
                      <td className="py-3 px-3">
                        {entry.nextHearingDate ? (
                          <div className="font-mono font-bold text-legal-950 text-[11px]">
                            {new Date(entry.nextHearingDate).toLocaleDateString('en-IN')}
                            {entry.nextHearingPurpose && (
                              <div className="font-sans font-normal text-[10px] text-slate-500 truncate max-w-[110px]">
                                {entry.nextHearingPurpose}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Pending</span>
                        )}
                      </td>

                      {/* 10. Today's Proceedings */}
                      <td className="py-3 px-4">
                        {entry.isCompleted ? (
                          <div className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                            {entry.proceedings}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-semibold print:border-none">
                            <Clock className="w-3 h-3" />
                            <span>Pending Update</span>
                          </span>
                        )}
                      </td>

                      {/* 11. Status */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            entry.isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {entry.isCompleted ? 'Updated' : 'Pending'}
                        </span>
                      </td>

                      {/* 12. Actions */}
                      <td className="py-3 px-3 text-right print:hidden">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenUpdateModal(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-legal-900 hover:bg-legal-800 text-white font-semibold text-[11px] transition-colors shadow-sm whitespace-nowrap"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{entry.isCompleted ? 'Edit Proceeding' : 'Update Hearing'}</span>
                          </button>

                          <Link
                            to={`/cases/${c._id}`}
                            className="p-1 text-slate-600 hover:text-legal-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Open Full Case Profile"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Update Hearing Modal */}
      <UpdateHearingModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        caseItem={selectedCaseForUpdate}
        defaultHearingDate={selectedDate}
        defaultPurpose={selectedCaseForUpdate?.nextHearingPurpose}
      />
    </div>
  );
};

