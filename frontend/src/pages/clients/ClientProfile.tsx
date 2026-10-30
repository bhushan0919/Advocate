import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  ChevronLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  Edit2,
  Trash2,
  Plus,
  ExternalLink,
  AlertCircle,
  FileText,
  Clock,
} from 'lucide-react';
import { clientsApi } from '../../api/clients.api.ts';
import { ClientModal } from './ClientModal.tsx';
import { CaseModal } from '../cases/CaseModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTranslation } from 'react-i18next';

export const ClientProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { workspace } = useAuth();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();
  const isMr = i18n.language === 'mr';

  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [isAddCaseOpen, setIsAddCaseOpen] = useState(false);

  // Fetch client details & associated cases
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['client', id, workspace?.id],
    queryFn: () => clientsApi.getClient(id!),
    enabled: !!id && !!workspace?.id,
  });

  // Delete/Archive mutation
  const deleteMutation = useMutation({
    mutationFn: () => clientsApi.deleteClient(id!),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      alert(res.message);
      navigate('/clients');
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Failed to delete client.');
    },
  });

  const handleDelete = () => {
    if (!data?.client) return;
    const confirmMsg =
      data.cases && data.cases.length > 0
        ? `This client has ${data.cases.length} associated case(s). Deleting will archive the profile to preserve legal case records. Proceed?`
        : `Permanently delete client "${data.client.fullName}"?`;

    if (window.confirm(confirmMsg)) {
      deleteMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
        <div className="w-5 h-5 border-2 border-legal-800 border-t-transparent rounded-full animate-spin" />
        <span>Loading client profile & associated cases...</span>
      </div>
    );
  }

  if (isError || !data?.client) {
    return (
      <div className="p-8 text-center text-xs text-rose-600 bg-white rounded-2xl border border-slate-200">
        <AlertCircle className="w-6 h-6 mx-auto mb-2 text-rose-500" />
        <h3 className="font-bold text-slate-900 text-sm">Client Not Found</h3>
        <p className="mt-1 text-slate-500">
          {(error as any)?.response?.data?.message || 'Unable to retrieve client details in this workspace.'}
        </p>
        <Link
          to="/clients"
          className="mt-4 inline-flex items-center gap-1 px-3 py-1.5 bg-legal-900 text-white rounded-lg text-xs font-semibold"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Return to Clients Directory</span>
        </Link>
      </div>
    );
  }

  const { client, cases } = data;

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/clients"
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{isMr ? 'सर्व पक्षकारांकडे परत' : 'Back to All Clients'}</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditClientOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-sm"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>{isMr ? 'माहिती संपादित करा' : 'Edit Profile'}</span>
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isMr ? 'हटवा / अभिलेखात ठेवा' : 'Delete / Archive'}</span>
          </button>
        </div>
      </div>

      {/* Client Overview Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-legal-900 text-white flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-md">
              {client.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{client.fullName}</h1>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                    client.clientType === 'Corporate'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : client.clientType === 'Government'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {isMr
                    ? client.clientType === 'Corporate'
                      ? 'कंपनी / संस्था'
                      : client.clientType === 'Government'
                      ? 'शासकीय पक्षकार'
                      : 'वैयक्तिक पक्षकार'
                    : `${client.clientType} Litigant`}
                </span>
                {client.isArchived && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
                    {isMr ? 'अभिलेखात' : 'Archived'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{isMr ? 'नोंदणी तारीख:' : 'Client Since'} {new Date(client.createdAt).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN')}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-legal-800 font-semibold">
                  <Briefcase className="w-3 h-3" />
                  <span>{cases.length} {isMr ? 'एकूण प्रकरणे' : 'Total Court Cases'}</span>
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAddCaseOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-legal-900 hover:bg-legal-800 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isMr ? 'पक्षकाराचे नवीन प्रकरण जोडा' : 'Register Case for Client'}</span>
          </button>
        </div>

        {/* Contact Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-500">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">{isMr ? 'भ्रमणध्वनी' : 'Mobile Phone'}</div>
              <a
                href={`tel:${client.mobile}`}
                className="font-mono font-semibold text-slate-900 hover:text-legal-800 mt-0.5 inline-block"
              >
                {client.mobile}
              </a>
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-500">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">{isMr ? 'ईमेल पत्ता' : 'Email Address'}</div>
              {client.email ? (
                <a
                  href={`mailto:${client.email}`}
                  className="font-mono text-slate-900 hover:text-legal-800 mt-0.5 inline-block"
                >
                  {client.email}
                </a>
              ) : (
                <span className="text-slate-400 italic">{isMr ? 'दिलेला नाही' : 'Not provided'}</span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-500">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-medium text-slate-400">{isMr ? 'पत्ता / ठिकाण' : 'Address / Location'}</div>
              <div className="text-slate-700 mt-0.5">
                {client.address || <span className="text-slate-400 italic">{isMr ? 'दिलेला नाही' : 'Not provided'}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Client Notes */}
        {client.notes && (
          <div className="mt-4 p-3 rounded-xl bg-amber-50/50 border border-amber-200/80 text-xs text-amber-900">
            <div className="font-semibold text-amber-800 flex items-center gap-1.5 mb-1 text-[11px]">
              <FileText className="w-3.5 h-3.5" />
              <span>{isMr ? 'चेंबर गोपनीय टिप्पण्या:' : 'Chamber Confidential Notes:'}</span>
            </div>
            <p className="whitespace-pre-wrap">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Associated Cases Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-legal-800" />
            <h2 className="text-sm font-bold text-slate-900">
              {isMr ? 'संबंधित न्यायालयीन प्रकरणे' : 'Associated Court Cases'} ({cases.length})
            </h2>
          </div>

          <button
            onClick={() => setIsAddCaseOpen(true)}
            className="text-xs font-semibold text-legal-800 hover:text-legal-900 flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isMr ? 'नवीन प्रकरण जोडा' : 'Add New Case'}</span>
          </button>
        </div>

        {cases.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <Briefcase className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800">{isMr ? 'या पक्षकारासाठी कोणतीही प्रकरणे नोंदवलेली नाहीत' : 'No Cases Registered For This Client'}</h4>
            <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto">
              {isMr ? `${client.fullName} यांच्याशी संबंधित न्यायालयात दाखल प्रकरणे नोंदवा.` : `Register court petitions, suits, or complaints linked directly to ${client.fullName}.`}
            </p>
            <button
              onClick={() => setIsAddCaseOpen(true)}
              className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 bg-legal-900 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-3 h-3" />
              <span>{isMr ? 'पहिले प्रकरण जोडा' : 'Register First Case'}</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4">{isMr ? 'प्रकरण क्र. / CNR' : 'Case Number / CNR'}</th>
                  <th className="py-2.5 px-4">{isMr ? 'न्यायालय व ठिकाण' : 'Court & Location'}</th>
                  <th className="py-2.5 px-4">{isMr ? 'विरोधी पक्ष' : 'Opponent Party'}</th>
                  <th className="py-2.5 px-4">{isMr ? 'प्रकरण प्रकार' : 'Case Type'}</th>
                  <th className="py-2.5 px-4">{isMr ? 'पुढील सुनावणी' : 'Next Hearing'}</th>
                  <th className="py-2.5 px-4">{isMr ? 'कामकाज उद्देश' : 'Purpose'}</th>
                  <th className="py-2.5 px-4">{t('common.status')}</th>
                  <th className="py-2.5 px-4 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cases.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        to={`/cases/${c._id}`}
                        className="font-bold text-legal-900 hover:text-legal-700 font-mono"
                      >
                        {c.caseNumber}
                      </Link>
                      {c.cnrNumber && (
                        <div className="font-mono text-[10px] text-slate-400">{c.cnrNumber}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.courtName}</div>
                      {(c.courtLocation || c.courtRoomNumber) && (
                        <div className="text-[10px] text-slate-500">
                          {[c.courtRoomNumber, c.courtLocation].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{c.opponentName}</div>
                      {c.opponentAdvocate && (
                        <div className="text-[10px] text-slate-400">Adv. {c.opponentAdvocate}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-medium text-slate-700">
                        {c.caseType}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {c.nextHearingDate ? (
                        <div className="flex items-center gap-1 font-mono font-medium text-slate-900">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{new Date(c.nextHearingDate).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN')}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">{isMr ? 'निश्चित नाही' : 'Unscheduled'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[150px] truncate">
                      {c.nextHearingPurpose || <span className="text-slate-400 italic">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          c.status === 'Pending'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : c.status === 'Disposed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {isMr
                          ? c.status === 'Pending'
                            ? 'प्रलंबित'
                            : c.status === 'Disposed'
                            ? 'निकाली'
                            : c.status
                          : c.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        to={`/cases/${c._id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors text-[11px]"
                      >
                        <span>{isMr ? 'उघडा' : 'Open'}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Client Modal */}
      <ClientModal
        isOpen={isEditClientOpen}
        onClose={() => setIsEditClientOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['client', id] });
          queryClient.invalidateQueries({ queryKey: ['clients'] });
        }}
        clientToEdit={client}
      />

      {/* Add Case Modal pre-bound to this client */}
      <CaseModal
        isOpen={isAddCaseOpen}
        onClose={() => setIsAddCaseOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['client', id] });
          queryClient.invalidateQueries({ queryKey: ['cases'] });
        }}
        initialClientId={client._id}
      />
    </div>
  );
};

