import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  Camera,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
  Briefcase,
  Mail,
  Phone,
  Shield,
  FileText,
} from 'lucide-react';
import { settingsApi } from '../../api/settings.api';
import { UpdateProfilePayload } from '../../types/settings';
import { useAuth } from '../../context/AuthContext';

export const ProfileSettings: React.FC = () => {
  const { refreshUserData } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<UpdateProfilePayload>({
    fullName: '',
    mobile: '',
    designation: '',
    barCouncilNumber: '',
    stateBarCouncil: '',
    officeAddress: '',
  });

  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['settings-profile'],
    queryFn: () => settingsApi.getProfile(),
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        mobile: profile.mobile || '',
        designation: profile.designation || '',
        barCouncilNumber: profile.barCouncilNumber || '',
        stateBarCouncil: profile.stateBarCouncil || '',
        officeAddress: profile.officeAddress || '',
      });
      setAvatarPreview(profile.avatar || '');
    }
  }, [profile]);

  // Mutation: Update Profile Details
  const updateProfileMutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => settingsApi.updateProfile(payload),
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'Profile details saved successfully.' });
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
      await refreshUserData();
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update profile. Please verify your inputs.';
      setFeedback({ type: 'error', message: msg });
    },
  });

  // Mutation: Upload Avatar
  const updateAvatarMutation = useMutation({
    mutationFn: (avatarOrFormData: FormData | string) => settingsApi.updateAvatar(avatarOrFormData),
    onSuccess: async (data) => {
      setAvatarPreview(data.avatar);
      setFeedback({ type: 'success', message: 'Profile photo uploaded to Cloudinary successfully.' });
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
      await refreshUserData();
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      // Revert to original profile avatar on upload failure
      setAvatarPreview(profile?.avatar || '');
      const msg = err.response?.data?.message || 'Failed to upload photo to Cloudinary. Please try again.';
      setFeedback({ type: 'error', message: msg });
    },
  });

  // Mutation: Delete Avatar
  const deleteAvatarMutation = useMutation({
    mutationFn: () => settingsApi.deleteAvatar(),
    onSuccess: async () => {
      setAvatarPreview('');
      setFeedback({ type: 'success', message: 'Profile photo removed from Cloudinary.' });
      queryClient.invalidateQueries({ queryKey: ['settings-profile'] });
      await refreshUserData();
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to remove photo.';
      setFeedback({ type: 'error', message: msg });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setFeedback({ type: 'error', message: 'Please select a valid image file (JPG, PNG, WebP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Image size exceeds maximum 5MB limit.' });
      return;
    }

    // Set immediate preview
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    // Create multipart FormData for direct Cloudinary upload
    const formData = new FormData();
    formData.append('avatar', file);

    updateAvatarMutation.mutate(formData);

    // Reset input value so re-selecting same file triggers change
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    updateProfileMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-4 border-legal-900 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-3 text-sm text-slate-600 font-medium">Loading profile...</span>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
        Failed to load profile details. Please try refreshing.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Feedback Alert */}
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

      {/* Profile Photo Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900 mb-1">Profile Photo</h3>
        <p className="text-xs text-slate-500 mb-6">
          This avatar represents you across hearing diaries, case logs, and chamber activities.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full bg-legal-900 text-white font-bold text-2xl flex items-center justify-center border-4 border-slate-100 shadow-md overflow-hidden relative">
              {avatarPreview ? (
                <img src={avatarPreview} alt={profile.fullName} className="w-full h-full object-cover" />
              ) : (
                profile.fullName.charAt(0).toUpperCase() || 'U'
              )}

              {/* Uploading Spinner Overlay */}
              {updateAvatarMutation.isPending && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={updateAvatarMutation.isPending || deleteAvatarMutation.isPending}
              className="absolute bottom-0 right-0 p-2 bg-legal-800 text-white rounded-full hover:bg-legal-700 shadow border-2 border-white transition-all disabled:opacity-50"
              title="Change photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-col gap-2 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                disabled={updateAvatarMutation.isPending || deleteAvatarMutation.isPending}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={updateAvatarMutation.isPending || deleteAvatarMutation.isPending}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{updateAvatarMutation.isPending ? 'Uploading to Cloudinary...' : 'Upload New Photo'}</span>
              </button>

              {avatarPreview && (
                <button
                  type="button"
                  onClick={() => deleteAvatarMutation.mutate()}
                  disabled={updateAvatarMutation.isPending || deleteAvatarMutation.isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{deleteAvatarMutation.isPending ? 'Removing from Cloudinary...' : 'Remove Photo'}</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              Cloud storage enabled (Cloudinary). Accepted formats: JPG, PNG, WebP. Max 5MB.
            </p>
          </div>
        </div>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Personal & Professional Information</h3>
            <p className="text-xs text-slate-500">
              Official advocate credentials and chamber identity details.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-legal-50 text-legal-800 border border-legal-200 flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-legal-600" />
            {profile.roleInWorkspace || 'Advocate'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Full Legal Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 focus:border-transparent text-slate-900"
                placeholder="Adv. Rajesh Sharma"
              />
            </div>
          </div>

          {/* Professional Designation */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Professional Designation
            </label>
            <div className="relative">
              <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 focus:border-transparent text-slate-900"
                placeholder="Senior Advocate / High Court Counsel / Legal Clerk"
              />
            </div>
          </div>

          {/* Primary Email (Read Only in Profile, managed in Account) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Email Address <span className="text-slate-400 font-normal">(Primary Login)</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                disabled
                value={profile.email}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              To update primary security email, visit Account Settings.
            </p>
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Mobile Contact Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 focus:border-transparent text-slate-900"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {/* Bar Council Enrollment Number */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Bar Council Enrollment Number
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={formData.barCouncilNumber}
                onChange={(e) => setFormData({ ...formData, barCouncilNumber: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm font-mono rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 focus:border-transparent text-slate-900"
                placeholder="MAH/1234/2015"
              />
            </div>
          </div>

          {/* State Bar Council */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              State Bar Council Association
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={formData.stateBarCouncil}
                onChange={(e) => setFormData({ ...formData, stateBarCouncil: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 focus:border-transparent text-slate-900"
                placeholder="Bar Council of Maharashtra & Goa"
              />
            </div>
          </div>

          {/* Office Address (Full Width) */}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Chamber / Office Address
            </label>
            <textarea
              rows={3}
              value={formData.officeAddress}
              onChange={(e) => setFormData({ ...formData, officeAddress: e.target.value })}
              className="w-full p-3 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-legal-500 focus:border-transparent text-slate-900"
              placeholder="Chamber No. 412, Lawyers Chambers Block, High Court Premises, Fort, Mumbai - 400001"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={updateProfileMutation.isPending}
            className="px-5 py-2.5 rounded-lg bg-legal-900 hover:bg-legal-800 text-white font-semibold text-xs tracking-wide shadow-sm transition-colors inline-flex items-center gap-2 disabled:opacity-50"
          >
            {updateProfileMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{updateProfileMutation.isPending ? 'Saving Changes...' : 'Save Profile Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

