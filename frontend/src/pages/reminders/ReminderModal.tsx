import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Bell, Calendar, AlertCircle } from 'lucide-react';
import {
  ReminderRecord,
  ReminderFormData,
  ReminderPriority,
  ReminderType,
  ReminderInterval,
} from '../../types/reminder';
import { useQuery } from '@tanstack/react-query';
import { casesApi } from '../../api/cases.api';
import { staffApi } from '../../api/staff.api';
import { useTranslation } from 'react-i18next';

const reminderSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Reminder title is required')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().optional(),
  reminderType: z.enum(['hearing', 'custom'] as const),
  intervalType: z
    .enum(['1_day_before', '3_days_before', '7_days_before', 'custom', 'manual'] as const)
    .optional(),
  caseId: z.string().optional(),
  hearingDate: z.string().optional(),
  reminderDate: z.string().min(1, 'Reminder date and time is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent'] as const),
  assignedTo: z.string().optional(),
});

interface ReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReminderFormData) => Promise<void>;
  initialData?: ReminderRecord | null;
  preselectedCaseId?: string;
  isSubmitting?: boolean;
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  preselectedCaseId,
  isSubmitting = false,
}) => {
  const { t, i18n } = useTranslation();
  const isMr = i18n.language === 'mr';
  const [selectedType, setSelectedType] = useState<ReminderType>('custom');

  const { data: staffMembers } = useQuery({
    queryKey: ['workspace-members'],
    queryFn: () => staffApi.getMembers(),
    enabled: isOpen,
  });

  const { data: casesData } = useQuery({
    queryKey: ['cases-dropdown-list'],
    queryFn: () => casesApi.getCases({ limit: 100, isArchived: false }),
    enabled: isOpen,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ReminderFormData>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: '',
      description: '',
      reminderType: 'custom',
      intervalType: 'custom',
      caseId: preselectedCaseId || '',
      hearingDate: '',
      reminderDate: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16),
      priority: 'High',
      assignedTo: '',
    },
  });

  const watchedCaseId = watch('caseId');
  const watchedInterval = watch('intervalType');

  // When a case is picked for hearing reminder, auto-fill hearing date & reminder date
  useEffect(() => {
    if (selectedType === 'hearing' && watchedCaseId && casesData?.cases) {
      const selectedCase = casesData.cases.find((c) => c._id === watchedCaseId);
      if (selectedCase && selectedCase.nextHearingDate) {
        const hDate = new Date(selectedCase.nextHearingDate);
        setValue('hearingDate', selectedCase.nextHearingDate);
        setValue(
          'title',
          `Hearing: ${selectedCase.caseNumber} - ${selectedCase.courtName}`
        );

        let daysBefore = 1;
        if (watchedInterval === '3_days_before') daysBefore = 3;
        if (watchedInterval === '7_days_before') daysBefore = 7;

        const rDate = new Date(hDate);
        rDate.setDate(rDate.getDate() - daysBefore);
        rDate.setHours(9, 0, 0, 0);

        setValue('reminderDate', rDate.toISOString().slice(0, 16));
      }
    }
  }, [watchedCaseId, watchedInterval, selectedType, casesData, setValue]);

  useEffect(() => {
    if (initialData) {
      setSelectedType(initialData.reminderType);
      const assignedId =
        typeof initialData.assignedTo === 'object'
          ? initialData.assignedTo._id
          : initialData.assignedTo;

      const cId =
        typeof initialData.caseId === 'object'
          ? initialData.caseId._id
          : initialData.caseId || '';

      const rDateFormatted = initialData.reminderDate
        ? new Date(initialData.reminderDate).toISOString().slice(0, 16)
        : '';

      const hDateFormatted = initialData.hearingDate
        ? new Date(initialData.hearingDate).toISOString().slice(0, 10)
        : '';

      reset({
        title: initialData.title,
        description: initialData.description || '',
        reminderType: initialData.reminderType,
        intervalType: initialData.intervalType || 'custom',
        caseId: cId,
        hearingDate: hDateFormatted,
        reminderDate: rDateFormatted,
        priority: initialData.priority,
        assignedTo: assignedId,
      });
    } else {
      setSelectedType('custom');
      reset({
        title: '',
        description: '',
        reminderType: 'custom',
        intervalType: 'custom',
        caseId: preselectedCaseId || '',
        hearingDate: '',
        reminderDate: new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16),
        priority: 'High',
        assignedTo: '',
      });
    }
  }, [initialData, preselectedCaseId, isOpen, reset]);

  if (!isOpen) return null;

  const onFormSubmit = async (data: ReminderFormData) => {
    await onSubmit({
      ...data,
      reminderType: selectedType,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-legal-800" />
              <span>{initialData ? (isMr ? 'स्मरणपत्र संपादित करा' : 'Edit Reminder') : (isMr ? 'नवीन स्मरणपत्र जोडा' : 'Set Chamber Reminder')}</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isMr ? 'सुनावणी, प्रकरणे, पक्षकार चर्चा व मुदतीचे स्मरण' : 'Scheduled alerts for hearings, filings, client conferences, and deadlines.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reminder Type Selector */}
        {!initialData && (
          <div className="px-6 pt-4">
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setSelectedType('custom');
                  setValue('reminderType', 'custom');
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedType === 'custom'
                    ? 'bg-white text-legal-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isMr ? 'इतर स्मरणपत्र' : 'Custom Activity Reminder'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedType('hearing');
                  setValue('reminderType', 'hearing');
                  setValue('intervalType', '1_day_before');
                }}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  selectedType === 'hearing'
                    ? 'bg-white text-legal-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isMr ? 'सुनावणी स्मरणपत्र' : 'Court Hearing Reminder'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onFormSubmit)} className="p-6 space-y-4">
          {/* If Hearing Reminder, show case & interval selector */}
          {selectedType === 'hearing' && (
            <div className="space-y-4 p-4 rounded-xl bg-amber-50/60 border border-amber-200">
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  {isMr ? 'न्यायालयीन प्रकरण निवडा' : 'Select Court Case'} <span className="text-rose-500">*</span>
                </label>
                <select
                  {...register('caseId')}
                  className="w-full text-xs px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                >
                  <option value="">{isMr ? '-- प्रकरण निवडा --' : '-- Choose Case --'}</option>
                  {casesData?.cases
                    ?.filter((c) => c.nextHearingDate)
                    ?.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.caseNumber} - {c.courtName} ({isMr ? 'सुनावणी' : 'Hearing'}: {new Date(c.nextHearingDate!).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN')})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  {isMr ? 'स्मरण वेळेचे वेळापत्रक' : 'Reminder Interval Schedule'}
                </label>
                <select
                  {...register('intervalType')}
                  className="w-full text-xs px-3 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white text-slate-900"
                >
                  <option value="1_day_before">{isMr ? '१ दिवस आधी (सकाळी ९:०० वा.)' : '1 Day Before Hearing (09:00 AM)'}</option>
                  <option value="3_days_before">{isMr ? '३ दिवस आधी (सकाळी ९:०० वा.)' : '3 Days Before Hearing (09:00 AM)'}</option>
                  <option value="7_days_before">{isMr ? '७ दिवस आधी (सकाळी ९:०० वा.)' : '7 Days Before Hearing (09:00 AM)'}</option>
                  <option value="custom">{isMr ? 'इच्छित तारीख व वेळ' : 'Custom Date & Time'}</option>
                </select>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isMr ? 'स्मरणपत्राचे शीर्षक' : 'Reminder Title'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...register('title')}
              placeholder={
                selectedType === 'hearing'
                  ? (isMr ? 'उदा. उद्याची सुनावणी: स्पेशल दिवाणी दावा १०४/२०२४' : 'e.g. Tomorrow Hearing: Special Civil Suit 104/2024')
                  : (isMr ? 'उदा. ज्येष्ठ वकिलांशी चर्चा, कैफियत / लेखी जबाब दाखल करणे...' : 'e.g. Conference with Senior Counsel, Submit Written Statement...')
              }
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 placeholder:text-slate-400"
            />
            {errors.title && (
              <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title.message}
              </p>
            )}
          </div>

          {/* If Custom, Optional Case Selector */}
          {selectedType === 'custom' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMr ? 'संबंधित प्रकरण (ऐच्छिक)' : 'Related Case (Optional)'}
              </label>
              <select
                {...register('caseId')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 bg-white"
              >
                <option value="">{isMr ? '-- विशिष्ट प्रकरण नाही / सामान्य कार्यालयीन विषय --' : '-- No specific case / General chamber matter --'}</option>
                {casesData?.cases?.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.caseNumber} - {c.courtName} ({c.clientName || (isMr ? 'पक्षकार' : 'Client')})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Grid: Date & Time, Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMr ? 'स्मरण तारीख व वेळ' : 'Reminder Date & Time'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                {...register('reminderDate')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 bg-white"
              />
              {errors.reminderDate && (
                <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.reminderDate.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMr ? 'प्राधान्य' : 'Priority'}
              </label>
              <select
                {...register('priority')}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 bg-white"
              >
                <option value="Low">{isMr ? 'कमी' : 'Low'}</option>
                <option value="Medium">{isMr ? 'मध्यम' : 'Medium'}</option>
                <option value="High">{isMr ? 'उच्च' : 'High'}</option>
                <option value="Urgent">{isMr ? 'तातडीचे (त्वरित लक्ष)' : 'Urgent (Immediate attention)'}</option>
              </select>
            </div>
          </div>

          {/* Assigned Staff */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isMr ? 'विशिष्ट सदस्यास सूचना द्या (ऐच्छिक)' : 'Notify Specific Chamber Member (Optional)'}
            </label>
            <select
              {...register('assignedTo')}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 bg-white"
            >
              <option value="">{isMr ? '-- स्वतः / चेंबर सर्वसाधारण --' : '-- Myself / Chamber default --'}</option>
              {staffMembers?.map((m) => (
                <option key={m.user._id} value={m.user._id}>
                  {m.user.fullName} ({m.role})
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isMr ? 'तपशील / टीप' : 'Description / Notes'}
            </label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder={isMr ? 'महत्त्वाचे मुद्दे, युक्तिवाद, दस्ताऐवज संदर्भ किंवा सूचना नोंदवा...' : 'Add key notes, points to argue, document references, or instructions...'}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-legal-900 hover:bg-legal-800 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isMr ? 'जतन करत आहे...' : 'Saving...'}
                </>
              ) : initialData ? (
                isMr ? 'स्मरणपत्र अद्यतनित करा' : 'Update Reminder'
              ) : (
                isMr ? 'स्मरणपत्र जतन करा' : 'Save Reminder'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

