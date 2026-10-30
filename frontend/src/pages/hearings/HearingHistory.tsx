import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  Calendar,
  Building2,
  Clock,
  User,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Eye,
  Edit3,
  Scale,
} from 'lucide-react';
import { hearingsApi } from '../../api/hearings.api.ts';
import { staffApi } from '../../api/staff.api.ts';
import { HearingRecord } from '../../types/hearing.ts';
import { HearingDetailModal } from './HearingDetailModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTranslation } from 'react-i18next';

export const HearingHistory: React.FC = () => {
  const { workspace } = useAuth();
  const { t, i18n } = useTranslation();
  const isMr = i18n.language === 'mr';

  // Filters & Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourt, setSelectedCourt] = useState('');
  const [selectedCaseType, setSelectedCaseType] = useState('');
  const [selectedHearingDate, setSelectedHearingDate] = useState('');
  const [selectedUpdatedBy, setSelectedUpdatedBy] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Modal State
  const [selectedHearing, setSelectedHearing] = useState<HearingRecord | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Fetch Chamber Members for Staff Filter
  const { data: membersData } = useQuery({
    queryKey: ['staff-members', workspace?.id],
    queryFn: () => staffApi.getMembers(),
    enabled: !!workspace?.id,
  });

  // Fetch Hearings Register
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      'hearings',
      workspace?.id,
      page,
      limit,
      searchQuery,
      selectedCourt,
      selectedCaseType,
      selectedHearingDate,
      selectedUpdatedBy,
      sortOrder,
    ],
    queryFn: () =>
      hearingsApi.getWorkspaceHearings({
        page,
        limit,
        search: searchQuery || undefined,
        court: selectedCourt || undefined,
        caseType: selectedCaseType || undefined,
        hearingDate: selectedHearingDate || undefined,
        updatedBy: selectedUpdatedBy || undefined,
        sortOrder,
      }),
    enabled: !!workspace?.id,
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
    setSelectedCaseType('');
    setSelectedHearingDate('');
    setSelectedUpdatedBy('');
    setPage(1);
  };

  const handleOpenDetailModal = (h: HearingRecord) => {
    setSelectedHearing(h);
    setIsDetailModalOpen(true);
  };

  const hearings = data?.hearings || [];
  const total = data?.pagination.total || 0;
  const totalPages = data?.pagination.totalPages || 1;
  const members = membersData || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-legal-800" />
              <span>{isMr ? 'सुनावणी इतिहास व कामकाज नोंदी' : 'Hearing History & Proceeding Audit Trail'}</span>
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-legal-100 text-legal-800 border border-legal-200">
              {isMr ? `एकूण ${total} सुनावणी नोंदी` : `${total} Total Proceedings`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isMr
              ? 'सर्व मागील न्यायालयीन कामकाज, दैनंदिन बोर्ड आदेश आणि पुढील तारखांची अपरिवर्तनीय नोंद.'
              : 'Immutable audit record of all past court proceedings, daily board orders, and scheduled next dates.'}
          </p>
        </div>

        <Link
          to="/diary"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-legal-900 hover:bg-legal-800 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <span>{isMr ? 'दैनंदिन डायरी उघडा' : 'Open Daily Diary'}</span>
        </Link>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Main Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by Case No., Client, Opponent, Court, or Proceeding terms..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 placeholder:text-slate-400"
            />
          </form>

          {/* Date Picker Filter */}
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

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
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
            value={selectedCaseType}
            onChange={(e) => {
              setSelectedCaseType(e.target.value);
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

          {/* Updated By Filter */}
          <select
            value={selectedUpdatedBy}
            onChange={(e) => {
              setSelectedUpdatedBy(e.target.value);
              setPage(1);
            }}
            className="py-1 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-700 font-medium"
          >
            <option value="">All Staff / Advocates</option>
            {members.map((m) => (
              <option key={m.user._id} value={m.user._id}>
                {m.user.fullName} ({m.role})
              </option>
            ))}
          </select>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="py-1 px-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg hover:bg-slate-100 text-slate-700 font-medium transition-colors"
          >
            Date: {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
          </button>

          {/* Reset Filters */}
          {(searchQuery ||
            selectedCourt ||
            selectedCaseType ||
            selectedHearingDate ||
            selectedUpdatedBy ||
            searchInput) && (
            <button
              onClick={handleClearFilters}
              className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-14 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-legal-800 border-t-transparent rounded-full animate-spin" />
            <span>Loading historical hearings register...</span>
          </div>
        ) : isError ? (
          <div className="p-10 text-center text-xs text-rose-600 flex flex-col items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            <span>Failed to load hearings: {(error as any)?.message || 'Server error'}</span>
            <button
              onClick={() => refetch()}
              className="mt-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200"
            >
              Retry
            </button>
          </div>
        ) : hearings.length === 0 ? (
          <div className="p-14 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Hearing Records Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedCourt || selectedCaseType || selectedHearingDate
                ? 'No hearing history matches your active filters. Try resetting search filters.'
                : 'Proceedings recorded from the Daily Court Diary or Case Profiles will build an immutable audit trail here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 w-10 text-center">Sr.</th>
                  <th className="py-2.5 px-3">Case Number</th>
                  <th className="py-2.5 px-3">Client Name</th>
                  <th className="py-2.5 px-3">Opponent Party</th>
                  <th className="py-2.5 px-3">Hearing Date</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-4 min-w-[200px]">Proceedings</th>
                  <th className="py-2.5 px-3">Next Hearing</th>
                  <th className="py-2.5 px-3">Updated By</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hearings.map((h: HearingRecord, index: number) => {
                  const srNo = (page - 1) * limit + index + 1;
                  const caseIdStr = typeof h.caseId === 'object' && h.caseId !== null ? h.caseId._id : h.caseId;
                  const caseNo = typeof h.caseId === 'object' && h.caseId !== null ? h.caseId.caseNumber : h.caseNumber;

                  return (
                    <tr key={h._id} className="hover:bg-slate-50/60 transition-colors">
                      {/* 1. Sr. No. */}
                      <td className="py-3 px-3 text-center font-mono text-slate-400 font-semibold text-[11px]">
                        {srNo}
                      </td>

                      {/* 2. Case Number */}
                      <td className="py-3 px-3">
                        <Link
                          to={`/cases/${caseIdStr}`}
                          className="font-bold text-legal-900 hover:text-legal-700 font-mono flex items-center gap-1"
                        >
                          <span>{caseNo}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                        </Link>
                        <div className="text-[10px] text-slate-500 truncate max-w-[120px]" title={h.courtName}>
                          {h.courtName}
                        </div>
                      </td>

                      {/* 3. Client Name */}
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {h.clientName}
                      </td>

                      {/* 4. Opponent Name */}
                      <td className="py-3 px-3 font-medium text-slate-700">
                        {h.opponentName}
                      </td>

                      {/* 5. Hearing Date */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900 text-[11px]">
                        {new Date(h.hearingDate).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* 6. Hearing Purpose */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium text-[11px]">
                          {h.purpose}
                        </span>
                      </td>

                      {/* 7. Proceedings */}
                      <td className="py-3 px-4 max-w-[280px]">
                        <div className="text-slate-800 line-clamp-2 leading-relaxed" title={h.proceedings}>
                          {h.proceedings}
                        </div>
                        {h.corrections && h.corrections.length > 0 && (
                          <span className="inline-block mt-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                            Audited ({h.corrections.length} correction{h.corrections.length > 1 ? 's' : ''})
                          </span>
                        )}
                      </td>

                      {/* 8. Next Hearing Date */}
                      <td className="py-3 px-3">
                        {h.nextHearingDate ? (
                          <div className="font-mono text-legal-900 font-semibold text-[11px]">
                            {new Date(h.nextHearingDate).toLocaleDateString('en-IN')}
                            {h.nextHearingPurpose && (
                              <div className="font-sans font-normal text-[10px] text-slate-500 truncate max-w-[110px]">
                                {h.nextHearingPurpose}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* 9. Updated By */}
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{h.createdBy?.fullName || 'Staff'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {new Date(h.createdAt).toLocaleDateString('en-IN')}
                        </div>
                      </td>

                      {/* 10. Actions */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenDetailModal(h)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-[11px] transition-colors shadow-sm"
                          title="View detailed proceedings and audit history"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > 0 && (
          <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold text-slate-900">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-900">
                {Math.min(page * limit, total)}
              </span>{' '}
              of <span className="font-semibold text-slate-900">{total}</span> hearing proceedings
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
                Page {page} of {totalPages}
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

      {/* Hearing Detail Modal */}
      <HearingDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        hearing={selectedHearing}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

