import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  Key,
  Smartphone,
  LogOut,
  Clock,
  History,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { settingsApi } from '../../api/settings.api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface SecuritySettingsProps {
  onNavigateToTab: (tab: string) => void;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({ onNavigateToTab }) => {
  const { logout } = useAuth();
  const { formatDate } = useTheme();

  const { data: security, isLoading, error } = useQuery({
    queryKey: ['settings-security'],
    queryFn: () => settingsApi.getSecurityInfo(),
  });

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'LOGIN_SUCCESS':
        return { label: 'Successful Sign In', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
      case 'PASSWORD_CHANGED':
        return { label: 'Password Updated', color: 'text-blue-700 bg-blue-50 border-blue-200' };
      case 'PROFILE_UPDATED':
        return { label: 'Profile Information Updated', color: 'text-legal-700 bg-legal-50 border-legal-200' };
      case 'SESSION_REVOKED':
        return { label: 'Session Revoked', color: 'text-amber-700 bg-amber-50 border-amber-200' };
      case 'WORKSPACE_INITIALIZED':
        return { label: 'Chamber Initialized', color: 'text-purple-700 bg-purple-50 border-purple-200' };
      case 'ACCOUNT_DEACTIVATED':
        return { label: 'Account Deactivation Requested', color: 'text-rose-700 bg-rose-50 border-rose-200' };
      default:
        return { label: action.replace(/_/g, ' '), color: 'text-slate-700 bg-slate-50 border-slate-200' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-legal-900 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-sm text-slate-600 font-medium">Loading security overview...</span>
      </div>
    );
  }

  if (error || !security) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
        Failed to load security audit data.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Health Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Security & Protection Status</h3>
              <p className="text-xs text-slate-500">Chamber account authentication and audit protection.</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Password Protection
              </span>
              <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-600" />
                Bcrypt Hashed (Salt 10)
              </span>
              <p className="text-[11px] text-slate-400 mt-2">
                Passwords are never stored in plaintext and cannot be decrypted.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('account')}
              className="mt-4 text-xs font-semibold text-legal-800 hover:text-legal-900 hover:underline inline-flex items-center gap-1 text-left"
            >
              <span>Change Password</span>
              <span>&rarr;</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Active Devices
              </span>
              <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-blue-600" />
                {security.activeSessionsCount} Authorized Session(s)
              </span>
              <p className="text-[11px] text-slate-400 mt-2">
                Secured via signed JWT tokens and rotating refresh tokens.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('sessions')}
              className="mt-4 text-xs font-semibold text-legal-800 hover:text-legal-900 hover:underline inline-flex items-center gap-1 text-left"
            >
              <span>Manage Active Sessions</span>
              <span>&rarr;</span>
            </button>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Account Age & Login
              </span>
              <span className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-legal-600" />
                Created {formatDate(security.accountCreated)}
              </span>
              <p className="text-[11px] text-slate-400 mt-2">
                Last sign-in:{' '}
                {security.lastLoginAt
                  ? new Date(security.lastLoginAt).toLocaleString('en-IN')
                  : 'Active now'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="mt-4 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1 text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out of Current Device</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security Activity & Audit Feed */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-legal-700" />
              Recent Security & Audit Logs
            </h3>
            <p className="text-xs text-slate-500">
              Chronological log of authentication and credential events related to your identity.
            </p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Real-time DB Ledger</span>
        </div>

        {security.recentLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No recent security alerts recorded.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {security.recentLogs.map((log) => {
              const act = getActionLabel(log.action);
              return (
                <div key={log._id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${act.color}`}>
                      {act.label}
                    </span>
                    {log.ipAddress && (
                      <span className="text-xs text-slate-500 font-mono hidden sm:inline">
                        IP: {log.ipAddress}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    {new Date(log.createdAt).toLocaleString('en-IN')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

