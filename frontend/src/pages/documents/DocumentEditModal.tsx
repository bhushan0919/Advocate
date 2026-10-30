import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save, AlertCircle, FileText } from 'lucide-react';
import { DocumentRecord, DocumentCategory } from '../../types/document';
import { documentsApi } from '../../api/documents.api';
import { casesApi } from '../../api/cases.api';
import { clientsApi } from '../../api/clients.api';
import { DOCUMENT_CATEGORIES } from './DocumentUploadModal';

interface DocumentEditModalProps {
  document: DocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentEditModal: React.FC<DocumentEditModalProps> = ({
  document: doc,
  isOpen,
  onClose,
}) => {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Case Documents');
  const [caseId, setCaseId] = useState<string>('');
  const [clientId, setClientId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (doc) {
      setTitle(doc.title || '');
      setDescription(doc.description || '');
      setCategory(doc.category || 'Case Documents');
      setCaseId(doc.caseId?._id || '');
      setClientId(doc.clientId?._id || '');
    }
  }, [doc]);

  const { data: casesData } = useQuery({
    queryKey: ['cases-dropdown-list'],
    queryFn: () => casesApi.getCases({ limit: 100 }),
    enabled: isOpen,
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients-dropdown-list'],
    queryFn: () => clientsApi.getClients({ limit: 100 }),
    enabled: isOpen,
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      documentsApi.updateDocument(doc!._id, {
        title,
        description,
        category,
        caseId: caseId || null,
        clientId: clientId || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents-list'] });
      queryClient.invalidateQueries({ queryKey: ['case-documents'] });
      onClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.message || 'Failed to update document metadata.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Document title cannot be empty.');
      return;
    }
    updateMutation.mutate();
  };

  if (!isOpen || !doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-legal-700" />
            <h3 className="text-sm font-bold text-slate-900">Edit Document Metadata</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Document Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 bg-white"
            >
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Associated Case
            </label>
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 bg-white"
            >
              <option value="">-- No Specific Case Association --</option>
              {casesData?.cases?.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.caseNumber} — {c.clientName || 'Client'} ({c.courtName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Associated Client
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description / Remarks
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-legal-900 hover:bg-legal-800 text-white shadow-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

