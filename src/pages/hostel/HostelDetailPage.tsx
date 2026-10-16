import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft, Plus, Pencil, Trash2,
  UserPlus, LogOut, BedDouble, DollarSign,
  CalendarOff, Users2, AlertCircle, CheckSquare,
  Check, X,
} from 'lucide-react';
import { hostelApi, sessionsApi, studentsApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import { getErrorMessage } from '../../types';
import { digitsOnly, isValidMobile, MOBILE_ERROR, mobileInputProps } from '../../utils/validation';
import type {
  Hostel, HostelRoom, HostelAllocation,
  RoomType, RoomStatus, AcademicSession, Student,
  HostelFeeType, HostelFeePayment, FeeFrequency, FeePaymentStatus,
  HostelLeaveRequest, HostelLeaveType, HostelLeaveStatus,
  HostelVisitor,
  HostelComplaint, ComplaintPriority, ComplaintStatus,
  HostelAttendanceRecord, HostelAttendanceStatus,
  PaginatedResponse,
} from '../../types';
import { usePrefillCurrentSession } from '../../hooks/useCurrentSession';

// ── Constants ──────────────────────────────────────────────────────────────────

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  single: 'Single', double: 'Double', triple: 'Triple', dormitory: 'Dormitory',
};

const ROOM_STATUS_STYLES: Record<RoomStatus, string> = {
  available: 'bg-emerald-100 text-emerald-700',
  full: 'bg-red-100 text-red-700',
  maintenance: 'bg-amber-100 text-amber-700',
};

const FEE_STATUS_STYLES: Record<FeePaymentStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
  overdue: 'bg-red-100 text-red-700',
  waived: 'bg-slate-100 text-slate-600',
};

const LEAVE_STATUS_STYLES: Record<HostelLeaveStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

const COMPLAINT_STATUS_STYLES: Record<ComplaintStatus, string> = {
  open: 'bg-red-100 text-red-700',
  in_progress: 'bg-amber-100 text-amber-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-slate-100 text-slate-500',
};

const PRIORITY_STYLES: Record<ComplaintPriority, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
};

const ATT_STATUS_STYLES: Record<HostelAttendanceStatus, string> = {
  present: 'bg-emerald-100 text-emerald-700',
  absent: 'bg-red-100 text-red-700',
  on_leave: 'bg-amber-100 text-amber-700',
  outing: 'bg-blue-100 text-blue-700',
};

// ── Room Modal ─────────────────────────────────────────────────────────────────

const roomSchema = z.object({
  room_number: z.string().min(1, 'Required'),
  floor: z.number().int().nullable().optional(),
  room_type: z.enum(['single', 'double', 'triple', 'dormitory']),
  capacity: z.number().int().min(1, 'Min 1'),
});
type RoomFormData = z.infer<typeof roomSchema>;

