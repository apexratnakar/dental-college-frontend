import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { meApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { cn, formatDateShort } from '../../utils';
import { getErrorMessage } from '../../types';
import type { MyExamResult } from '../../types';
import { MyPageState } from './MyPageState';
import { humanize } from './format';

const marks = (n: number | null) => (n === null ? '—' : Number.isInteger(n) ? String(n) : n.toFixed(2));

export function MyResultsPage() {
  const [downloading, setDownloading] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState('');
  const { data: results = [], isLoading, error } = useQuery<MyExamResult[]>({
    queryKey: ['me', 'results'],
    queryFn: () => meApi.results().then((r) => r.data),
  });

  const download = async (r: MyExamResult) => {
    setDownloading(r.exam_id);
    setDownloadError('');
    try {
      const { data } = await meApi.reportCard(r.exam_id);
      const url = URL.createObjectURL(new Blob([data as BlobPart], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_card_${r.exam_name.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(getErrorMessage(err));
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div>
      <PageTitle title="My Results" subtitle="Results appear here once the exam cell publishes them." />
      {downloadError && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{downloadError}</p>}
      <MyPageState isLoading={isLoading} error={error} isEmpty={results.length === 0} emptyText="No published results yet.">
        <div className="space-y-6">
          {results.map((r) => (
            <section key={r.exam_id} className="card overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold text-slate-900">{r.exam_name}</h2>
                  <p className="text-xs text-slate-500">
                    {humanize(r.exam_type)} · {formatDateShort(r.start_date)} – {formatDateShort(r.end_date)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right tabular-nums">
                    <p className="text-lg font-bold text-slate-900">
                      {r.percentage !== null ? `${r.percentage.toFixed(2)}%` : '—'}
                      {r.grade && <span className="ml-2 text-sm font-medium text-slate-500">Grade {r.grade}</span>}
                    </p>
                    <p className="text-xs text-slate-500">{marks(r.total_obtained)} / {marks(r.total_max_marks)}</p>
                  </div>
                  <span className={cn('badge', r.is_pass ? 'badge-green' : r.is_pass === false ? 'badge-red' : 'bg-slate-100 text-slate-600')}>
                    {r.result_status ? humanize(r.result_status) : r.is_pass ? 'Pass' : r.is_pass === false ? 'Fail' : '—'}
                  </span>
                  <button className="btn-secondary" onClick={() => download(r)} disabled={downloading === r.exam_id}>
                    <Download className="h-4 w-4" />
                    {downloading === r.exam_id ? 'Preparing…' : 'Report card'}
                  </button>
                </div>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[32rem] text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-2.5">Subject</th>
                      <th className="px-5 py-2.5 text-right">Marks</th>
                      <th className="px-5 py-2.5 text-right">Pass mark</th>
                      <th className="px-5 py-2.5 text-center">Grade</th>
                      <th className="px-5 py-2.5 text-center">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 tabular-nums">
                    {r.subjects.map((s) => (
                      <tr key={s.subject_id}>
                        <td className="px-5 py-2.5">
                          <span className="font-medium text-slate-900">{s.subject_name}</span>
                          <span className="ml-2 text-xs text-slate-500">{s.subject_code}</span>
                        </td>
                        <td className="px-5 py-2.5 text-right">
                          {s.is_absent ? <span className="text-slate-500">Absent</span> : `${marks(s.marks_obtained)} / ${marks(s.max_marks)}`}
                        </td>
                        <td className="px-5 py-2.5 text-right text-slate-500">{marks(s.passing_marks)}</td>
                        <td className="px-5 py-2.5 text-center">{s.grade ?? '—'}</td>
                        <td className="px-5 py-2.5 text-center">
                          <span className={cn('badge', s.is_pass ? 'badge-green' : s.is_pass === false ? 'badge-red' : 'bg-slate-100 text-slate-600')}>
                            {s.is_absent ? 'Absent' : s.is_pass ? 'Pass' : s.is_pass === false ? 'Fail' : '—'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </MyPageState>
    </div>
  );
}
