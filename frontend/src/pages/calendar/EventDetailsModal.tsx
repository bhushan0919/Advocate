import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  Calendar,
  Scale,
  Building2,
  Clock,
  User,
  ExternalLink,
  BookOpen,
  History,
  Edit3,
  MapPin,
  Phone,
  Mail,
  Shield,
  FileText,
} from 'lucide-react';
import { CalendarEvent } from '../../types/calendar.ts';
import { CaseRecord } from '../../types/case.ts';
import { UpdateHearingModal } from '../diary/UpdateHearingModal.tsx';
import { useQueryClient } from '@tanstack/react-query';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onSuccess?: () => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  isOpen,
  onClose,
  event,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isUpdateHearingOpen, setIsUpdateHearingOpen] = useState(false);

  if (!isOpen || !event) return null;

  const clientObj = typeof event.clientId === 'object' && event.clientId !== null ? event.clientId : null;
  const clientName = clientObj?.fullName || event.clientName || 'Litigant';

  const formattedHearingDate = new Date(event.nextHearingDate).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const formattedPrevDate = event.previousHearingDate
    ? new Date(event.previousHearingDate).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  // Convert CalendarEvent to CaseRecord shape for UpdateHearingModal
  const caseRecordForModal: CaseRecord = {
    _id: event.caseId || event._id,
    workspaceId: '',
    caseNumber: event.caseNumber,
    cnrNumber: event.cnrNumber,
    caseType: event.caseType as any,
    courtName: event.courtName,
    courtLocation: event.courtLocation,
    courtRoomNumber: event.courtRoom,
    clientId: clientObj?._id || (typeof event.clientId === 'string' ? event.clientId : ''),
    clientName: clientName,
    opponentName: event.opponentName,
    opponentAdvocate: event.opponentAdvocate,
    filingDate: event.filingDate,
    previousHearingDate: event.previousHearingDate,
    nextHearingDate: event.nextHearingDate,
    nextHearingPurpose: event.purpose,
    status: event.status as any,
    caseDescription: event.caseDescription,
    isArchived: event.isArchived,
    createdAt: '',
    updatedAt: '',
  };

  const handleViewCase = () => {
    onClose();
    navigate(`/cases/${event.caseId || event._id}`);
  };

  const handleOpenDiary = () => {
    onClose();
    navigate(`/diary?date=${event.date}`);
  };

  const handleViewHearingHistory = () => {
    onClose();
    navigate(`/hearings?caseNumber=${encodeURIComponent(event.caseNumber)}`);
  };

  const handleHearingUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-summary'] });
    queryClient.invalidateQueries({ queryKey: ['daily-diary'] });
    queryClient.invalidateQueries({ queryKey: ['diary-summary'] });
    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-legal-900 text-white flex items-center justify-center font-bold shadow-sm">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold font-mono text-slate-900">
                    {event.caseNumber}
                  </h3>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                      event.status === 'Pending'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : event.status === 'Disposed'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : event.status === 'Stayed'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {event.status}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    {event.caseType}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  CNR: {event.cnrNumber || 'Not assigned'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
            {/* Hearing Highlight Box */}
            <div className="bg-legal-50/70 border border-legal-200 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-legal-200/60 pb-2 mb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-legal-950 uppercase tracking-wide">
                  <Calendar className="w-4 h-4 text-legal-800" />
                  <span>Scheduled Hearing Date</span>
                </div>
                <span className="text-xs font-mono font-bold text-legal-900 bg-white px-2.5 py-0.5 rounded-full border border-legal-200">
                  {event.date}
                </span>
              </div>

              <div className="text-sm font-semibold text-slate-900">
                {formattedHearingDate}
              </div>

              <div className="mt-2 flex items-start gap-2 text-xs text-slate-700">
                <Clock className="w-4 h-4 text-legal-800 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900">Hearing Purpose: </span>
                  <span className="font-medium text-legal-900">{event.purpose}</span>
                </div>
              </div>

              {formattedPrevDate && (
                <div className="mt-1 text-[11px] text-slate-500 pl-6">
                  Previous Hearing: {formattedPrevDate}
                </div>
              )}
            </div>

            {/* Litigants Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Client Info */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-legal-800" />
                    <span>Client / Litigant</span>
                  </span>
                  {clientObj?.clientType && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-medium">
                      {clientObj.clientType}
                    </span>
                  )}
                </div>
                <div className="font-bold text-slate-900 text-sm">{clientName}</div>
                {clientObj?.mobile && (
                  <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px]">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{clientObj.mobile}</span>
                  </div>
                )}
                {clientObj?.email && (
                  <div className="flex items-center gap-1.5 text-slate-600 text-[11px] truncate">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span className="truncate">{clientObj.email}</span>
                  </div>
                )}
              </div>

              {/* Opponent Info */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="border-b border-slate-100 pb-1.5">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-slate-500" />
                    <span>Opponent Party</span>
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-sm">{event.opponentName}</div>
                <div className="text-[11px] text-slate-600">
                  <span className="text-slate-400">Advocate: </span>
                  <span className="font-medium text-slate-800">
                    {event.opponentAdvocate ? `Adv. ${event.opponentAdvocate}` : 'Not recorded'}
                  </span>
                </div>
              </div>
            </div>

            {/* Court Details */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                <Building2 className="w-3.5 h-3.5 text-legal-800" />
                <span>Court / Forum Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Court Name</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{event.courtName}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Court Room / Hall</div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    {event.courtRoom || 'Main Board'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-medium">Bench / Location</div>
                  <div className="text-slate-700 mt-0.5">{event.courtLocation || 'Court Complex'}</div>
                </div>
              </div>
            </div>

            {/* Case Description or Staff Notes if present */}
            {event.caseDescription && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-600 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <FileText className="w-3 h-3 text-slate-400" />
                  <span>Chamber Brief</span>
                </div>
                <p className="text-slate-700 whitespace-pre-wrap">{event.caseDescription}</p>
              </div>
            )}

            {/* Assigned Clerk */}
            {event.assignedClerk && (
              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Assigned Clerk:{' '}
                  <strong className="text-slate-700 font-semibold">
                    {event.assignedClerk.fullName}
                  </strong>{' '}
                  ({event.assignedClerk.email})
                </span>
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleViewCase}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>View Case</span>
              </button>

              <button
                onClick={handleOpenDiary}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5 text-legal-800" />
                <span>Open Daily Diary</span>
              </button>

              <button
                onClick={handleViewHearingHistory}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
              >
                <History className="w-3.5 h-3.5 text-slate-600" />
                <span>Hearing History</span>
              </button>
            </div>

            <button
              onClick={() => setIsUpdateHearingOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-legal-900 hover:bg-legal-800 text-white text-xs font-semibold shadow-sm transition-colors ml-auto"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Update Hearing</span>
            </button>
          </div>
        </div>
      </div>

      {/* Update Hearing Modal */}
      <UpdateHearingModal
        isOpen={isUpdateHearingOpen}
        onClose={() => setIsUpdateHearingOpen(false)}
        caseItem={caseRecordForModal}
        defaultHearingDate={event.date}
        defaultPurpose={event.purpose}
        onSuccess={handleHearingUpdated}
      />
    </>
  );
};

