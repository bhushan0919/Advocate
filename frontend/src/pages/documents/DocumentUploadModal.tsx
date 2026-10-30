import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  X,
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Trash2,
} from 'lucide-react';
import { documentsApi } from '../../api/documents.api';
import { casesApi } from '../../api/cases.api';
import { clientsApi } from '../../api/clients.api';
import { DocumentCategory } from '../../types/document';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCaseId?: string;
  defaultClientId?: string;
  onSuccess?: () => void;
}

export const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'Case Documents',
  'Court Orders',
  'Judgments',
  'Petitions',
  'Applications',
  'Affidavits',
  'Notices',
  'Evidence',
  'Agreements',
  'Legal Notices',
  'Client Documents',
  'Identity Documents',
  'Other Documents',
];

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  defaultCaseId,
  defaultClientId,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Case Documents');
  const [selectedCaseId, setSelectedCaseId] = useState<string>(defaultCaseId || '');
  const [selectedClientId, setSelectedClientId] = useState<string>(defaultClientId || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Chamber Cases for dropdown
  const { data: casesData } = useQuery({
    queryKey: ['cases-dropdown-list'],
    queryFn: () => casesApi.getCases({ limit: 100 }),
    enabled: isOpen,
  });

  // Fetch Chamber Clients for dropdown
  const { data: clientsData } = useQuery({
    queryKey: ['clients-dropdown-list'],
    queryFn: () => clientsApi.getClients({ limit: 100 }),
    enabled: isOpen,
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => {
      if (defaultCaseId) {
        return documentsApi.uploadCaseDocument(defaultCaseId, formData);
      }
      return documentsApi.uploadDocument(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents-list'] });
      queryClient.invalidateQueries({ queryKey: ['case-documents'] });
      queryClient.invalidateQueries({ queryKey: ['settings-data-summary'] });
      if (onSuccess) onSuccess();
      handleClose();
    },
    onError: (err: any) => {
      setErrorMsg(
        err.response?.data?.message || 'Failed to upload document. Please check the file and try again.'
      );
    },
  });

  const handleClose = () => {
    setTitle('');
    setDescription('');
    setCategory('Case Documents');
    setSelectedFile(null);
    setSelectedCaseId(defaultCaseId || '');
    setSelectedClientId(defaultClientId || '');
    setErrorMsg(null);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const allowed = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png'];

    if (!allowed.includes(ext)) {
      setErrorMsg(`Unsupported file type: ${ext}. Permitted formats: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG.`);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 25MB maximum limit.');
      return;
    }

    setSelectedFile(file);
    if (!title) {
      // Auto-suggest title based on filename
      const suggested = file.name.slice(0, file.name.lastIndexOf('.')).replace(/[_-]/g, ' ');
      setTitle(suggested);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a file to upload.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Please provide a document title.');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', title.trim());
    formData.append('category', category);
    if (description.trim()) formData.append('description', description.trim());
    if (selectedCaseId) formData.append('caseId', selectedCaseId);
    if (selectedClientId) formData.append('clientId', selectedClientId);

    uploadMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-legal-900 text-white flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{t('documents.uploadButton')}</h3>
              <p className="text-[11px] text-slate-500">{t('documents.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* File Upload Zone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Document File <span className="text-rose-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-legal-700 rounded-xl p-6 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-legal-50/30"
              >
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <div className="text-xs font-semibold text-slate-700">Click to choose a legal document</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  PDF, DOCX, XLSX, Images (max 25MB)
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-5 h-5 text-legal-700 shrink-0" />
                  <div className="truncate text-left">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {selectedFile.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Interim Bail Order by Sessions Court"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('documents.category')} <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 bg-white"
            >
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(`documents.categories.${cat}`) || cat}
                </option>
              ))}
            </select>
          </div>

          {/* Case Association (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Associated Case (Optional)
            </label>
            <select
              disabled={!!defaultCaseId}
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 bg-white disabled:bg-slate-100"
            >
              <option value="">-- No Specific Case Association --</option>
              {casesData?.cases?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.caseNumber} — {c.clientName || 'Client'} ({c.courtName})
                </option>
              ))}
            </select>
          </div>

          {/* Client Association (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Associated Client (Optional)
            </label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 bg-white"
            >
              <option value="">-- No Specific Client Association --</option>
              {clientsData?.clients?.map((cl) => (
                <option key={cl._id} value={cl._id}>
                  {cl.fullName} ({cl.mobile})
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Document Remarks / Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key notes, clauses or filing context..."
              className="w-full p-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-legal-900 hover:bg-legal-800 text-white shadow-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              {uploadMutation.isPending ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5" />
              )}
              <span>{uploadMutation.isPending ? t('common.uploading') : t('documents.uploadButton')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

