import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, Briefcase, Edit3, AlertCircle, Calendar, Building2, User } from 'lucide-react';
import { CaseRecord, CaseFormData, CaseStatus, CaseType } from '../../types/case.ts';
import { casesApi } from '../../api/cases.api.ts';
import { clientsApi } from '../../api/clients.api.ts';
import { staffApi } from '../../api/staff.api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

const caseSchema = z.object({
  caseNumber: z
    .string()
    .trim()
    .min(1, 'Case number is required')
    .max(100, 'Case number cannot exceed 100 characters'),
  cnrNumber: z.string().trim().optional(),
  caseType: z.enum(['Civil', 'Criminal', 'Family', 'Property', 'Consumer', 'Labour', 'Other']),
  courtName: z
    .string()
    .trim()
    .min(2, 'Court name is required')
    .max(150, 'Court name cannot exceed 150 characters'),
  courtLocation: z.string().trim().optional(),
  courtRoomNumber: z.string().trim().optional(),
  clientId: z.string().min(1, 'Please select a client'),
  opponentName: z
    .string()
    .trim()
    .min(1, 'Opponent party name is required')
    .max(120, 'Opponent name cannot exceed 120 characters'),
  opponentAdvocate: z.string().trim().optional(),
  filingDate: z.string().optional(),
  previousHearingDate: z.string().optional(),
  nextHearingDate: z.string().optional(),
  nextHearingPurpose: z.string().trim().optional(),
  status: z.enum(['Pending', 'Disposed', 'Transferred', 'Withdrawn', 'Stayed']),
  assignedClerkId: z.string().optional(),
  caseDescription: z.string().optional(),
});

interface CaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  caseToEdit?: CaseRecord | null;
  initialClientId?: string;
}

