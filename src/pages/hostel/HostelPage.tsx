import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, BedDouble, Building2, DoorOpen, MapPin, Pencil, Plus, Trash2, UserRound, Users, X,
} from 'lucide-react';
import { hostelApi, rolesApi, usersApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../utils';
import { getErrorMessage } from '../../types';
import type { Hostel, HostelType, PaginatedResponse, Role, User } from '../../types';

// ── Constants ──────────────────────────────────────────────────────────────────

const HOSTEL_TYPE: Record<HostelType, { label: string; badge: string; icon: string }> = {
  boys:  { label: 'Boys',  badge: 'bg-sky-50 text-sky-700 ring-sky-200',          icon: 'bg-sky-50 text-sky-600' },
  girls: { label: 'Girls', badge: 'bg-rose-50 text-rose-700 ring-rose-200',       icon: 'bg-rose-50 text-rose-600' },
  mixed: { label: 'Mixed', badge: 'bg-violet-50 text-violet-700 ring-violet-200', icon: 'bg-violet-50 text-violet-600' },
};

const occupancyColor = (pct: number) => (pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500');

// ── Hostel Form Modal ─────────────────────────────────────────────────────────

const hostelSchema = z.object({
  name: z.string().trim().min(1, 'Hostel name is required'),
  hostel_type: z.enum(['boys', 'girls', 'mixed']),
  address: z.string().max(500).optional(),
  warden_id: z.string().optional(),
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
  const { can } = useAuth();
  const [error, setError] = useState<string | null>(null);
  // Picking a warden needs the user list; roles without it keep the current warden unchanged.
  const canPickWarden = can('users:read') && can('roles:read');

  const { data: wardens = [], isLoading: loadingWardens } = useQuery<User[]>({
    queryKey: ['users', 'wardens'],
    enabled: canPickWarden,
    queryFn: async () => {
      const { data: roles } = await rolesApi.list();
      const wardenRole = (roles as Role[]).find((r) => r.name === 'Warden');
      if (!wardenRole) return [];
      const { data } = await usersApi.list({ role_id: wardenRole.id, per_page: 100, is_active: true });
      return (data as PaginatedResponse<User>).items;
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<HostelFormData>({
    resolver: zodResolver(hostelSchema),
    defaultValues: hostel
      ? { name: hostel.name, hostel_type: hostel.hostel_type, address: hostel.address ?? '',
          warden_id: hostel.warden_id ? String(hostel.warden_id) : '' }
      : { name: '', hostel_type: 'boys', address: '', warden_id: '' },
  });

  const onSubmit = async (values: HostelFormData) => {
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: values.name,
        hostel_type: values.hostel_type,
        address: values.address || null,
      };
      if (canPickWarden) payload.warden_id = values.warden_id ? Number(values.warden_id) : null;
      if (hostel) await hostelApi.updateHostel(hostel.id, payload);
      else await hostelApi.createHostel(payload);
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{hostel ? 'Edit hostel' : 'Add hostel'}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          <div>
            <label htmlFor="hostel-name" className="form-label">Hostel name *</label>
            <input id="hostel-name" {...register('name')} className="input w-full" placeholder="e.g. Sushruta Boys Hostel" />
            {errors.name && <p className="form-error">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="hostel-type" className="form-label">Type *</label>
              <select id="hostel-type" {...register('hostel_type')} className="input w-full">
                <option value="boys">Boys</option>
                <option value="girls">Girls</option>
                <option value="mixed">Mixed</option>
              </select>
            </div>
            {canPickWarden && (
              <div>
                <label htmlFor="hostel-warden" className="form-label">Warden</label>
                <select id="hostel-warden" {...register('warden_id')} className="input w-full" disabled={loadingWardens}>
                  <option value="">{loadingWardens ? 'Loading…' : 'Not assigned'}</option>
                  {wardens.map((w) => (
                    <option key={w.id} value={w.id}>{w.full_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          {canPickWarden && !loadingWardens && wardens.length === 0 && (
            <p className="-mt-2 text-xs text-slate-500">
              No users have the Warden role yet. Create one in Users and give them the Warden role.
            </p>
          )}

          <div>
            <label htmlFor="hostel-address" className="form-label">Address</label>
            <textarea id="hostel-address" {...register('address')} className="input w-full resize-none" rows={2} placeholder="Building / wing / campus" />
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Saving…' : hostel ? 'Save changes' : 'Add hostel'}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">Delete hostel</h2>
        <p className="text-sm text-slate-600">
          Delete <span className="font-semibold">{hostel.name}</span>? This cannot be undone.
          {hostel.occupied_count > 0 && (
            <span className="mt-2 block text-amber-700">
              {hostel.occupied_count} student{hostel.occupied_count > 1 ? 's are' : ' is'} still allotted here. Vacate them first.
            </span>
          )}
        </p>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handle} disabled={loading} className="btn-danger">
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Summary strip ─────────────────────────────────────────────────────────────

function Summary({ hostels }: { hostels: Hostel[] }) {
  const rooms = hostels.reduce((t, h) => t + h.room_count, 0);
  const beds = hostels.reduce((t, h) => t + h.total_capacity, 0);
  const occupied = hostels.reduce((t, h) => t + h.occupied_count, 0);
  const pct = beds > 0 ? Math.round((occupied / beds) * 100) : 0;

  const items = [
    { label: 'Hostels', value: hostels.length, icon: Building2 },
    { label: 'Rooms', value: rooms, icon: DoorOpen },
    { label: 'Total beds', value: beds, icon: BedDouble },
    { label: 'Occupied', value: occupied, icon: Users },
    { label: 'Available', value: Math.max(beds - occupied, 0), icon: BedDouble },
  ];

  return (
    <div className="card mb-6 overflow-hidden">
      <div className="grid grid-cols-2 divide-slate-100 sm:grid-cols-3 lg:grid-cols-6 lg:divide-x">
        {items.map((it) => (
          <div key={it.label} className="flex items-center gap-3 px-5 py-4">
            <it.icon className="h-5 w-5 shrink-0 text-slate-400" />
            <div>
              <p className="text-xs text-slate-500">{it.label}</p>
              <p className="text-xl font-semibold tabular-nums text-slate-900">{it.value}</p>
            </div>
          </div>
        ))}
        <div className="col-span-2 px-5 py-4 sm:col-span-3 lg:col-span-1">
          <div className="flex items-baseline justify-between">
            <p className="text-xs text-slate-500">Occupancy</p>
            <p className="text-xl font-semibold tabular-nums text-slate-900">{pct}%</p>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-slate-100">
            <div className={cn('h-1.5 rounded-full', occupancyColor(pct))} style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hostel card ───────────────────────────────────────────────────────────────

function HostelCard({
  h, canEdit, canDelete, onOpen, onEdit, onDelete,
}: {
  h: Hostel;
  canEdit: boolean;
  canDelete: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const type = HOSTEL_TYPE[h.hostel_type];
  const pct = h.total_capacity > 0 ? Math.round((h.occupied_count / h.total_capacity) * 100) : 0;
  const available = Math.max(h.total_capacity - h.occupied_count, 0);

  return (
    <article className="card flex flex-col transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start gap-3 p-5 pb-4">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', type.icon)}>
          <Building2 className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold text-slate-900" title={h.name}>{h.name}</h3>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', type.badge)}>
              {type.label}
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-slate-500">
            <MapPin className="h-3 w-3 shrink-0" />
            {h.address || 'No address added'}
          </p>
        </div>
      </div>

      {/* Stats */}
      <dl className="mx-5 grid grid-cols-3 divide-x divide-slate-100 rounded-lg border border-slate-100 bg-slate-50/60 py-3 text-center">
        {[
          ['Rooms', h.room_count],
          ['Beds', h.total_capacity],
          ['Occupied', h.occupied_count],
        ].map(([label, value]) => (
          <div key={label}>
            <dd className="text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
            <dt className="text-xs text-slate-500">{label}</dt>
          </div>
        ))}
      </dl>

      {/* Occupancy */}
      <div className="px-5 pt-4">
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-slate-500">Occupancy</span>
          <span className="tabular-nums text-slate-700">
            <span className="font-semibold">{pct}%</span>
            <span className="text-slate-400"> · {available} bed{available === 1 ? '' : 's'} free</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100">
          <div className={cn('h-1.5 rounded-full transition-all', occupancyColor(pct))} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Warden — always present so cards line up */}
      <div className="flex items-center justify-between gap-2 px-5 py-4 text-sm">
        <span className="flex min-w-0 items-center gap-2 text-slate-500">
          <UserRound className="h-4 w-4 shrink-0 text-slate-400" />
          Warden
        </span>
        {h.warden_name ? (
          <span className="truncate font-medium text-slate-800">{h.warden_name}</span>
        ) : canEdit ? (
          <button onClick={onEdit} className="text-sm font-medium text-amber-700 hover:underline">Assign warden</button>
        ) : (
          <span className="text-amber-700">Not assigned</span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-auto flex items-center gap-2 border-t border-slate-100 px-5 py-3">
        <button
          onClick={onOpen}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          Manage rooms <ArrowRight className="h-4 w-4" />
        </button>
        {canEdit && (
          <button
            onClick={onEdit}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            title="Edit hostel"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        {canDelete && (
          <button
            onClick={onDelete}
            className="rounded-lg border border-slate-200 p-2 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            title="Delete hostel"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </article>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function HostelPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editHostel, setEditHostel] = useState<Hostel | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Hostel | null>(null);

  const canCreate = can('hostel:create');
  const canEdit = can('hostel:update');
  const canDelete = can('hostel:delete');

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

  const openCreate = () => { setEditHostel(null); setModalOpen(true); };

  return (
    <div>
      <PageTitle
        title="Hostel Management"
        subtitle="Hostel buildings, rooms, wardens and occupancy"
        action={canCreate && (
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" /> Add hostel
          </button>
        )}
      />

      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner size="lg" /></div>
      ) : !hostels?.length ? (
        <div className="card flex flex-col items-center px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
            <Building2 className="h-6 w-6 text-slate-400" />
          </span>
          <p className="mt-3 font-medium text-slate-800">No hostels yet</p>
          <p className="mt-1 text-sm text-slate-500">Add a hostel, then add its rooms and allot students.</p>
          {canCreate && <button onClick={openCreate} className="btn-primary mt-4"><Plus className="h-4 w-4" /> Add hostel</button>}
        </div>
      ) : (
        <>
          <Summary hostels={hostels} />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {hostels.map((h) => (
              <HostelCard
                key={h.id}
                h={h}
                canEdit={canEdit}
                canDelete={canDelete}
                onOpen={() => navigate(`/hostel/${h.id}`)}
                onEdit={() => { setEditHostel(h); setModalOpen(true); }}
                onDelete={() => setDeleteTarget(h)}
              />
            ))}
          </div>
        </>
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
