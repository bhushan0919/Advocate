import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  FileText,
  UploadCloud,
  Search,
  Filter,
  Eye,
  Download,
  Edit2,
  Trash2,
  Calendar,
  Briefcase,
  User,
  Shield,
  FileSpreadsheet,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
} from 'lucide-react';
import { documentsApi } from '../../api/documents.api';
import { DocumentRecord, DocumentFilterParams } from '../../types/document';
import { DocumentUploadModal, DOCUMENT_CATEGORIES } from './DocumentUploadModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { DocumentEditModal } from './DocumentEditModal';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';

export const DocumentsPage: React.FC = () => {
  const { workspace } = useAuth();
  const { formatDate } = useTheme();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const isClerk = workspace?.role === 'clerk';

  // Filters state
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [fileType, setFileType] = useState('All');
  const [page, setPage] = useState(1);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);
  const [editDoc, setEditDoc] = useState<DocumentRecord | null>(null);

  const queryParams: DocumentFilterParams = {
    search: search.trim() || undefined,
    category: category !== 'All' ? category : undefined,
    fileType: fileType !== 'All' ? fileType : undefined,
    page,
    limit: 15,
  };

  const { data: documentsData, isLoading, isError } = useQuery({
    queryKey: ['documents-list', queryParams],
    queryFn: () => documentsApi.getDocuments(queryParams),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents-list'] });
      queryClient.invalidateQueries({ queryKey: ['settings-data-summary'] });
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete document.');
    },
  });

  const handleDelete = (doc: DocumentRecord) => {
    if (isClerk) {
      alert(t('documents.clerkDeleteRestricted'));
      return;
    }
    if (
      window.confirm(
        `${t('documents.deleteConfirm')}\n("${doc.title}")`
      )
    ) {
      deleteMutation.mutate(doc._id);
    }
  };

  const handleDownload = async (doc: DocumentRecord) => {
    try {
      await documentsApi.downloadDocumentFile(doc._id, doc.originalFileName);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download file.');
    }
  };

  const getFileIcon = (mime: string, originalName: string) => {
    const ext = originalName.slice(originalName.lastIndexOf('.')).toLowerCase();
    if (mime.includes('pdf') || ext === '.pdf') {
      return <FileText className="w-5 h-5 text-rose-600" />;
    }
    if (mime.includes('image') || ['.jpg', '.jpeg', '.png'].includes(ext)) {
      return <ImageIcon className="w-5 h-5 text-purple-600" />;
    }
    if (mime.includes('sheet') || mime.includes('excel') || ['.xls', '.xlsx'].includes(ext)) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    }
    return <FileText className="w-5 h-5 text-blue-600" />;
  };

  const clearFilters = () => {
    setSearch('');
    setCategory('All');
    setFileType('All');
    setPage(1);
  };

  const documents = documentsData?.documents || [];
  const pagination = documentsData?.pagination || { page: 1, limit: 15, total: 0, pages: 1 };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t('documents.title')}</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {t('documents.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsUploadOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-legal-900 hover:bg-legal-800 text-white font-semibold text-xs tracking-wide shadow-sm transition-colors inline-flex items-center gap-2 self-start sm:self-auto"
        >
          <UploadCloud className="w-4 h-4" />
          <span>{t('documents.uploadButton')}</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search title, case, client..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 bg-white"
            >
              <option value="All">All Categories</option>
              {DOCUMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* File Type Filter */}
          <div>
            <select
              value={fileType}
              onChange={(e) => {
                setFileType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 bg-white"
            >
              <option value="All">All File Types</option>
              <option value="pdf">PDF Documents</option>
              <option value="word">Word Documents (DOC/DOCX)</option>
              <option value="excel">Spreadsheets (XLS/XLSX)</option>
              <option value="image">Images (JPG/PNG)</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="flex items-center gap-2">
            {(search || category !== 'All' || fileType !== 'All') && (
              <button
                type="button"
                onClick={clearFilters}
                className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors inline-flex items-center gap-1.5 w-full justify-center"
              >
                <X className="w-3.5 h-3.5" />
                <span>Clear Filters</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Documents Table View */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-16">
            <div className="w-8 h-8 border-4 border-legal-900 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-xs font-medium text-slate-500">Loading chamber documents...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-rose-600 text-xs font-medium">
            Failed to load documents. Please check your connection.
          </div>
        ) : documents.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <FileCheck className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Documents Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
              {search || category !== 'All' || fileType !== 'All'
                ? 'No documents matched your search filter criteria. Try resetting filters.'
                : 'Upload court orders, vakalatnamas, and petitions to organize your chamber records.'}
            </p>
            <button
              type="button"
              onClick={() => setIsUploadOpen(true)}
              className="px-4 py-2 rounded-xl bg-legal-900 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Associated Case</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">File Size</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Document Info */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                          {getFileIcon(doc.mimeType, doc.originalFileName)}
                        </div>
                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="font-semibold text-slate-900 hover:text-legal-900 hover:underline text-left block truncate max-w-xs sm:max-w-sm"
                          >
                            {doc.title}
                          </button>
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {doc.originalFileName}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {doc.category}
                      </span>
                    </td>

                    {/* Case Link */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {doc.caseId ? (
                        <Link
                          to={`/cases/${doc.caseId._id}`}
                          className="font-medium text-legal-800 hover:underline flex items-center gap-1"
                        >
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          <span>{doc.caseId.caseNumber}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Client Link */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {doc.clientId ? (
                        <Link
                          to={`/clients/${doc.clientId._id}`}
                          className="text-slate-700 hover:text-legal-900 hover:underline flex items-center gap-1"
                        >
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{doc.clientId.fullName}</span>
                        </Link>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Size */}
                    <td className="px-4 py-3.5 whitespace-nowrap font-mono text-slate-500 text-[11px]">
                      {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </td>

                    {/* Upload Date & User */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="text-slate-700 font-medium">{formatDate(doc.createdAt)}</div>
                      <div className="text-[10px] text-slate-400 truncate">
                        by {doc.uploadedBy?.fullName || 'Advocate'}
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          title="Preview Document"
                          className="p-1.5 text-slate-600 hover:text-legal-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownload(doc)}
                          title="Download File"
                          className="p-1.5 text-slate-600 hover:text-legal-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditDoc(doc)}
                          title="Edit Metadata"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!isClerk && (
                          <button
                            type="button"
                            onClick={() => handleDelete(doc)}
                            title="Delete Document"
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination footer */}
            <div className="px-4 py-3 bg-slate-50/60 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Showing <strong>{(pagination.page - 1) * pagination.limit + 1}</strong> to{' '}
                <strong>{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of{' '}
                <strong>{pagination.total}</strong> documents
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-2 font-medium text-slate-700">
                  Page {pagination.page} of {pagination.pages || 1}
                </span>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2.5 py-1 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
      />

      <DocumentPreviewModal
        isOpen={!!previewDoc}
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />

      <DocumentEditModal
        isOpen={!!editDoc}
        document={editDoc}
        onClose={() => setEditDoc(null)}
      />
    </div>
  );
};

