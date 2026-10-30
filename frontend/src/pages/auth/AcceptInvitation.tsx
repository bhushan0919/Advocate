import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Scale, Lock, User, Phone, CheckCircle, AlertCircle, ArrowRight, Building } from 'lucide-react';
import { apiClient } from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const AcceptInvitation: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUserData } = useAuth();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(true);
  const [inviteData, setInviteData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Missing invitation token. Please check your invitation link.');
        setIsLoading(false);
        return;
      }

      try {
        const res = await apiClient.get(`/auth/verify-invitation?token=${token}`);
        if (res.data.success) {
          setInviteData(res.data.data);
        }
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            'This invitation link is invalid or has expired. Please contact the advocate.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await apiClient.post('/auth/accept-invitation', {
        token,
        fullName,
        mobile,
        password,
      });

      if (res.data.success) {
        const { workspace, tokens } = res.data.data;
        localStorage.setItem('advd_access_token', tokens.accessToken);
        localStorage.setItem('advd_refresh_token', tokens.refreshToken);
        localStorage.setItem('advd_active_workspace_id', workspace.id);

        await refreshUserData();
        navigate('/');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Failed to accept invitation. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-legal-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-3 text-sm text-slate-600">Verifying Chamber Invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-legal-900 border border-legal-800 flex items-center justify-center text-amber-300 shadow-md">
            <Scale className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900 font-sans">
          Chamber Invitation
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          Join Advocate Workspace as Clerk / Staff
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {error ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">Unable to accept invitation</div>
                <div className="text-xs mt-1">{error}</div>
              </div>
            </div>
          ) : (
            <>
              {/* Workspace details banner */}
              <div className="mb-5 p-3.5 rounded-xl bg-legal-50 border border-legal-200 text-legal-900">
                <div className="flex items-center gap-2 text-xs font-semibold text-legal-800">
                  <Building className="w-4 h-4 text-legal-700" />
                  <span>Invited by: {inviteData?.invitedBy?.name}</span>
                </div>
                <div className="text-sm font-bold mt-1 text-legal-950">
                  {inviteData?.workspace?.name}
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Joining as: <span className="font-semibold capitalize text-amber-800">{inviteData?.role}</span>
                </div>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Suresh Verma"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mobile Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="+91 98200 44556"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Create Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900"
                    />
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                  Your account will be securely linked to <strong>{inviteData?.workspace?.name}</strong>.
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg text-sm font-semibold text-white bg-legal-900 hover:bg-legal-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-legal-700 shadow-sm transition-colors disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Accept & Join Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

