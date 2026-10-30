import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Camera,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Users,
  Shield,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  Lock,
} from 'lucide-react';
import { settingsApi } from '../../api/settings.api';
import { UpdateWorkspacePayload } from '../../types/settings';
import { useTheme } from '../../context/ThemeContext';

export const WorkspaceSettings: React.FC = () => {
  const queryClient = useQueryClient();
  const { formatDate } = useTheme();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<UpdateWorkspacePayload>({
    name: '',
    officeName: '',
    address: '',
    contactEmail: '',
    contactPhone: '',
    barCouncilNumber: '',
    stateBarCouncil: '',
    reminderDaysBefore: [1, 3],
  });

  const [logoPreview, setLogoPreview] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const { data: ws, isLoading, error } = useQuery({
    queryKey: ['settings-workspace'],
    queryFn: () => settingsApi.getWorkspaceSettings(),
  });

  const isClerk = ws?.userRole === 'clerk';

  useEffect(() => {
    if (ws) {
      setFormData({
        name: ws.name || '',
        officeName: ws.officeName || '',
        address: ws.address || '',
        contactEmail: ws.contactEmail || '',
        contactPhone: ws.contactPhone || '',
        barCouncilNumber: ws.barCouncilNumber || '',
        stateBarCouncil: ws.stateBarCouncil || '',
        reminderDaysBefore: ws.settings?.reminderDaysBefore || [1, 3],
      });
      setLogoPreview(ws.logo || '');
    }
  }, [ws]);

  // Mutation: Update details
  const updateWorkspaceMutation = useMutation({
    mutationFn: (payload: UpdateWorkspacePayload) => settingsApi.updateWorkspaceSettings(payload),
    onSuccess: () => {
      setFeedback({ type: 'success', message: 'Chamber workspace details saved successfully.' });
      queryClient.invalidateQueries({ queryKey: ['settings-workspace'] });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update workspace settings.';
      setFeedback({ type: 'error', message: msg });
    },
  });

  // Mutation: Upload Logo
  const updateLogoMutation = useMutation({
    mutationFn: (base64: string) => settingsApi.updateWorkspaceLogo(base64),
    onSuccess: (data) => {
      setLogoPreview(data.logo);
      setFeedback({ type: 'success', message: 'Chamber logo updated successfully.' });
      queryClient.invalidateQueries({ queryKey: ['settings-workspace'] });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to upload chamber logo. Max size 3MB.';
      setFeedback({ type: 'error', message: msg });
    },
  });

  // Mutation: Delete Logo
  const deleteLogoMutation = useMutation({
    mutationFn: () => settingsApi.deleteWorkspaceLogo(),
    onSuccess: () => {
      setLogoPreview('');
      setFeedback({ type: 'success', message: 'Chamber logo removed.' });
      queryClient.invalidateQueries({ queryKey: ['settings-workspace'] });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to remove logo.';
      setFeedback({ type: 'error', message: msg });
    },
  });

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Please select a valid image file.' });
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Image size exceeds maximum 3MB limit.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      updateLogoMutation.mutate(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleReminderToggle = (day: number) => {
    if (isClerk) return;
    const current = formData.reminderDaysBefore || [];
    const exists = current.includes(day);
    const updated = exists ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => a - b);
    setFormData({ ...formData, reminderDaysBefore: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isClerk) return;
    setFeedback(null);
    updateWorkspaceMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-legal-900 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-sm text-slate-600 font-medium">Loading workspace settings...</span>
      </div>
    );
  }

  if (error || !ws) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
        Failed to load workspace configuration.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Clerk Read-Only Notice */}
      {isClerk && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold">Chamber Settings: Read-Only Access</h4>
            <p className="text-xs text-amber-700 mt-0.5">
              You are signed in as a chamber Clerk. Only Chamber Owners and Advocates have authorization
              to modify workspace branding, contact credentials, and reminder policies.
            </p>
          </div>
        </div>
      )}

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border transition-all ${feedback.type === 'success'
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

      {/* Chamber Branding & Logo Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-1">Chamber Branding</h3>
        <p className="text-xs text-slate-500 mb-6">
          Official seal or firm logo shown in reports, vakalatnamas, and diary exports.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-2xl bg-legal-50 text-legal-900 font-bold text-2xl flex items-center justify-center border-2 border-dashed border-legal-300 shadow-sm overflow-hidden">
              {logoPreview ? (
                <img src={logoPreview} alt={ws.name} className="w-full h-full object-contain p-2" />
              ) : (
                <Building2 className="w-10 h-10 text-legal-600" />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                disabled={isClerk}
                onChange={handleLogoFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={isClerk || updateLogoMutation.isPending}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{updateLogoMutation.isPending ? 'Uploading...' : 'Upload Chamber Logo'}</span>
              </button>

              {logoPreview && !isClerk && (
                <button
                  type="button"
                  onClick={() => deleteLogoMutation.mutate()}
                  disabled={deleteLogoMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleteLogoMutation.isPending ? 'Removing...' : 'Remove Logo'}</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Recommended: High resolution PNG with transparent background. Max 3MB.
            </p>
          </div>
        </div>
      </div>

      {/* Chamber Metadata Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Chamber Details & Contact Information</h3>
            <p className="text-xs text-slate-500">
              Official workspace name, address, and primary communication channels.
            </p>
          </div>
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Established {formatDate(ws.createdAt)}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Workspace Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Chamber / Practice Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                disabled={isClerk}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Sharma Law Chambers"
              />
            </div>
          </div>

          {/* Office Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Branch / Office Identifier
            </label>
            <input
              type="text"
              disabled={isClerk}
              value={formData.officeName}
              onChange={(e) => setFormData({ ...formData, officeName: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="High Court Main Branch"
            />
          </div>

          {/* Contact Email */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Official Chamber Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                disabled={isClerk}
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="contact@sharmachambers.in"
              />
            </div>
          </div>

          {/* Contact Phone */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Official Chamber Phone / Helpline
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                disabled={isClerk}
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="+91 22 2265 0000"
              />
            </div>
          </div>

          {/* Bar Registration */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Lead Advocate Bar Council Number
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                disabled={isClerk}
                value={formData.barCouncilNumber}
                onChange={(e) => setFormData({ ...formData, barCouncilNumber: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="D/1982/2010"
              />
            </div>
          </div>

          {/* State Bar Council */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Associated State Bar Council
            </label>
            <input
              type="text"
              disabled={isClerk}
              value={formData.stateBarCouncil}
              onChange={(e) => setFormData({ ...formData, stateBarCouncil: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Bar Council of Delhi"
            />
          </div>

          {/* Office Address */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Physical Office / Chamber Address
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows={2}
                disabled={isClerk}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
                placeholder="Room 14, High Court Advocates Block, New Delhi"
              />
            </div>
          </div>

          {/* Hearing Reminder Defaults */}
          <div className="md:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <label className="block text-xs font-semibold text-slate-900 mb-1">
              Automatic Hearing Reminder Schedule
            </label>
            <p className="text-xs text-slate-500 mb-3">
              AdvD will automatically schedule pending notifications prior to scheduled hearings.
            </p>

            <div className="flex flex-wrap gap-3">
              {[
                { day: 1, label: '1 Day Before' },
                { day: 3, label: '3 Days Before' },
                { day: 7, label: '7 Days Before' },
                { day: 14, label: '14 Days Before' },
              ].map(({ day, label }) => {
                const isSelected = formData.reminderDaysBefore?.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isClerk}
                    onClick={() => handleReminderToggle(day)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${isSelected
                        ? 'bg-legal-900 text-white border-legal-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                      } disabled:opacity-50`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action Button */}
        {!isClerk && (
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={updateWorkspaceMutation.isPending}
              className="px-5 py-2.5 rounded-lg bg-legal-900 hover:bg-legal-800 text-white font-semibold text-xs tracking-wide shadow-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50"
            >
              {updateWorkspaceMutation.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{updateWorkspaceMutation.isPending ? 'Saving...' : 'Save Chamber Settings'}</span>
            </button>
          </div>
        )}
      </form>

      {/* Chamber Members Summary */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-legal-700" />
              Active Chamber Members ({ws.membersCount})
            </h3>
            <p className="text-xs text-slate-500">
              Users authorized to view and maintain cases in this chamber workspace.
            </p>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {ws.members.map((member) => (
            <div key={member.id} className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center overflow-hidden">
                  {member.user?.avatar ? (
                    <img src={member.user.avatar} alt={member.user.fullName} className="w-full h-full object-cover" />
                  ) : (
                    member.user?.fullName?.charAt(0) || 'U'
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <span>{member.user?.fullName}</span>
                    {member.user?.id === ws.owner?._id && (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                        Primary Owner
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500">{member.user?.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold capitalize bg-slate-100 text-slate-700">
                  {member.role}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Joined {formatDate(member.joinedAt)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

