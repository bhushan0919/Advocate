import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, UserPlus, Edit3, AlertCircle } from 'lucide-react';
import { Client, ClientFormData } from '../../types/client.ts';
import { clientsApi } from '../../api/clients.api.ts';
import { useTranslation } from 'react-i18next';

const clientSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  mobile: z
    .string()
    .trim()
    .regex(/^[0-9+\-\s()]{7,20}$/, 'Valid mobile number required (7-20 digits)'),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .or(z.literal(''))
    .optional(),
  clientType: z.enum(['Individual', 'Corporate', 'Government', 'Other']),
  address: z.string().trim().optional(),
  notes: z.string().optional(),
});

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clientToEdit?: Client | null;
}

export const ClientModal: React.FC<ClientModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  clientToEdit,
}) => {
  const { t, i18n } = useTranslation();
  const isMr = i18n.language === 'mr';
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      fullName: '',
      mobile: '',
      email: '',
      clientType: 'Individual',
      address: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (clientToEdit) {
      reset({
        fullName: clientToEdit.fullName,
        mobile: clientToEdit.mobile,
        email: clientToEdit.email || '',
        clientType: clientToEdit.clientType,
        address: clientToEdit.address || '',
        notes: clientToEdit.notes || '',
      });
    } else {
      reset({
        fullName: '',
        mobile: '',
        email: '',
        clientType: 'Individual',
        address: '',
        notes: '',
      });
    }
    setApiError(null);
  }, [clientToEdit, isOpen, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: ClientFormData) => {
    setApiError(null);
    try {
      if (clientToEdit) {
        await clientsApi.updateClient(clientToEdit._id, data);
      } else {
        await clientsApi.createClient(data);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const responseData = err.response?.data;
      if (responseData?.field === 'mobile') {
        setError('mobile', { message: responseData.message });
      } else if (responseData?.field === 'email') {
        setError('email', { message: responseData.message });
      } else {
        setApiError(responseData?.message || 'Failed to save client details.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-legal-100 text-legal-800 flex items-center justify-center font-bold">
              {clientToEdit ? <Edit3 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {clientToEdit ? (isMr ? 'पक्षकार माहिती संपादित करा' : 'Edit Client Profile') : (isMr ? 'नवीन पक्षकार जोडा' : 'Add New Client')}
              </h2>
              <p className="text-xs text-slate-500">
                {clientToEdit
                  ? (isMr ? 'संपर्क व नोंदणी तपशील अद्यतनित करा' : 'Update contact and registration details')
                  : (isMr ? 'या चेंबरमध्ये नवीन पक्षकार किंवा कंपनीची नोंदणी करा' : 'Register a new litigant or corporate client in this workspace')}
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

        {/* Global API Error */}
        {apiError && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{apiError}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isMr ? 'पक्षकाराचे पूर्ण नाव' : 'Client Full Name'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...register('fullName')}
              placeholder={isMr ? 'उदा. रमेश चंद्र शर्मा' : 'e.g. Ramesh Chandra Sharma'}
              className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 ${
                errors.fullName ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
              }`}
            />
            {errors.fullName && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.fullName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMr ? 'भ्रमणध्वनी क्रमांक' : 'Mobile Number'} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register('mobile')}
                placeholder="+91 98765 43210"
                className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 ${
                  errors.mobile ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
                }`}
              />
              {errors.mobile && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.mobile.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {isMr ? 'पक्षकार वर्गीकरण' : 'Client Classification'}
              </label>
              <select
                {...register('clientType')}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700"
              >
                <option value="Individual">{isMr ? 'वैयक्तिक पक्षकार' : 'Individual Litigant'}</option>
                <option value="Corporate">{isMr ? 'कंपनी / संस्था' : 'Corporate / Business'}</option>
                <option value="Government">{isMr ? 'शासकीय संस्था' : 'Government / Public Body'}</option>
                <option value="Other">{isMr ? 'इतर' : 'Other'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{isMr ? 'ईमेल पत्ता' : 'Email Address'}</label>
            <input
              type="email"
              {...register('email')}
              placeholder="client@example.com"
              className={`w-full px-3 py-2 text-xs bg-slate-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 ${
                errors.email ? 'border-rose-400 bg-rose-50/20' : 'border-slate-300'
              }`}
            />
            {errors.email && (
              <p className="text-[11px] text-rose-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{isMr ? 'टपाल पत्ता' : 'Postal Address'}</label>
            <textarea
              rows={2}
              {...register('address')}
              placeholder={isMr ? 'कार्यालय किंवा घराचा पत्ता...' : 'Office or residential address...'}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {isMr ? 'चेंबर अंतर्गत टिप्पण्या' : 'Internal Chamber Notes'}
            </label>
            <textarea
              rows={2}
              {...register('notes')}
              placeholder={isMr ? 'पार्श्वभूमी, फी अटी, विशेष सूचना...' : 'Reference background, billing terms, special instructions...'}
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
              className="px-4 py-2 text-xs font-semibold text-white bg-legal-900 hover:bg-legal-800 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : clientToEdit ? (
                isMr ? 'पक्षकार अद्यतनित करा' : 'Update Client'
              ) : (
                isMr ? 'पक्षकार जतन करा' : 'Save Client'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

