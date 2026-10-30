import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Smartphone,
  Laptop,
  Globe,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { settingsApi } from '../../api/settings.api';
import { useTheme } from '../../context/ThemeContext';

export const SessionSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const { formatDate } = useTheme();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const { data: sessionData, isLoading, error } = useQuery({
    queryKey: ['settings-sessions'],
    queryFn: () => settingsApi.getSessions(),
  });

  const revokeSingleMutation = useMutation({
    mutationFn: (id: string) => settingsApi.revokeSession(id),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Session revoked successfully.' });
      queryClient.invalidateQueries({ queryKey: ['settings-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['settings-security'] });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to revoke session.',
      });
    },
  });

  const revokeOthersMutation = useMutation({
    mutationFn: () => settingsApi.revokeOtherSessions(),
    onSuccess: (data) => {
      setFeedback({
        type: 'success',
        message: `Successfully revoked ${data.revokedCount} other active session(s).`,
      });
      queryClient.invalidateQueries({ queryKey: ['settings-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['settings-security'] });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to revoke other sessions.',
      });
    },
  });

  const getDeviceIcon = (device: string) => {
    if (device.toLowerCase().includes('android') || device.toLowerCase().includes('ios') || device.toLowerCase().includes('iphone')) {
      return <Smartphone className="w-5 h-5 text-legal-700" />;
    }
    return <Laptop className="w-5 h-5 text-legal-700" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-legal-900 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-sm text-slate-600 font-medium">Loading active sessions...</span>
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
        Failed to load active sessions.
      </div>
    );
  }

  const { sessions, total } = sessionData;

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

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Active Authorized Sessions ({total})</h3>
            <p className="text-xs text-slate-500">
              Web browsers and mobile devices currently logged into your AdvD account.
            </p>
          </div>

          {sessions.length > 1 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to log out all other devices?')) {
                  revokeOthersMutation.mutate();
                }
              }}
              disabled={revokeOthersMutation.isPending}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>
                {revokeOthersMutation.isPending ? 'Revoking...' : 'Revoke All Other Sessions'}
              </span>
            </button>
          )}
        </div>

        {sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No active sessions found.
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                  s.isCurrent
                    ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      s.isCurrent
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {getDeviceIcon(s.device)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900">{s.device}</span>
                      {s.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                          Current Device
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-slate-400" />
                        IP: {s.ipAddress}
                      </span>
                      <span className="text-slate-300">&bull;</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Signed in: {new Date(s.createdAt).toLocaleString('en-IN')}
                      </span>
                      {s.lastActiveAt && (
                        <>
                          <span className="text-slate-300">&bull;</span>
                          <span className="text-slate-500">
                            Last active: {new Date(s.lastActiveAt).toLocaleTimeString('en-IN')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {!s.isCurrent && (
                  <button
                    type="button"
                    onClick={() => revokeSingleMutation.mutate(s.id)}
                    disabled={revokeSingleMutation.isPending}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors inline-flex items-center gap-1.5 self-end sm:self-auto disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