export const CaseModal: React.FC<CaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  caseToEdit,
  initialClientId,
}) => {
  const { workspace } = useAuth();
  const { t } = useTranslation();
  const [apiError, setApiError] = useState<string | null>(null);

  // Fetch active clients for dropdown
  const { data: clientsData } = useQuery({
    queryKey: ['clients-dropdown', workspace?.id],
    queryFn: () => clientsApi.getClients({ limit: 100 }),
    enabled: isOpen && !!workspace?.id,
  });

  // Fetch workspace members for clerk assignment dropdown
  const { data: membersData } = useQuery({
    queryKey: ['staff-members', workspace?.id],
    queryFn: () => staffApi.getMembers(),
    enabled: isOpen && !!workspace?.id,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CaseFormData>({
    resolver: zodResolver(caseSchema),
    defaultValues: {
      caseNumber: '',
      cnrNumber: '',
      caseType: 'Civil',
      courtName: '',
      courtLocation: '',
      courtRoomNumber: '',
      clientId: initialClientId || '',
      opponentName: '',
      opponentAdvocate: '',
      filingDate: '',
      previousHearingDate: '',
      nextHearingDate: '',
      nextHearingPurpose: '',
      status: 'Pending',
      assignedClerkId: '',
      caseDescription: '',
    },
  });

  const formatDateForInput = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (caseToEdit) {
      const clientId =
        typeof caseToEdit.clientId === 'object' && caseToEdit.clientId !== null
          ? caseToEdit.clientId._id
          : (caseToEdit.clientId as string);

      const clerkId =
        typeof caseToEdit.assignedClerkId === 'object' && caseToEdit.assignedClerkId !== null
          ? caseToEdit.assignedClerkId._id
          : (caseToEdit.assignedClerkId as string) || '';

      reset({
        caseNumber: caseToEdit.caseNumber,
        cnrNumber: caseToEdit.cnrNumber || '',
        caseType: caseToEdit.caseType,
        courtName: caseToEdit.courtName,
        courtLocation: caseToEdit.courtLocation || '',
        courtRoomNumber: caseToEdit.courtRoomNumber || '',
        clientId,
        opponentName: caseToEdit.opponentName,
        opponentAdvocate: caseToEdit.opponentAdvocate || '',
        filingDate: formatDateForInput(caseToEdit.filingDate),
        previousHearingDate: formatDateForInput(caseToEdit.previousHearingDate),
        nextHearingDate: formatDateForInput(caseToEdit.nextHearingDate),
        nextHearingPurpose: caseToEdit.nextHearingPurpose || '',
        status: caseToEdit.status,
        assignedClerkId: clerkId,
        caseDescription: caseDescriptionClean(caseToEdit.caseDescription),
      });
    } else {
      reset({
        caseNumber: '',
        cnrNumber: '',
        caseType: 'Civil',
        courtName: '',
        courtLocation: '',
        courtRoomNumber: '',
        clientId: initialClientId || '',
        opponentName: '',
        opponentAdvocate: '',
        filingDate: '',
        previousHearingDate: '',
        nextHearingDate: '',
        nextHearingPurpose: '',
        status: 'Pending',
        assignedClerkId: '',
        caseDescription: '',
      });
    }
    setApiError(null);
  }, [caseToEdit, initialClientId, isOpen, reset]);

  function caseDescriptionClean(desc?: string) {
    return desc || '';
  }

  if (!isOpen) return null;

  const onSubmit = async (data: CaseFormData) => {
    setApiError(null);
    try {
      // Clean empty string dates
      const payload: CaseFormData = {
        ...data,
        cnrNumber: data.cnrNumber?.trim().toUpperCase() || '',
        filingDate: data.filingDate || undefined,
        previousHearingDate: data.previousHearingDate || undefined,
        nextHearingDate: data.nextHearingDate || undefined,
        assignedClerkId: data.assignedClerkId || undefined,
      };

      if (caseToEdit) {
        await casesApi.updateCase(caseToEdit._id, payload);
      } else {
        await casesApi.createCase(payload);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const resp = err.response?.data;
      if (resp?.field === 'caseNumber') {
        setError('caseNumber', { message: resp.message });
      } else if (resp?.field === 'clientId') {
        setError('clientId', { message: resp.message });
      } else if (resp?.field === 'assignedClerkId') {
        setError('assignedClerkId', { message: resp.message });
      } else {
        setApiError(resp?.message || 'Failed to save case.');
      }
    }
  };

  const clients = clientsData?.clients || [];
  const members = membersData || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-legal-100 text-legal-800 flex items-center justify-center font-bold">
              {caseToEdit ? <Edit3 className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {caseToEdit ? t('cases.editCase') : t('cases.newCase')}
              </h2>
              <p className="text-xs text-slate-500">
                {caseToEdit ? t('cases.subtitle') : t('cases.caseDescriptionPlaceholder')}
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

        {/* API Error Notification */}
        {apiError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Section 1: Identification */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-legal-800 mb-2 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              <span>Case Identification & Type</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Case Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('caseNumber')}
                  placeholder="e.g. WP/3819/2026"
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 font-mono ${
                    errors.caseNumber ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                />
                {errors.caseNumber && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.caseNumber.message}</p>
                )}
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CNR Number (16-Digit)
                </label>
                <input
                  type="text"
                  maxLength={16}
                  {...register('cnrNumber')}
                  placeholder="e.g. MHCB010023452026"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 font-mono uppercase"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Case Category <span className="text-rose-500">*</span>
                </label>
                <select
                  {...register('caseType')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700"
                >
                  <option value="Civil">Civil</option>
                  <option value="Criminal">Criminal</option>
                  <option value="Family">Family / Matrimonial</option>
                  <option value="Property">Property & Land</option>
                  <option value="Consumer">Consumer Forum</option>
                  <option value="Labour">Labour & Industrial</option>
                  <option value="Other">Other Category</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Court Details */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-legal-800 mb-2 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              <span>Court Information</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Court Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('courtName')}
                  placeholder="e.g. Bombay High Court"
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 ${
                    errors.courtName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                />
                {errors.courtName && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.courtName.message}</p>
                )}
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Court Location / Bench
                </label>
                <input
                  type="text"
                  {...register('courtLocation')}
                  placeholder="e.g. Principal Seat, Mumbai"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700"
                />
              </div>

              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Court Room Number
                </label>
                <input
                  type="text"
                  {...register('courtRoomNumber')}
                  placeholder="e.g. Court Room 14"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Litigant & Opponent */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-legal-800 mb-2 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              <span>Parties & Representation</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chamber Client <span className="text-rose-500">*</span>
                </label>
                <select
                  {...register('clientId')}
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 ${
                    errors.clientId ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                >
                  <option value="">-- Select Client from Registry --</option>
                  {clients.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.fullName} ({c.clientType} • {c.mobile})
                    </option>
                  ))}
                </select>
                {errors.clientId && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.clientId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Opponent Party Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('opponentName')}
                  placeholder="e.g. Municipal Corp of Greater Mumbai"
                  className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 ${
                    errors.opponentName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                  }`}
                />
                {errors.opponentName && (
                  <p className="text-[11px] text-rose-600 mt-1">{errors.opponentName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Opponent Advocate
                </label>
                <input
                  type="text"
                  {...register('opponentAdvocate')}
                  placeholder="e.g. Adv. S. K. Mehta & Associates"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Assigned Chamber Clerk
                </label>
                <select
                  {...register('assignedClerkId')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700"
                >
                  <option value="">-- No Clerk Assigned --</option>
                  {members.map((m) => (
                    <option key={m.user._id} value={m.user._id}>
                      {m.user.fullName} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 4: Hearing Schedule & Status */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-legal-800 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Hearing Dates & Status</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Filing Date
                </label>
                <input
                  type="date"
                  {...register('filingDate')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Previous Hearing
                </label>
                <input
                  type="date"
                  {...register('previousHearingDate')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Next Hearing Date
                </label>
                <input
                  type="date"
                  {...register('nextHearingDate')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Case Status <span className="text-rose-500">*</span>
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 font-semibold text-slate-800"
                >
                  <option value="Pending">Pending</option>
                  <option value="Disposed">Disposed</option>
                  <option value="Transferred">Transferred</option>
                  <option value="Withdrawn">Withdrawn</option>
                  <option value="Stayed">Stayed</option>
                </select>
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Next Hearing Purpose
              </label>
              <input
                type="text"
                {...register('nextHearingPurpose')}
                placeholder="e.g. Admission / Interim Relief / Cross Examination of PW-1"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700"
              />
            </div>
          </div>

          {/* Section 5: Description & Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Case Brief & Notes
            </label>
            <textarea
              rows={3}
              {...register('caseDescription')}
              placeholder="Summary of prayers, key citations, vakalatnama status, internal observations..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-legal-900 hover:bg-legal-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : caseToEdit ? (
                t('common.save')
              ) : (
                t('cases.newCase')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

