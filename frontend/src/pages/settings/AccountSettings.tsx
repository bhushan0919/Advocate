import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lock,
  Key,
  Smartphone,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  LogOut,
} from 'lucide-react';
import { settingsApi } from '../../api/settings.api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export const AccountSettings: React.FC = () => {
  const { logout } = useAuth();
  const { formatDate } = useTheme();
  const queryClient = useQueryClient();

  // Mobile state
  const [mobileInput, setMobileInput] = useState('');
  const [mobileFeedback, setMobileFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Deactivate state
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [confirmationWord, setConfirmationWord] = useState('');
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [deactivateError, setDeactivateError] = useState<string | null>(null);

  const { data: account, isLoading, error } = useQuery({
    queryKey: ['settings-account'],
    queryFn: async () => {
      const data = await settingsApi.getAccount();
      setMobileInput(data.mobile);
      return data;
    },
  });

  // Mobile mutation
  const updateMobileMutation = useMutation({
    mutationFn: (mobile: string) => settingsApi.updateMobile(mobile),
    onSuccess: () => {
      setMobileFeedback({ type: 'success', message: 'Mobile number updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['settings-account'] });
      setTimeout(() => setMobileFeedback(null), 4000);
    },
    onError: (err: any) => {
      setMobileFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update mobile number.',
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: () =>
      settingsApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    onSuccess: (data) => {
      setPasswordFeedback({
        type: 'success',
        message: data.message || 'Password changed successfully. All other sessions have been revoked.',
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordFeedback(null), 6000);
    },
    onError: (err: any) => {
      setPasswordFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update password. Check your current password.',
      });
    },
  });

  // Deactivate mutation
  const deactivateMutation = useMutation({
    mutationFn: () => settingsApi.deactivateAccount(deactivatePassword, confirmationWord),
    onSuccess: async () => {
      alert('Your account has been deactivated. You will now be redirected to the sign in page.');
      await logout();
    },
    onError: (err: any) => {
      setDeactivateError(err.response?.data?.message || 'Failed to deactivate account.');
    },
  });

  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMobileFeedback(null);
    updateMobileMutation.mutate(mobileInput);
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);
    if (newPassword.length < 8) {
      setPasswordFeedback({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }
    changePasswordMutation.mutate();
  };

  const handleDeactivate = (e: React.FormEvent) => {
    e.preventDefault();
    setDeactivateError(null);
    if (confirmationWord !== 'DEACTIVATE') {
      setDeactivateError('Please type DEACTIVATE in capital letters to confirm.');
      return;
    }
    deactivateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-legal-900 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-sm text-slate-600 font-medium">Loading account details...</span>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
        Failed to load account settings.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Overview Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-1">Account Credentials & Overview</h3>
        <p className="text-xs text-slate-500 mb-6">
          Your primary email serves as your system-wide identity across all workspaces.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Primary Email</span>
            <span className="text-sm font-semibold text-slate-900 block truncate">{account.email}</span>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              Verified Identity
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Account Status</span>
            <span className="text-sm font-semibold text-slate-900 uppercase tracking-wide block">
              {account.status}
            </span>
            <div className="mt-2 flex items-center gap-1.5 text-[11px] text-legal-700 font-medium">
              <Clock className="w-3.5 h-3.5" />
              Member since {formatDate(account.createdAt)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Last Successful Login</span>
            <span className="text-sm font-semibold text-slate-900 block">
              {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString('en-IN') : 'Active now'}
            </span>
            <div className="mt-2 text-[11px] text-slate-400">
              Session secured via JWT & Refresh Token
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-1">
          <Key className="w-4 h-4 text-legal-700" />
          <h3 className="text-base font-semibold text-slate-900">Change Password</h3>
        </div>
        <p className="text-xs text-slate-500 mb-6">
          Update your password to keep your chamber account and client records protected.
        </p>

        {passwordFeedback && (
          <div
            className={`p-4 rounded-xl flex items-start gap-3 border mb-6 ${
              passwordFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {passwordFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="text-sm font-medium">{passwordFeedback.message}</div>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Current Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900"
                placeholder="Enter current password"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900"
                placeholder="Minimum 8 characters"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900"
                placeholder="Re-type new password"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={changePasswordMutation.isPending}
              className="px-5 py-2.5 rounded-lg bg-legal-900 hover:bg-legal-800 text-white font-semibold text-xs tracking-wide shadow-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              {changePasswordMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone: Account Deactivation */}
      <div className="bg-rose-50/50 rounded-xl border border-rose-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h3 className="text-base font-semibold text-rose-900">Danger Zone: Account Deactivation</h3>
        </div>
        <p className="text-xs text-rose-700 mb-4 max-w-2xl leading-relaxed">
          Deactivating your account will immediately revoke all access tokens. In compliance with Bar
          Council and court record requirements, existing case histories, filed hearing notes, and past
          diaries will NOT be deleted, but your login identity will be deactivated.
        </p>

        {!isDeactivateOpen ? (
          <button
            type="button"
            onClick={() => setIsDeactivateOpen(true)}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors"
          >
            Deactivate My Account
          </button>
        ) : (
          <form onSubmit={handleDeactivate} className="mt-4 p-4 bg-white rounded-xl border border-rose-200 space-y-4 max-w-md">
            {deactivateError && (
              <div className="p-3 rounded-lg bg-rose-100 text-rose-800 text-xs font-medium">
                {deactivateError}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Enter Current Password to Confirm
              </label>
              <input
                type="password"
                required
                value={deactivatePassword}
                onChange={(e) => setDeactivatePassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Current password"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Type <span className="font-mono font-bold text-rose-600">DEACTIVATE</span> to proceed
              </label>
              <input
                type="text"
                required
                value={confirmationWord}
                onChange={(e) => setConfirmationWord(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="DEACTIVATE"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={deactivateMutation.isPending}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-colors disabled:opacity-50"
              >
                {deactivateMutation.isPending ? 'Deactivating...' : 'Confirm Permanent Deactivation'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDeactivateOpen(false);
                  setDeactivateError(null);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

