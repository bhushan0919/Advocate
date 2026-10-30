import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  ChevronLeft,
  Building2,
  Calendar,
  Clock,
  User,
  Scale,
  Edit2,
  Archive,
  ArchiveRestore,
  ExternalLink,
  Phone,
  Mail,
  MapPin,
  FileText,
  History,
  CheckSquare,
  AlertCircle,
  Shield,
  Layers,
  Plus,
} from 'lucide-react';
import { casesApi } from '../../api/cases.api.ts';
import { hearingsApi } from '../../api/hearings.api.ts';
import { tasksApi } from '../../api/tasks.api.ts';
import { HearingRecord } from '../../types/hearing.ts';
import { TaskRecord, TaskFormData } from '../../types/task.ts';
import { CaseModal } from './CaseModal.tsx';
import { UpdateHearingModal } from '../diary/UpdateHearingModal.tsx';
import { HearingDetailModal } from '../hearings/HearingDetailModal.tsx';
import { TaskModal } from '../tasks/TaskModal.tsx';
import { DocumentUploadModal } from '../documents/DocumentUploadModal.tsx';
import { DocumentPreviewModal } from '../documents/DocumentPreviewModal.tsx';
import { DocumentEditModal } from '../documents/DocumentEditModal.tsx';
import { documentsApi } from '../../api/documents.api.ts';
import { DocumentRecord } from '../../types/document.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTranslation } from 'react-i18next';

