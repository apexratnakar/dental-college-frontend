import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

interface OrgBranding {
  org_name: string;
  logo_data?: string | null;
  address?: string | null;
  phone_no?: string | null;
  website?: string | null;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  const [branding, setBranding] = useState<OrgBranding | null>(null);

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/v1';
    fetch(`${base}/settings/organization`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setBranding(data); })
      .catch(() => {});
  }, []);

  const orgName = branding?.org_name ?? 'College Management';
  const logoData = branding?.logo_data;
  const orgSubline = branding?.address ?? branding?.website ?? 'Academic Excellence Platform';

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-primary-900 via-primary-800 to-primary-600 p-4">
      <div className="w-full max-w-md">

        {/* Org branding */}
        <div className="mb-8 flex flex-col items-center text-center">
          {logoData ? (
            <img
              src={logoData}
              alt={orgName}
              className="h-20 w-20 rounded-2xl object-contain bg-white shadow-lg p-2"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg">
              <GraduationCap className="h-9 w-9 text-primary-600" />
            </div>
          )}
          <h1 className="mt-4 text-2xl font-bold text-white">{orgName}</h1>
          <p className="mt-1 text-sm text-primary-200 max-w-xs">{orgSubline}</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>

      </div>
    </div>
  );
}
