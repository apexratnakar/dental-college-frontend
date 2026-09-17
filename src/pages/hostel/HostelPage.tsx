import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Pencil, Trash2, Users } from 'lucide-react';
import { hostelApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import { getErrorMessage } from '../../types';
import type { Hostel, HostelType } from '../../types';

// ── Constants ──────────────────────────────────────────────────────────────────

const HOSTEL_TYPE_LABELS: Record<HostelType, string> = {
  boys: 'Boys',
  girls: 'Girls',
  mixed: 'Mixed',
};

const HOSTEL_TYPE_STYLES: Record<HostelType, string> = {
  boys: 'bg-blue-100 text-blue-700',
  girls: 'bg-pink-100 text-pink-700',
  mixed: 'bg-purple-100 text-purple-700',
};

// ── Hostel Form Modal ─────────────────────────────────────────────────────────

const hostelSchema = z.object({
  name: z.string().min(1, 'Required'),
  hostel_type: z.enum(['boys', 'girls', 'mixed']),
  address: z.string().max(500).optional(),
});

type HostelFormData = z.infer<typeof hostelSchema>;

function HostelModal({
  hostel,
  onClose,
  onSaved,
}: {
  hostel: Hostel | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<HostelFormData>({
    resolver: zodResolver(hostelSchema),
    defaultValues: hostel
      ? { name: hostel.name, hostel_type: hostel.hostel_type, address: hostel.address ?? '' }
      : { hostel_type: 'boys' },
  });

  const onSubmit = async (values: HostelFormData) => {
    setError(null);
    try {
      const payload = { ...values, address: values.address || null };
      if (hostel) {
        await hostelApi.updateHostel(hostel.id, payload);
      } else {
        await hostelApi.createHostel(payload);
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
            {hostel ? 'Edit Hostel' : 'Add Hostel'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="form-label">Hostel Name *</label>
            <input {...register('name')} className="input w-full" placeholder="e.g. Boys Hostel Block A" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>

          <div>
            <label className="form-label">Type *</label>
            <select {...register('hostel_type')} className="input w-full">
              <option value="boys">Boys</option>
              <option value="girls">Girls</option>
              <option value="mixed">Mixed</option>
            </select>
            {errors.hostel_type && <p className="form-error">{errors.hostel_type.message}</p>}
          </div>

          <div>
            <label className="form-label">Address</label>
            <textarea {...register('address')} className="input w-full" rows={2} placeholder="Building address…" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Saving…' : hostel ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({
  hostel,
  onClose,
  onDeleted,
}: {
  hostel: Hostel;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async () => {
    setLoading(true);
    setError(null);
    try {
      await hostelApi.deleteHostel(hostel.id);
      onDeleted();
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">Delete Hostel</h2>
        <p className="text-sm text-slate-600">
          Are you sure you want to delete <span className="font-semibold">{hostel.name}</span>?
          This cannot be undone.
        </p>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={handle}
            disabled={loading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function HostelPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [editHostel, setEditHostel] = useState<Hostel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Hostel | null>(null);

  const { data: hostels, isLoading } = useQuery<Hostel[]>({
    queryKey: ['hostels'],
    queryFn: async () => {
      const { data } = await hostelApi.listHostels();
      return data as Hostel[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['hostels'] });
    setModalOpen(false);
    setEditHostel(null);
    setDeleteTarget(null);
  };

  return (
    <div>
      <PageTitle
        title="Hostel Management"
        subtitle="Manage hostel buildings, rooms, and student allocations"
        action={
          <button
            onClick={() => { setEditHostel(null); setModalOpen(true); }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Hostel
          </button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : !hostels?.length ? (
        <div className="card py-16 text-center">
          <Building2 className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-500">No hostels added yet.</p>
          <button
            onClick={() => { setEditHostel(null); setModalOpen(true); }}
            className="mt-4 btn-primary"
          >
            Add First Hostel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostels.map((h) => {
            const pct = h.total_capacity > 0
              ? Math.round((h.occupied_count / h.total_capacity) * 100)
              : 0;
            const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500';

            return (
              <div key={h.id} className="card flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 leading-tight">{h.name}</h3>
                    {h.address && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{h.address}</p>
                    )}
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${HOSTEL_TYPE_STYLES[h.hostel_type]}`}>
                    {HOSTEL_TYPE_LABELS[h.hostel_type]}
                  </span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-50 py-2">
                    <p className="text-lg font-bold text-slate-900">{h.room_count}</p>
                    <p className="text-[11px] text-slate-500">Rooms</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 py-2">
                    <p className="text-lg font-bold text-slate-900">{h.total_capacity}</p>
                    <p className="text-[11px] text-slate-500">Capacity</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 py-2">
                    <p className="text-lg font-bold text-slate-900">{h.occupied_count}</p>
                    <p className="text-[11px] text-slate-500">Occupied</p>
                  </div>
                </div>

                {/* Occupancy bar */}
                {h.total_capacity > 0 && (
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Occupancy</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100">
                      <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}

                {h.warden_name && (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Users className="h-3 w-3" /> Warden: <span className="font-medium">{h.warden_name}</span>
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <button
                    onClick={() => navigate(`/hostel/${h.id}`)}
                    className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                  >
                    View Rooms
                  </button>
                  <button
                    onClick={() => { setEditHostel(h); setModalOpen(true); }}
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(h)}
                    className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <HostelModal
          hostel={editHostel}
          onClose={() => { setModalOpen(false); setEditHostel(null); }}
          onSaved={invalidate}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          hostel={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={invalidate}
        />
      )}
    </div>
  );
}
