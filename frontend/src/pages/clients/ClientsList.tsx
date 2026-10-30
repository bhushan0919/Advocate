import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Edit2,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { clientsApi } from '../../api/clients.api.ts';
import { Client } from '../../types/client.ts';
import { ClientModal } from './ClientModal.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTranslation } from 'react-i18next';

export const ClientsList: React.FC = () => {
  const { workspace } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // Filters & Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  // Status/Alert Message State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Fetch Clients with TanStack Query
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['clients', workspace?.id, page, limit, searchQuery, selectedType],
    queryFn: () =>
      clientsApi.getClients({
        page,
        limit,
        search: searchQuery || undefined,
        clientType: selectedType || undefined,
      }),
    enabled: !!workspace?.id,
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (clientId: string) => clientsApi.deleteClient(clientId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setNotification({
        message: res.message,
        type: res.archived ? 'info' : 'success',
      });
      setTimeout(() => setNotification(null), 5000);
    },
    onError: (err: any) => {
      setNotification({
        message: err.response?.data?.message || 'Failed to delete client.',
        type: 'info',
      });
      setTimeout(() => setNotification(null), 5000);
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setSearchQuery('');
    setSelectedType('');
    setPage(1);
  };

  const handleOpenCreateModal = () => {
    setClientToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setClientToEdit(client);
    setIsModalOpen(true);
  };

  const handleDelete = (client: Client) => {
    const confirmText =
      client.caseCount && client.caseCount > 0
        ? `Client "${client.fullName}" has ${client.caseCount} linked case(s). Deleting will safely ARCHIVE the client profile to preserve case records. Proceed?`
        : `Are you sure you want to delete client "${client.fullName}"? This action cannot be undone.`;

    if (window.confirm(confirmText)) {
      deleteMutation.mutate(client._id);
    }
  };

  const clients = data?.clients || [];
  const total = data?.pagination.total || 0;
  const totalPages = data?.pagination.totalPages || 1;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-legal-800" />
              <span>{t('clients.title')}</span>
            </h1>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-legal-100 text-legal-800">
              {total} {t('common.results')}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('clients.subtitle')}
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-legal-900 hover:bg-legal-800 text-white text-xs font-semibold shadow-sm transition-colors"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>{t('clients.newClient')}</span>
        </button>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{notification.message}</span>
        </div>
      )}

      {/* Search and Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by client name, mobile (+91...), or email..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 placeholder:text-slate-400"
          />
        </form>

        {/* Client Type Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="py-2 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-700 font-medium"
          >
            <option value="">All Litigant Types</option>
            <option value="Individual">Individual Litigant</option>
            <option value="Corporate">Corporate / Entity</option>
            <option value="Government">Government / Public Body</option>
            <option value="Other">Other</option>
          </select>

          {(searchQuery || selectedType || searchInput) && (
            <button
              onClick={handleClearSearch}
              className="px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Table / Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-legal-800 border-t-transparent rounded-full animate-spin" />
            <span>Loading clients directory...</span>
          </div>
        ) : isError ? (
          <div className="p-8 text-center text-xs text-rose-600 flex flex-col items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>Failed to load clients: {(error as any)?.message || 'Internal server error'}</span>
            <button
              onClick={() => refetch()}
              className="mt-2 px-3 py-1 bg-slate-100 text-slate-700 rounded text-xs font-semibold hover:bg-slate-200"
            >
              Retry
            </button>
          </div>
        ) : clients.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Clients Found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedType
                ? 'No client profiles match your current search criteria. Try resetting filters.'
                : 'Your chamber client registry is empty. Add your first litigant or corporate client.'}
            </p>
            {!searchQuery && !selectedType && (
              <button
                onClick={handleOpenCreateModal}
                className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-legal-900 text-white text-xs font-semibold hover:bg-legal-800 shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add First Client</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 w-12 text-center">Sr.</th>
                  <th className="py-2.5 px-4">Client Name & Classification</th>
                  <th className="py-2.5 px-4">Contact Phone</th>
                  <th className="py-2.5 px-4">Email</th>
                  <th className="py-2.5 px-4">Address</th>
                  <th className="py-2.5 px-4 text-center">Linked Cases</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client, index) => {
                  const srNo = (page - 1) * limit + index + 1;
                  return (
                    <tr key={client._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400 font-semibold text-[11px]">
                        {srNo}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          to={`/clients/${client._id}`}
                          className="font-bold text-slate-900 hover:text-legal-700 flex items-center gap-1.5"
                        >
                          <span>{client.fullName}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 inline" />
                        </Link>
                        <div className="mt-0.5">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                              client.clientType === 'Corporate'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : client.clientType === 'Government'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {client.clientType}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <a
                          href={`tel:${client.mobile}`}
                          className="font-mono text-slate-700 hover:text-legal-800 flex items-center gap-1.5 font-medium"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{client.mobile}</span>
                        </a>
                      </td>
                      <td className="py-3 px-4">
                        {client.email ? (
                          <a
                            href={`mailto:${client.email}`}
                            className="font-mono text-slate-600 hover:text-legal-800 flex items-center gap-1.5 text-[11px]"
                          >
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[140px]">{client.email}</span>
                          </a>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 max-w-[200px]">
                        {client.address ? (
                          <div className="flex items-start gap-1 text-slate-600 truncate" title={client.address}>
                            <MapPin className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                            <span className="truncate">{client.address}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          to={`/clients/${client._id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-legal-50 text-legal-900 border border-legal-200 hover:bg-legal-100 transition-colors"
                        >
                          <Briefcase className="w-3 h-3" />
                          <span>{client.caseCount || 0}</span>
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/clients/${client._id}`}
                            className="p-1.5 text-slate-600 hover:text-legal-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View Profile & Cases"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleOpenEditModal(client)}
                            className="p-1.5 text-slate-600 hover:text-legal-900 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Edit Client Profile"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(client)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete or Archive Client"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > 0 && (
          <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              Showing <span className="font-semibold text-slate-900">{(page - 1) * limit + 1}</span> to{' '}
              <span className="font-semibold text-slate-900">
                {Math.min(page * limit, total)}
              </span>{' '}
              of <span className="font-semibold text-slate-900">{total}</span> clients
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-300 hover:bg-white disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      <ClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['clients'] });
        }}
        clientToEdit={clientToEdit}
      />
    </div>
  );
};