export const CaseProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workspace } = useAuth();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const isMr = i18n.language === 'mr';

  const [activeTab, setActiveTab] = useState<'overview' | 'hearings' | 'documents' | 'tasks' | 'notes'>('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isRecordHearingModalOpen, setIsRecordHearingModalOpen] = useState(false);
  const [selectedHearingForDetail, setSelectedHearingForDetail] = useState<HearingRecord | null>(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<DocumentRecord | null>(null);
  const [selectedDocForEdit, setSelectedDocForEdit] = useState<DocumentRecord | null>(null);
  const [docCategoryFilter, setDocCategoryFilter] = useState('All');

  // Fetch Case Details
  const { data: caseRecord, isLoading, isError, error } = useQuery({
    queryKey: ['case', id, workspace?.id],
    queryFn: () => casesApi.getCase(id!),
    enabled: !!id && !!workspace?.id,
  });

  // Fetch Hearings for this Case
  const { data: hearings = [], isLoading: isLoadingHearings } = useQuery({
    queryKey: ['caseHearings', id, workspace?.id],
    queryFn: () => hearingsApi.getCaseHearings(id!),
    enabled: !!id && !!workspace?.id,
  });

  // Fetch Tasks for this Case
  const { data: caseTasksData, refetch: refetchCaseTasks } = useQuery({
    queryKey: ['case-tasks', id],
    queryFn: () => tasksApi.getTasks({ caseId: id }),
    enabled: !!id,
  });

  // Fetch Documents for this Case
  const { data: caseDocs = [], isLoading: isLoadingDocs } = useQuery({
    queryKey: ['case-documents', id],
    queryFn: () => documentsApi.getCaseDocuments(id!),
    enabled: !!id && !!workspace?.id,
  });

  const createTaskMutation = useMutation({
    mutationFn: (data: TaskFormData) => tasksApi.createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
      setIsTaskModalOpen(false);
    },
  });

  const toggleTaskStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: any }) =>
      tasksApi.updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-tasks', id] });
      queryClient.invalidateQueries({ queryKey: ['tasks-list'] });
    },
  });

  // Archive / Restore Mutation
  const archiveMutation = useMutation({
    mutationFn: (isArchived: boolean) => casesApi.archiveCase(id!, isArchived),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      alert(
        res.isArchived
          ? `Case ${res.caseNumber} moved to archive.`
          : `Case ${res.caseNumber} restored to active register.`
      );
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to update case.');
    },
  });

  if (isLoading) {
    return (
      <div className="p-14 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
        <div className="w-5 h-5 border-2 border-legal-800 border-t-transparent rounded-full animate-spin" />
        <span>Loading case record & proceedings profile...</span>
      </div>
    );
  }

  if (isError || !caseRecord) {
    return (
      <div className="p-8 text-center text-xs text-rose-600 bg-white rounded-2xl border border-slate-200">
        <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
        <h3 className="font-bold text-slate-900 text-sm">Case Record Not Found</h3>
        <p className="mt-1 text-slate-500">
          {(error as any)?.response?.data?.message || 'The requested case does not exist or you lack workspace authorization.'}
        </p>
        <Link
          to="/cases"
          className="mt-4 inline-flex items-center gap-1 px-3 py-1.5 bg-legal-900 text-white rounded-lg text-xs font-semibold"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Return to All Cases</span>
        </Link>
      </div>
    );
  }

  const client = typeof caseRecord.clientId === 'object' && caseRecord.clientId !== null ? caseRecord.clientId : null;
  const clerk = typeof caseRecord.assignedClerkId === 'object' && caseRecord.assignedClerkId !== null ? caseRecord.assignedClerkId : null;

  // Next hearing calculation
  const getDaysCountdown = (dateStr?: string) => {
    if (!dateStr) return null;
    const hDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    hDate.setHours(0, 0, 0, 0);
    const diff = Math.round((hDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return isMr ? 'आज' : 'Today';
    if (diff === 1) return isMr ? 'उद्या' : 'Tomorrow';
    if (diff > 1) return isMr ? `${diff} दिवसांत` : `In ${diff} days`;
    if (diff === -1) return isMr ? 'काल' : 'Yesterday';
    return isMr ? `${Math.abs(diff)} दिवसांपूर्वी` : `${Math.abs(diff)} days ago`;
  };

  const tabs = [
    { id: 'overview', label: isMr ? 'प्रकरण माहिती' : 'Case Overview', icon: Briefcase },
    {
      id: 'hearings',
      label: isMr ? 'सुनावणी इतिहास' : 'Hearing History',
      icon: History,
      badge: hearings.length > 0 ? `${hearings.length}` : undefined,
    },
    { id: 'documents', label: isMr ? 'दस्ताऐवज' : 'Documents', icon: FileText, badge: 'Phase 5' },
    { id: 'tasks', label: isMr ? 'कार्यालयीन कामे' : 'Clerk Tasks', icon: CheckSquare, badge: 'Phase 4' },
    { id: 'notes', label: isMr ? 'चेंबर टिप्पण्या' : 'Chamber Notes', icon: Layers },
  ];

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex items-center justify-between">
        <Link
          to="/cases"
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{isMr ? 'सर्व प्रकरणांकडे परत' : 'Back to Cases Register'}</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRecordHearingModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-legal-800 hover:bg-legal-700 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isMr ? 'सुनावणी नोंदवा' : 'Record Hearing'}</span>
          </button>

          <button
            onClick={() => archiveMutation.mutate(!caseRecord.isArchived)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
              caseRecord.isArchived
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50 shadow-sm'
            }`}
          >
            {caseRecord.isArchived ? (
              <>
                <ArchiveRestore className="w-3.5 h-3.5" />
                <span>{isMr ? 'प्रकरण पूर्ववत करा' : 'Restore Case'}</span>
              </>
            ) : (
              <>
                <Archive className="w-3.5 h-3.5" />
                <span>{isMr ? 'अभिलेखात ठेवा' : 'Archive Case'}</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-legal-900 hover:bg-legal-800 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{t('common.edit')}</span>
          </button>
        </div>
      </div>

      {/* Case Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-legal-900 text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-md">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold font-mono text-slate-900">{caseRecord.caseNumber}</h1>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                    caseRecord.status === 'Pending'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : caseRecord.status === 'Disposed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : caseRecord.status === 'Stayed'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {isMr
                    ? caseRecord.status === 'Pending'
                      ? 'प्रलंबित'
                      : caseRecord.status === 'Disposed'
                      ? 'निकाली'
                      : caseRecord.status === 'Stayed'
                      ? 'स्थगिती'
                      : caseRecord.status
                    : caseRecord.status}
                </span>

                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                  {caseRecord.caseType}
                </span>

                {caseRecord.isArchived && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800 border border-rose-200">
                    {isMr ? 'अभिलेखात' : 'Archived'}
                  </span>
                )}
              </div>

              {/* Opponent vs Client Subtitle */}
              <div className="text-xs text-slate-600 mt-1.5 font-medium">
                <span className="font-semibold text-slate-900">
                  {client?.fullName || caseRecord.clientName || (isMr ? 'पक्षकार' : 'Client')}
                </span>
                <span className="text-slate-400 mx-1.5 font-bold">{isMr ? 'विरुद्ध' : 'vs.'}</span>
                <span className="font-semibold text-slate-900">{caseRecord.opponentName}</span>
              </div>

              {/* CNR Badge & Court Room */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-2">
                {caseRecord.cnrNumber && (
                  <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                    CNR: <strong>{caseRecord.cnrNumber}</strong>
                  </span>
                )}
                <span className="flex items-center gap-1 font-medium text-slate-700">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{caseRecord.courtName}</span>
                  {caseRecord.courtRoomNumber && (
                    <span className="text-slate-400">({caseRecord.courtRoomNumber})</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Next Hearing Countdown Pill */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col items-start md:items-end min-w-[200px]">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-legal-800" />
              <span>{isMr ? 'पुढील सुनावणी तारीख' : 'Next Hearing Schedule'}</span>
            </div>
            {caseRecord.nextHearingDate ? (
              <div className="mt-1">
                <div className="text-base font-bold font-mono text-legal-900">
                  {new Date(caseRecord.nextHearingDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
                <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1 mt-0.5 justify-start md:justify-end">
                  <span>{getDaysCountdown(caseRecord.nextHearingDate)}</span>
                </div>
                {caseRecord.nextHearingPurpose && (
                  <div className="text-[11px] text-slate-600 mt-1 max-w-[220px] truncate md:text-right font-medium">
                    {caseRecord.nextHearingPurpose}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic mt-1">{isMr ? 'तारीख अद्याप निश्चित नाही' : 'Date not yet fixed'}</div>
            )}
          </div>
        </div>

        {/* Tab Navigation Navigation Headers */}
        <div className="flex items-center gap-1 mt-6 pt-2 border-t border-slate-100 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-legal-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    activeTab === tab.id
                      ? 'bg-legal-800 text-amber-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Detailed Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1 & 2: Primary Cards */}
          <div className="md:col-span-2 space-y-6">
            {/* Case Overview & Brief Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-legal-800" />
                  <span>Case Overview & Summary</span>
                </h2>
                <span className="text-xs text-slate-500 font-mono">
                  Filed:{' '}
                  {caseRecord.filingDate
                    ? new Date(caseRecord.filingDate).toLocaleDateString('en-IN')
                    : 'Not specified'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Case Classification</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{caseRecord.caseType}</div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Current Status</div>
                  <div className="font-semibold text-slate-900 mt-0.5">{caseRecord.status}</div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Assigned Clerk</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {clerk?.fullName || <span className="text-slate-400 italic">None</span>}
                  </div>
                </div>
              </div>

              {/* Case Description */}
              <div className="pt-2">
                <div className="text-[11px] font-semibold text-slate-500 mb-1">
                  Chamber Case Brief / Prayer Details:
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
                  {caseRecord.caseDescription || 'No case brief recorded yet. Click Edit to add summary.'}
                </div>
              </div>
            </div>

            {/* Hearing Date Information Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-legal-800" />
                  <span>Hearing Date Schedule & Board Information</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Previous Hearing</div>
                  <div className="font-mono text-sm font-bold text-slate-900 mt-1">
                    {caseRecord.previousHearingDate
                      ? new Date(caseRecord.previousHearingDate).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'None recorded'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-legal-50 border border-legal-200">
                  <div className="text-[11px] font-bold text-legal-800 uppercase">Next Hearing Scheduled</div>
                  <div className="font-mono text-sm font-bold text-legal-950 mt-1">
                    {caseRecord.nextHearingDate
                      ? new Date(caseRecord.nextHearingDate).toLocaleDateString('en-IN', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Not fixed'}
                  </div>
                  {caseRecord.nextHearingPurpose && (
                    <div className="text-xs text-legal-900 font-medium mt-1">
                      Purpose: <strong>{caseRecord.nextHearingPurpose}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Column 3: Court, Client & Opponent Sidecards */}
          <div className="space-y-6">
            {/* Client Details Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-legal-800" />
                  <span>Client Details</span>
                </h3>
                {client?._id && (
                  <Link
                    to={`/clients/${client._id}`}
                    className="text-[11px] text-legal-800 font-semibold hover:underline flex items-center gap-0.5"
                  >
                    <span>View Profile</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>

              <div className="text-xs space-y-2">
                <div className="font-bold text-slate-900 text-sm">
                  {client?.fullName || caseRecord.clientName}
                </div>
                {client?.clientType && (
                  <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-medium">
                    {client.clientType} Litigant
                  </span>
                )}

                {client?.mobile && (
                  <div className="pt-1">
                    <a
                      href={`tel:${client.mobile}`}
                      className="font-mono text-slate-700 hover:text-legal-800 flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{client.mobile}</span>
                    </a>
                  </div>
                )}

                {client?.email && (
                  <div>
                    <a
                      href={`mailto:${client.email}`}
                      className="font-mono text-slate-600 hover:text-legal-800 flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{client.email}</span>
                    </a>
                  </div>
                )}

                {client?.address && (
                  <div className="flex items-start gap-1.5 text-slate-600 pt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                    <span>{client.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Opponent Details Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Scale className="w-3.5 h-3.5 text-slate-500" />
                <span>Opponent Details</span>
              </h3>

              <div className="text-xs space-y-2">
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Opponent Party</div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {caseRecord.opponentName}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Opponent Advocate</div>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {caseRecord.opponentAdvocate ? (
                      `Adv. ${caseRecord.opponentAdvocate}`
                    ) : (
                      <span className="text-slate-400 italic">Not recorded</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Court Information Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Building2 className="w-3.5 h-3.5 text-legal-800" />
                <span>Court Information</span>
              </h3>

              <div className="text-xs space-y-2">
                <div>
                  <div className="text-[11px] text-slate-400 font-medium">Court / Tribunal</div>
                  <div className="font-bold text-slate-900 mt-0.5">{caseRecord.courtName}</div>
                </div>

                {caseRecord.courtLocation && (
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">Location / Bench</div>
                    <div className="text-slate-800 font-medium mt-0.5">{caseRecord.courtLocation}</div>
                  </div>
                )}

                {caseRecord.courtRoomNumber && (
                  <div>
                    <div className="text-[11px] text-slate-400 font-medium">Room / Court Hall</div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5">
                      {caseRecord.courtRoomNumber}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Hearing History Module */}
      {activeTab === 'hearings' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-legal-800" />
                <span>Court Hearing Chronicle & Proceedings</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {hearings.length} {hearings.length === 1 ? 'hearing' : 'hearings'} recorded in chronological sequence. Historical entries are immutable.
              </p>
            </div>
            <button
              onClick={() => setIsRecordHearingModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-legal-900 hover:bg-legal-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Record Today's Proceeding</span>
            </button>
          </div>

          {isLoadingHearings ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-legal-800 border-t-transparent rounded-full animate-spin" />
              <span>Loading hearing history...</span>
            </div>
          ) : hearings.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <History className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">No Hearing Records Recorded Yet</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  When hearings occur, record what transpired in court, capture interim orders, and schedule the next hearing date.
                </p>
              </div>
              {caseRecord.nextHearingDate && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 inline-block text-xs font-mono text-slate-700">
                  Next Hearing Scheduled: {new Date(caseRecord.nextHearingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} ({caseRecord.nextHearingPurpose || 'Hearing'})
                </div>
              )}
              <div>
                <button
                  onClick={() => setIsRecordHearingModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-legal-900 hover:bg-legal-800 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Record First Hearing</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="relative border-l-2 border-legal-200 ml-4 pl-6 space-y-6">
              {hearings.map((h) => (
                <div key={h._id} className="relative group">
                  {/* Timeline bullet */}
                  <div className="absolute -left-[31px] top-4 w-4 h-4 rounded-full border-2 border-white bg-legal-900 shadow-sm ring-4 ring-slate-100 group-hover:bg-legal-700 transition-colors" />

                  {/* Hearing Card */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-shadow space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-legal-800" />
                          <span>{new Date(h.hearingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </span>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-legal-50 text-legal-800 border border-legal-200">
                          {h.purpose}
                        </span>
                        {h.corrections && h.corrections.length > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                            Corrected ({h.corrections.length})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {h.courtRoom && (
                          <span className="font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                            Room: {h.courtRoom}
                          </span>
                        )}
                        <button
                          onClick={() => setSelectedHearingForDetail(h)}
                          className="text-legal-800 hover:text-legal-950 font-semibold text-xs inline-flex items-center gap-1 hover:underline"
                        >
                          <span>Full Record</span>
                          <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
                        </button>
                      </div>
                    </div>

                    {/* Proceedings Content */}
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Today's Proceedings & Courtroom Record
                      </div>
                      <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 font-normal">
                        {h.proceedings}
                      </p>
                    </div>

                    {/* Next Hearing & Remarks Footer */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                      {h.nextHearingDate && (
                        <div className="flex items-start gap-2 bg-amber-50/60 p-2.5 rounded-xl border border-amber-100">
                          <Clock className="w-4 h-4 text-amber-700 mt-0.5 flex-shrink-0" />
                          <div>
                            <div className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">
                              Next Hearing Scheduled
                            </div>
                            <div className="font-semibold text-slate-900 mt-0.5">
                              {new Date(h.nextHearingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                            {h.nextHearingPurpose && (
                              <div className="text-slate-600 text-[11px]">
                                Purpose: {h.nextHearingPurpose}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {h.additionalRemarks && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <div className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                            Additional Chamber Remarks
                          </div>
                          <div className="text-slate-700 text-[11px] mt-0.5 line-clamp-2">
                            {h.additionalRemarks}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Recording metadata */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                      <span>
                        Recorded by{' '}
                        <strong className="text-slate-600 font-semibold">
                          {h.createdBy?.fullName || 'Chamber Staff'}
                        </strong>
                      </span>
                      <span>
                        {new Date(h.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Case Documents Repository */}
      {activeTab === 'documents' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-legal-800" />
                <span>Case Documents & Court Records ({caseDocs.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Petitions, vakalatnamas, court orders, and exhibits associated with {caseRecord.caseNumber}.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={docCategoryFilter}
                onChange={(e) => setDocCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 bg-white text-slate-700"
              >
                <option value="All">All Categories</option>
                {Array.from(new Set(caseDocs.map((d) => d.category))).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsUploadDocModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-legal-900 hover:bg-legal-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </button>
            </div>
          </div>

          {isLoadingDocs ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-2 border-legal-900 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-2 text-xs text-slate-500">Loading case documents...</p>
            </div>
          ) : caseDocs.filter((d) => docCategoryFilter === 'All' || d.category === docCategoryFilter).length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h4 className="text-xs font-semibold text-slate-700">No Documents Uploaded</h4>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                No legal documents attached to this case. Upload certified court orders, plaints, or client vakalatnamas.
              </p>
              <button
                type="button"
                onClick={() => setIsUploadDocModalOpen(true)}
                className="mt-3 px-3 py-1.5 rounded-lg bg-legal-900 text-white text-xs font-semibold inline-flex items-center gap-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Upload Now</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {caseDocs
                .filter((d) => docCategoryFilter === 'All' || d.category === docCategoryFilter)
                .map((doc) => (
                  <div key={doc._id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-4 h-4 text-legal-700" />
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setSelectedDocForPreview(doc)}
                          className="text-xs font-semibold text-slate-900 hover:text-legal-900 hover:underline text-left block truncate"
                        >
                          {doc.title}
                        </button>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{doc.originalFileName}</span>
                          <span>&bull;</span>
                          <span className="font-mono">{(doc.fileSize / (1024 * 1024)).toFixed(2)} MB</span>
                          <span>&bull;</span>
                          <span>{new Date(doc.createdAt).toLocaleDateString('en-IN')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 hidden sm:inline">
                        {doc.category}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setSelectedDocForPreview(doc)}
                          title="Preview"
                          className="p-1.5 text-slate-500 hover:text-legal-900 hover:bg-slate-100 rounded-lg"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => documentsApi.downloadDocumentFile(doc._id, doc.originalFileName)}
                          title="Download"
                          className="p-1.5 text-slate-500 hover:text-legal-900 hover:bg-slate-100 rounded-lg"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedDocForEdit(doc)}
                          title="Edit"
                          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Clerk Tasks Pipeline */}
      {activeTab === 'tasks' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-legal-800" />
                <span>Case Tasks & Clerk Assignments</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage registry certified copies, process service fees, summons, and preparation for this case.
              </p>
            </div>

            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-legal-900 text-white hover:bg-legal-800 shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Case Task</span>
            </button>
          </div>

          {/* Tasks List */}
          {!caseTasksData?.tasks || caseTasksData.tasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckSquare className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600 text-xs">No tasks assigned for this case yet</p>
              <p className="text-[11px] text-slate-400">
                Click "Add Case Task" to allocate tasks to chamber clerks or advocates.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {caseTasksData.tasks.map((task) => {
                const isOverdue =
                  new Date(task.dueDate).getTime() < Date.now() &&
                  task.status !== 'Completed' &&
                  task.status !== 'Cancelled';

                return (
                  <div
                    key={task._id}
                    className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 p-2 rounded-xl transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={task.status === 'Completed'}
                          onChange={() =>
                            toggleTaskStatusMutation.mutate({
                              taskId: task._id,
                              status: task.status === 'Completed' ? 'Pending' : 'Completed',
                            })
                          }
                          className="w-4 h-4 rounded text-legal-900 focus:ring-legal-700/20 cursor-pointer"
                        />
                        <span
                          className={`font-semibold text-xs ${
                            task.status === 'Completed'
                              ? 'line-through text-slate-400'
                              : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full border border-slate-200 bg-slate-100 text-slate-700">
                          {task.priority}
                        </span>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                            task.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {task.status}
                        </span>
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-slate-600 pl-6">{task.description}</p>
                      )}

                      <div className="flex items-center gap-3 pl-6 text-[10px] text-slate-400">
                        <span>
                          Assigned to: <strong>{task.assignedTo?.fullName || 'Clerk'}</strong>
                        </span>
                        <span>•</span>
                        <span className={isOverdue ? 'text-rose-600 font-bold' : ''}>
                          Due: {new Date(task.dueDate).toLocaleDateString('en-IN')}
                        </span>
                        {task.comments?.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{task.comments.length} comment(s)</span>
                          </>
                        )}
                      </div>
                    </div>

                    <Link
                      to="/tasks"
                      className="text-xs font-semibold text-legal-800 hover:underline self-end sm:self-center"
                    >
                      Manage in Tasks →
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Chamber Notes */}
      {activeTab === 'notes' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-legal-800" />
            <span>Confidential Chamber Brief & Notes</span>
          </h3>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">
            {caseRecord.caseDescription || 'No internal notes recorded. Use Edit Case to add confidential case brief.'}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <CaseModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['case', id] });
          queryClient.invalidateQueries({ queryKey: ['cases'] });
        }}
        caseToEdit={caseRecord}
      />

      {/* Update Hearing Modal */}
      <UpdateHearingModal
        isOpen={isRecordHearingModalOpen}
        onClose={() => setIsRecordHearingModalOpen(false)}
        caseItem={caseRecord}
        defaultHearingDate={
          caseRecord.nextHearingDate
            ? new Date(caseRecord.nextHearingDate).toISOString().slice(0, 10)
            : new Date().toISOString().slice(0, 10)
        }
        defaultPurpose={caseRecord.nextHearingPurpose || 'Hearing'}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['case', id] });
          queryClient.invalidateQueries({ queryKey: ['cases'] });
          queryClient.invalidateQueries({ queryKey: ['caseHearings', id] });
          queryClient.invalidateQueries({ queryKey: ['workspaceHearings'] });
          queryClient.invalidateQueries({ queryKey: ['dailyDiary'] });
          queryClient.invalidateQueries({ queryKey: ['diarySummary'] });
        }}
      />

      {/* Hearing Detail Modal */}
      <HearingDetailModal
        isOpen={!!selectedHearingForDetail}
        onClose={() => setSelectedHearingForDetail(null)}
        hearing={selectedHearingForDetail}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['case', id] });
          queryClient.invalidateQueries({ queryKey: ['caseHearings', id] });
          queryClient.invalidateQueries({ queryKey: ['workspaceHearings'] });
          setSelectedHearingForDetail(null);
        }}
      />

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSubmit={async (data) => {
          await createTaskMutation.mutateAsync(data);
        }}
        preselectedCaseId={id}
        isSubmitting={createTaskMutation.isPending}
      />

      {/* Case Document Modals */}
      <DocumentUploadModal
        isOpen={isUploadDocModalOpen}
        onClose={() => setIsUploadDocModalOpen(false)}
        defaultCaseId={id}
        defaultClientId={
          typeof caseRecord.clientId === 'object' && caseRecord.clientId !== null
            ? (caseRecord.clientId as any)._id
            : typeof caseRecord.clientId === 'string'
            ? caseRecord.clientId
            : undefined
        }
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['case-documents', id] });
        }}
      />

      <DocumentPreviewModal
        isOpen={!!selectedDocForPreview}
        document={selectedDocForPreview}
        onClose={() => setSelectedDocForPreview(null)}
      />

      <DocumentEditModal
        isOpen={!!selectedDocForEdit}
        document={selectedDocForEdit}
        onClose={() => setSelectedDocForEdit(null)}
      />
    </div>
  );
};

