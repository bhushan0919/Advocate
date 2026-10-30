import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  Calendar,
  Building2,
  Clock,
  Archive,
  ArchiveRestore,
  Edit2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  User,
  Scale,
} from 'lucide-react';
import { casesApi } from '../../api/cases.api.ts';
import { CaseRecord, CaseStatus, CaseType } from '../../types/case.ts';
import { CaseModal } from './CaseModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext';

export const CasesRegister: React.FC = () => {
  const { workspace } = useAuth();
  const { language, formatDate } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Filters & Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourt, setSelectedCourt] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedHearingDate, setSelectedHearingDate] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [caseToEdit, setCaseToEdit] = useState<CaseRecord | null>(null);

  // Toast State
  const [notification, setNotification] = useState<string | null>(null);

  // Fetch Cases with TanStack Query
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      'cases',
      workspace?.id,
      page,
      limit,
      searchQuery,
      selectedCourt,
      selectedType,
      selectedStatus,
      selectedHearingDate,
      showArchived,
    ],
    queryFn: () =>
      casesApi.getCases({
        page,
        limit,
        search: searchQuery || undefined,
        court: selectedCourt || undefined,
        caseType: selectedType || undefined,
        status: selectedStatus || undefined,
        hearingDate: selectedHearingDate || undefined,
        isArchived: showArchived ? 'true' : false,
      }),
    enabled: !!workspace?.id,
  });

  // Archive / Restore Mutation
  const archiveMutation = useMutation({
    mutationFn: ({ id, isArchived }: { id: string; isArchived: boolean }) =>
      casesApi.archiveCase(id, isArchived),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setNotification(
        res.isArchived
          ? `Case ${res.caseNumber} has been moved to Archive.`
          : `Case ${res.caseNumber} restored to active register.`
      );
      setTimeout(() => setNotification(null), 4000);
    },
    onError: (err: any) => {
      setNotification(err.response?.data?.message || 'Failed to update case archive state.');
      setTimeout(() => setNotification(null), 4000);
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchQuery('');
    setSelectedCourt('');
    setSelectedType('');
    setSelectedStatus('');
    setSelectedHearingDate('');
    setShowArchived(false);
    setPage(1);
  };

  const handleOpenCreateModal = () => {
    setCaseToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (caseItem: CaseRecord) => {
    setCaseToEdit(caseItem);
    setIsModalOpen(true);
  };

  const handleToggleArchive = (caseItem: CaseRecord) => {
    const nextArchived = !caseItem.isArchived;
    const confirmPrompt = nextArchived
      ? `Archive case "${caseItem.caseNumber}"? It will be hidden from the active daily diary and active register.`
      : `Restore case "${caseItem.caseNumber}" to the active case register?`;

    if (window.confirm(confirmPrompt)) {
      archiveMutation.mutate({ id: caseItem._id, isArchived: nextArchived });
    }
  };

  const cases = data?.cases || [];
  const total = data?.pagination.total || 0;
  const totalPages = data?.pagination.totalPages || 1;

  // Format Helper: Relative days indicator for next hearing
  const getHearingUrgencyBadge = (dateStr?: string) => {
    if (!dateStr) return null;
    const hearing = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    hearing.setHours(0, 0, 0, 0);

    const diffDays = Math.round((hearing.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 animate-pulse">
          {t('common.today')}
        </span>
      );
    } else if (diffDays === 1) {
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
          {language === 'mr' ? 'उद्या' : 'Tomorrow'}
        </span>
      );
    } else if (diffDays > 1 && diffDays <= 7) {
      return (
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
          {language === 'mr' ? `${diffDays} दिवसांत` : `In ${diffDays} days`}
        </span>
      );
    } else if (diffDays < 0) {
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
          {language === 'mr' ? 'मागील' : 'Past'}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-legal-800" />
              <span>{t('cases.title')}</span>
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-legal-100 text-legal-800 border border-legal-200">
              {total} {showArchived ? t('common.archived') : t('common.active')} {t('common.results')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('cases.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowArchived(!showArchived);
              setPage(1);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              showArchived
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>{showArchived ? t('common.archived') : `${t('common.view')} ${t('common.archived')}`}</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-legal-900 hover:bg-legal-800 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('cases.newCase')}</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Search and Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Main Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Case No., CNR, Litigant, Opponent, or Court..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 placeholder:text-slate-400"
            />
          </form>

          {/* Quick Date Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap hidden sm:inline">
              Hearing Date:
            </span>
            <input
              type="date"
              value={selectedHearingDate}
              onChange={(e) => {
                setSelectedHearingDate(e.target.value);
                setPage(1);
              }}
              className="py-1.5 px-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-700 font-mono"
            />
          </div>
        </div>

        {/* Filter Dropdowns Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Court Filter */}
          <input
            type="text"
            value={selectedCourt}
            onChange={(e) => {
              setSelectedCourt(e.target.value);
              setPage(1);
            }}
            placeholder="Filter Court..."
            className="py-1 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-700 w-36"
          />

          {/* Case Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="py-1 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-700 font-medium"
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
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="py-1 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-700 font-medium"
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Disposed">Disposed</option>
            <option value="Transferred">Transferred</option>
            <option value="Withdrawn">Withdrawn</option>
            <option value="Stayed">Stayed</option>
          </select>

          {/* Reset Button */}
          {(searchQuery ||
            selectedCourt ||
            selectedType ||
            selectedStatus ||
            selectedHearingDate ||
            searchInput ||
            showArchived) && (
            <button
              onClick={handleClearFilters}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-14 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-legal-800 border-t-transparent rounded-full animate-spin" />
            <span>Loading cases register...</span>
          </div>
        ) : isError ? (
          <div className="p-10 text-center text-xs text-rose-600 flex flex-col items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            <span>Failed to load court cases: {(error as any)?.message || 'Server error'}</span>
            <button
              onClick={() => refetch()}
              className="mt-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
            >
              Retry
            </button>
          </div>
        ) : cases.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              {showArchived ? 'No Archived Cases Found' : 'No Court Cases Registered'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedCourt || selectedType || selectedStatus || selectedHearingDate
                ? 'No cases match your active filters. Try resetting the search filters.'
                : 'Register your first case with CNR numbers, hearing calendar, and parties.'}
            </p>
            {!showArchived && (
              <button
                onClick={handleOpenCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-legal-900 text-white text-xs font-semibold hover:bg-legal-800 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register New Case</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 w-12 text-center">#</th>
                  <th className="py-2.5 px-4">{t('cases.caseNumber')}</th>
                  <th className="py-2.5 px-4">{t('cases.client')}</th>
                  <th className="py-2.5 px-4">{t('cases.opponentName')}</th>
                  <th className="py-2.5 px-4">{t('cases.courtName')}</th>
                  <th className="py-2.5 px-4">{t('cases.filingDate')}</th>
                  <th className="py-2.5 px-4">{t('cases.nextHearingDate')}</th>
                  <th className="py-2.5 px-4">{t('cases.nextHearingPurpose')}</th>
                  <th className="py-2.5 px-4">{t('common.status')}</th>
                  <th className="py-2.5 px-4 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((c, index) => {
                  const srNo = (page - 1) * limit + index + 1;
                  const clientObj = typeof c.clientId === 'object' && c.clientId !== null ? c.clientId : null;
                  const clientName = clientObj?.fullName || c.clientName || 'Client';
                  const clientIdStr = clientObj?._id || (typeof c.clientId === 'string' ? c.clientId : '');

                  return (
                    <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                      {/* 1. Sr. No. */}
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-semibold text-[11px]">
                        {srNo}
                      </td>

                      {/* 2. Case Number & CNR */}
                      <td className="py-3 px-4">
                        <Link
                          to={`/cases/${c._id}`}
                          className="font-bold text-legal-900 hover:text-legal-700 font-mono text-xs flex items-center gap-1"
                        >
                          <span>{c.caseNumber}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 inline" />
                        </Link>
                        {c.cnrNumber && (
                          <div className="font-mono text-[10px] text-slate-400 tracking-wider">
                            {c.cnrNumber}
                          </div>
                        )}
                        <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          {c.caseType}
                        </span>
                      </td>

                      {/* 3. Client Name */}
                      <td className="py-3 px-4">
                        {clientIdStr ? (
                          <Link
                            to={`/clients/${clientIdStr}`}
                            className="font-semibold text-slate-900 hover:text-legal-800 flex items-center gap-1"
                          >
                            <User className="w-3 h-3 text-slate-400" />
                            <span>{clientName}</span>
                          </Link>
                        ) : (
                          <span className="font-semibold text-slate-900">{clientName}</span>
                        )}
                      </td>

                      {/* 4. Opponent Name */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800">{c.opponentName}</div>
                        {c.opponentAdvocate && (
                          <div className="text-[10px] text-slate-400">Adv. {c.opponentAdvocate}</div>
                        )}
                      </td>

                      {/* 5. Court & Room */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{c.courtName}</div>
                        {(c.courtRoomNumber || c.courtLocation) && (
                          <div className="text-[10px] text-slate-500">
                            {[c.courtRoomNumber, c.courtLocation].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </td>

                      {/* 6. Previous Hearing */}
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                        {c.previousHearingDate ? (
                          formatDate(c.previousHearingDate)
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* 7. Next Hearing */}
                      <td className="py-3 px-4">
                        {c.nextHearingDate ? (
                          <div className="space-y-0.5">
                            <div className="font-mono font-bold text-slate-900 flex items-center gap-1 text-[11px]">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{formatDate(c.nextHearingDate)}</span>
                            </div>
                            <div>{getHearingUrgencyBadge(c.nextHearingDate)}</div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* 8. Purpose */}
                      <td className="py-3 px-4 max-w-[150px]">
                        {c.nextHearingPurpose ? (
                          <span className="truncate block font-medium text-slate-700" title={c.nextHearingPurpose}>
                            {c.nextHearingPurpose}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* 9. Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            c.status === 'Pending'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : c.status === 'Disposed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : c.status === 'Stayed'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      {/* 10. Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/cases/${c._id}`}
                            className="p-1.5 text-slate-600 hover:text-legal-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Full Case Profile"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleOpenEditModal(c)}
                            className="p-1.5 text-slate-600 hover:text-legal-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Case Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleArchive(c)}
                            className="p-1.5 text-slate-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                            title={c.isArchived ? 'Restore Case' : 'Archive Case'}
                          >
                            {c.isArchived ? (
                              <ArchiveRestore className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Archive className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination Footer */}
        {total > 0 && (
          <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              {t('common.showing')} <span className="font-semibold text-slate-900">{(page - 1) * limit + 1}</span> {t('common.to')}{' '}
              <span className="font-semibold text-slate-900">
                {Math.min(page * limit, total)}
              </span>{' '}
              {t('common.of')} <span className="font-semibold text-slate-900">{total}</span> {t('common.results')}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-medium">
                {t('common.page')} {page} {t('common.of')} {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Case Modal */}
      <CaseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['cases'] });
        }}
        caseToEdit={caseToEdit}
      />
    </div>
  );
};

