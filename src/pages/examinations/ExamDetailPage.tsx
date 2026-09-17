import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, ChevronRight, Plus, Trash2, Save, Send,
  CheckCircle, XCircle, Clock, Download, UserCheck, FileText,
} from 'lucide-react';
import { examsApi, subjectsApi, sectionsApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import type {
  Exam, ExamSubjectSchedule, StudentMarkEntry, StudentExamResult,
  Subject, Section, PaginatedResponse, MarkComponent,
  ExamRegistration, VerificationRecord, CorrectionRecord,
  StudentComponentMarksRow,
} from '../../types';
import { EXAM_TYPE_LABELS, EXAM_TYPE_COLORS, EXAM_STATUS_LABELS, EXAM_STATUS_COLORS } from './ExamsPage';

// ── Grade badge ───────────────────────────────────────────────────────────────

const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-emerald-100 text-emerald-700',
  'A': 'bg-green-100 text-green-700',
  'B+': 'bg-teal-100 text-teal-700',
  'B': 'bg-cyan-100 text-cyan-700',
  'C': 'bg-blue-100 text-blue-700',
  'D': 'bg-yellow-100 text-yellow-700',
  'F': 'bg-red-100 text-red-700',
};

// ── Add schedule form ──────────────────────────────────────────────────────────

