import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2, Clock, GripVertical } from 'lucide-react';
import { timetableApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import type { TimeSlot, SlotType } from '../../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const SLOT_TYPES: { value: SlotType; label: string; color: string }[] = [
  { value: 'period', label: 'Period',    color: 'bg-blue-100 text-blue-800' },
  { value: 'break',  label: 'Break',     color: 'bg-amber-100 text-amber-800' },
  { value: 'lunch',  label: 'Lunch',     color: 'bg-orange-100 text-orange-800' },
];

function slotTypeBadge(t: SlotType) {
  return SLOT_TYPES.find((x) => x.value === t)?.color ?? 'bg-slate-100 text-slate-600';
}
function slotTypeLabel(t: SlotType) {
  return SLOT_TYPES.find((x) => x.value === t)?.label ?? t;
}
function fmt(t: string) {
  return t.slice(0, 5); // HH:MM:SS → HH:MM
}
function duration(start: string, end: string) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? (mins % 60) + 'm' : ''}`.trim();
}

// ── Schema ────────────────────────────────────────────────────────────────────

const timeRegex = /^\d{2}:\d{2}$/;
const slotSchema = z.object({
  name: z.string().min(1, 'Required'),
  start_time: z.string().regex(timeRegex, 'Required (HH:MM)'),
  end_time: z.string().regex(timeRegex, 'Required (HH:MM)'),
  slot_type: z.enum(['period', 'break', 'lunch']),
  order_index: z.coerce.number().int().min(0),
  is_active: z.boolean(),
}).refine((d) => d.end_time > d.start_time, {
  message: 'End time must be after start time',
  path: ['end_time'],
});

type SlotForm = z.infer<typeof slotSchema>;

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  slot: TimeSlot | null;
  nextOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

function SlotModal({ slot, nextOrder, onClose, onSaved }: ModalProps) {
  const isEdit = !!slot;
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SlotForm>({
    resolver: zodResolver(slotSchema),
    defaultValues: slot
      ? { ...slot, start_time: fmt(slot.start_time), end_time: fmt(slot.end_time) }
      : { name: '', start_time: '09:00', end_time: '10:00', slot_type: 'period', order_index: nextOrder, is_active: true },
  });

  const onSubmit = async (values: SlotForm) => {
    setError(null);
    try {
      if (isEdit) {
        await timetableApi.updateTimeSlot(slot.id, values);
      } else {
        await timetableApi.createTimeSlot(values);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">
            {isEdit ? 'Edit Time Slot' : 'Add Time Slot'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="form-label">Name *</label>
            <input {...register('name')} className="input w-full" placeholder="e.g. Period 1, Break, Lunch" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Start Time *</label>
              <input type="time" {...register('start_time')} className="input w-full" />
              {errors.start_time && <p className="form-error">{errors.start_time.message}</p>}
            </div>
            <div>
              <label className="form-label">End Time *</label>
              <input type="time" {...register('end_time')} className="input w-full" />
              {errors.end_time && <p className="form-error">{errors.end_time.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Type *</label>
              <select {...register('slot_type')} className="input w-full">
                {SLOT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Order</label>
              <input type="number" {...register('order_index')} className="input w-full" min={0} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input type="checkbox" id="is_active" {...register('is_active')} className="h-4 w-4 rounded border-slate-300" />
            <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Add Slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function TimeSlotsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editSlot, setEditSlot] = useState<TimeSlot | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimeSlot | null>(null);

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ['time-slots'],
    queryFn: async () => {
      const { data } = await timetableApi.listTimeSlots();
      return data as TimeSlot[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => timetableApi.deleteTimeSlot(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['time-slots'] });
      setDeleteTarget(null);
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['time-slots'] });
    setModal(false);
    setEditSlot(null);
  };

  const nextOrder = slots.length > 0 ? Math.max(...slots.map((s) => s.order_index)) + 1 : 0;

  const periods = slots.filter((s) => s.slot_type === 'period');
  const breaks  = slots.filter((s) => s.slot_type !== 'period');

  return (
    <div>
      <PageTitle
        title="Time Slot Master"
        subtitle="Define the daily periods, breaks and lunch timings"
        action={
          <button
            onClick={() => { setEditSlot(null); setModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Slot
          </button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : slots.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">
          No time slots defined. Add the first period.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedule preview card */}
          <div className="lg:col-span-1">
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Schedule Preview</h3>
              <div className="space-y-1.5">
                {slots.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                      s.slot_type === 'period' ? 'bg-blue-50' :
                      s.slot_type === 'break'  ? 'bg-amber-50' : 'bg-orange-50'
                    } ${!s.is_active ? 'opacity-40' : ''}`}
                  >
                    <Clock className={`h-3.5 w-3.5 shrink-0 ${
                      s.slot_type === 'period' ? 'text-blue-500' :
                      s.slot_type === 'break'  ? 'text-amber-500' : 'text-orange-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {fmt(s.start_time)} – {fmt(s.end_time)}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-400">{duration(s.start_time, s.end_time)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-400">
                {periods.length} periods · {breaks.length} break{breaks.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="lg:col-span-2">
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Order</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Time</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Duration</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Active</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {slots.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-slate-400">
                          <GripVertical className="h-3.5 w-3.5" />
                          <span className="text-xs">{s.order_index}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{s.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {fmt(s.start_time)} – {fmt(s.end_time)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {duration(s.start_time, s.end_time)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${slotTypeBadge(s.slot_type)}`}>
                          {slotTypeLabel(s.slot_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex w-2 h-2 rounded-full ${s.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => { setEditSlot(s); setModal(true); }} className="p-1.5 rounded hover:bg-slate-100 text-slate-500">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded hover:bg-red-50 text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <SlotModal
          slot={editSlot}
          nextOrder={nextOrder}
          onClose={() => { setModal(false); setEditSlot(null); }}
          onSaved={invalidate}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Time Slot"
        message={`Remove "${deleteTarget?.name}" from the schedule?`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
