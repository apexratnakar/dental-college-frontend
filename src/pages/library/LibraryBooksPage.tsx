import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Plus, Pencil, Trash2, BookMarked, Search, ChevronRight, ChevronDown } from 'lucide-react';
import { libraryApi, studentsApi } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { PageTitle } from '../../components/common/PageTitle';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import { getErrorMessage } from '../../types';
import type { Book, BookCategory, BookCopy, CopyStatus } from '../../types';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES: { value: BookCategory; label: string }[] = [
  { value: 'textbook', label: 'Textbook' },
  { value: 'reference', label: 'Reference' },
  { value: 'fiction', label: 'Fiction' },
  { value: 'non_fiction', label: 'Non-Fiction' },
  { value: 'journal', label: 'Journal' },
  { value: 'magazine', label: 'Magazine' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_COLORS: Record<BookCategory, string> = {
  textbook:    'bg-blue-100 text-blue-700',
  reference:   'bg-purple-100 text-purple-700',
  fiction:     'bg-green-100 text-green-700',
  non_fiction: 'bg-teal-100 text-teal-700',
  journal:     'bg-amber-100 text-amber-700',
  magazine:    'bg-rose-100 text-rose-700',
  other:       'bg-slate-100 text-slate-600',
};

const COPY_STATUS_COLORS: Record<CopyStatus, string> = {
  available:   'bg-green-100 text-green-700',
  issued:      'bg-blue-100 text-blue-700',
  reserved:    'bg-indigo-100 text-indigo-700',
  lost:        'bg-red-100 text-red-700',
  damaged:     'bg-amber-100 text-amber-700',
  under_repair:'bg-orange-100 text-orange-700',
  discarded:   'bg-slate-100 text-slate-500',
};

// ── Book form schema ──────────────────────────────────────────────────────────

const bookSchema = z.object({
  title: z.string().min(1, 'Required').max(300),
  author: z.string().min(1, 'Required').max(300),
  isbn: z.string().max(20).optional().or(z.literal('')),
  publisher: z.string().max(200).optional().or(z.literal('')),
  edition: z.string().max(50).optional().or(z.literal('')),
  year_published: z.number().int().min(1000).max(9999).nullable().optional(),
  category: z.enum(['textbook', 'reference', 'fiction', 'non_fiction', 'journal', 'magazine', 'other']),
  total_copies: z.number().int().min(1, 'Must be at least 1'),
  location: z.string().max(100).optional().or(z.literal('')),
  description: z.string().max(1000).optional().or(z.literal('')),
  // Extended fields
  subtitle: z.string().max(300).optional().or(z.literal('')),
  language: z.string().max(50).optional().or(z.literal('')),
  book_type: z.enum(['textbook', 'reference', 'fiction', 'non_fiction', 'journal', 'magazine', 'newspaper', 'ebook', 'other']).optional().nullable(),
  price: z.number().min(0).nullable().optional(),
  rack: z.string().max(50).optional().or(z.literal('')),
  shelf: z.string().max(50).optional().or(z.literal('')),
  supplier: z.string().max(200).optional().or(z.literal('')),
  purchase_date: z.string().optional().or(z.literal('')),
  cover_image_url: z.string().max(500).optional().or(z.literal('')),
  digital_url: z.string().max(500).optional().or(z.literal('')),
  pages: z.number().int().min(1).nullable().optional(),
});

type BookFormData = z.infer<typeof bookSchema>;

// ── Issue form schema ─────────────────────────────────────────────────────────

const issueSchema = z.object({
  student_id: z.number().int().positive('Select a student'),
  due_date: z.string().optional(),
});

type IssueFormData = z.infer<typeof issueSchema>;

// ── Book modal ────────────────────────────────────────────────────────────────

function BookModal({
  book,
  onClose,
  onSaved,
}: {
  book: Book | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [showExtended, setShowExtended] = useState(false);
  const isEdit = !!book;

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<BookFormData>({
    resolver: zodResolver(bookSchema),
    defaultValues: book
      ? {
          title: book.title,
          author: book.author,
          isbn: book.isbn ?? '',
          publisher: book.publisher ?? '',
          edition: book.edition ?? '',
          year_published: book.year_published ?? undefined,
          category: book.category,
          total_copies: book.total_copies,
          location: book.location ?? '',
          description: book.description ?? '',
          subtitle: book.subtitle ?? '',
          language: book.language ?? '',
          book_type: book.book_type ?? undefined,
          price: book.price ?? undefined,
          rack: book.rack ?? '',
          shelf: book.shelf ?? '',
          supplier: book.supplier ?? '',
          purchase_date: book.purchase_date ?? '',
          cover_image_url: book.cover_image_url ?? '',
          digital_url: book.digital_url ?? '',
          pages: book.pages ?? undefined,
        }
      : { category: 'textbook', total_copies: 1 },
  });

  const onSubmit = async (values: BookFormData) => {
    setError(null);
    const payload = {
      ...values,
      isbn: values.isbn || null,
      publisher: values.publisher || null,
      edition: values.edition || null,
      location: values.location || null,
      description: values.description || null,
      year_published: values.year_published || null,
      subtitle: values.subtitle || null,
      language: values.language || null,
      book_type: values.book_type || null,
      price: values.price ?? null,
      rack: values.rack || null,
      shelf: values.shelf || null,
      supplier: values.supplier || null,
      purchase_date: values.purchase_date || null,
      cover_image_url: values.cover_image_url || null,
      digital_url: values.digital_url || null,
      pages: values.pages ?? null,
    };
    try {
      if (isEdit) {
        await libraryApi.updateBook(book.id, payload);
      } else {
        await libraryApi.addBook(payload);
      }
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">{isEdit ? 'Edit Book' : 'Add Book'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Core fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="form-label">Title *</label>
              <input {...register('title')} className="input w-full" placeholder="Book title" />
              {errors.title && <p className="form-error">{errors.title.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="form-label">Author *</label>
              <input {...register('author')} className="input w-full" placeholder="Author name(s)" />
              {errors.author && <p className="form-error">{errors.author.message}</p>}
            </div>
            <div>
              <label className="form-label">ISBN</label>
              <input {...register('isbn')} className="input w-full" placeholder="978-..." />
            </div>
            <div>
              <label className="form-label">Category *</label>
              <select {...register('category')} className="input w-full">
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Publisher</label>
              <input {...register('publisher')} className="input w-full" />
            </div>
            <div>
              <label className="form-label">Edition</label>
              <input {...register('edition')} className="input w-full" placeholder="3rd" />
            </div>
            <div>
              <label className="form-label">Year Published</label>
              <input
                type="number"
                {...register('year_published', { valueAsNumber: true })}
                className="input w-full"
                placeholder="2024"
              />
            </div>
            <div>
              <label className="form-label">Total Copies *</label>
              <input
                type="number"
                {...register('total_copies', { valueAsNumber: true })}
                className="input w-full"
                min="1"
              />
              {errors.total_copies && <p className="form-error">{errors.total_copies.message}</p>}
            </div>
            <div className="col-span-2">
              <label className="form-label">Location (shelf/rack)</label>
              <input {...register('location')} className="input w-full" placeholder="Shelf A-3" />
            </div>
            <div className="col-span-2">
              <label className="form-label">Description</label>
              <textarea {...register('description')} className="input w-full" rows={2} />
            </div>
          </div>

          {/* Collapsible extended fields */}
          <div>
            <button
              type="button"
              onClick={() => setShowExtended(!showExtended)}
              className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              {showExtended ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Additional Details
            </button>
          </div>

          {showExtended && (
            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
              <div className="col-span-2">
                <label className="form-label">Subtitle</label>
                <input {...register('subtitle')} className="input w-full" />
              </div>
              <div>
                <label className="form-label">Language</label>
                <input {...register('language')} className="input w-full" placeholder="English" />
              </div>
              <div>
                <label className="form-label">Book Type</label>
                <select {...register('book_type')} className="input w-full">
                  <option value="">— Select —</option>
                  <option value="textbook">Textbook</option>
                  <option value="reference">Reference</option>
                  <option value="fiction">Fiction</option>
                  <option value="non_fiction">Non-Fiction</option>
                  <option value="journal">Journal</option>
                  <option value="magazine">Magazine</option>
                  <option value="newspaper">Newspaper</option>
                  <option value="ebook">E-Book</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Price (₹)</label>
                <input
                  type="number" min={0} step="0.01"
                  {...register('price', { valueAsNumber: true })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="form-label">Pages</label>
                <input
                  type="number" min={1}
                  {...register('pages', { valueAsNumber: true })}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="form-label">Rack</label>
                <input {...register('rack')} className="input w-full" placeholder="A" />
              </div>
              <div>
                <label className="form-label">Shelf</label>
                <input {...register('shelf')} className="input w-full" placeholder="3" />
              </div>
              <div className="col-span-2">
                <label className="form-label">Supplier</label>
                <input {...register('supplier')} className="input w-full" />
              </div>
              <div>
                <label className="form-label">Purchase Date</label>
                <input type="date" {...register('purchase_date')} className="input w-full" />
              </div>
              <div className="col-span-2">
                <label className="form-label">Cover Image URL</label>
                <input {...register('cover_image_url')} className="input w-full" placeholder="https://..." />
              </div>
              <div className="col-span-2">
                <label className="form-label">Digital / E-Book URL</label>
                <input {...register('digital_url')} className="input w-full" placeholder="https://..." />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Saving…' : isEdit ? 'Update Book' : 'Add Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Issue modal ───────────────────────────────────────────────────────────────

function IssueModal({
  book,
  onClose,
  onSaved,
}: {
  book: Book;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const defaultDue = new Date();
  defaultDue.setDate(defaultDue.getDate() + 14);
  const defaultDueStr = defaultDue.toISOString().slice(0, 10);

  const { data: students } = useQuery({
    queryKey: ['students-all'],
    queryFn: async () => {
      const { data } = await studentsApi.list({ per_page: 500 });
      return (data as { items: { id: number; enrollment_number: string; full_name: string | null }[] }).items;
    },
  });

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<IssueFormData>({
    resolver: zodResolver(issueSchema),
    defaultValues: { due_date: defaultDueStr },
  });

  const onSubmit = async (values: IssueFormData) => {
    setError(null);
    try {
      await libraryApi.issueBook(book.id, {
        student_id: values.student_id,
        due_date: values.due_date || null,
      });
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Issue Book</h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{book.title}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="form-label">Student *</label>
            <select
              {...register('student_id', { valueAsNumber: true })}
              className="input w-full"
            >
              <option value="">Select student…</option>
              {students?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.enrollment_number} — {s.full_name ?? ''}
                </option>
              ))}
            </select>
            {errors.student_id && <p className="form-error">{errors.student_id.message}</p>}
          </div>

          <div>
            <label className="form-label">Due Date</label>
            <input type="date" {...register('due_date')} className="input w-full" />
            <p className="text-xs text-slate-400 mt-1">Default: 14 days from today</p>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary disabled:opacity-50">
              {isSubmitting ? 'Issuing…' : 'Issue Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Book Copies row ───────────────────────────────────────────────────────────

function BookCopiesRow({ bookId }: { bookId: number }) {
  const { data: copies, isLoading } = useQuery<BookCopy[]>({
    queryKey: ['book-copies', bookId],
    queryFn: async () => {
      const { data } = await libraryApi.getBookCopies(bookId);
      return data as BookCopy[];
    },
  });

  return (
    <tr>
      <td colSpan={7} className="bg-slate-50 px-8 py-3">
        {isLoading ? (
          <span className="text-xs text-slate-400">Loading copies…</span>
        ) : !copies?.length ? (
          <span className="text-xs text-slate-400">No copies registered</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {copies.map((copy) => (
              <span
                key={copy.id}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${COPY_STATUS_COLORS[copy.copy_status]}`}
              >
                <span className="font-mono">{copy.accession_number}</span>
                <span className="opacity-70">·</span>
                <span className="capitalize">{copy.copy_status.replace('_', ' ')}</span>
              </span>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function LibraryBooksPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [category, setCategory] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [bookModal, setBookModal] = useState<'add' | Book | null>(null);
  const [issueBook, setIssueBook] = useState<Book | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);
  const [expandedBookId, setExpandedBookId] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['library-books', search, category, availableOnly, page],
    queryFn: async () => {
      const { data } = await libraryApi.listBooks({
        page,
        per_page: 20,
        search: search || undefined,
        category: category || undefined,
        available_only: availableOnly || undefined,
      });
      return data as { items: Book[]; total: number; page: number; per_page: number };
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => libraryApi.deleteBook(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['library-books'] });
      setDeleteTarget(null);
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['library-books'] });
    setBookModal(null);
    setIssueBook(null);
  };

  const totalPages = Math.ceil((data?.total ?? 0) / 20);

  const toggleExpand = (bookId: number) => {
    setExpandedBookId((prev) => (prev === bookId ? null : bookId));
  };

  return (
    <div>
      <PageTitle
        title="Library — Books"
        subtitle="Manage the book catalog and issue books to students"
        action={
          <button
            onClick={() => setBookModal('add')}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Book
          </button>
        }
      />

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setSearch(searchInput); setPage(1); } }}
              className="input pl-9 w-full"
              placeholder="Search title, author, ISBN… (Enter)"
            />
          </div>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="input w-40"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(e) => { setAvailableOnly(e.target.checked); setPage(1); }}
              className="rounded border-slate-300"
            />
            Available only
          </label>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-24"><Spinner /></div>
      ) : !data?.items.length ? (
        <div className="card py-12 text-center text-sm text-slate-400">
          No books found. {search && <button onClick={() => { setSearch(''); setSearchInput(''); }} className="text-primary-600 underline">Clear search</button>}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="w-8 px-2 py-3" />
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Title / Author</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 hidden sm:table-cell">ISBN</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-600">Copies</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 hidden md:table-cell">Location</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.items.map((book) => (
                <>
                  <tr key={book.id} className="hover:bg-slate-50/50">
                    {/* Expand toggle */}
                    <td className="px-2 py-3 text-center">
                      <button
                        onClick={() => toggleExpand(book.id)}
                        className="text-slate-400 hover:text-slate-600"
                        title="Show copies"
                      >
                        {expandedBookId === book.id
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 leading-tight">{book.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{book.author}</p>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500 hidden sm:table-cell">
                      {book.isbn ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[book.category]}`}>
                        {CATEGORIES.find((c) => c.value === book.category)?.label ?? book.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-semibold ${book.available_copies === 0 ? 'text-red-600' : 'text-green-700'}`}>
                        {book.available_copies}
                      </span>
                      <span className="text-xs text-slate-400">/{book.total_copies}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">
                      {book.location ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setIssueBook(book)}
                          disabled={book.available_copies === 0}
                          className="flex items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <BookMarked className="h-3.5 w-3.5" />
                          Issue
                        </button>
                        <button
                          onClick={() => setBookModal(book)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(book)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedBookId === book.id && <BookCopiesRow key={`copies-${book.id}`} bookId={book.id} />}
                </>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
              <span>{data.total} books</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary py-1 text-xs disabled:opacity-40"
                >
                  Prev
                </button>
                <span>Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="btn-secondary py-1 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary */}
      {data && (
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5" />
            {data.total} total books
          </span>
        </div>
      )}

      {/* Modals */}
      {bookModal !== null && (
        <BookModal
          book={bookModal === 'add' ? null : bookModal}
          onClose={() => setBookModal(null)}
          onSaved={invalidate}
        />
      )}
      {issueBook && (
        <IssueModal
          book={issueBook}
          onClose={() => setIssueBook(null)}
          onSaved={invalidate}
        />
      )}
      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete Book"
        message={deleteTarget ? `Delete "${deleteTarget.title}" from the library catalog? This cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
