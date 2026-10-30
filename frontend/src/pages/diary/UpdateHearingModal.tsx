import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Clock, Building2, AlertCircle, CheckCircle2, Scale } from 'lucide-react';
import { CaseRecord } from '../../types/case.ts';
import { CreateHearingPayload } from '../../types/hearing.ts';
import { hearingsApi } from '../../api/hearings.api.ts';

const updateHearingSchema = z
  .object({
    hearingDate: z.string().min(1, 'Today hearing date is required'),
    purpose: z.string().trim().min(1, 'Purpose of hearing is required'),
    proceedings: z.string().trim().min(1, 'Please record what happened today in court'),
    nextHearingDate: z.string().min(1, 'Next hearing date is required'),
    nextHearingPurpose: z.string().trim().min(1, 'Next hearing purpose is required'),
    courtName: z.string().trim().optional(),
    courtRoom: z.string().trim().optional(),
    additionalRemarks: z.string().trim().optional(),
    associatedOrderUrl: z.string().trim().optional(),
  })
  .refine(
    (data) => {
      if (!data.hearingDate || !data.nextHearingDate) return true;
      return new Date(data.nextHearingDate).getTime() >= new Date(data.hearingDate).getTime();
    },
    {
      message: 'Next hearing date cannot be earlier than today hearing date',
      path: ['nextHearingDate'],
    }
  );

interface UpdateHearingModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseItem: CaseRecord | null;
  defaultHearingDate?: string;
  defaultPurpose?: string;
  onSuccess?: () => void;
}

export const UpdateHearingModal: React.FC<UpdateHearingModalProps> = ({
  isOpen,
  onClose,
  caseItem,
  defaultHearingDate,
  defaultPurpose,
  onSuccess,
}) => {
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const todayStr = defaultHearingDate || new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateHearingPayload>({
    resolver: zodResolver(updateHearingSchema),
    defaultValues: {
      hearingDate: todayStr,
      purpose: defaultPurpose || '',
      proceedings: '',
      nextHearingDate: '',
      nextHearingPurpose: '',
      courtName: '',
      courtRoom: '',
      additionalRemarks: '',
      associatedOrderUrl: '',
    },
  });

  useEffect(() => {
    if (caseItem) {
      reset({
        hearingDate: defaultHearingDate || todayStr,
        purpose: defaultPurpose || caseItem.nextHearingPurpose || 'Hearing',
        proceedings: '',
        nextHearingDate: '',
        nextHearingPurpose: '',
        courtName: caseItem.courtName || '',
        courtRoom: caseItem.courtRoomNumber || '',
        additionalRemarks: '',
        associatedOrderUrl: '',
      });
      setApiError(null);
    }
  }, [caseItem, defaultHearingDate, defaultPurpose, isOpen, reset, todayStr]);

  const updateMutation = useMutation({
    mutationFn: (data: CreateHearingPayload) =>
      hearingsApi.createCaseHearing(caseItem!._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-diary'] });
      queryClient.invalidateQueries({ queryKey: ['diary-summary'] });
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-summary'] });
      queryClient.invalidateQueries({ queryKey: ['case', caseItem?._id] });
      queryClient.invalidateQueries({ queryKey: ['case-hearings', caseItem?._id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['hearings'] });

      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (err: any) => {
      setApiError(err.response?.data?.message || 'Failed to record hearing update.');
    },
  });

  if (!isOpen || !caseItem) return null;

  const clientName =
    typeof caseItem.clientId === 'object' && caseItem.clientId !== null
      ? caseItem.clientId.fullName
      : caseItem.clientName || 'Client';

  const onSubmit = (data: CreateHearingPayload) => {
    setApiError(null);
    updateMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-legal-100 text-legal-800 flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Record Court Proceedings</h2>
              <p className="text-xs text-slate-500 font-mono">
                {caseItem.caseNumber} • {clientName} vs. {caseItem.opponentName}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Hearing Date & Purpose */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Today’s Hearing Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                {...register('hearingDate')}
                className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 font-mono ${
                  errors.hearingDate ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                }`}
              />
              {errors.hearingDate && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.hearingDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Scheduled Hearing Purpose <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('purpose')}
                placeholder="e.g. Evidence / Arguments / Framing of Issues"
                className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 ${
                  errors.purpose ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                }`}
              />
              {errors.purpose && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.purpose.message}</p>
              )}
            </div>
          </div>

          {/* Today's Proceedings / What Happened */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Today’s Proceedings / What Happened in Court <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              {...register('proceedings')}
              placeholder="e.g. Plaintiff examined PW-1 on affidavit. Defendant advocate sought adjournment to cross examine. Allowed on payment of Rs. 1000 costs to PLA."
              className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 ${
                errors.proceedings ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
              }`}
            />
            {errors.proceedings && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.proceedings.message}</p>
            )}
          </div>

          {/* Next Hearing Schedule */}
          <div className="p-3.5 rounded-xl bg-legal-50/60 border border-legal-200/80 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-legal-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-legal-800" />
              <span>Next Date Schedule Fixed by Court</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Next Hearing Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  {...register('nextHearingDate')}
                  className={`w-full px-3 py-2 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 font-mono ${
                    errors.nextHearingDate ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                />
                {errors.nextHearingDate && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.nextHearingDate.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Next Hearing Purpose <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('nextHearingPurpose')}
                  placeholder="e.g. Cross Examination of PW-1"
                  className={`w-full px-3 py-2 text-xs bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 ${
                    errors.nextHearingPurpose ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                />
                {errors.nextHearingPurpose && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.nextHearingPurpose.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Court Room & Court Name Updates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Court Name</label>
              <input
                type="text"
                {...register('courtName')}
                placeholder="e.g. Bombay High Court"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Court Room</label>
              <input
                type="text"
                {...register('courtRoom')}
                placeholder="e.g. Court Room 14"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 font-mono"
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Additional Remarks / Court Order Reference
            </label>
            <input
              type="text"
              {...register('additionalRemarks')}
              placeholder="e.g. Certified copy applied; interim relief extended till next date"
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[11px] text-slate-400 italic">
              Saved permanently to hearing history; previous hearings are never overwritten.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || updateMutation.isPending}
                className="px-5 py-2 text-xs font-semibold text-white bg-legal-900 hover:bg-legal-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                {isSubmitting || updateMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Record Proceedings'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

