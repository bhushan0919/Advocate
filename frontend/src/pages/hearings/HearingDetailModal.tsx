import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Scale,
  Calendar,
  Building2,
  Clock,
  User,
  History,
  Edit3,
  AlertCircle,
  CheckCircle2,
  FileText,
  ShieldAlert,
} from 'lucide-react';
import { HearingRecord, CorrectHearingPayload } from '../../types/hearing.ts';
import { hearingsApi } from '../../api/hearings.api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

interface HearingDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  hearing: HearingRecord | null;
  onSuccess?: () => void;
}

export const HearingDetailModal: React.FC<HearingDetailModalProps> = ({
  isOpen,
  onClose,
  hearing,
  onSuccess,
}) => {
  const { workspace } = useAuth();
  const queryClient = useQueryClient();
  const isAdvocateOrOwner = workspace?.role === 'owner' || workspace?.role === 'advocate';

  const [isCorrecting, setIsCorrecting] = useState(false);
  const [reason, setReason] = useState('');
  const [purpose, setPurpose] = useState('');
  const [proceedings, setProceedings] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [nextPurpose, setNextPurpose] = useState('');
  const [remarks, setRemarks] = useState('');
  const [apiError, setApiError] = useState<string | null>(null);

  React.useEffect(() => {
    if (hearing) {
      setPurpose(hearing.purpose);
      setProceedings(hearing.proceedings);
      setNextDate(hearing.nextHearingDate ? hearing.nextHearingDate.split('T')[0] : '');
      setNextPurpose(hearing.nextHearingPurpose || '');
      setRemarks(hearing.additionalRemarks || '');
      setReason('');
      setIsCorrecting(false);
      setApiError(null);
    }
  }, [hearing, isOpen]);

  const correctMutation = useMutation({
    mutationFn: (payload: CorrectHearingPayload) =>
      hearingsApi.correctHearing(hearing!._id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hearings'] });
      queryClient.invalidateQueries({ queryKey: ['case-hearings'] });
      queryClient.invalidateQueries({ queryKey: ['daily-diary'] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      setIsCorrecting(false);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setApiError(err.response?.data?.message || 'Failed to submit correction.');
    },
  });

  if (!isOpen || !hearing) return null;

  const handleCorrectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setApiError('Please provide a mandatory audit reason explaining why this record is being corrected.');
      return;
    }
    setApiError(null);
    correctMutation.mutate({
      reason: reason.trim(),
      purpose: purpose.trim(),
      proceedings: proceedings.trim(),
      nextHearingDate: nextDate || undefined,
      nextHearingPurpose: nextPurpose.trim(),
      additionalRemarks: remarks.trim(),
    });
  };

  const caseNumber =
    typeof hearing.caseId === 'object' && hearing.caseId !== null
      ? hearing.caseId.caseNumber
      : hearing.caseNumber || 'Case Record';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-legal-100 text-legal-800 flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-mono">{caseNumber}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-legal-50 text-legal-800 border border-legal-200">
                  {hearing.purpose}
                </span>
                {hearing.corrections && hearing.corrections.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                    Audited Correction
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {hearing.clientName} vs. {hearing.opponentName} • {hearing.courtName}
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

        {/* Global Error */}
        {apiError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Hearing Date</span>
              <div className="font-mono font-bold text-slate-900 mt-0.5">
                {new Date(hearing.hearingDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Court & Room</span>
              <div className="font-medium text-slate-800 mt-0.5 truncate" title={hearing.courtName}>
                {hearing.courtName}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                {hearing.courtRoom || 'Main Room'}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Next Hearing</span>
              <div className="font-mono font-bold text-slate-900 mt-0.5">
                {hearing.nextHearingDate
                  ? new Date(hearing.nextHearingDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Not fixed'}
              </div>
              <div className="text-[10px] text-slate-500 truncate" title={hearing.nextHearingPurpose}>
                {hearing.nextHearingPurpose || '—'}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Recorded By</span>
              <div className="font-medium text-slate-800 mt-0.5 truncate">
                {hearing.createdBy?.fullName || 'Advocate'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                {new Date(hearing.createdAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>

          {!isCorrecting ? (
            <>
              {/* Detailed Proceedings */}
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-legal-800" />
                  <span>Recorded Court Proceedings</span>
                </h4>
                <div className="p-4 rounded-xl bg-white border border-slate-200 text-slate-800 whitespace-pre-wrap leading-relaxed shadow-sm">
                  {hearing.proceedings}
                </div>
              </div>

              {/* Remarks */}
              {hearing.additionalRemarks && (
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Additional Remarks / Orders
                  </h4>
                  <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 text-slate-800">
                    {hearing.additionalRemarks}
                  </div>
                </div>
              )}

              {/* Audit History Timeline (if any) */}
              {hearing.corrections && hearing.corrections.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-amber-600" />
                    <span>Historical Audit Corrections Log ({hearing.corrections.length})</span>
                  </h4>
                  <div className="space-y-2">
                    {hearing.corrections.map((corr, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span className="font-semibold text-slate-800">
                            Corrected by {corr.correctedBy?.fullName || 'Advocate'}
                          </span>
                          <span className="font-mono">
                            {new Date(corr.correctedAt).toLocaleDateString('en-IN')}{' '}
                            {new Date(corr.correctedAt).toLocaleTimeString('en-IN')}
                          </span>
                        </div>
                        <div className="text-xs">
                          <strong>Audit Reason:</strong> {corr.reason}
                        </div>
                        {corr.previousValues?.proceedings && (
                          <div className="text-[11px] text-slate-500 font-mono bg-white p-2 rounded border border-slate-200">
                            <strong>Previous Text:</strong> {corr.previousValues.proceedings}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Advocate Correction Trigger Button */}
              {isAdvocateOrOwner && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCorrecting(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Apply Audited Correction (Advocate Only)</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Controlled Audited Correction Form */
            <form onSubmit={handleCorrectSubmit} className="space-y-4 pt-2">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-700" />
                <div>
                  <div className="font-bold">Controlled Audited Correction</div>
                  <div>
                    Indian court records are immutable by default. Correcting this entry will create
                    a permanent audit trail recording your identity, timestamp, and explanation.
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mandatory Audit Reason <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Corrected typographical error in interim relief terms"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Purpose</label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corrected Proceedings Text
                </label>
                <textarea
                  rows={4}
                  value={proceedings}
                  onChange={(e) => setProceedings(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Next Hearing Date
                  </label>
                  <input
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Next Hearing Purpose
                  </label>
                  <input
                    type="text"
                    value={nextPurpose}
                    onChange={(e) => setNextPurpose(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Additional Remarks
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCorrecting(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel Correction
                </button>
                <button
                  type="submit"
                  disabled={correctMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                >
                  {correctMutation.isPending ? 'Saving Audit...' : 'Save Audited Correction'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

