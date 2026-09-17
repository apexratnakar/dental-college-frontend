import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, Plus, X, AlertCircle, RefreshCw, BookOpen, Clock, CheckCircle,
} from 'lucide-react';
import { libraryApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import type { LibraryReservation, PaginatedResponse } from '../../types';
import { getErrorMessage } from '../../types';

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  pending:   'bg-blue-50 text-blue-700',
  available: 'bg-green-50 text-green-700',
  fulfilled: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-red-50 text-red-600',
  expired:   'bg-amber-50 text-amber-700',
};

const STATUS_LABEL: Record<string, string> = {
  pending:   'Pending',
  available: 'Available — Notify Student',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
  expired:   'Expired',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:   <Clock className="h-3.5 w-3.5" />,
  available: <CheckCircle className="h-3.5 w-3.5" />,
  fulfilled: <BookOpen className="h-3.5 w-3.5" />,
  cancelled: <X className="h-3.5 w-3.5" />,
  expired:   <AlertCircle className="h-3.5 w-3.5" />,
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {STATUS_ICON[status]}
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// ── Add Reservation Modal ─────────────────────────────────────────────────────

function AddReservationModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [bookSearch, setBookSearch] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedBookTitle, setSelectedBookTitle] = useState('');
  const [studentId, setStudentId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: bookResults, isLoading: booksLoading } = useQuery({
    queryKey: ['book-search-reservation', bookSearch],
    queryFn: async () => {
      const { data } = await libraryApi.listBooks({
        page: 1, per_page: 10, search: bookSearch,
      });
      return (data as { items: { id: number; title: string; author: string; available_copies: number }[] }).items;
    },
    enabled: bookSearch.length >= 2 && !selectedBookId,
  });

  const handleSelectBook = (id: number, title: string) => {
    setSelectedBookId(id);
    setSelectedBookTitle(title);
    setBookSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedBookId) { setError('Select a book first.'); return; }
    if (!studentId.trim()) { setError('Student ID is required.'); return; }
    setIsSubmitting(true);
    try {
      await libraryApi.createReservation(selectedBookId, {
        student_id: parseInt(studentId),
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputCls = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">New Reservation</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100">
            <X className="h-4 w-4 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Book selection */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Book *</label>
              {selectedBookId ? (
                <div className="flex items-center justify-between rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-sm">
                  <span className="font-medium text-primary-800">{selectedBookTitle}</span>
                  <button
                    type="button"
                    onClick={() => { setSelectedBookId(null); setSelectedBookTitle(''); }}
                    className="text-primary-500 hover:text-primary-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <Search className="h-4 w-4 shrink-0 text-slate-400" />
                    <input
                      value={bookSearch}
                      onChange={(e) => setBookSearch(e.target.value)}
                      placeholder="Type to search books…"
                      className="flex-1 bg-transparent text-sm outline-none"
                    />
                    {booksLoading && <Spinner size="sm" />}
                  </div>
                  {bookResults && bookResults.length > 0 && (
                    <ul className="mt-1 rounded-lg border border-slate-100 bg-white shadow text-sm">
                      {bookResults.map((b) => (
                        <li key={b.id}>
                          <button
                            type="button"
                            onClick={() => handleSelectBook(b.id, b.title)}
                            className="w-full px-3 py-2 text-left hover:bg-slate-50"
                          >
                            <p className="font-medium">{b.title}</p>
                            <p className="text-xs text-slate-400">
                              {b.author} ·{' '}
                              <span className={b.available_copies > 0 ? 'text-green-600' : 'text-red-500'}>
                                {b.available_copies > 0 ? `${b.available_copies} available` : 'Not available'}
                              </span>
                            </p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            {/* Student ID */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Student ID *</label>
              <input
                type="number"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="Enter student ID"
                className={inputCls}
              />
              <p className="mt-1 text-xs text-slate-400">Use the student's internal system ID.</p>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={`${inputCls} resize-none`}
                placeholder="Optional note for this reservation…"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {isSubmitting ? <Spinner size="sm" /> : <Plus className="h-4 w-4" />}
              Reserve
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['', 'pending', 'available', 'fulfilled', 'cancelled', 'expired'];

export function LibraryReservationsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<LibraryReservation | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['reservations', page, statusFilter],
    queryFn: async () => {
      const { data } = await libraryApi.listReservations({
        page,
        per_page: 20,
        status: statusFilter || undefined,
      });
      return data as PaginatedResponse<LibraryReservation>;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => libraryApi.cancelReservation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservations'] });
      setCancelTarget(null);
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['reservations'] });

  const displayedItems = data?.items.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.book_title.toLowerCase().includes(q) ||
      (r.student_name ?? '').toLowerCase().includes(q) ||
      (r.library_card_number ?? '').toLowerCase().includes(q)
    );
  }) ?? [];

  return (
    <div>
      <PageTitle
        title="Reservations"
        subtitle="Manage book reservation queue — students are notified when their book becomes available"
      />

      {/* Toolbar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex w-64 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by book, student…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s ? STATUS_LABEL[s] : 'All Statuses'}
            </option>
          ))}
        </select>

        <div className="ml-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            New Reservation
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-red-400" />
            <p className="text-sm text-slate-600">Failed to load reservations.</p>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white"
            >
              <RefreshCw className="h-4 w-4" /> Retry
            </button>
          </div>
        ) : displayedItems.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-400">
            {search || statusFilter ? 'No reservations match your filters.' : 'No reservations found.'}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Book</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Student</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Reserved On</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Notified</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayedItems.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{r.book_title}</p>
                      {r.library_card_number && (
                        <p className="font-mono text-xs text-slate-400">{r.library_card_number}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {r.student_name ?? (r.student_id ? `#${r.student_id}` : '—')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(r.reservation_date).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {r.notified_at
                        ? new Date(r.notified_at).toLocaleDateString('en-IN')
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(r.status === 'pending' || r.status === 'available') && (
                        <button
                          onClick={() => setCancelTarget(r)}
                          className="rounded px-2 py-1 text-xs font-medium text-red-500 hover:bg-red-50"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data && data.pages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                <span>{data.total} reservations</span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="btn-secondary disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span className="px-2">
                    {page} / {data.pages}
                  </span>
                  <button
                    disabled={page >= data.pages}
                    onClick={() => setPage((p) => p + 1)}
                    className="btn-secondary disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showAddModal && (
        <AddReservationModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={invalidate}
        />
      )}

      <ConfirmModal
        isOpen={!!cancelTarget}
        title="Cancel Reservation"
        message={
          cancelTarget
            ? `Cancel reservation for "${cancelTarget.book_title}" by ${cancelTarget.student_name ?? 'student'}? This cannot be undone.`
            : ''
        }
        onConfirm={() => cancelTarget && cancelMutation.mutate(cancelTarget.id)}
        onCancel={() => setCancelTarget(null)}
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}