function RoomModal({ hostelId, room, onClose, onSaved }: {
  hostelId: number; room: HostelRoom | null; onClose: () => void; onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: room
      ? { room_number: room.room_number, floor: room.floor, room_type: room.room_type, capacity: room.capacity }
      : { room_type: 'double', capacity: 2 },
  });
  const onSubmit = async (values: RoomFormData) => {
    setError(null);
    try {
      if (room) { await hostelApi.updateRoom(room.id, values); }
      else { await hostelApi.createRoom({ ...values, hostel_id: hostelId }); }
      onSaved();
    } catch (err) { setError(getErrorMessage(err)); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{room ? 'Edit Room' : 'Add Room'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="form-label">Room Number *</label>
            <input {...register('room_number')} className="input w-full" placeholder="e.g. 101" />
            {errors.room_number && <p className="form-error">{errors.room_number.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Floor</label>
              <input type="number" {...register('floor', { valueAsNumber: true, setValueAs: v => v === '' || isNaN(v) ? null : Number(v) })} className="input w-full" placeholder="0" />
            </div>
            <div>
              <label className="form-label">Capacity *</label>
              <input type="number" min={1} {...register('capacity', { valueAsNumber: true })} className="input w-full" />
              {errors.capacity && <p className="form-error">{errors.capacity.message}</p>}
            </div>
          </div>
          <div>
            <label className="form-label">Room Type *</label>
            <select {...register('room_type')} className="input w-full">
              <option value="single">Single</option>
              <option value="double">Double</option>
              <option value="triple">Triple</option>
              <option value="dormitory">Dormitory</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Saving…' : room ? 'Update' : 'Add Room'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Allocate Modal ─────────────────────────────────────────────────────────────

const allocSchema = z.object({
  student_id: z.number().int().positive('Select a student'),
  academic_session_id: z.number().int().positive('Select a session'),
  check_in_date: z.string().min(1, 'Required'),
  remarks: z.string().max(500).optional(),
});
type AllocFormData = z.infer<typeof allocSchema>;

function AllocateModal({ room, onClose, onSaved }: {
  room: HostelRoom; onClose: () => void; onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const { data: sessions } = useQuery<AcademicSession[]>({
    queryKey: ['sessions'],
    queryFn: async () => { const { data } = await sessionsApi.list(); return data as AcademicSession[]; },
  });
  const { data: studentsData } = useQuery({
    queryKey: ['students-all'],
    queryFn: async () => {
      const { data } = await studentsApi.list({ per_page: 500, status: 'active' });
      return data as { items: Student[] };
    },
  });
  const { getValues, setValue, register, handleSubmit, formState: { errors, isSubmitting } } = useForm<AllocFormData>({
    resolver: zodResolver(allocSchema),
    defaultValues: { check_in_date: new Date().toISOString().slice(0, 10) },
  });
  // New records default to the current academic session
  usePrefillCurrentSession(
    () => !getValues('academic_session_id'),
    (id) => setValue('academic_session_id', id),
    !!sessions?.length,
  );
  const onSubmit = async (values: AllocFormData) => {
    setError(null);
    try {
      await hostelApi.allocateRoom(room.id, { ...values, remarks: values.remarks || null });
      onSaved();
    } catch (err) { setError(getErrorMessage(err)); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Allocate Room</h2>
            <p className="text-xs text-slate-500 mt-0.5">Room {room.room_number} — {ROOM_TYPE_LABELS[room.room_type]} ({room.occupied_count}/{room.capacity})</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="form-label">Student *</label>
            <select {...register('student_id', { valueAsNumber: true })} className="input w-full">
              <option value="">Select student…</option>
              {studentsData?.items.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name} ({s.enrollment_number})</option>
              ))}
            </select>
            {errors.student_id && <p className="form-error">{errors.student_id.message}</p>}
          </div>
          <div>
            <label className="form-label">Academic Session *</label>
            <select {...register('academic_session_id', { valueAsNumber: true })} className="input w-full">
              <option value="">Select session…</option>
              {sessions?.map((s) => (
                <option key={s.id} value={s.id}>{s.name}{s.is_current ? ' (Current)' : ''}</option>
              ))}
            </select>
            {errors.academic_session_id && <p className="form-error">{errors.academic_session_id.message}</p>}
          </div>
          <div>
            <label className="form-label">Check-in Date *</label>
            <input type="date" {...register('check_in_date')} className="input w-full" />
          </div>
          <div>
            <label className="form-label">Remarks</label>
            <textarea {...register('remarks')} className="input w-full" rows={2} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Allocating…' : 'Allocate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Vacate Modal ───────────────────────────────────────────────────────────────

function VacateModal({ alloc, onClose, onSaved }: {
  alloc: HostelAllocation; onClose: () => void; onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { check_out_date: new Date().toISOString().slice(0, 10), remarks: '' },
  });
  const onSubmit = async (values: { check_out_date: string; remarks: string }) => {
    setError(null);
    try {
      await hostelApi.vacate(alloc.id, { ...values, remarks: values.remarks || null });
      onSaved();
    } catch (err) { setError(getErrorMessage(err)); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Vacate Room</h2>
            <p className="text-xs text-slate-500 mt-0.5">{alloc.student_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Room</span><span className="font-medium">{alloc.room_number}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Check-in</span><span>{alloc.check_in_date}</span></div>
          </div>
          <div>
            <label className="form-label">Check-out Date *</label>
            <input type="date" {...register('check_out_date')} className="input w-full" />
          </div>
          <div>
            <label className="form-label">Remarks</label>
            <textarea {...register('remarks')} className="input w-full" rows={2} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Processing…' : 'Confirm Vacate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Fee Type Modal ─────────────────────────────────────────────────────────────

function FeeTypeModal({ hostelId, feeType, onClose, onSaved }: {
  hostelId: number; feeType: HostelFeeType | null; onClose: () => void; onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: feeType
      ? { name: feeType.name, amount: feeType.amount, frequency: feeType.frequency, is_active: feeType.is_active }
      : { name: '', amount: 0, frequency: 'monthly' as FeeFrequency, is_active: true },
  });
  const onSubmit = async (values: unknown) => {
    setError(null);
    try {
      if (feeType) { await hostelApi.updateFeeType(feeType.id, values); }
      else { await hostelApi.createFeeType({ ...(values as object), hostel_id: hostelId }); }
      onSaved();
    } catch (err) { setError(getErrorMessage(err)); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{feeType ? 'Edit Fee Type' : 'Add Fee Type'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="form-label">Name *</label>
            <input {...register('name', { required: true })} className="input w-full" placeholder="e.g. Boarding Fee" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Amount *</label>
              <input type="number" step="0.01" min="0" {...register('amount', { valueAsNumber: true })} className="input w-full" />
            </div>
            <div>
              <label className="form-label">Frequency</label>
              <select {...register('frequency')} className="input w-full">
                <option value="one_time">One-time</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="is_active" {...register('is_active')} className="rounded" />
            <label htmlFor="is_active" className="text-sm text-slate-700">Active</label>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Saving…' : feeType ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Record Payment Modal ───────────────────────────────────────────────────────

function RecordPaymentModal({ hostelId, onClose, onSaved }: {
  hostelId: number; onClose: () => void; onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const { data: feeTypes } = useQuery<HostelFeeType[]>({
    queryKey: ['hostel-fee-types', hostelId],
    queryFn: async () => { const { data } = await hostelApi.listFeeTypes({ hostel_id: hostelId }); return data as HostelFeeType[]; },
  });
  const { data: allocData } = useQuery({
    queryKey: ['hostel-allocations', hostelId, 'active-all'],
    queryFn: async () => {
      const { data } = await hostelApi.listAllocations({ hostel_id: hostelId, status: 'active', per_page: 200 });
      return data as PaginatedResponse<HostelAllocation>;
    },
  });
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { allocation_id: 0, fee_type_id: '', description: '', amount: 0, due_date: '', paid_date: new Date().toISOString().slice(0, 10), status: 'paid', payment_mode: 'cash', receipt_no: '', remarks: '' },
  });
  const onSubmit = async (values: Record<string, unknown>) => {
    setError(null);
    try {
      const payload = {
        ...values,
        allocation_id: Number(values.allocation_id),
        fee_type_id: values.fee_type_id ? Number(values.fee_type_id) : null,
        amount: Number(values.amount),
        due_date: values.due_date || null,
        paid_date: values.paid_date || null,
        description: values.description || null,
        payment_mode: values.payment_mode || null,
        receipt_no: values.receipt_no || null,
        remarks: values.remarks || null,
      };
      await hostelApi.createFeePayment(payload);
      onSaved();
    } catch (err) { setError(getErrorMessage(err)); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Record Fee Payment</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="form-label">Student / Allocation *</label>
            <select {...register('allocation_id', { valueAsNumber: true })} className="input w-full">
              <option value="">Select resident…</option>
              {allocData?.items.map((a) => (
                <option key={a.id} value={a.id}>{a.student_name} — Room {a.room_number}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Fee Type</label>
              <select {...register('fee_type_id')} className="input w-full">
                <option value="">— Custom —</option>
                {feeTypes?.map((ft) => (
                  <option key={ft.id} value={ft.id}>{ft.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Amount *</label>
              <input type="number" step="0.01" min="0" {...register('amount', { valueAsNumber: true })} className="input w-full" />
            </div>
          </div>
          <div>
            <label className="form-label">Description</label>
            <input {...register('description')} className="input w-full" placeholder="Optional description…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Status</label>
              <select {...register('status')} className="input w-full">
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
                <option value="waived">Waived</option>
              </select>
            </div>
            <div>
              <label className="form-label">Payment Mode</label>
              <select {...register('payment_mode')} className="input w-full">
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="online">Online</option>
                <option value="cheque">Cheque</option>
                <option value="neft">NEFT</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Paid Date</label>
              <input type="date" {...register('paid_date')} className="input w-full" />
            </div>
            <div>
              <label className="form-label">Due Date</label>
              <input type="date" {...register('due_date')} className="input w-full" />
            </div>
          </div>
          <div>
            <label className="form-label">Receipt No.</label>
            <input {...register('receipt_no')} className="input w-full" placeholder="Optional" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Leave Request Modal ────────────────────────────────────────────────────────

function LeaveRequestModal({ hostelId, onClose, onSaved }: {
  hostelId: number; onClose: () => void; onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const { data: allocData } = useQuery({
    queryKey: ['hostel-allocations', hostelId, 'active-all'],
    queryFn: async () => {
      const { data } = await hostelApi.listAllocations({ hostel_id: hostelId, status: 'active', per_page: 200 });
      return data as PaginatedResponse<HostelAllocation>;
    },
  });
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm({
    defaultValues: {
      student_id: 0, hostel_id: hostelId, leave_type: 'leave' as HostelLeaveType,
      from_date: new Date().toISOString().slice(0, 10),
      to_date: new Date().toISOString().slice(0, 10),
      from_time: '', to_time: '', reason: '', destination: '', contact_during_leave: '',
    },
  });
  const contactReg = register('contact_during_leave', {
    validate: (v) => isValidMobile(v) || MOBILE_ERROR,
  });
  const onSubmit = async (values: Record<string, unknown>) => {
    setError(null);
    try {
      await hostelApi.createLeaveRequest({
        ...values,
        student_id: Number(values.student_id),
        from_time: values.from_time || null,
        to_time: values.to_time || null,
        destination: values.destination || null,
        contact_during_leave: values.contact_during_leave || null,
      });
      onSaved();
    } catch (err) { setError(getErrorMessage(err)); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">New Leave / Outing Request</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="form-label">Student *</label>
            <select {...register('student_id', { valueAsNumber: true })} className="input w-full">
              <option value="">Select resident…</option>
              {allocData?.items.map((a) => (
                <option key={a.student_id} value={a.student_id}>{a.student_name} — Room {a.room_number}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Type</label>
              <select {...register('leave_type')} className="input w-full">
                <option value="leave">Leave</option>
                <option value="outing">Outing</option>
              </select>
            </div>
            <div />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">From *</label>
              <input type="date" {...register('from_date')} className="input w-full" />
            </div>
            <div>
              <label className="form-label">To *</label>
              <input type="date" {...register('to_date')} className="input w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">From Time</label>
              <input type="time" {...register('from_time')} className="input w-full" />
            </div>
            <div>
              <label className="form-label">To Time</label>
              <input type="time" {...register('to_time')} className="input w-full" />
            </div>
          </div>
          <div>
            <label className="form-label">Reason *</label>
            <textarea {...register('reason', { required: true })} className="input w-full" rows={2} />
          </div>
          <div>
            <label className="form-label">Destination</label>
            <input {...register('destination')} className="input w-full" placeholder="Optional" />
          </div>
          <div>
            <label className="form-label">Contact During Leave</label>
            <input
              {...contactReg}
              {...mobileInputProps}
              className="input w-full"
              onChange={(e) => contactReg.onChange(digitsOnly(e))}
            />
            {errors.contact_during_leave && <p className="form-error">{errors.contact_during_leave.message}</p>}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Visitor Modal ──────────────────────────────────────────────────────────

function AddVisitorModal({ hostelId, onClose, onSaved }: {
  hostelId: number; onClose: () => void; onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const { data: allocData } = useQuery({
    queryKey: ['hostel-allocations', hostelId, 'active-all'],
    queryFn: async () => {
      const { data } = await hostelApi.listAllocations({ hostel_id: hostelId, status: 'active', per_page: 200 });
      return data as PaginatedResponse<HostelAllocation>;
    },
  });
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm({
    defaultValues: { hostel_id: hostelId, student_id: 0, visitor_name: '', visitor_phone: '', relation: '', purpose: '', remarks: '' },
  });
  const phoneReg = register('visitor_phone', {
    validate: (v) => isValidMobile(v) || MOBILE_ERROR,
  });
  const onSubmit = async (values: Record<string, unknown>) => {
    setError(null);
    try {
      await hostelApi.createVisitor({
        ...values,
        student_id: Number(values.student_id),
        visitor_phone: values.visitor_phone || null,
        relation: values.relation || null,
        purpose: values.purpose || null,
        remarks: values.remarks || null,
      });
      onSaved();
    } catch (err) { setError(getErrorMessage(err)); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Add Visitor Entry</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])} className="p-6 space-y-4">
          <div>
            <label className="form-label">Student (Visiting) *</label>
            <select {...register('student_id', { valueAsNumber: true })} className="input w-full">
              <option value="">Select resident…</option>
              {allocData?.items.map((a) => (
                <option key={a.student_id} value={a.student_id}>{a.student_name} — Room {a.room_number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Visitor Name *</label>
            <input {...register('visitor_name', { required: true })} className="input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Phone</label>
              <input
                {...phoneReg}
                {...mobileInputProps}
                className="input w-full"
                onChange={(e) => phoneReg.onChange(digitsOnly(e))}
              />
              {errors.visitor_phone && <p className="form-error">{errors.visitor_phone.message}</p>}
            </div>
            <div>
              <label className="form-label">Relation</label>
              <input {...register('relation')} className="input w-full" placeholder="e.g. Parent" />
            </div>
          </div>
          <div>
            <label className="form-label">Purpose</label>
            <input {...register('purpose')} className="input w-full" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Saving…' : 'Check In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Complaint Modal ────────────────────────────────────────────────────────

function AddComplaintModal({ hostelId, onClose, onSaved }: {
  hostelId: number; onClose: () => void; onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const { data: allocData } = useQuery({
    queryKey: ['hostel-allocations', hostelId, 'active-all'],
    queryFn: async () => {
      const { data } = await hostelApi.listAllocations({ hostel_id: hostelId, status: 'active', per_page: 200 });
      return data as PaginatedResponse<HostelAllocation>;
    },
  });
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { hostel_id: hostelId, student_id: 0, title: '', description: '', complaint_type: 'general', priority: 'medium' as ComplaintPriority },
  });
  const onSubmit = async (values: Record<string, unknown>) => {
    setError(null);
    try {
      await hostelApi.createComplaint({ ...values, student_id: Number(values.student_id), description: values.description || null });
      onSaved();
    } catch (err) { setError(getErrorMessage(err)); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Log Complaint</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])} className="p-6 space-y-4">
          <div>
            <label className="form-label">Student *</label>
            <select {...register('student_id', { valueAsNumber: true })} className="input w-full">
              <option value="">Select resident…</option>
              {allocData?.items.map((a) => (
                <option key={a.student_id} value={a.student_id}>{a.student_name} — Room {a.room_number}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Title *</label>
            <input {...register('title', { required: true })} className="input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Type</label>
              <select {...register('complaint_type')} className="input w-full">
                <option value="general">General</option>
                <option value="maintenance">Maintenance</option>
                <option value="hygiene">Hygiene</option>
                <option value="security">Security</option>
                <option value="food">Food / Mess</option>
                <option value="noise">Noise</option>
              </select>
            </div>
            <div>
              <label className="form-label">Priority</label>
              <select {...register('priority')} className="input w-full">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea {...register('description')} className="input w-full" rows={3} />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Submitting…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Mark Attendance Modal ──────────────────────────────────────────────────────

function MarkAttendanceModal({ hostelId, onClose, onSaved }: {
  hostelId: number; onClose: () => void; onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [attendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [statuses, setStatuses] = useState<Record<number, HostelAttendanceStatus>>({});
  const [submitting, setSubmitting] = useState(false);

  const { data: allocData, isLoading } = useQuery({
    queryKey: ['hostel-allocations', hostelId, 'active-all'],
    queryFn: async () => {
      const { data } = await hostelApi.listAllocations({ hostel_id: hostelId, status: 'active', per_page: 200 });
      return data as PaginatedResponse<HostelAllocation>;
    },
  });

  const students = allocData?.items ?? [];

  const getStatus = (studentId: number): HostelAttendanceStatus =>
    statuses[studentId] ?? 'present';

  const setStatus = (studentId: number, s: HostelAttendanceStatus) =>
    setStatuses((prev) => ({ ...prev, [studentId]: s }));

  const markAll = (s: HostelAttendanceStatus) => {
    const updates: Record<number, HostelAttendanceStatus> = {};
    students.forEach((a) => { updates[a.student_id] = s; });
    setStatuses(updates);
  };

  const handleSubmit = async () => {
    if (!students.length) { setError('No active residents.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      await hostelApi.submitAttendance({
        hostel_id: hostelId,
        date: attendanceDate,
        entries: students.map((a) => ({ student_id: a.student_id, status: getStatus(a.student_id) })),
      });
      onSaved();
    } catch (err) { setError(getErrorMessage(err)); setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Mark Attendance</h2>
            <p className="text-xs text-slate-500">{attendanceDate}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>
        <div className="px-6 py-3 border-b border-slate-100 shrink-0">
          <div className="flex gap-2 text-xs">
            <span className="text-slate-500 mr-1">Mark all:</span>
            {(['present', 'absent', 'on_leave', 'outing'] as HostelAttendanceStatus[]).map((s) => (
              <button key={s} onClick={() => markAll(s)} className={`rounded-full px-2.5 py-0.5 font-medium ${ATT_STATUS_STYLES[s]}`}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : !students.length ? (
            <p className="text-center text-sm text-slate-400 py-8">No active residents.</p>
          ) : (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-slate-50">
                {students.map((a) => {
                  const cur = getStatus(a.student_id);
                  return (
                    <tr key={a.student_id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-slate-900">{a.student_name}</p>
                        <p className="text-xs text-slate-400">{a.enrollment_number} · Rm {a.room_number}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex gap-1.5 justify-end">
                          {(['present', 'absent', 'on_leave', 'outing'] as HostelAttendanceStatus[]).map((s) => (
                            <button
                              key={s}
                              onClick={() => setStatus(a.student_id, s)}
                              className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-all ${
                                cur === s ? ATT_STATUS_STYLES[s] + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                              }`}
                            >
                              {s.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary disabled:opacity-50 flex items-center gap-2">
              {submitting ? <Spinner /> : <CheckSquare className="h-4 w-4" />}
              Save Attendance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

type ActiveTab = 'rooms' | 'residents' | 'fees' | 'leave' | 'visitors' | 'complaints' | 'attendance';

const TAB_CONFIG: { key: ActiveTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { key: 'rooms', label: 'Rooms', icon: BedDouble },
  { key: 'residents', label: 'Residents', icon: Users2 },
  { key: 'fees', label: 'Fees', icon: DollarSign },
  { key: 'leave', label: 'Leave', icon: CalendarOff },
  { key: 'visitors', label: 'Visitors', icon: Users2 },
  { key: 'complaints', label: 'Complaints', icon: AlertCircle },
  { key: 'attendance', label: 'Attendance', icon: CheckSquare },
];

export function HostelDetailPage() {
  const { hostelId } = useParams<{ hostelId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const id = Number(hostelId);

  const [tab, setTab] = useState<ActiveTab>('rooms');
  const [roomModal, setRoomModal] = useState(false);
  const [editRoom, setEditRoom] = useState<HostelRoom | null>(null);
  const [allocRoom, setAllocRoom] = useState<HostelRoom | null>(null);
  const [vacateAlloc, setVacateAlloc] = useState<HostelAllocation | null>(null);
  const [allocPage, setAllocPage] = useState(1);

  // Fee state
  const [feeTypeModal, setFeeTypeModal] = useState(false);
  const [editFeeType, setEditFeeType] = useState<HostelFeeType | null>(null);
  const [paymentModal, setPaymentModal] = useState(false);
  const [feePage, setFeePage] = useState(1);

  // Leave state
  const [leaveModal, setLeaveModal] = useState(false);
  const [leavePage, setLeavePage] = useState(1);

  // Visitor state
  const [visitorModal, setVisitorModal] = useState(false);
  const [visitorPage, setVisitorPage] = useState(1);

  // Complaint state
  const [complaintModal, setComplaintModal] = useState(false);
  const [complaintPage, setComplaintPage] = useState(1);

  // Attendance state
  const [markAttModal, setMarkAttModal] = useState(false);
  const [attPage, setAttPage] = useState(1);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: hostel, isLoading: hostelLoading } = useQuery<Hostel>({
    queryKey: ['hostel', id],
    queryFn: async () => { const { data } = await hostelApi.getHostel(id); return data as Hostel; },
    enabled: !!id,
  });

  const { data: rooms, isLoading: roomsLoading } = useQuery<HostelRoom[]>({
    queryKey: ['hostel-rooms', id],
    queryFn: async () => { const { data } = await hostelApi.listRooms({ hostel_id: id }); return data as HostelRoom[]; },
    enabled: !!id && tab === 'rooms',
  });

  const { data: allocData, isLoading: allocLoading } = useQuery({
    queryKey: ['hostel-allocations', id, allocPage],
    queryFn: async () => {
      const { data } = await hostelApi.listAllocations({ hostel_id: id, status: 'active', page: allocPage, per_page: 20 });
      return data as PaginatedResponse<HostelAllocation>;
    },
    enabled: !!id && tab === 'residents',
  });

  const { data: feeTypes } = useQuery<HostelFeeType[]>({
    queryKey: ['hostel-fee-types', id],
    queryFn: async () => { const { data } = await hostelApi.listFeeTypes({ hostel_id: id }); return data as HostelFeeType[]; },
    enabled: !!id && tab === 'fees',
  });

  const { data: feePayments } = useQuery({
    queryKey: ['hostel-fee-payments', id, feePage],
    queryFn: async () => {
      const { data } = await hostelApi.listFeePayments({ hostel_id: id, page: feePage, per_page: 20 });
      return data as PaginatedResponse<HostelFeePayment>;
    },
    enabled: !!id && tab === 'fees',
  });

  const { data: leaveData } = useQuery({
    queryKey: ['hostel-leave-requests', id, leavePage],
    queryFn: async () => {
      const { data } = await hostelApi.listLeaveRequests({ hostel_id: id, page: leavePage, per_page: 20 });
      return data as PaginatedResponse<HostelLeaveRequest>;
    },
    enabled: !!id && tab === 'leave',
  });

  const { data: visitorData } = useQuery({
    queryKey: ['hostel-visitors', id, visitorPage],
    queryFn: async () => {
      const { data } = await hostelApi.listVisitors({ hostel_id: id, page: visitorPage, per_page: 20 });
      return data as PaginatedResponse<HostelVisitor>;
    },
    enabled: !!id && tab === 'visitors',
  });

  const { data: complaintData } = useQuery({
    queryKey: ['hostel-complaints', id, complaintPage],
    queryFn: async () => {
      const { data } = await hostelApi.listComplaints({ hostel_id: id, page: complaintPage, per_page: 20 });
      return data as PaginatedResponse<HostelComplaint>;
    },
    enabled: !!id && tab === 'complaints',
  });

  const { data: attData } = useQuery({
    queryKey: ['hostel-attendance', id, attPage],
    queryFn: async () => {
      const { data } = await hostelApi.listAttendance({ hostel_id: id, page: attPage, per_page: 20 });
      return data as PaginatedResponse<HostelAttendanceRecord>;
    },
    enabled: !!id && tab === 'attendance',
  });

  // ── Mutations for quick actions ────────────────────────────────────────────

  const checkoutVisitor = useMutation({
    mutationFn: (visitorId: number) => hostelApi.checkoutVisitor(visitorId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hostel-visitors', id] }),
  });

  const updateComplaint = useMutation({
    mutationFn: ({ cId, data }: { cId: number; data: unknown }) => hostelApi.updateComplaint(cId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hostel-complaints', id] }),
  });

  const approveLeave = useMutation({
    mutationFn: (lrId: number) => hostelApi.approveLeaveRequest(lrId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hostel-leave-requests', id] }),
  });

  const rejectLeave = useMutation({
    mutationFn: (lrId: number) => hostelApi.rejectLeaveRequest(lrId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hostel-leave-requests', id] }),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['hostel', id] });
    qc.invalidateQueries({ queryKey: ['hostel-rooms', id] });
    qc.invalidateQueries({ queryKey: ['hostel-allocations', id] });
    qc.invalidateQueries({ queryKey: ['hostel-fee-types', id] });
    qc.invalidateQueries({ queryKey: ['hostel-fee-payments', id] });
    qc.invalidateQueries({ queryKey: ['hostel-leave-requests', id] });
    qc.invalidateQueries({ queryKey: ['hostel-visitors', id] });
    qc.invalidateQueries({ queryKey: ['hostel-complaints', id] });
    qc.invalidateQueries({ queryKey: ['hostel-attendance', id] });
    qc.invalidateQueries({ queryKey: ['hostels'] });
    setRoomModal(false); setEditRoom(null); setAllocRoom(null); setVacateAlloc(null);
    setFeeTypeModal(false); setEditFeeType(null); setPaymentModal(false);
    setLeaveModal(false); setVisitorModal(false); setComplaintModal(false); setMarkAttModal(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (hostelLoading) return <div className="flex justify-center py-24"><Spinner /></div>;
  if (!hostel) return <div className="card py-12 text-center text-sm text-slate-400">Hostel not found.</div>;

  return (
    <div>
      {/* Back + title */}
      <div className="mb-6">
        <button onClick={() => navigate('/hostel')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to Hostels
        </button>
        <PageTitle title={hostel.name} subtitle={`${hostel.room_count} rooms · ${hostel.occupied_count}/${hostel.total_capacity} occupied`} />
      </div>

      {/* Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 w-fit min-w-full sm:min-w-fit">
          {TAB_CONFIG.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap capitalize transition-colors ${
                tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Rooms Tab ── */}
      {tab === 'rooms' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => { setEditRoom(null); setRoomModal(true); }} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Room
            </button>
          </div>
          {roomsLoading ? <div className="flex justify-center py-16"><Spinner /></div>
            : !rooms?.length ? (
              <div className="card py-12 text-center"><BedDouble className="h-10 w-10 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-500">No rooms added yet.</p></div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Room</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 hidden sm:table-cell">Floor</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Occupancy</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rooms.map((room) => (
                      <tr key={room.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{room.room_number}</td>
                        <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{room.floor != null ? `Floor ${room.floor}` : '—'}</td>
                        <td className="px-4 py-3 text-slate-600">{ROOM_TYPE_LABELS[room.room_type]}</td>
                        <td className="px-4 py-3"><span className="font-medium">{room.occupied_count}</span><span className="text-slate-400">/{room.capacity}</span></td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROOM_STATUS_STYLES[room.status]}`}>{room.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {room.status !== 'maintenance' && room.status !== 'full' && (
                              <button onClick={() => setAllocRoom(room)} className="flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700">
                                <UserPlus className="h-3.5 w-3.5" /> Allocate
                              </button>
                            )}
                            <button onClick={() => { setEditRoom(room); setRoomModal(true); }} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={async () => {
                              if (!confirm(`Delete room ${room.room_number}?`)) return;
                              try { await hostelApi.deleteRoom(room.id); invalidateAll(); }
                              catch (err) { alert(getErrorMessage(err)); }
                            }} className="rounded-lg border border-red-200 p-1.5 text-red-500 hover:bg-red-50">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </>
      )}

      {/* ── Residents Tab ── */}
      {tab === 'residents' && (
        <>
          {allocLoading ? <div className="flex justify-center py-16"><Spinner /></div>
            : !allocData?.items.length ? (
              <div className="card py-12 text-center text-sm text-slate-400">No active residents found.</div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Room</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600 hidden sm:table-cell">Session</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Check-in</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allocData.items.map((alloc) => (
                      <tr key={alloc.id}>
                        <td className="px-4 py-3"><p className="font-medium text-slate-900">{alloc.student_name}</p><p className="text-xs text-slate-400 font-mono">{alloc.enrollment_number}</p></td>
                        <td className="px-4 py-3 font-medium text-slate-700">{alloc.room_number}</td>
                        <td className="px-4 py-3 text-xs text-slate-500 hidden sm:table-cell">{alloc.session_name ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{alloc.check_in_date}</td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => setVacateAlloc(alloc)} className="flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 ml-auto">
                            <LogOut className="h-3.5 w-3.5" /> Vacate
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(allocData.total > 20) && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
                    <span>{allocData.total} residents</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setAllocPage((p) => Math.max(1, p - 1))} disabled={allocPage === 1} className="btn-secondary py-1 text-xs disabled:opacity-40">Prev</button>
                      <span>Page {allocPage}</span>
                      <button onClick={() => setAllocPage((p) => p + 1)} disabled={allocData.items.length < 20} className="btn-secondary py-1 text-xs disabled:opacity-40">Next</button>
                    </div>
                  </div>
                )}
              </div>
            )}
        </>
      )}

      {/* ── Fees Tab ── */}
      {tab === 'fees' && (
        <div className="space-y-6">
          {/* Fee Types */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Fee Types</h3>
              <div className="flex gap-2">
                <button onClick={() => { setEditFeeType(null); setFeeTypeModal(true); }} className="btn-secondary flex items-center gap-1 text-xs py-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add Type
                </button>
                <button onClick={() => setPaymentModal(true)} className="btn-primary flex items-center gap-1 text-xs py-1.5">
                  <DollarSign className="h-3.5 w-3.5" /> Record Payment
                </button>
              </div>
            </div>
            {!feeTypes?.length ? (
              <div className="card py-8 text-center text-sm text-slate-400">No fee types configured. Add one to start tracking payments.</div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Frequency</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                      <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {feeTypes.map((ft) => (
                      <tr key={ft.id}>
                        <td className="px-4 py-3 font-medium text-slate-900">{ft.name}</td>
                        <td className="px-4 py-3 text-slate-700">₹{Number(ft.amount).toLocaleString()}</td>
                        <td className="px-4 py-3 capitalize text-slate-600">{ft.frequency.replace('_', '-')}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ft.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {ft.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => { setEditFeeType(ft); setFeeTypeModal(true); }} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Fee Payments */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Payments</h3>
            {!feePayments?.items.length ? (
              <div className="card py-8 text-center text-sm text-slate-400">No fee payments recorded yet.</div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-100 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Description</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Amount</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {feePayments.items.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3"><p className="font-medium text-slate-900">{p.student_name}</p><p className="text-xs text-slate-400">{p.enrollment_number}</p></td>
                        <td className="px-4 py-3 text-slate-600">{p.fee_type_name ?? p.description ?? '—'}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">₹{Number(p.amount).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${FEE_STATUS_STYLES[p.status]}`}>{p.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{p.paid_date ?? p.due_date ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(feePayments.total > 20) && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
                    <span>{feePayments.total} records</span>
                    <div className="flex gap-2">
                      <button onClick={() => setFeePage((p) => Math.max(1, p - 1))} disabled={feePage === 1} className="btn-secondary py-1 text-xs disabled:opacity-40">Prev</button>
                      <button onClick={() => setFeePage((p) => p + 1)} disabled={feePayments.items.length < 20} className="btn-secondary py-1 text-xs disabled:opacity-40">Next</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Leave Tab ── */}
      {tab === 'leave' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setLeaveModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Request
            </button>
          </div>
          {!leaveData?.items.length ? (
            <div className="card py-12 text-center text-sm text-slate-400">No leave/outing requests found.</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Dates</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {leaveData.items.map((lr) => (
                    <tr key={lr.id}>
                      <td className="px-4 py-3"><p className="font-medium text-slate-900">{lr.student_name}</p><p className="text-xs text-slate-400">{lr.enrollment_number}</p></td>
                      <td className="px-4 py-3 capitalize text-slate-600">{lr.leave_type}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">{lr.from_date} → {lr.to_date}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${LEAVE_STATUS_STYLES[lr.status]}`}>{lr.status}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {lr.status === 'pending' && (
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => approveLeave.mutate(lr.id)} className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40" disabled={approveLeave.isPending}>
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button onClick={() => rejectLeave.mutate(lr.id)} className="rounded-lg bg-red-50 p-1.5 text-red-700 hover:bg-red-100 disabled:opacity-40" disabled={rejectLeave.isPending}>
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(leaveData.total > 20) && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
                  <span>{leaveData.total} requests</span>
                  <div className="flex gap-2">
                    <button onClick={() => setLeavePage((p) => Math.max(1, p - 1))} disabled={leavePage === 1} className="btn-secondary py-1 text-xs disabled:opacity-40">Prev</button>
                    <button onClick={() => setLeavePage((p) => p + 1)} disabled={leaveData.items.length < 20} className="btn-secondary py-1 text-xs disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Visitors Tab ── */}
      {tab === 'visitors' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setVisitorModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> Add Visitor
            </button>
          </div>
          {!visitorData?.items.length ? (
            <div className="card py-12 text-center text-sm text-slate-400">No visitor records found.</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Visitor</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Check-in</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Check-out</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visitorData.items.map((v) => (
                    <tr key={v.id}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{v.visitor_name}</p>
                        <p className="text-xs text-slate-400">{v.relation} {v.visitor_phone && `· ${v.visitor_phone}`}</p>
                      </td>
                      <td className="px-4 py-3"><p className="text-slate-700">{v.student_name}</p><p className="text-xs text-slate-400">{v.enrollment_number}</p></td>
                      <td className="px-4 py-3 text-xs text-slate-600">{new Date(v.check_in_time).toLocaleString()}</td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {v.check_out_time ? new Date(v.check_out_time).toLocaleString() : (
                          <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">Inside</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!v.check_out_time && (
                          <button onClick={() => checkoutVisitor.mutate(v.id)} disabled={checkoutVisitor.isPending} className="flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-700 ml-auto disabled:opacity-40">
                            <LogOut className="h-3.5 w-3.5" /> Check Out
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(visitorData.total > 20) && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
                  <span>{visitorData.total} records</span>
                  <div className="flex gap-2">
                    <button onClick={() => setVisitorPage((p) => Math.max(1, p - 1))} disabled={visitorPage === 1} className="btn-secondary py-1 text-xs disabled:opacity-40">Prev</button>
                    <button onClick={() => setVisitorPage((p) => p + 1)} disabled={visitorData.items.length < 20} className="btn-secondary py-1 text-xs disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Complaints Tab ── */}
      {tab === 'complaints' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setComplaintModal(true)} className="btn-primary flex items-center gap-2">
              <Plus className="h-4 w-4" /> Log Complaint
            </button>
          </div>
          {!complaintData?.items.length ? (
            <div className="card py-12 text-center text-sm text-slate-400">No complaints logged.</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Title</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Priority</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {complaintData.items.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-3"><p className="font-medium text-slate-900">{c.student_name}</p><p className="text-xs text-slate-400">{c.enrollment_number}</p></td>
                      <td className="px-4 py-3 text-slate-700"><p className="font-medium">{c.title}</p><p className="text-xs text-slate-400 capitalize">{c.complaint_type}</p></td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_STYLES[c.priority]}`}>{c.priority}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${COMPLAINT_STATUS_STYLES[c.status]}`}>{c.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {c.status === 'open' && (
                          <button onClick={() => updateComplaint.mutate({ cId: c.id, data: { status: 'in_progress' } })} className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-40" disabled={updateComplaint.isPending}>
                            In Progress
                          </button>
                        )}
                        {c.status === 'in_progress' && (
                          <button onClick={() => updateComplaint.mutate({ cId: c.id, data: { status: 'resolved' } })} className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-40" disabled={updateComplaint.isPending}>
                            Resolve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(complaintData.total > 20) && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
                  <span>{complaintData.total} complaints</span>
                  <div className="flex gap-2">
                    <button onClick={() => setComplaintPage((p) => Math.max(1, p - 1))} disabled={complaintPage === 1} className="btn-secondary py-1 text-xs disabled:opacity-40">Prev</button>
                    <button onClick={() => setComplaintPage((p) => p + 1)} disabled={complaintData.items.length < 20} className="btn-secondary py-1 text-xs disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Attendance Tab ── */}
      {tab === 'attendance' && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={() => setMarkAttModal(true)} className="btn-primary flex items-center gap-2">
              <CheckSquare className="h-4 w-4" /> Mark Today's Attendance
            </button>
          </div>
          {!attData?.items.length ? (
            <div className="card py-12 text-center text-sm text-slate-400">No attendance records found.</div>
          ) : (
            <div className="card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Present</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Absent</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">On Leave</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Outing</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">Marked By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {attData.items.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 font-medium text-slate-900">{a.date}</td>
                      <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">{a.present_count}</span></td>
                      <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">{a.absent_count}</span></td>
                      <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">{a.on_leave_count}</span></td>
                      <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">{a.outing_count}</span></td>
                      <td className="px-4 py-3 text-xs text-slate-500">{a.marked_by_name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(attData.total > 20) && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
                  <span>{attData.total} records</span>
                  <div className="flex gap-2">
                    <button onClick={() => setAttPage((p) => Math.max(1, p - 1))} disabled={attPage === 1} className="btn-secondary py-1 text-xs disabled:opacity-40">Prev</button>
                    <button onClick={() => setAttPage((p) => p + 1)} disabled={attData.items.length < 20} className="btn-secondary py-1 text-xs disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {roomModal && <RoomModal hostelId={id} room={editRoom} onClose={() => { setRoomModal(false); setEditRoom(null); }} onSaved={invalidateAll} />}
      {allocRoom && <AllocateModal room={allocRoom} onClose={() => setAllocRoom(null)} onSaved={invalidateAll} />}
      {vacateAlloc && <VacateModal alloc={vacateAlloc} onClose={() => setVacateAlloc(null)} onSaved={invalidateAll} />}
      {feeTypeModal && <FeeTypeModal hostelId={id} feeType={editFeeType} onClose={() => { setFeeTypeModal(false); setEditFeeType(null); }} onSaved={invalidateAll} />}
      {paymentModal && <RecordPaymentModal hostelId={id} onClose={() => setPaymentModal(false)} onSaved={invalidateAll} />}
      {leaveModal && <LeaveRequestModal hostelId={id} onClose={() => setLeaveModal(false)} onSaved={invalidateAll} />}
      {visitorModal && <AddVisitorModal hostelId={id} onClose={() => setVisitorModal(false)} onSaved={invalidateAll} />}
      {complaintModal && <AddComplaintModal hostelId={id} onClose={() => setComplaintModal(false)} onSaved={invalidateAll} />}
      {markAttModal && <MarkAttendanceModal hostelId={id} onClose={() => setMarkAttModal(false)} onSaved={invalidateAll} />}
    </div>
  );
}
