import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, MapPin } from 'lucide-react';
import { meApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { cn, formatDateShort } from '../../utils';
import { getErrorMessage } from '../../types';
import type { MyUpcomingExam } from '../../types';
import { MyPageState } from './MyPageState';
import { PAPER_KIND, daysUntil, humanize, time12 } from './format';

const REGISTRATION: Record<MyUpcomingExam['registration'], { label: string; cls: string }> = {
  registered:     { label: 'Registered',             cls: 'badge-green' },
  not_eligible:   { label: 'Not eligible',           cls: 'badge-red' },
  not_registered: { label: 'Registration pending',   cls: 'badge-yellow' },
};

/** Blob error responses hide the API's message; read it back out. */
async function blobErrorMessage(err: unknown): Promise<string> {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const detail = JSON.parse(await data.text())?.detail;
      if (typeof detail === 'string') return detail;
    } catch { /* fall through */ }
  }
  return getErrorMessage(err);
}

export function MyExamsPage() {
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const { data: exams = [], isLoading, error } = useQuery<MyUpcomingExam[]>({
    queryKey: ['me', 'exams'],
    queryFn: () => meApi.exams().then((r) => r.data),
  });

  const downloadAdmitCard = async (e: MyUpcomingExam) => {
    setDownloading(e.exam_id);
    setDownloadError('');
    try {
      const { data } = await meApi.admitCard(e.exam_id);
      const url = URL.createObjectURL(new Blob([data as BlobPart], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `admit_card_${e.exam_name.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(await blobErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <PageTitle
        title="My Exams"
        subtitle="Upcoming theory papers and practicals for your course and year. Reach the venue 15 minutes early with your admit card."
      />
      {downloadError && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{downloadError}</p>}
      <MyPageState
        isLoading={isLoading}
        error={error}
        isEmpty={exams.length === 0}
        emptyText="No upcoming exams or practicals. They appear here once the exam cell announces them."
      >
        <div className="space-y-6">
          {exams.map((e) => {
            const reg = REGISTRATION[e.registration];
            return (
              <section key={e.exam_id} className="card overflow-hidden">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="font-semibold text-slate-900">{e.exam_name}</h2>
                    <p className="text-xs text-slate-500">
                      {humanize(e.exam_type)} · {formatDateShort(e.start_date)} – {formatDateShort(e.end_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('badge', reg.cls)}>{reg.label}</span>
                    {e.can_download_admit_card && (
                      <button className="btn-secondary" onClick={() => downloadAdmitCard(e)} disabled={downloading === e.exam_id}>
                        <Download className="h-4 w-4" />
                        {downloading === e.exam_id ? 'Preparing…' : 'Admit card'}
                      </button>
                    )}
                  </div>
                </header>
                {e.registration !== 'registered' && (
                  <p className="border-b border-slate-100 bg-amber-50 px-5 py-2 text-xs text-amber-800">
                    {e.registration === 'not_eligible'
                      ? 'You have been marked not eligible for this exam. Contact the exam cell.'
                      : 'The exam cell has not registered you for this exam yet. Your admit card will be available after registration.'}
                  </p>
                )}
                <ul className="divide-y divide-slate-100">
                  {e.papers.map((p) => {
                    const kind = PAPER_KIND[p.kind] ?? PAPER_KIND.theory;
                    return (
                      <li key={p.schedule_id} className="grid gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[9rem_1fr_auto] sm:items-center">
                        <div className="tabular-nums">
                          <p className="text-sm font-medium text-slate-900">{formatDateShort(p.exam_date)}</p>
                          <p className="text-xs text-primary-600">{daysUntil(p.exam_date)}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {p.subject_name} <span className="text-xs font-normal text-slate-500">{p.subject_code}</span>
                          </p>
                          <p className="flex flex-wrap items-center gap-x-3 text-xs text-slate-500 tabular-nums">
                            {p.start_time && <span>{time12(p.start_time)}{p.end_time && ` – ${time12(p.end_time)}`}</span>}
                            {p.room_no && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{p.room_no}</span>}
                            <span>Max {p.max_marks} · Pass {p.passing_marks}</span>
                          </p>
                        </div>
                        <span className={cn('badge justify-self-start sm:justify-self-end', kind.cls)}>{kind.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </MyPageState>
    </div>
  );
}
