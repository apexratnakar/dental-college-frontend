import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Upload, X, Save } from 'lucide-react';
import { settingsApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import type { OrganizationSettings } from '../../types';

export function OrganizationSettingsPage() {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: org, isLoading } = useQuery<OrganizationSettings>({
    queryKey: ['org-settings'],
    queryFn: async () => {
      const { data } = await settingsApi.getOrgSettings();
      return data as OrganizationSettings;
    },
  });

  const [form, setForm] = useState<Partial<OrganizationSettings>>({});
  const [logoPreview, setLogoPreview] = useState<string | null | undefined>(undefined);
  const [saved, setSaved] = useState(false);

  // Once data is loaded, initialise form (only once)
  const initialised = useRef(false);
  if (org && !initialised.current) {
    initialised.current = true;
    setForm({
      org_name: org.org_name,
      tagline: org.tagline ?? '',
      website: org.website ?? '',
      phone_no: org.phone_no ?? '',
      email: org.email ?? '',
      address: org.address ?? '',
      logo_data: org.logo_data,
    });
    setLogoPreview(org.logo_data);
  }

  const mutation = useMutation({
    mutationFn: (payload: Partial<OrganizationSettings>) =>
      settingsApi.updateOrgSettings(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['org-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const handleChange = (field: keyof OrganizationSettings, value: string | null) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoPreview(dataUrl);
      setForm((prev) => ({ ...prev, logo_data: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setForm((prev) => ({ ...prev, logo_data: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      org_name: form.org_name || 'Organization Name',
      tagline: form.tagline || null,
      website: form.website || null,
      phone_no: form.phone_no || null,
      email: form.email || null,
      address: form.address || null,
      logo_data: form.logo_data ?? null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageTitle
        title="Organization Settings"
        subtitle="Branding and contact details used on payslips and fee receipts"
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {/* Logo */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Organization Logo
          </h2>
          <div className="flex items-center gap-5">
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Organization logo"
                  className="h-20 w-20 rounded-lg border border-slate-200 object-contain p-1"
                />
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="absolute -right-2 -top-2 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                  title="Remove logo"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50">
                <Building2 className="h-8 w-8 text-slate-300" />
              </div>
            )}
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" />
                {logoPreview ? 'Change Logo' : 'Upload Logo'}
              </button>
              <p className="mt-1 text-xs text-slate-400">PNG, JPG, SVG — recommended max 100 KB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>
        </div>

        {/* Basic info */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Organization Details
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.org_name ?? ''}
                onChange={(e) => handleChange('org_name', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. ABC Dental College"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tagline</label>
              <input
                type="text"
                value={form.tagline ?? ''}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="e.g. Excellence in Education"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
              <textarea
                rows={3}
                value={form.address ?? ''}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Full postal address"
              />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Contact Information
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Phone Number</label>
              <input
                type="text"
                value={form.phone_no ?? ''}
                onChange={(e) => handleChange('phone_no', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={form.email ?? ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="info@example.edu"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Website</label>
              <input
                type="text"
                value={form.website ?? ''}
                onChange={(e) => handleChange('website', e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="https://www.example.edu"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {mutation.isPending ? <Spinner /> : <Save className="h-4 w-4" />}
            Save Settings
          </button>
          {saved && (
            <span className="text-sm font-medium text-green-600">Settings saved successfully.</span>
          )}
          {mutation.isError && (
            <span className="text-sm font-medium text-red-600">
              Failed to save. Please try again.
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
