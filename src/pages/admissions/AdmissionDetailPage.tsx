import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Copy, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';
import { admissionsApi, sectionsApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { getErrorMessage } from '../../types';
import type { Admission, AdmissionCredentials, Section, AdmissionStatus } from '../../types';
import { STATUS_LABELS, STATUS_COLORS } from './AdmissionsPage';

// ── Workflow config ────────────────────────────────────────────────────────────

const NEXT_STATUS: Partial<Record<AdmissionStatus, AdmissionStatus>> = {
  pending: 'documents_submitted',
  documents_submitted: 'documents_verified',
  documents_verified: 'merit_listed',
  merit_listed: 'counselled',
  counselled: 'approved',
};

const NEXT_STATUS_LABEL: Partial<Record<AdmissionStatus, string>> = {
  pending: 'Mark Docs Submitted',
  documents_submitted: 'Verify Documents',
  documents_verified: 'Add to Merit List',
  merit_listed: 'Mark Counselled',
  counselled: 'Approve',
};

// ── Credentials modal ─────────────────────────────────────────────────────────

function CredentialsModal({
  creds,
  onClose,
}: {
  creds: AdmissionCredentials;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const CopyRow = ({ label, value, id }: { label: string; value: string; id: string }) => (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
      <div>
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        <p className="mt-0.5 font-mono text-sm font-semibold text-slate-900">{value}</p>
      </div>
      <button
        onClick={() => copy(value, id)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
      >
        {copied === id ? (
          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied === id ? 'Copied' : 'Copy'}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Student Admitted</h2>
              <p className="text-xs text-slate-500">Share these credentials with the student</p>
            </div>
          </div>
        </div>

        <div className="px-6 space-y-2">
          <CopyRow label="Enrollment Number" value={creds.enrollment_number} id="enrollment" />
          <CopyRow label="Username" value={creds.username} id="username" />
          <CopyRow label="Temporary Password" value={creds.temp_password} id="password" />
          {creds.email && <CopyRow label="Email" value={creds.email} id="email" />}
          {creds.mobile && <CopyRow label="Mobile" value={creds.mobile} id="mobile" />}
        </div>

        <p className="mx-6 mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs text-amber-700">
          The student must change their password on first login. Save these credentials before closing.
        </p>

        <div className="flex justify-end gap-2 px-6 py-4">
          <button onClick={onClose} className="btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Reject modal ──────────────────────────────────────────────────────────────

function RejectModal({
  onConfirm,
  onCancel,
  isLoading,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <XCircle className="h-5 w-5 text-red-500" />
          <h2 className="text-base font-semibold text-slate-900">Reject Application</h2>
        </div>
        <label className="text-sm font-medium text-slate-700">Rejection Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Provide a reason for rejection…"
          className="input-field mt-1 w-full resize-none"
        />
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isLoading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Approve modal ─────────────────────────────────────────────────────────────

function ApproveModal({
  courseId,
  sessionId,
  onConfirm,
  onCancel,
  isLoading,
}: {
  courseId: number;
  sessionId: number;
  onConfirm: (sectionId?: number) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [sectionId, setSectionId] = useState<number | undefined>();

  const { data: sections } = useQuery({
    queryKey: ['sections', courseId, sessionId],
    queryFn: async () => {
      const { data } = await sectionsApi.list({ course_id: courseId, session_id: sessionId, per_page: 100 });
      return data.items as Section[];
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Admit Student</h2>
        <label className="text-sm font-medium text-slate-700">
          Assign Section (optional)
        </label>
        <select
          value={sectionId ?? ''}
          onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : undefined)}
          className="input-field mt-1 w-full"
        >
          <option value="">No section</option>
          {sections?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-slate-500">
          This will create a user account and student record with a temporary password.
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(sectionId)}
            disabled={isLoading}
            className="btn-primary disabled:opacity-50"
          >
            {isLoading ? 'Admitting…' : 'Admit & Generate Credentials'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Info row helper ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string | null | undefined | number }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm text-slate-900">{value ?? '—'}</p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function AdmissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showReject, setShowReject] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [credentials, setCredentials] = useState<AdmissionCredentials | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: admission, isLoading } = useQuery({
    queryKey: ['admission', id],
    queryFn: async () => {
      const { data } = await admissionsApi.get(Number(id));
      return data as Admission;
    },
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { status: string; rejection_reason?: string; remarks?: string }) =>
      admissionsApi.updateStatus(Number(id), payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admission', id] });
      qc.invalidateQueries({ queryKey: ['admissions'] });
      setShowReject(false);
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  const approveMutation = useMutation({
    mutationFn: (sectionId?: number) => admissionsApi.approve(Number(id), sectionId),
    onSuccess: ({ data }) => {
      qc.invalidateQueries({ queryKey: ['admission', id] });
      qc.invalidateQueries({ queryKey: ['admissions'] });
      setShowApprove(false);
      setCredentials(data as AdmissionCredentials);
      setActionError(null);
    },
    onError: (err) => setActionError(getErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (!admission) {
    return (
      <div className="py-12 text-center text-slate-500">
        Application not found.{' '}
        <button onClick={() => navigate('/admissions')} className="text-primary-600 underline">
          Go back
        </button>
      </div>
    );
  }

  const nextStatus = NEXT_STATUS[admission.status];
  const canAdvance = !!nextStatus;
  const canReject = !['admitted', 'rejected'].includes(admission.status);
  const canAdmit = ['approved', 'counselled', 'documents_verified', 'merit_listed'].includes(
    admission.status,
  );

  return (
    <div>
      {/* Back + header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => navigate('/admissions')}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Admissions
        </button>
        <ChevronRight className="h-4 w-4 text-slate-300" />
        <span className="text-sm font-medium text-slate-700">{admission.full_name}</span>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{admission.full_name}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Application #{admission.id} · {new Date(admission.created_at).toLocaleDateString()}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_COLORS[admission.status] ?? 'bg-slate-100 text-slate-600'}`}
        >
          {STATUS_LABELS[admission.status] ?? admission.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal info */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Full Name" value={admission.full_name} />
              <InfoRow label="Email" value={admission.email} />
              <InfoRow label="Mobile" value={admission.mobile} />
              <InfoRow label="Date of Birth" value={admission.date_of_birth} />
              <InfoRow label="Gender" value={admission.gender} />
              <InfoRow label="Category" value={admission.category} />
            </div>
            {admission.permanent_address && (
              <div className="mt-4">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  Address
                </p>
                <p className="mt-0.5 text-sm text-slate-900">{admission.permanent_address}</p>
              </div>
            )}
          </div>

          {/* Academic */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Academic Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Course" value={admission.course_name ?? `#${admission.course_id}`} />
              <InfoRow
                label="Session"
                value={admission.session_name ?? `#${admission.session_id}`}
              />
              <InfoRow label="Year of Study" value={`Year ${admission.year_of_study}`} />
              <InfoRow
                label="Merit Score"
                value={admission.merit_score != null ? `${admission.merit_score}%` : null}
              />
              <InfoRow label="Previous Institution" value={admission.previous_institution} />
              <InfoRow label="Qualification" value={admission.previous_qualification} />
              <InfoRow label="Counselling Rank" value={admission.counselling_rank} />
            </div>
          </div>

          {/* Guardian */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">Parent / Guardian</h2>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="Father Name" value={admission.father_name} />
              <InfoRow label="Mother Name" value={admission.mother_name} />
              <InfoRow label="Guardian Name" value={admission.guardian_name} />
              <InfoRow label="Guardian Mobile" value={admission.guardian_mobile} />
            </div>
          </div>

          {/* Remarks / Rejection */}
          {(admission.remarks || admission.rejection_reason) && (
            <div className="card p-6">
              <h2 className="text-sm font-semibold text-slate-900 mb-4">Notes</h2>
              {admission.remarks && (
                <InfoRow label="Remarks" value={admission.remarks} />
              )}
              {admission.rejection_reason && (
                <div className="mt-3 rounded-lg bg-red-50 p-3">
                  <p className="text-xs font-medium text-red-600 uppercase tracking-wide">
                    Rejection Reason
                  </p>
                  <p className="mt-0.5 text-sm text-red-800">{admission.rejection_reason}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right — workflow */}
        <div className="space-y-4">
          {/* Enrollment (if admitted) */}
          {admission.status === 'admitted' && admission.enrollment_number && (
            <div className="card p-4 bg-green-50 border-green-200">
              <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-1">
                Admitted
              </p>
              <p className="text-lg font-mono font-bold text-green-900">
                {admission.enrollment_number}
              </p>
              {admission.student_id && (
                <button
                  onClick={() => navigate(`/students`)}
                  className="mt-2 text-xs text-green-700 underline"
                >
                  View Student Record →
                </button>
              )}
            </div>
          )}

          {/* Workflow actions */}
          {(canAdvance || canReject || canAdmit) && (
            <div className="card p-4">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">Workflow Actions</h2>
              <div className="space-y-2">
                {canAdvance && nextStatus && (
                  <button
                    onClick={() =>
                      statusMutation.mutate({ status: nextStatus })
                    }
                    disabled={statusMutation.isPending}
                    className="btn-primary w-full text-sm disabled:opacity-50"
                  >
                    {NEXT_STATUS_LABEL[admission.status]}
                  </button>
                )}
                {canAdmit && (
                  <button
                    onClick={() => setShowApprove(true)}
                    className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                  >
                    Admit & Generate Credentials
                  </button>
                )}
                {canReject && (
                  <button
                    onClick={() => setShowReject(true)}
                    className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    Reject Application
                  </button>
                )}
              </div>
              {actionError && (
                <p className="mt-3 text-xs text-red-500">{actionError}</p>
              )}
            </div>
          )}

          {/* Status timeline */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Status Progress</h2>
            <ol className="space-y-2">
              {(
                [
                  'pending',
                  'documents_submitted',
                  'documents_verified',
                  'merit_listed',
                  'counselled',
                  'approved',
                  'admitted',
                ] as AdmissionStatus[]
              ).map((s) => {
                const statuses: AdmissionStatus[] = [
                  'pending', 'documents_submitted', 'documents_verified',
                  'merit_listed', 'counselled', 'approved', 'admitted',
                ];
                const currentIdx = statuses.indexOf(admission.status as AdmissionStatus);
                const stepIdx = statuses.indexOf(s);
                const isDone = stepIdx < currentIdx || admission.status === s;
                const isCurrent = admission.status === s;
                return (
                  <li key={s} className="flex items-center gap-2 text-xs">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        isCurrent
                          ? 'bg-primary-600'
                          : isDone
                          ? 'bg-green-500'
                          : 'bg-slate-200'
                      }`}
                    />
                    <span
                      className={
                        isCurrent
                          ? 'font-semibold text-primary-700'
                          : isDone
                          ? 'text-slate-600'
                          : 'text-slate-400'
                      }
                    >
                      {STATUS_LABELS[s]}
                    </span>
                  </li>
                );
              })}
              {admission.status === 'rejected' && (
                <li className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full shrink-0 bg-red-500" />
                  <span className="font-semibold text-red-600">Rejected</span>
                </li>
              )}
            </ol>
          </div>

          {/* Documents */}
          {admission.documents.length > 0 && (
            <div className="card p-4">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">
                Documents ({admission.documents.length})
              </h2>
              <ul className="space-y-2">
                {admission.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-700">{doc.document_type}</span>
                    <span
                      className={
                        doc.is_verified
                          ? 'text-green-600 font-medium'
                          : 'text-slate-400'
                      }
                    >
                      {doc.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showReject && (
        <RejectModal
          onConfirm={(reason) =>
            statusMutation.mutate({ status: 'rejected', rejection_reason: reason })
          }
          onCancel={() => setShowReject(false)}
          isLoading={statusMutation.isPending}
        />
      )}

      {showApprove && (
        <ApproveModal
          courseId={admission.course_id}
          sessionId={admission.session_id}
          onConfirm={(sectionId) => approveMutation.mutate(sectionId)}
          onCancel={() => setShowApprove(false)}
          isLoading={approveMutation.isPending}
        />
      )}

      {credentials && (
        <CredentialsModal creds={credentials} onClose={() => setCredentials(null)} />
      )}
    </div>
  );
}
