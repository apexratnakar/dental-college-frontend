import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { IndianRupee, Plus, Pencil, Trash2, AlertCircle } from 'lucide-react';
import { feeApi, sessionsApi, coursesApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import { getErrorMessage } from '../../types';
import type { FeeStructure, FeeCategory, AcademicSession, Course } from '../../types';

// ── Constants ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<FeeCategory, string> = {
  tuition: 'Tuition',
  hostel: 'Hostel',
  library: 'Library',
  examination: 'Examination',
  transport: 'Transport',
  miscellaneous: 'Miscellaneous',
};

const CATEGORY_STYLES: Record<FeeCategory, string> = {
  tuition: 'bg-blue-100 text-blue-700',
  hostel: 'bg-purple-100 text-purple-700',
  library: 'bg-amber-100 text-amber-700',
  examination: 'bg-red-100 text-red-700',
  transport: 'bg-teal-100 text-teal-700',
  miscellaneous: 'bg-slate-100 text-slate-600',
};

// ── Form ───────────────────────────────────────────────────────────────────────

const structureSchema = z.object({
  course_id: z.number().int().positive('Select a course'),
  academic_session_id: z.number().int().positive('Select a session'),
  year_of_study: z.number().int().min(1).max(10),
  fee_category: z.enum(['tuition', 'hostel', 'library', 'examination', 'transport', 'miscellaneous']),
  amount: z.number().positive('Amount must be > 0'),
  due_date: z.string().optional(),
  description: z.string().max(500).optional(),
  is_active: z.boolean(),
});

type StructureForm = z.infer<typeof structureSchema>;

