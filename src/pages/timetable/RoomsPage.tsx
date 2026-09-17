import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Pencil, Trash2, Building2, Users, Wifi } from 'lucide-react';
import { timetableApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import type { Classroom, ClassroomType, ClassroomStatus } from '../../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const ROOM_TYPES: { value: ClassroomType; label: string }[] = [
  { value: 'classroom',     label: 'Classroom' },
  { value: 'computer_lab',  label: 'Computer Lab' },
  { value: 'physics_lab',   label: 'Physics Lab' },
  { value: 'chemistry_lab', label: 'Chemistry Lab' },
  { value: 'seminar_hall',  label: 'Seminar Hall' },
  { value: 'auditorium',    label: 'Auditorium' },
  { value: 'workshop',      label: 'Workshop' },
];

const STATUSES: { value: ClassroomStatus; label: string; color: string }[] = [
  { value: 'active',             label: 'Active',             color: 'bg-emerald-100 text-emerald-800' },
  { value: 'inactive',           label: 'Inactive',           color: 'bg-slate-100 text-slate-600' },
  { value: 'under_maintenance',  label: 'Under Maintenance',  color: 'bg-amber-100 text-amber-800' },
];

function statusBadge(s: ClassroomStatus) {
  return STATUSES.find((x) => x.value === s)?.color ?? 'bg-slate-100 text-slate-600';
}
function statusLabel(s: ClassroomStatus) {
  return STATUSES.find((x) => x.value === s)?.label ?? s;
}
function roomTypeLabel(t: ClassroomType) {
  return ROOM_TYPES.find((x) => x.value === t)?.label ?? t;
}

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  room: Classroom | null;
  onClose: () => void;
  onSaved: () => void;
}

function RoomModal({ room, onClose, onSaved }: ModalProps) {
  const isEdit = !!room;
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    defaultValues: room ?? {
      room_number: '', building: '', floor: '', room_type: 'classroom' as ClassroomType,
      capacity: null, department: '', facilities: '', status: 'active' as ClassroomStatus,
    },
  });

  const onSubmit = async (values: Classroom) => {
    setError(null);
    try {
      const payload = {
        ...values,
        capacity: values.capacity ? Number(values.capacity) : null,
        facilities: (values.facilities as string)?.trim() || null,
        building: (values.building as string)?.trim() || null,
        floor: (values.floor as string)?.trim() || null,
        department: (values.department as string)?.trim() || null,
      };
      if (isEdit) {
        await timetableApi.updateClassroom(room.id, payload);
      } else {
        await timetableApi.createClassroom(payload);
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
            {isEdit ? 'Edit Room / Lab' : 'Add Room / Lab'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Room Number *</label>
              <input {...register('room_number', { required: 'Required' })} className="input w-full" placeholder="e.g. R-201, Lab-1" />
              {errors.room_number && <p className="form-error">{errors.room_number.message as string}</p>}
            </div>
            <div>
              <label className="form-label">Room Type *</label>
              <select {...register('room_type')} className="input w-full">
                {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Building</label>
              <input {...register('building')} className="input w-full" placeholder="e.g. Block A" />
            </div>
            <div>
              <label className="form-label">Floor</label>
              <input {...register('floor')} className="input w-full" placeholder="e.g. Ground, 1st" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Capacity</label>
              <input type="number" {...register('capacity')} className="input w-full" placeholder="60" min={1} />
            </div>
            <div>
              <label className="form-label">Department</label>
              <input {...register('department')} className="input w-full" placeholder="e.g. Computer Science" />
            </div>
          </div>

          <div>
            <label className="form-label">Facilities</label>
            <input {...register('facilities')} className="input w-full" placeholder="Projector, Smart Board, AC, Wi-Fi" />
            <p className="mt-1 text-xs text-slate-400">Comma-separated list of available facilities</p>
          </div>

          <div>
            <label className="form-label">Status *</label>
            <select {...register('status')} className="input w-full">
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Saving…' : isEdit ? 'Update' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function RoomsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editRoom, setEditRoom] = useState<Classroom | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Classroom | null>(null);
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['classrooms', filterType, filterStatus],
    queryFn: async () => {
      const { data } = await timetableApi.listClassrooms({
        room_type: filterType || undefined,
        status: filterStatus || undefined,
      });
      return data as Classroom[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => timetableApi.deleteClassroom(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['classrooms'] });
      setDeleteTarget(null);
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['classrooms'] });
    setModal(false);
    setEditRoom(null);
  };

  return (
    <div>
      <PageTitle
        title="Rooms & Labs"
        subtitle="Manage classrooms, laboratories and other spaces"
        action={
          <button
            onClick={() => { setEditRoom(null); setModal(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Add Room
          </button>
        }
      />

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Room Type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="input w-full">
              <option value="">All Types</option>
              {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input w-full">
              <option value="">All Statuses</option>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : rooms.length === 0 ? (
        <div className="card py-12 text-center text-sm text-slate-400">No rooms found. Add the first one.</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Room</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Location</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Capacity</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Facilities</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rooms.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="font-medium text-slate-900">{r.room_number}</p>
                        {r.department && <p className="text-xs text-slate-400">{r.department}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{roomTypeLabel(r.room_type)}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {[r.building, r.floor].filter(Boolean).join(', ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.capacity ? (
                      <div className="flex items-center gap-1 text-slate-700">
                        <Users className="h-3.5 w-3.5 text-slate-400" />
                        {r.capacity}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.facilities ? (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Wifi className="h-3 w-3 shrink-0" />
                        <span className="truncate max-w-[140px]">{r.facilities}</span>
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(r.status)}`}>
                      {statusLabel(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => { setEditRoom(r); setModal(true); }}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(r)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-slate-100 text-xs text-slate-400">
            {rooms.length} room{rooms.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {modal && (
        <RoomModal
          room={editRoom}
          onClose={() => { setModal(false); setEditRoom(null); }}
          onSaved={invalidate}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Room"
        message={`Remove ${deleteTarget?.room_number} from the system? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
