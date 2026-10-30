import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Database,
  Download,
  Shield,
  FileText,
  Briefcase,
  Users,
  Calendar,
  CheckSquare,
  Bell,
  Lock,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { settingsApi } from '../../api/settings.api';
import { useAuth } from '../../context/AuthContext';

export const DataPrivacySettings: React.FC = () => {
  const { workspace } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const isClerk = workspace?.role === 'clerk';

  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['settings-data-summary'],
    queryFn: () => settingsApi.getDataSummary(),
  });

  const handleExportData = async () => {
    if (isClerk) return;
    try {
      setIsExporting(true);
      setFeedback(null);
      const res = await settingsApi.exportWorkspaceData();

      // Trigger client file download
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(res.data, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute(
        'download',
        `advd-chamber-export-${workspace?.name?.toLowerCase().replace(/\s+/g, '-') || 'chamber'}-${Date.now()}.json`
      );
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setFeedback({
        type: 'success',
        message: 'Chamber archive exported and downloaded successfully.',
      });
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to export chamber data.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-legal-900 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-sm text-slate-600 font-medium">Loading chamber data metrics...</span>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
        Failed to load chamber data summary.
      </div>
    );
  }

  const metricCards = [
    { title: 'Total Cases', value: summary.totalCases, icon: Briefcase, color: 'text-blue-600 bg-blue-50' },
    { title: 'Active Cases', value: summary.activeCases, icon: FileText, color: 'text-emerald-600 bg-emerald-50' },
    { title: 'Archived Cases', value: summary.archivedCases, icon: Database, color: 'text-slate-600 bg-slate-100' },
    { title: 'Total Clients', value: summary.totalClients, icon: Users, color: 'text-purple-600 bg-purple-50' },
    { title: 'Hearings Recorded', value: summary.totalHearings, icon: Calendar, color: 'text-amber-600 bg-amber-50' },
    { title: 'Chamber Tasks', value: summary.totalTasks, icon: CheckSquare, color: 'text-teal-600 bg-teal-50' },
    { title: 'Active Reminders', value: summary.totalReminders, icon: Bell, color: 'text-rose-600 bg-rose-50' },
    { title: 'Chamber Staff', value: summary.totalMembers, icon: Shield, color: 'text-legal-700 bg-legal-50' },
  ];

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="text-sm font-medium">{feedback.message}</div>
        </div>
      )}

      {/* Workspace Data Metrics */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-1">Chamber Data Inventory</h3>
        <p className="text-xs text-slate-500 mb-6">
          Real-time summary of digital court records maintained within this isolated chamber workspace.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {metricCards.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-500 truncate">{m.title}</span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${m.color}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div className="text-xl font-bold text-slate-900">{m.value}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Export Chamber Data */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Download className="w-4 h-4 text-legal-700" />
              Chamber Archive & Data Portability
            </h3>
            <p className="text-xs text-slate-500">
              Export all cases, clients, hearing histories, reminders, and tasks as structured JSON.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportData}
            disabled={isClerk || isExporting}
            className="px-4 py-2.5 rounded-lg bg-legal-900 hover:bg-legal-800 text-white font-semibold text-xs tracking-wide shadow-sm transition-colors inline-flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isExporting ? 'Generating JSON...' : 'Export Complete Chamber Data (JSON)'}</span>
          </button>
        </div>

        {isClerk ? (
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Clerks do not have permission to trigger chamber-wide database exports. Please request an
              authorized chamber advocate.
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-500 leading-relaxed">
            The generated JSON archive includes full metadata: case numbers, filing dates, CNR codes,
            client records, hearing proceedings, daily diary remarks, reminders, and chamber tasks.
          </p>
        )}
      </div>

      {/* Privacy & Legal Retention Notice */}
      <div className="bg-legal-50/50 rounded-xl border border-legal-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-legal-800" />
          <h3 className="text-sm font-semibold text-legal-900">
            Advocate-Client Confidentiality & Isolation Architecture
          </h3>
        </div>
        <div className="space-y-2 text-xs text-legal-800/90 leading-relaxed">
          <p>
            AdvD is engineered specifically for Indian advocates and legal practitioners. In accordance
            with Section 126 of the Indian Evidence Act / Section 132 of Bharatiya Sakshya Adhiniyam,
            advocate-client privilege is strictly protected through multi-tenant database isolation.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Every query is strictly constrained to your authenticated <code className="font-mono text-legal-900">workspaceId</code>.</li>
            <li>No other law firm, chamber, or user can view, query, or infer your cases or diary proceedings.</li>
            <li>Passwords are hashed with one-way salted Bcrypt (Factor 10). Session tokens are cryptographically signed.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