function StructureModal({
  structure,
  onClose,
  onSaved,
}: {
  structure: FeeStructure | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const { data: sessions } = useQuery<AcademicSession[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await sessionsApi.list();
      return data as AcademicSession[];
    },
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses-all'],
    queryFn: async () => {
      const { data } = await coursesApi.list({ per_page: 200 });
      return (data as { items: Course[] }).items;
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<StructureForm>({
    resolver: zodResolver(structureSchema),
    defaultValues: structure
      ? {
          course_id: structure.course_id,
          academic_session_id: structure.academic_session_id,
          year_of_study: structure.year_of_study,
          fee_category: structure.fee_category,
          amount: structure.amount,
          due_date: structure.due_date ?? '',
          description: structure.description ?? '',
          is_active: structure.is_active,
        }
      : { year_of_study: 1, fee_category: 'tuition', is_active: true },
  });

  const onSubmit = async (values: StructureForm) => {
    setError(null);
    try {
      const payload = {
        ...values,
        due_date: values.due_date || null,
        description: values.description || null,
      };
      if (structure) {
        await feeApi.updateStructure(structure.id, {
          amount: payload.amount,
          due_date: payload.due_date,
          description: payload.description,
          is_active: payload.is_active,
        });
      } else {
        await feeApi.createStructure(payload);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {structure ? 'Edit Fee Structure' : 'Add Fee Structure'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Session *</label>
              <select
                {...register('academic_session_id', { valueAsNumber: true })}
                className="input w-full"
                disabled={!!structure}
              >
                <option value="">Select…</option>
                {sessions?.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.academic_session_id && <p className="form-error">{errors.academic_session_id.message}</p>}
            </div>
            <div>
              <label className="form-label">Course *</label>
              <select
                {...register('course_id', { valueAsNumber: true })}
                className="input w-full"
                disabled={!!structure}
              >
                <option value="">Select…</option>
                {coursesData?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.course_id && <p className="form-error">{errors.course_id.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Year of Study *</label>
              <input
                type="number"
                min={1}
                max={10}
                {...register('year_of_study', { valueAsNumber: true })}
                className="input w-full"
                disabled={!!structure}
              />
            </div>
            <div>
              <label className="form-label">Fee Category *</label>
              <select
                {...register('fee_category')}
                className="input w-full"
                disabled={!!structure}
              >
                {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Amount (₹) *</label>
              <input
                type="number"
                min={0}
                step={0.01}
                {...register('amount', { valueAsNumber: true })}
                className="input w-full"
                placeholder="0.00"
              />
              {errors.amount && <p className="form-error">{errors.amount.message}</p>}
            </div>
            <div>
              <label className="form-label">Due Date</label>
              <input type="date" {...register('due_date')} className="input w-full" />
            </div>
          </div>

          <div>
            <label className="form-label">Description</label>
            <input {...register('description')} className="input w-full" placeholder="Optional notes…" />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" {...register('is_active')} className="h-4 w-4" />
            <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Saving…' : structure ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function FeeStructurePage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState<FeeStructure | null>(null);

  // Filters
  const [filterSession, setFilterSession] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const { data: sessions } = useQuery<AcademicSession[]>({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data } = await sessionsApi.list();
      return data as AcademicSession[];
    },
  });

  const { data: coursesData } = useQuery({
    queryKey: ['courses-all'],
    queryFn: async () => {
      const { data } = await coursesApi.list({ per_page: 200 });
      return (data as { items: Course[] }).items;
    },
  });

  const params = {
    ...(filterSession ? { academic_session_id: Number(filterSession) } : {}),
    ...(filterCourse ? { course_id: Number(filterCourse) } : {}),
    ...(filterYear ? { year_of_study: Number(filterYear) } : {}),
  };

  const { data: structures, isLoading } = useQuery<FeeStructure[]>({
    queryKey: ['fee-structures', params],
    queryFn: async () => {
      const { data } = await feeApi.listStructures(params);
      return data as FeeStructure[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['fee-structures'] });
    setModal(false);
    setEditItem(null);
  };

  const handleDelete = async (s: FeeStructure) => {
    if (!confirm(`Delete ${CATEGORY_LABELS[s.fee_category]} fee structure (₹${s.amount.toLocaleString('en-IN')})?`)) return;
    try {
      await feeApi.deleteStructure(s.id);
      invalidate();
    } catch (err) {
      alert(getErrorMessage(err));
    }
  };

  // Group by session for display
  const grouped = (structures ?? []).reduce<Record<string, FeeStructure[]>>((acc, s) => {
    const key = s.session_name ?? `Session ${s.academic_session_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div>
      <PageTitle
        title="Fee Structures"
        subtitle="Define fee amounts per course, session and category"
        action={
          <button
            onClick={() => { setEditItem(null); setModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Structure
          </button>
        }
      />

      {/* Filters */}
      <div className="card mb-6 flex flex-wrap gap-3">
        <select
          value={filterSession}
          onChange={(e) => setFilterSession(e.target.value)}
          className="input min-w-[160px]"
        >
          <option value="">All Sessions</option>
          {sessions?.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="input min-w-[160px]"
        >
          <option value="">All Courses</option>
          {coursesData?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="input"
        >
          <option value="">All Years</option>
          {[1, 2, 3, 4, 5].map((y) => (
            <option key={y} value={y}>Year {y}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : !structures?.length ? (
        <div className="card py-16 text-center">
          <IndianRupee className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No fee structures found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([sessionName, items]) => {
            const total = items.reduce((sum, i) => sum + i.amount, 0);
            return (
              <div key={sessionName}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700">{sessionName}</h3>
                  <span className="text-xs text-slate-400">
                    Total: <span className="font-semibold text-slate-700">₹{total.toLocaleString('en-IN')}</span>
                  </span>
                </div>
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="border-b border-slate-100 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Course</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Year</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600">Amount</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600 hidden md:table-cell">Due Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {items.map((s) => {
                        const today = new Date().toISOString().slice(0, 10);
                        const overdue = s.due_date && s.due_date < today && s.is_active;
                        return (
                          <tr key={s.id} className={overdue ? 'bg-red-50/50' : ''}>
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {s.course_name ?? `Course ${s.course_id}`}
                            </td>
                            <td className="px-4 py-3 text-slate-500">Year {s.year_of_study}</td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[s.fee_category]}`}>
                                {CATEGORY_LABELS[s.fee_category]}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">
                              ₹{s.amount.toLocaleString('en-IN')}
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                              {s.due_date ? (
                                <span className={overdue ? 'text-red-600 flex items-center gap-1' : ''}>
                                  {overdue && <AlertCircle className="h-3 w-3" />}
                                  {s.due_date}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                s.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {s.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 justify-end">
                                <button
                                  onClick={() => { setEditItem(s); setModal(true); }}
                                  className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(s)}
                                  className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <StructureModal
          structure={editItem}
          onClose={() => { setModal(false); setEditItem(null); }}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}
