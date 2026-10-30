import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  UserPlus,
  Mail,
  Shield,
  Copy,
  Check,
  Trash2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Clock,
} from 'lucide-react';
import { apiClient } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTranslation } from 'react-i18next';

export const StaffManagement: React.FC = () => {
  const { workspace } = useAuth();
  const { t, i18n } = useTranslation();
  const isMr = i18n.language === 'mr';
  const isOwner = workspace?.role === 'owner';

  const [members, setMembers] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite Clerk Form State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'clerk' | 'advocate'>('clerk');
  const [isInviting, setIsInviting] = useState(false);
  const [lastGeneratedInvite, setLastGeneratedInvite] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadStaffData = async () => {
    setIsLoading(true);
    try {
      const [membersRes, invitesRes] = await Promise.all([
        apiClient.get('/workspaces/members'),
        isOwner ? apiClient.get('/workspaces/invitations') : Promise.resolve({ data: { data: [] } }),
      ]);

      if (membersRes.data.success) {
        setMembers(membersRes.data.data);
      }
      if (invitesRes.data?.success) {
        setInvitations(invitesRes.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load chamber staff data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaffData();
  }, [workspace?.id]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsInviting(true);
    setLastGeneratedInvite(null);

    try {
      const res = await apiClient.post('/workspaces/invitations', {
        email: inviteEmail,
        role: inviteRole,
      });

      if (res.data.success) {
        setInviteEmail('');
        setLastGeneratedInvite(res.data.data.inviteUrl);
        loadStaffData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate invitation.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await apiClient.delete(`/workspaces/invitations/${id}`);
      setInvitations(invitations.filter((inv) => inv._id !== id));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to revoke invitation.');
    }
  };

  const handleToggleStatus = async (memberId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await apiClient.patch(`/workspaces/members/${memberId}/status`, {
        status: nextStatus,
      });
      loadStaffData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update member status.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-legal-800" />
          <span>{t('staff.title')}</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {t('staff.subtitle')} — <strong>{workspace?.name}</strong>.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Invite Staff Section (Only Advocate Owner can invite) */}
      {isOwner && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-legal-800" />
            <h2 className="text-sm font-bold text-slate-900">{t('staff.inviteClerk')}</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {isMr
              ? 'निमंत्रण लिंक पाठवा. लिपिक किंवा सहकारी वकील थेट या चेंबरशी जोडले जातील.'
              : 'Send an expiring invitation link. The clerk joins this workspace directly and cannot create an independent workspace.'}
          </p>

          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row items-stretch gap-3">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={isMr ? 'लिपिक / सहकारी ईमेल पत्ता' : 'clerk@chambers.in'}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900"
              />
            </div>

            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as any)}
              className="py-2 px-3 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 font-medium"
            >
              <option value="clerk">{isMr ? 'भूमिका: लिपिक (Clerk)' : 'Role: Clerk'}</option>
              <option value="advocate">{isMr ? 'भूमिका: सहकारी वकील (Associate)' : 'Role: Associate Advocate'}</option>
            </select>

            <button
              type="submit"
              disabled={isInviting}
              className="py-2 px-4 rounded-lg bg-legal-900 hover:bg-legal-800 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-60 shadow-sm"
            >
              {isInviting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isMr ? 'निमंत्रण लिंक तयार करा' : 'Generate Invitation Link'}</span>
                </>
              )}
            </button>
          </form>

          {/* Generated Invite Alert */}
          {lastGeneratedInvite && (
            <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
              <div className="text-xs font-bold flex items-center justify-between">
                <span>{isMr ? 'निमंत्रण लिंक तयार झाली (७ दिवसांसाठी वैध):' : 'Invitation Link Generated (Valid for 7 Days):'}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(lastGeneratedInvite)}
                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copied ? (isMr ? 'लिंक कॉपी केली' : 'Copied Link') : (isMr ? 'लिंक कॉपी करा' : 'Copy Link')}</span>
                </button>
              </div>
              <div className="text-xs font-mono bg-white p-2 rounded border border-emerald-200 mt-2 break-all text-slate-800 select-all">
                {lastGeneratedInvite}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-legal-800" />
            <h2 className="text-sm font-bold text-slate-900">
              {t('staff.activeMembers')} ({members.length})
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-500">{isMr ? 'सदस्य माहिती लोड होत आहे...' : 'Loading chamber members...'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4">{isMr ? 'सदस्याचे नाव' : 'Member Name'}</th>
                  <th className="py-2.5 px-4">{isMr ? 'ईमेल' : 'Email'}</th>
                  <th className="py-2.5 px-4">{t('staff.role')}</th>
                  <th className="py-2.5 px-4">{t('common.status')}</th>
                  <th className="py-2.5 px-4">{t('staff.memberSince')}</th>
                  {isOwner && <th className="py-2.5 px-4 text-right">{t('common.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((member) => (
                  <tr key={member.membershipId} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {member.user?.fullName}
                      {member.role === 'owner' && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold uppercase">
                          {isMr ? 'चेंबर प्रमुख' : 'Chamber Owner'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {member.user?.email}
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize font-medium text-slate-800 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {isMr
                          ? member.role === 'owner'
                            ? 'प्रमुख वकील'
                            : member.role === 'advocate'
                            ? 'सहकारी वकील'
                            : 'लिपिक'
                          : member.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-medium ${
                          member.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {isMr
                          ? member.status === 'active'
                            ? 'सक्रिय'
                            : 'निलंबित'
                          : member.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(member.joinedAt).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN')}
                    </td>
                    {isOwner && (
                      <td className="py-3 px-4 text-right">
                        {member.role !== 'owner' ? (
                          <button
                            onClick={() => handleToggleStatus(member.membershipId, member.status)}
                            className="text-xs font-semibold text-slate-600 hover:text-slate-900 inline-flex items-center gap-1"
                            title={member.status === 'active' ? (isMr ? 'सदस्य निलंबित करा' : 'Suspend Member') : (isMr ? 'सदस्य सक्रिय करा' : 'Activate Member')}
                          >
                            {member.status === 'active' ? (
                              <>
                                <ToggleRight className="w-5 h-5 text-emerald-600" />
                                <span>{isMr ? 'सक्रिय' : 'Active'}</span>
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-5 h-5 text-rose-500" />
                                <span className="text-rose-600">{isMr ? 'निलंबित' : 'Suspended'}</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">{isMr ? 'मालक खाते' : 'Owner account'}</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations Table */}
      {isOwner && invitations.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-slate-900">
                {t('staff.pendingInvites')} ({invitations.length})
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4">{t('staff.clerkEmail')}</th>
                  <th className="py-2.5 px-4">{t('staff.role')}</th>
                  <th className="py-2.5 px-4">{isMr ? 'मुदत समाप्ती' : 'Expires At'}</th>
                  <th className="py-2.5 px-4 text-right">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invitations.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-900">{inv.email}</td>
                    <td className="py-3 px-4 capitalize font-medium">
                      {isMr
                        ? inv.role === 'advocate'
                          ? 'सहकारी वकील'
                          : 'लिपिक'
                        : inv.role}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(inv.expiresAt).toLocaleDateString(isMr ? 'mr-IN' : 'en-IN')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleRevoke(inv._id)}
                        className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded"
                        title={t('staff.revokeInvitation')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

