import { useQuery } from '@tanstack/react-query';
import { meApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { formatDateShort } from '../../utils';
import type { MyStudentProfile } from '../../types';
import { MyPageState } from './MyPageState';
import { humanize } from './format';

function Row({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 py-2 text-sm border-b border-slate-100 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-900 break-words">{value || '—'}</dd>
    </div>
  );
}

export function MyProfilePage() {
  const { data: p, isLoading, error } = useQuery<MyStudentProfile>({
    queryKey: ['me', 'profile'],
    queryFn: () => meApi.profile().then((r) => r.data),
  });

  return (
    <div>
      <PageTitle title="My Profile" subtitle="Your student record. Contact the office to correct anything here." />
      <MyPageState isLoading={isLoading} error={error}>
        {p && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Academic</h2>
              <dl>
                <Row label="Name" value={p.full_name} />
                <Row label="Enrollment no." value={p.enrollment_number} />
                <Row label="Course" value={p.course_name ? `${p.course_name} (${p.course_code})` : null} />
                <Row label="Year" value={p.year_of_study} />
                <Row label="Section" value={p.section_name} />
                <Row label="Session" value={p.session_name} />
                <Row label="Status" value={humanize(p.status)} />
              </dl>
            </section>
            <section className="card p-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Personal</h2>
              <dl>
                <Row label="Email" value={p.email} />
                <Row label="Mobile" value={p.mobile_number} />
                <Row label="Date of birth" value={p.date_of_birth ? formatDateShort(p.date_of_birth) : null} />
                <Row label="Gender" value={humanize(p.gender)} />
                <Row label="Blood group" value={p.blood_group} />
                <Row label="Category" value={p.category} />
                <Row label="Address" value={p.current_address || p.permanent_address} />
              </dl>
            </section>
            <section className="card p-5 lg:col-span-2">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Parents &amp; guardian</h2>
              <dl className="grid lg:grid-cols-2 lg:gap-x-8">
                <div>
                  <Row label="Father" value={p.father_name} />
                  <Row label="Father's mobile" value={p.father_mobile} />
                  <Row label="Mother" value={p.mother_name} />
                </div>
                <div>
                  <Row label="Guardian" value={p.guardian_name ? `${p.guardian_name}${p.guardian_relation ? ` (${p.guardian_relation})` : ''}` : null} />
                  <Row label="Guardian's mobile" value={p.guardian_mobile} />
                </div>
              </dl>
            </section>
          </div>
        )}
      </MyPageState>
    </div>
  );
}
