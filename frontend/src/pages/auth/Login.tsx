import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Scale, Lock, Mail, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';
import { LanguageSwitcher } from '../../components/common/LanguageSwitcher';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.message || t('auth.invalidCredentials')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      {/* Language Switcher in top right corner */}
      <div className="absolute top-4 right-4">
        <LanguageSwitcher variant="pill" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Icon & Heading */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-legal-900 border border-legal-800 flex items-center justify-center text-amber-300 shadow-md">
            <Scale className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900 font-sans">
          AdvD — {t('nav.diary')}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500 font-medium">
          {t('common.appTagline')}
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('auth.emailLabel')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">{t('auth.passwordLabel')}</label>
                <a href="#forgot" className="text-[11px] text-legal-700 hover:underline">
                  {t('auth.forgotPassword')}
                </a>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-legal-700/20 focus:border-legal-700 text-slate-900"
                />
              </div>
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
                  <span>{t('auth.signInButton')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-legal-700" />
              Demo:
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickDemo('rajesh.sharma@advd-demo.in', 'Advocate@123')}
                className="text-left px-2.5 py-1.5 rounded-md bg-slate-50 hover:bg-legal-50 border border-slate-200 hover:border-legal-300 text-xs flex items-center justify-between text-slate-700 transition-colors"
              >
                <div>
                  <div className="font-semibold text-slate-900">Advocate Rajesh Sharma</div>
                  <div className="text-[10px] text-slate-500">Chamber A Owner</div>
                </div>
                <span className="text-[10px] font-mono text-legal-700 font-medium">Use Login</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('suresh.clerk@advd-demo.in', 'Clerk@123')}
                className="text-left px-2.5 py-1.5 rounded-md bg-slate-50 hover:bg-legal-50 border border-slate-200 hover:border-legal-300 text-xs flex items-center justify-between text-slate-700 transition-colors"
              >
                <div>
                  <div className="font-semibold text-slate-900">Suresh Verma (Clerk)</div>
                  <div className="text-[10px] text-slate-500">Chamber A Clerk</div>
                </div>
                <span className="text-[10px] font-mono text-legal-700 font-medium">Use Login</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-600">
            {t('auth.dontHaveAccount')}{' '}
            <Link
              to="/register"
              className="font-semibold text-legal-800 hover:text-legal-900 underline"
            >
              {t('auth.registerAdvocate')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
