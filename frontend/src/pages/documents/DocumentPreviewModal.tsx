import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  FileText,
  Calendar,
  User,
  Briefcase,
  Building,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { DocumentRecord } from '../../types/document';
import { documentsApi } from '../../api/documents.api';
import { useTheme } from '../../context/ThemeContext';

interface DocumentPreviewModalProps {
  document: DocumentRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document: doc,
  isOpen,
  onClose,
}) => {
  const { formatDate } = useTheme();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen || !doc) {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setErrorMsg(null);

    documentsApi
      .getPreviewBlobUrl(doc._id)
      .then(({ url, mimeType: fetchedMime }) => {
        if (isMounted) {
          setBlobUrl(url);
          setMimeType(fetchedMime);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMsg(err.response?.data?.message || 'Failed to load preview for this file.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
      }
    };
  }, [isOpen, doc]);

  const handleDownload = async () => {
    if (!doc) return;
    try {
      setIsDownloading(true);
      await documentsApi.downloadDocumentFile(doc._id, doc.originalFileName);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download file.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen || !doc) return null;

  const isPdf = mimeType.includes('pdf') || doc.mimeType.includes('pdf');
  const isImage = mimeType.startsWith('image/') || doc.mimeType.startsWith('image/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-legal-900 text-white flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate">{doc.title}</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-legal-100 text-legal-800 border border-legal-200 shrink-0">
                  {doc.category}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 truncate flex items-center gap-2 mt-0.5">
                <span>{doc.originalFileName}</span>
                <span>&bull;</span>
                <span>{(doc.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-legal-900 hover:bg-legal-800 text-white shadow-sm transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isDownloading ? 'Downloading...' : 'Download File'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Sub-bar: Metadata Context */}
        <div className="px-6 py-2 bg-slate-100/60 border-b border-slate-200/80 flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-600">
          {doc.caseId && (
            <span className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              Case: <strong className="text-slate-900">{doc.caseId.caseNumber}</strong> ({doc.caseId.courtName})
            </span>
          )}
          {doc.clientId && (
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Client: <strong className="text-slate-900">{doc.clientId.fullName}</strong>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            Uploaded {formatDate(doc.createdAt)} by {doc.uploadedBy?.fullName || 'Advocate'}
          </span>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 bg-slate-200/50 relative overflow-hidden flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="w-8 h-8 border-4 border-legal-900 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-3 text-xs font-medium text-slate-600">Loading document preview...</p>
            </div>
          ) : errorMsg ? (
            <div className="p-6 bg-white rounded-xl border border-rose-200 shadow-sm max-w-md text-center">
              <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-slate-900">Preview Unavailable</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">{errorMsg}</p>
              <button
                type="button"
                onClick={handleDownload}
                className="px-4 py-2 rounded-lg bg-legal-900 text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File Instead</span>
              </button>
            </div>
          ) : isPdf && blobUrl ? (
            <iframe
              src={blobUrl}
              title={doc.title}
              className="w-full h-full border-none"
            />
          ) : isImage && blobUrl ? (
            <div className="w-full h-full overflow-auto p-4 flex items-center justify-center">
              <img
                src={blobUrl}
                alt={doc.title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
              />
            </div>
          ) : (
            <div className="p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-md text-center m-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6 text-legal-700" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">Office Document Preview</h4>
              <p className="text-xs text-slate-500 mt-1 mb-6 leading-relaxed">
                In-browser preview is available for PDF files and images. This file ({doc.originalFileName}) can be opened in Microsoft Word or Excel after download.
              </p>
              <button
                type="button"
                onClick={handleDownload}
                className="px-5 py-2.5 rounded-lg bg-legal-900 hover:bg-legal-800 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download {doc.originalFileName}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