const scheduleSchema = z.object({
  subject_id: z.number().min(1, 'Subject is required'),
  section_id: z.number().optional().nullable(),
  exam_date: z.string().min(1, 'Date is required'),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  room_no: z.string().optional(),
  max_marks: z.number().int().min(1),
  passing_marks: z.number().int().min(1),
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

function AddScheduleForm({
  examId, courseId, sessionId, onSuccess,
}: {
  examId: number; courseId: number; sessionId: number; onSuccess: () => void;
}) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ScheduleFormData>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: { max_marks: 100, passing_marks: 40 },
  });

  const { data: subjects } = useQuery({
    queryKey: ['subjects-for-course', courseId],
    queryFn: async () => {
      const { data } = await subjectsApi.list({ course_id: courseId, per_page: 200 });
      return (data as PaginatedResponse<Subject>).items;
    },
  });

  const { data: sections } = useQuery({
    queryKey: ['sections', courseId, sessionId],
    queryFn: async () => {
      const { data } = await sectionsApi.list({ course_id: courseId, session_id: sessionId });
      return (data as PaginatedResponse<Section>).items;
    },
  });

  const mutation = useMutation({
    mutationFn: (data: ScheduleFormData) => {
      const payload = {
        ...data,
        section_id: data.section_id || undefined,
        start_time: data.start_time || undefined,
        end_time: data.end_time || undefined,
        room_no: data.room_no || undefined,
      };
      return examsApi.addSchedule(examId, payload);
    },
    onSuccess: () => { reset({ max_marks: 100, passing_marks: 40 }); onSuccess(); },
  });

  return (
    <form
      onSubmit={handleSubmit((d) => mutation.mutate(d))}
      className="rounded-lg border border-dashed border-slate-300 p-4 bg-slate-50"
    >
      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Add Subject</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-slate-600">Subject *</label>
          <select {...register('subject_id', { valueAsNumber: true })} className="input-field mt-1 w-full text-sm">
            <option value={0}>Select…</option>
            {subjects?.map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
          </select>
          {errors.subject_id && <p className="mt-0.5 text-xs text-red-500">{errors.subject_id.message}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Section</label>
          <select {...register('section_id', { valueAsNumber: true })} className="input-field mt-1 w-full text-sm">
            <option value={0}>All</option>
            {sections?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Date *</label>
          <input type="date" {...register('exam_date')} className="input-field mt-1 w-full text-sm" />
          {errors.exam_date && <p className="mt-0.5 text-xs text-red-500">{errors.exam_date.message}</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Start Time</label>
          <input type="time" {...register('start_time')} className="input-field mt-1 w-full text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">End Time</label>
          <input type="time" {...register('end_time')} className="input-field mt-1 w-full text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Room</label>
          <input {...register('room_no')} placeholder="Hall A" className="input-field mt-1 w-full text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Max Marks *</label>
          <input type="number" {...register('max_marks', { valueAsNumber: true })} min={1} className="input-field mt-1 w-full text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Pass Marks *</label>
          <input type="number" {...register('passing_marks', { valueAsNumber: true })} min={1} className="input-field mt-1 w-full text-sm" />
        </div>
      </div>
      {mutation.isError && <p className="mt-2 text-xs text-red-500">{getErrorMessage(mutation.error)}</p>}
      <div className="mt-3 flex justify-end">
        <button type="submit" disabled={mutation.isPending} className="btn-primary flex items-center gap-1.5 text-sm">
          <Plus className="h-3.5 w-3.5" />
          {mutation.isPending ? 'Adding…' : 'Add Subject'}
        </button>
      </div>
    </form>
  );
}

// ── Components tab (mark breakdown per schedule) ──────────────────────────────

function ComponentsTab({ exam }: { exam: Exam }) {
  const qc = useQueryClient();
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
    exam.schedules[0]?.id ?? null,
  );
  const [newName, setNewName] = useState('');
  const [newMax, setNewMax] = useState('');
  const [newPass, setNewPass] = useState('');
  const [addError, setAddError] = useState('');

  const { data: components, isLoading } = useQuery({
    queryKey: ['components', selectedScheduleId],
    enabled: !!selectedScheduleId,
    queryFn: async () => {
      const { data } = await examsApi.listComponents(selectedScheduleId!);
      return data as MarkComponent[];
    },
  });

  const addMutation = useMutation({
    mutationFn: () => {
      if (!selectedScheduleId) throw new Error('No schedule selected');
      if (!newName.trim()) throw new Error('Component name required');
      const max = Number(newMax);
      const pass = Number(newPass);
      if (!max || !pass) throw new Error('Max and passing marks required');
      return examsApi.createComponent(selectedScheduleId, {
        component_name: newName.trim(),
        max_marks: max,
        passing_marks: pass,
        display_order: (components?.length ?? 0) + 1,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['components', selectedScheduleId] });
      qc.invalidateQueries({ queryKey: ['exam', String(exam.id)] });
      setNewName(''); setNewMax(''); setNewPass(''); setAddError('');
    },
    onError: (e) => setAddError(getErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => examsApi.deleteComponent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['components', selectedScheduleId] });
      qc.invalidateQueries({ queryKey: ['exam', String(exam.id)] });
    },
  });

  const isLocked = exam.status === 'published';

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Schedule:</label>
        <select
          value={selectedScheduleId ?? ''}
          onChange={(e) => setSelectedScheduleId(Number(e.target.value))}
          className="input-field text-sm"
        >
          {exam.schedules.map((s) => (
            <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>
          ))}
        </select>
      </div>

      {!selectedScheduleId ? (
        <div className="py-8 text-center text-sm text-slate-400">Select a schedule</div>
      ) : isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <>
          {!isLocked && (
            <div className="rounded-lg border border-dashed border-slate-300 p-4 bg-slate-50">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Add Component</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-600">Component Name *</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)}
                    placeholder="Theory / Practical / IA"
                    className="input-field mt-1 w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-600">Max Marks *</label>
                  <input type="number" value={newMax} onChange={(e) => setNewMax(e.target.value)}
                    min={1} className="input-field mt-1 w-full text-sm" />
                </div>
                <div>
                  <label className="text-xs text-slate-600">Passing Marks *</label>
                  <input type="number" value={newPass} onChange={(e) => setNewPass(e.target.value)}
                    min={1} className="input-field mt-1 w-full text-sm" />
                </div>
              </div>
              {addError && <p className="mt-1 text-xs text-red-500">{addError}</p>}
              <div className="mt-3 flex justify-end">
                <button onClick={() => addMutation.mutate()} disabled={addMutation.isPending}
                  className="btn-primary text-sm flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  {addMutation.isPending ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>
          )}

          {!components?.length ? (
            <div className="py-8 text-center text-sm text-slate-400">
              No components defined. Add components (Theory, Practical, etc.) to break down marks.
            </div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Component</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Max Marks</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Pass Marks</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {components.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{c.component_name}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{c.max_marks}</td>
                      <td className="px-4 py-3 text-center text-slate-700">{c.passing_marks}</td>
                      <td className="px-4 py-3">
                        {!isLocked && (
                          <div className="flex justify-end">
                            <button onClick={() => deleteMutation.mutate(c.id)} className="icon-btn" title="Delete">
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50">
                  <tr>
                    <td className="px-4 py-2 text-xs font-semibold text-slate-600">Total</td>
                    <td className="px-4 py-2 text-center text-xs font-bold text-slate-800">
                      {components.reduce((sum, c) => sum + c.max_marks, 0)}
                    </td>
                    <td className="px-4 py-2 text-center text-xs font-bold text-slate-800">
                      {components.reduce((sum, c) => sum + c.passing_marks, 0)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Registrations tab ─────────────────────────────────────────────────────────

function RegistrationsTab({ exam }: { exam: Exam }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['exam-registrations', exam.id],
    queryFn: async () => {
      const { data } = await examsApi.listRegistrations(exam.id, { per_page: 500 });
      return (data as { items: ExamRegistration[]; total: number }).items;
    },
  });

  const toggleEligibility = useMutation({
    mutationFn: ({ regId, is_eligible }: { regId: number; is_eligible: boolean }) =>
      examsApi.updateRegistration(regId, { is_eligible }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exam-registrations', exam.id] }),
  });

  const downloadAdmitCard = (studentId: number) => {
    examsApi.downloadAdmitCard(exam.id, studentId).then(({ data }) => {
      const url = URL.createObjectURL(new Blob([data as BlobPart], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `admit_card_${studentId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {data?.length ?? 0} student(s) registered
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !data?.length ? (
        <div className="py-12 text-center text-sm text-slate-400">
          No registrations yet. Use the Bulk Register button after adding students to the course.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Enrollment</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Eligible</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.map((reg) => (
                <tr key={reg.id} className={!reg.is_eligible ? 'bg-red-50/30' : ''}>
                  <td className="px-4 py-3 font-medium text-slate-900">{reg.student_name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{reg.enrollment_number}</td>
                  <td className="px-4 py-3 text-center">
                    {reg.is_eligible ? (
                      <CheckCircle className="mx-auto h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="mx-auto h-4 w-4 text-red-400" />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => toggleEligibility.mutate({ regId: reg.id, is_eligible: !reg.is_eligible })}
                        className="text-xs text-slate-500 hover:text-slate-700 underline"
                      >
                        {reg.is_eligible ? 'Mark Ineligible' : 'Restore'}
                      </button>
                      <button
                        onClick={() => downloadAdmitCard(reg.student_id)}
                        title="Download Admit Card"
                        className="icon-btn"
                      >
                        <Download className="h-4 w-4 text-slate-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Marks Entry tab ───────────────────────────────────────────────────────────

function MarksEntryTab({ exam }: { exam: Exam }) {
  const qc = useQueryClient();
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
    exam.schedules[0]?.id ?? null,
  );
  const [localMarks, setLocalMarks] = useState<Record<number, { marks: string; absent: boolean }>>({});
  const [componentMarks, setComponentMarks] = useState<Record<string, { marks: string; absent: boolean }>>({});
  const [saved, setSaved] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  const selectedSchedule = exam.schedules.find((s) => s.id === selectedScheduleId);
  const useComponents = (selectedSchedule?.has_components ?? false) && (selectedSchedule?.components?.length ?? 0) > 0;

  const { data: marks, isLoading: marksLoading } = useQuery({
    queryKey: ['marks', selectedScheduleId],
    enabled: !!selectedScheduleId && !useComponents,
    queryFn: async () => {
      const { data } = await examsApi.getMarks(selectedScheduleId!);
      const entries = data as StudentMarkEntry[];
      const init: Record<number, { marks: string; absent: boolean }> = {};
      entries.forEach((m) => {
        init[m.student_id] = { marks: m.marks_obtained != null ? String(m.marks_obtained) : '', absent: m.is_absent };
      });
      setLocalMarks(init);
      setSaved(false);
      return entries;
    },
  });

  const { data: compMarks, isLoading: compLoading } = useQuery({
    queryKey: ['component-marks', selectedScheduleId],
    enabled: !!selectedScheduleId && useComponents,
    queryFn: async () => {
      const { data } = await examsApi.getComponentMarks(selectedScheduleId!);
      const rows = data as StudentComponentMarksRow[];
      const init: Record<string, { marks: string; absent: boolean }> = {};
      rows.forEach((r) => {
        r.components.forEach((c) => {
          init[`${r.student_id}-${c.component_id}`] = {
            marks: c.marks_obtained != null ? String(c.marks_obtained) : '',
            absent: c.is_absent,
          };
        });
      });
      setComponentMarks(init);
      setSaved(false);
      return rows;
    },
  });

  const saveLegacyMutation = useMutation({
    mutationFn: () => {
      if (!marks || !selectedScheduleId) throw new Error('No marks loaded');
      const payload = marks.map((m) => ({
        student_id: m.student_id,
        is_absent: localMarks[m.student_id]?.absent ?? false,
        marks_obtained: localMarks[m.student_id]?.absent ? null
          : localMarks[m.student_id]?.marks ? Number(localMarks[m.student_id].marks) : null,
      }));
      return examsApi.saveMarks(selectedScheduleId, payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['marks', selectedScheduleId] }); setSaved(true); },
  });

  const saveComponentsMutation = useMutation({
    mutationFn: () => {
      if (!compMarks || !selectedScheduleId || !selectedSchedule) throw new Error('No data loaded');
      const payload: { student_id: number; component_id: number; marks_obtained: number | null; is_absent: boolean }[] = [];
      compMarks.forEach((row) => {
        selectedSchedule.components.forEach((comp) => {
          const key = `${row.student_id}-${comp.id}`;
          const local = componentMarks[key] ?? { marks: '', absent: false };
          payload.push({
            student_id: row.student_id,
            component_id: comp.id,
            is_absent: local.absent,
            marks_obtained: local.absent ? null : local.marks ? Number(local.marks) : null,
          });
        });
      });
      return examsApi.saveComponentMarks(selectedScheduleId, payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['component-marks', selectedScheduleId] }); setSaved(true); },
  });

  const submitMutation = useMutation({
    mutationFn: () => examsApi.submitMarks(selectedScheduleId!),
    onSuccess: () => {
      setSubmitMsg('Marks submitted for verification.');
      setTimeout(() => setSubmitMsg(''), 4000);
    },
  });

  const isLoading = useComponents ? compLoading : marksLoading;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm font-medium text-slate-700">Subject:</label>
        <select
          value={selectedScheduleId ?? ''}
          onChange={(e) => { setSelectedScheduleId(Number(e.target.value)); setSaved(false); setSubmitMsg(''); }}
          className="input-field text-sm"
        >
          {exam.schedules.map((s) => (
            <option key={s.id} value={s.id}>
              {s.subject_code} — {s.subject_name} ({s.exam_date})
              {s.has_components ? ' [Components]' : ''}
            </option>
          ))}
        </select>
        {selectedSchedule && !useComponents && (
          <span className="text-xs text-slate-500">Max: {selectedSchedule.max_marks} | Pass: {selectedSchedule.passing_marks}</span>
        )}
      </div>

      {!selectedScheduleId ? (
        <div className="py-12 text-center text-sm text-slate-400">Select a subject</div>
      ) : isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : useComponents ? (
        /* Component marks grid */
        !compMarks?.length ? (
          <div className="py-12 text-center text-sm text-slate-400">No students found for this schedule.</div>
        ) : (
          <>
            <div className="card overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                    {selectedSchedule!.components.map((c) => (
                      <th key={c.id} className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap">
                        {c.component_name}
                        <span className="block text-xs font-normal text-slate-400">/{c.max_marks}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {compMarks.map((row) => (
                    <tr key={row.student_id}>
                      <td className="px-4 py-2">
                        <p className="font-medium text-slate-900">{row.student_name}</p>
                        <p className="text-xs font-mono text-slate-400">{row.enrollment_number}</p>
                      </td>
                      {selectedSchedule!.components.map((comp) => {
                        const key = `${row.student_id}-${comp.id}`;
                        const local = componentMarks[key] ?? { marks: '', absent: false };
                        return (
                          <td key={comp.id} className="px-3 py-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <label className="text-xs text-slate-500">
                                <input
                                  type="checkbox"
                                  checked={local.absent}
                                  onChange={(e) => setComponentMarks((prev) => ({
                                    ...prev,
                                    [key]: { ...prev[key], absent: e.target.checked },
                                  }))}
                                  className="mr-1 h-3 w-3"
                                />
                                AB
                              </label>
                              <input
                                type="number"
                                value={local.absent ? '' : local.marks}
                                disabled={local.absent}
                                min={0} max={comp.max_marks} step="0.5"
                                onChange={(e) => setComponentMarks((prev) => ({
                                  ...prev,
                                  [key]: { ...prev[key], marks: e.target.value },
                                }))}
                                className="input-field w-20 text-sm text-center disabled:bg-slate-100"
                                placeholder="—"
                              />
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {saved && <span className="text-sm text-green-600 font-medium">Saved.</span>}
                {submitMsg && <span className="text-sm text-blue-600 font-medium">{submitMsg}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => saveComponentsMutation.mutate()} disabled={saveComponentsMutation.isPending} className="btn-primary flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {saveComponentsMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="btn-secondary flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  {submitMutation.isPending ? 'Submitting…' : 'Submit for Verification'}
                </button>
              </div>
            </div>
          </>
        )
      ) : (
        /* Legacy single-component marks */
        !marks?.length ? (
          <div className="py-12 text-center text-sm text-slate-400">
            No students found for this schedule.
          </div>
        ) : (
          <>
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Student</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Enrollment</th>
                    <th className="px-4 py-2.5 text-center font-semibold text-slate-600 w-24">Absent</th>
                    <th className="px-4 py-2.5 text-left font-semibold text-slate-600 w-36">
                      Marks / {selectedSchedule?.max_marks}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {marks.map((m) => {
                    const local = localMarks[m.student_id] ?? { marks: '', absent: false };
                    return (
                      <tr key={m.student_id} className={local.absent ? 'bg-red-50/40' : ''}>
                        <td className="px-4 py-2 font-medium text-slate-900">{m.student_name}</td>
                        <td className="px-4 py-2 text-slate-500 font-mono text-xs">{m.enrollment_number}</td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={local.absent}
                            onChange={(e) => setLocalMarks((prev) => ({ ...prev, [m.student_id]: { ...prev[m.student_id], absent: e.target.checked } }))}
                            className="h-4 w-4 rounded"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={local.absent ? '' : local.marks}
                            disabled={local.absent}
                            min={0} max={selectedSchedule?.max_marks} step="0.5"
                            onChange={(e) => setLocalMarks((prev) => ({ ...prev, [m.student_id]: { ...prev[m.student_id], marks: e.target.value } }))}
                            className="input-field w-28 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                            placeholder="—"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {saved && <span className="text-sm text-green-600 font-medium">Marks saved successfully.</span>}
                {submitMsg && <span className="text-sm text-blue-600 font-medium">{submitMsg}</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => saveLegacyMutation.mutate()} disabled={saveLegacyMutation.isPending} className="btn-primary flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {saveLegacyMutation.isPending ? 'Saving…' : 'Save Marks'}
                </button>
                <button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending} className="btn-secondary flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  {submitMutation.isPending ? 'Submitting…' : 'Submit for Verification'}
                </button>
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}

// ── Verification tab ──────────────────────────────────────────────────────────

function VerificationTab({ exam }: { exam: Exam }) {
  const qc = useQueryClient();
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
    exam.schedules[0]?.id ?? null,
  );
  const [remarks, setRemarks] = useState('');
  const [msg, setMsg] = useState('');

  const { data: verifications, isLoading } = useQuery({
    queryKey: ['verification', selectedScheduleId],
    enabled: !!selectedScheduleId,
    queryFn: async () => {
      const { data } = await examsApi.getVerification(selectedScheduleId!);
      return data as VerificationRecord[];
    },
  });

  const hodMutation = useMutation({
    mutationFn: (action: 'approve' | 'reject') =>
      examsApi.hodVerify(selectedScheduleId!, { action, remarks: remarks || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verification', selectedScheduleId] });
      setMsg('HOD verification recorded.'); setTimeout(() => setMsg(''), 3000);
    },
  });

  const examCellMutation = useMutation({
    mutationFn: (action: 'approve' | 'reject') =>
      examsApi.examCellApprove(selectedScheduleId!, { action, remarks: remarks || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['verification', selectedScheduleId] });
      setMsg('Exam Cell decision recorded.'); setTimeout(() => setMsg(''), 3000);
    },
  });

  const verif = (level: string) => verifications?.find((v) => v.level === level);

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-slate-100 text-slate-600',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>{status}</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Schedule:</label>
        <select value={selectedScheduleId ?? ''} onChange={(e) => setSelectedScheduleId(Number(e.target.value))} className="input-field text-sm">
          {exam.schedules.map((s) => <option key={s.id} value={s.id}>{s.subject_code} — {s.subject_name}</option>)}
        </select>
      </div>

      {!selectedScheduleId ? null : isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="space-y-4">
          {/* Status table */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Level</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">By</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">At</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(['hod', 'exam_cell'] as const).map((level) => {
                  const v = verif(level);
                  return (
                    <tr key={level}>
                      <td className="px-4 py-3 font-medium text-slate-700 capitalize">{level.replace('_', ' ')}</td>
                      <td className="px-4 py-3">{v ? statusBadge(v.status) : <span className="text-slate-400 text-xs">—</span>}</td>
                      <td className="px-4 py-3 text-slate-500">{v?.verified_by_name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{v?.verified_at ? new Date(v.verified_at).toLocaleString() : '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">{v?.remarks ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Actions */}
          <div className="rounded-lg border border-slate-200 p-4 space-y-3">
            <div>
              <label className="text-xs text-slate-600">Remarks (optional)</label>
              <input value={remarks} onChange={(e) => setRemarks(e.target.value)} className="input-field mt-1 w-full text-sm" placeholder="Optional remarks…" />
            </div>
            {msg && <p className="text-sm text-green-600 font-medium">{msg}</p>}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => hodMutation.mutate('approve')} disabled={hodMutation.isPending} className="btn-primary text-sm flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5" /> HOD Approve
              </button>
              <button onClick={() => hodMutation.mutate('reject')} disabled={hodMutation.isPending} className="btn-secondary text-sm flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-red-500" /> HOD Reject
              </button>
              <button onClick={() => examCellMutation.mutate('approve')} disabled={examCellMutation.isPending} className="btn-primary text-sm flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700">
                <CheckCircle className="h-3.5 w-3.5" /> Exam Cell Approve
              </button>
              <button onClick={() => examCellMutation.mutate('reject')} disabled={examCellMutation.isPending} className="btn-secondary text-sm flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-red-500" /> Exam Cell Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Corrections tab ───────────────────────────────────────────────────────────

function CorrectionsTab({ exam }: { exam: Exam }) {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('pending');
  const [reviewNote, setReviewNote] = useState<Record<number, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['corrections', exam.id, filterStatus],
    queryFn: async () => {
      const { data } = await examsApi.listCorrections(exam.id, { status: filterStatus || undefined });
      return (data as { items: CorrectionRecord[] }).items;
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' }) =>
      examsApi.reviewCorrection(id, { action, review_note: reviewNote[id] || undefined }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['corrections', exam.id, filterStatus] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-slate-700">Status:</label>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field text-sm">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : !data?.length ? (
        <div className="py-12 text-center text-sm text-slate-400">No correction requests found.</div>
      ) : (
        <div className="space-y-3">
          {data.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900">{c.student_name} <span className="text-xs text-slate-400 font-mono">({c.enrollment_number})</span></p>
                  <p className="text-xs text-slate-500">{c.subject_name}{c.component_name ? ` — ${c.component_name}` : ''}</p>
                  <p className="text-sm text-slate-700 mt-1">
                    Change: <span className="font-mono">{c.old_marks ?? '—'} → {c.new_marks}</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">Reason: {c.reason}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === 'pending' ? 'bg-amber-100 text-amber-700' : c.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {c.status}
                </span>
              </div>
              {c.status === 'pending' && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    value={reviewNote[c.id] ?? ''}
                    onChange={(e) => setReviewNote((prev) => ({ ...prev, [c.id]: e.target.value }))}
                    placeholder="Review note (optional)"
                    className="input-field text-sm flex-1"
                  />
                  <button onClick={() => reviewMutation.mutate({ id: c.id, action: 'approve' })} disabled={reviewMutation.isPending} className="btn-primary text-sm flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Approve
                  </button>
                  <button onClick={() => reviewMutation.mutate({ id: c.id, action: 'reject' })} disabled={reviewMutation.isPending} className="btn-secondary text-sm flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 text-red-500" /> Reject
                  </button>
                </div>
              )}
              {c.review_note && (
                <p className="mt-2 text-xs text-slate-500 italic">Note: {c.review_note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Results tab ───────────────────────────────────────────────────────────────

function ResultsTab({ exam }: { exam: Exam }) {
  const qc = useQueryClient();
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadError, setDownloadError] = useState('');

  const downloadReportCard = (studentId: number, studentName: string) => {
    setDownloadingId(studentId);
    setDownloadError('');
    examsApi.downloadReportCard(exam.id, studentId)
      .then(({ data }) => {
        const url = URL.createObjectURL(new Blob([data as BlobPart], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_card_${studentName.replace(/\s+/g, '_')}_${exam.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(async (err) => {
        // With responseType:'blob', error bodies arrive as Blob — parse back to text to get the real message.
        let msg = '';
        const blobData = err?.response?.data;
        if (blobData instanceof Blob) {
          try {
            const text = await blobData.text();
            const json = JSON.parse(text);
            msg = typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail);
          } catch { /* ignore parse errors */ }
        }
        setDownloadError(msg || getErrorMessage(err) || 'Failed to generate report card.');
      })
      .finally(() => setDownloadingId(null));
  };

  const { data: results, isLoading } = useQuery({
    queryKey: ['exam-results', exam.id],
    queryFn: async () => {
      const { data } = await examsApi.results(exam.id);
      return data as StudentExamResult[];
    },
  });

  const publishMutation = useMutation({
    mutationFn: () => examsApi.publish(exam.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', String(exam.id)] });
      qc.invalidateQueries({ queryKey: ['exam-results', exam.id] });
    },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (!results?.length) {
    return <div className="py-12 text-center text-sm text-slate-400">No results yet. Enter marks first.</div>;
  }

  const subjects = exam.schedules;

  return (
    <div className="space-y-4">
      {downloadError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <XCircle className="h-4 w-4 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{downloadError}</p>
        </div>
      )}
      {exam.status === 'closed' && (
        <div className="flex items-center justify-between rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-sm text-amber-800">Review results below and publish when ready.</p>
          <button
            onClick={() => publishMutation.mutate()}
            disabled={publishMutation.isPending}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Send className="h-3.5 w-3.5" />
            {publishMutation.isPending ? 'Publishing…' : 'Publish Results'}
          </button>
        </div>
      )}
      {exam.status === 'published' && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <p className="text-sm text-green-800 font-medium">Results are published.</p>
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
              {subjects.map((s) => (
                <th key={s.id} className="px-3 py-3 text-center font-semibold text-slate-600 whitespace-nowrap">
                  {s.subject_code}
                  <span className="block text-xs font-normal text-slate-400">/{s.max_marks}</span>
                </th>
              ))}
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Total</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">%</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Grade</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Result</th>
              <th className="px-4 py-3 text-center font-semibold text-slate-600">Report</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {results.map((r) => {
              const subjectMap = Object.fromEntries(r.subjects.map((s) => [s.schedule_id, s]));
              return (
                <tr key={r.student_id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{r.student_name}</p>
                    <p className="text-xs text-slate-400 font-mono">{r.enrollment_number}</p>
                  </td>
                  {subjects.map((s) => {
                    const sub = subjectMap[s.id];
                    if (!sub) return <td key={s.id} className="px-3 py-3 text-center text-slate-300">—</td>;
                    return (
                      <td key={s.id} className="px-3 py-3 text-center">
                        {sub.is_absent ? (
                          <span className="text-xs text-red-500 font-medium">AB</span>
                        ) : sub.marks_obtained != null ? (
                          <span className={sub.is_pass ? 'text-slate-700' : 'text-red-500 font-medium'}>
                            {sub.marks_obtained}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-slate-700">
                    {r.total_obtained != null ? `${r.total_obtained}/${r.total_max_marks}` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-700">
                    {r.percentage != null ? `${r.percentage}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.overall_grade ? (
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${GRADE_COLORS[r.overall_grade] ?? 'bg-slate-100 text-slate-600'}`}>
                        {r.overall_grade}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.is_pass == null ? (
                      <span className="text-slate-300 text-xs">—</span>
                    ) : r.is_pass ? (
                      <span className="badge-active">Pass</span>
                    ) : (
                      <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-xs font-medium">Fail</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      title="Download Report Card PDF"
                      onClick={() => downloadReportCard(r.student_id, r.student_name)}
                      disabled={downloadingId === r.student_id}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                    >
                      {downloadingId === r.student_id ? (
                        <Spinner className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                      PDF
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'schedule' | 'components' | 'registrations' | 'marks' | 'verification' | 'corrections' | 'results';

export function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('overview');
  const [deleteSchedule, setDeleteSchedule] = useState<ExamSubjectSchedule | null>(null);
  const [statusError, setStatusError] = useState('');

  const { data: exam, isLoading } = useQuery({
    queryKey: ['exam', id],
    queryFn: async () => {
      const { data } = await examsApi.get(Number(id));
      return data as Exam;
    },
  });

  const openMutation = useMutation({
    mutationFn: () => examsApi.open(Number(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exam', id] }); setStatusError(''); },
    onError: (e) => setStatusError(getErrorMessage(e)),
  });

  const closeMutation = useMutation({
    mutationFn: () => examsApi.close(Number(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exam', id] }); setStatusError(''); },
    onError: (e) => setStatusError(getErrorMessage(e)),
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: (scheduleId: number) => examsApi.deleteSchedule(scheduleId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exam', id] }); setDeleteSchedule(null); },
  });

  if (isLoading) return <div className="flex justify-center py-24"><Spinner /></div>;

  if (!exam) {
    return (
      <div className="py-12 text-center text-slate-500">
        Exam not found.{' '}
        <button onClick={() => navigate('/examinations')} className="text-primary-600 underline">Go back</button>
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'schedule', label: `Schedule (${exam.schedules.length})` },
    { key: 'components', label: 'Components' },
    { key: 'registrations', label: 'Registrations' },
    { key: 'marks', label: 'Marks' },
    { key: 'verification', label: 'Verification' },
    { key: 'corrections', label: 'Corrections' },
    { key: 'results', label: 'Results' },
  ];

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-3">
        <button onClick={() => navigate('/examinations')} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Examinations
        </button>
        <ChevronRight className="h-4 w-4 text-slate-300" />
        <span className="text-sm font-medium text-slate-700">{exam.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">{exam.name}</h1>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EXAM_TYPE_COLORS[exam.exam_type]}`}>
              {EXAM_TYPE_LABELS[exam.exam_type]}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {exam.course_name} · Year {exam.year_of_study}
            {exam.semester ? ` · Sem ${exam.semester}` : ''} · {exam.session_name}
          </p>
          <p className="text-sm text-slate-400 mt-0.5">{exam.start_date} → {exam.end_date}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${EXAM_STATUS_COLORS[exam.status] ?? 'bg-slate-100 text-slate-600'}`}>
            {EXAM_STATUS_LABELS[exam.status] ?? exam.status}
          </span>
          <div className="flex items-center gap-2">
            {exam.status === 'draft' && (
              <button
                onClick={() => openMutation.mutate()}
                disabled={openMutation.isPending || !exam.schedules.length}
                className="btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50"
                title={!exam.schedules.length ? 'Add subjects first' : ''}
              >
                <Clock className="h-3.5 w-3.5" />
                {openMutation.isPending ? 'Opening…' : 'Open'}
              </button>
            )}
            {exam.status === 'open' && (
              <button
                onClick={() => closeMutation.mutate()}
                disabled={closeMutation.isPending}
                className="btn-secondary flex items-center gap-1.5 text-sm"
              >
                <XCircle className="h-3.5 w-3.5" />
                {closeMutation.isPending ? 'Closing…' : 'Close Exam'}
              </button>
            )}
          </div>
          {statusError && <p className="text-xs text-red-500 max-w-xs text-right">{statusError}</p>}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? 'border-b-2 border-primary-600 px-4 py-2 text-sm font-semibold text-primary-700 whitespace-nowrap'
                : 'px-4 py-2 text-sm text-slate-500 hover:text-slate-700 whitespace-nowrap'
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Exam Type', value: EXAM_TYPE_LABELS[exam.exam_type] },
              { label: 'Subjects', value: String(exam.schedules.length) },
              { label: 'Course', value: exam.course_name ?? `#${exam.course_id}` },
              { label: 'Session', value: exam.session_name ?? `#${exam.session_id}` },
            ].map((stat) => (
              <div key={stat.label} className="card p-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{stat.label}</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>
          {exam.description && (
            <div className="card p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-slate-700">{exam.description}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'schedule' && (
        <div className="space-y-4">
          {exam.status === 'draft' && (
            <AddScheduleForm
              examId={exam.id} courseId={exam.course_id} sessionId={exam.session_id}
              onSuccess={() => qc.invalidateQueries({ queryKey: ['exam', id] })}
            />
          )}
          {!exam.schedules.length ? (
            <div className="py-8 text-center text-sm text-slate-400">No subjects added yet.</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Subject</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Section</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Time</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Room</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Marks</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600">Components</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {exam.schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{s.subject_name}</p>
                        <p className="text-xs text-slate-400 font-mono">{s.subject_code}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.section_name ?? 'All'}</td>
                      <td className="px-4 py-3 text-slate-600">{s.exam_date}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {s.start_time ? `${s.start_time}–${s.end_time ?? '?'}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{s.room_no ?? '—'}</td>
                      <td className="px-4 py-3 text-center text-slate-600">
                        {s.max_marks}/{s.passing_marks}
                        <span className="ml-1 text-xs text-slate-400">({s.marks_entered_count} entered)</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {s.has_components ? (
                          <span className="badge-active text-xs">{s.components.length}</span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {exam.status === 'draft' && (
                          <div className="flex justify-end">
                            <button onClick={() => setDeleteSchedule(s)} className="icon-btn" title="Remove">
                              <Trash2 className="h-4 w-4 text-red-400" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'components' && (
        exam.schedules.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">Add subjects in the Schedule tab first.</div>
        ) : (
          <ComponentsTab exam={exam} />
        )
      )}

      {tab === 'registrations' && (
        <RegistrationsTab exam={exam} />
      )}

      {tab === 'marks' && (
        exam.schedules.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">Add subjects in the Schedule tab first.</div>
        ) : (
          <MarksEntryTab exam={exam} />
        )
      )}

      {tab === 'verification' && (
        exam.schedules.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">No schedules yet.</div>
        ) : (
          <VerificationTab exam={exam} />
        )
      )}

      {tab === 'corrections' && (
        <CorrectionsTab exam={exam} />
      )}

      {tab === 'results' && (
        <ResultsTab exam={exam} />
      )}

      <ConfirmModal
        isOpen={!!deleteSchedule}
        title="Remove Subject"
        message={deleteSchedule ? `Remove "${deleteSchedule.subject_name}" from this exam? All entered marks will be lost.` : ''}
        onConfirm={() => deleteSchedule && deleteScheduleMutation.mutate(deleteSchedule.id)}
        onCancel={() => setDeleteSchedule(null)}
        isLoading={deleteScheduleMutation.isPending}
      />
    </div>
  );
}
