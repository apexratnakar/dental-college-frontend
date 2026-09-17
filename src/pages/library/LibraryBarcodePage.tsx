import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Printer, CheckSquare, Square, AlertCircle } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { libraryApi } from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';
import { Spinner } from '../../components/common/Spinner';
import type { Book, BookCopy, PaginatedResponse } from '../../types';

// ── Single label component ────────────────────────────────────────────────────

const COLLEGE_NAME = 'DENTAL COLLEGE';

function BarcodeLabel({
  copy,
  book,
  size,
}: {
  copy: BookCopy;
  book: Book;
  size: 'sm' | 'md' | 'lg';
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const value = copy.barcode ?? copy.accession_number;

  const widths = { sm: 1.5, md: 2, lg: 2.5 };
  const heights = { sm: 40, md: 55, lg: 70 };

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width: widths[size],
        height: heights[size],
        displayValue: false,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      // ignore invalid barcode values
    }
  }, [value, size]);

  const titleMaxLen = { sm: 30, md: 40, lg: 50 };
  const shortTitle =
    book.title.length > titleMaxLen[size]
      ? book.title.slice(0, titleMaxLen[size] - 1) + '…'
      : book.title;

  return (
    <div
      className="label-card border border-slate-300 bg-white p-2 flex flex-col items-center gap-1 rounded"
      style={{ width: size === 'sm' ? 180 : size === 'md' ? 220 : 260 }}
    >
      <p className="text-center font-bold leading-tight" style={{ fontSize: 9 }}>
        {COLLEGE_NAME}
      </p>
      <p className="text-center leading-tight" style={{ fontSize: size === 'sm' ? 7 : 8 }}>
        {shortTitle}
      </p>
      <svg ref={svgRef} className="w-full" />
      <p className="font-mono font-semibold" style={{ fontSize: 8 }}>
        {value}
      </p>
      {(book.rack || book.shelf) && (
        <p className="text-slate-600" style={{ fontSize: 7 }}>
          {book.rack ? `Rack: ${book.rack}` : ''}{book.rack && book.shelf ? '  ' : ''}{book.shelf ? `Shelf: ${book.shelf}` : ''}
        </p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function LibraryBarcodePage() {
  const [search, setSearch] = useState('');
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [selectedCopyIds, setSelectedCopyIds] = useState<Set<number>>(new Set());
  const [labelSize, setLabelSize] = useState<'sm' | 'md' | 'lg'>('md');
  const printRef = useRef<HTMLDivElement>(null);

  const { data: booksData, isLoading: booksLoading } = useQuery({
    queryKey: ['library-books-search', search],
    queryFn: async () => {
      const { data } = await libraryApi.listBooks({
        page: 1,
        per_page: 20,
        search: search || undefined,
      });
      return data as PaginatedResponse<Book>;
    },
    enabled: search.length >= 1 || !selectedBookId,
  });

  const selectedBook = booksData?.items.find((b) => b.id === selectedBookId) ?? null;

  const { data: copies = [], isLoading: copiesLoading } = useQuery<BookCopy[]>({
    queryKey: ['book-copies', selectedBookId],
    queryFn: async () => {
      const { data } = await libraryApi.getBookCopies(selectedBookId!);
      return data as BookCopy[];
    },
    enabled: !!selectedBookId,
  });

  const selectAll = () => setSelectedCopyIds(new Set(copies.map((c) => c.id)));
  const clearAll = () => setSelectedCopyIds(new Set());
  const toggleCopy = (id: number) => {
    setSelectedCopyIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Reset selection when book changes
  const handleSelectBook = (id: number) => {
    setSelectedBookId(id);
    setSelectedCopyIds(new Set());
    setSearch('');
  };

  const selectedCopies = copies.filter((c) => selectedCopyIds.has(c.id));

  const handlePrint = () => {
    if (!selectedCopies.length || !selectedBook) return;
    window.print();
  };

  const copyStatusColor: Record<string, string> = {
    available: 'text-green-600',
    issued: 'text-amber-600',
    reserved: 'text-blue-600',
    lost: 'text-red-600',
    damaged: 'text-orange-600',
    under_repair: 'text-purple-600',
    discarded: 'text-slate-400',
  };

  return (
    <>
      {/* ── Print-only styles ── */}
      <style>{`
        @media screen {
          #print-labels {
            position: fixed;
            left: -9999px;
            top: 0;
            visibility: hidden;
            pointer-events: none;
          }
        }
        @media print {
          body * { visibility: hidden !important; }
          #print-labels, #print-labels * { visibility: visible !important; }
          #print-labels {
            position: fixed !important;
            top: 0;
            left: 0;
            display: flex !important;
            flex-wrap: wrap;
            gap: 8px;
            padding: 16px;
            background: white !important;
            width: 100% !important;
          }
        }
      `}</style>

      {/* ── Hidden print area (off-screen so JsBarcode can render into it) ── */}
      <div id="print-labels" className="flex flex-wrap gap-2 p-4" ref={printRef}>
        {selectedBook &&
          selectedCopies.map((copy) => (
            <BarcodeLabel key={copy.id} copy={copy} book={selectedBook} size={labelSize} />
          ))}
      </div>

      {/* ── Screen UI ── */}
      <div>
        <PageTitle
          title="Barcode Labels"
          subtitle="Generate and print Code 128 barcode labels for physical book copies"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Book search + copy selection */}
          <div className="space-y-4">
            {/* Book search */}
            <div className="card p-4">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">1. Search & Select Book</h3>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title, author, ISBN…"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </div>

              {booksLoading && (
                <div className="mt-3 flex justify-center">
                  <Spinner size="sm" />
                </div>
              )}

              {booksData && booksData.items.length > 0 && (
                <ul className="mt-2 divide-y divide-slate-50 rounded-lg border border-slate-100 bg-white text-sm">
                  {booksData.items.map((b) => (
                    <li key={b.id}>
                      <button
                        onClick={() => handleSelectBook(b.id)}
                        className={`w-full px-3 py-2.5 text-left hover:bg-slate-50 ${
                          selectedBookId === b.id ? 'bg-primary-50 font-medium text-primary-700' : 'text-slate-800'
                        }`}
                      >
                        <p className="font-medium">{b.title}</p>
                        <p className="text-xs text-slate-400">
                          {b.author} · {b.total_copies} copies
                          {b.rack ? ` · Rack ${b.rack}` : ''}
                          {b.isbn ? ` · ${b.isbn}` : ''}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {booksData && booksData.items.length === 0 && search && (
                <p className="mt-3 text-center text-xs text-slate-400">No books found.</p>
              )}
            </div>

            {/* Copy selection */}
            {selectedBookId && (
              <div className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">2. Select Copies</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs font-medium text-primary-600 hover:underline"
                    >
                      All
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      onClick={clearAll}
                      className="text-xs font-medium text-slate-500 hover:underline"
                    >
                      None
                    </button>
                  </div>
                </div>

                {copiesLoading ? (
                  <div className="flex justify-center py-4">
                    <Spinner size="sm" />
                  </div>
                ) : copies.length === 0 ? (
                  <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    No physical copies found for this book.
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-50 text-sm">
                    {copies.map((c) => (
                      <li
                        key={c.id}
                        className="flex cursor-pointer items-center gap-3 py-2 hover:bg-slate-50/50"
                        onClick={() => toggleCopy(c.id)}
                      >
                        {selectedCopyIds.has(c.id) ? (
                          <CheckSquare className="h-4 w-4 shrink-0 text-primary-600" />
                        ) : (
                          <Square className="h-4 w-4 shrink-0 text-slate-300" />
                        )}
                        <span className="font-mono text-xs font-medium text-slate-800">
                          {c.accession_number}
                        </span>
                        <span
                          className={`ml-auto text-xs font-medium ${copyStatusColor[c.copy_status] ?? 'text-slate-500'}`}
                        >
                          {c.copy_status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Print settings */}
            {selectedCopyIds.size > 0 && (
              <div className="card p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">3. Label Settings & Print</h3>
                <div className="flex items-end gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Label Size</label>
                    <select
                      value={labelSize}
                      onChange={(e) => setLabelSize(e.target.value as 'sm' | 'md' | 'lg')}
                      className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="sm">Small (180 × ~65px)</option>
                      <option value="md">Medium (220 × ~80px)</option>
                      <option value="lg">Large (260 × ~95px)</option>
                    </select>
                  </div>
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700"
                  >
                    <Printer className="h-4 w-4" />
                    Print {selectedCopyIds.size} Label{selectedCopyIds.size !== 1 ? 's' : ''}
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Labels use Code 128 format. Tip: set browser margins to "None" for best results.
                </p>
              </div>
            )}
          </div>

          {/* Right: Label preview */}
          <div className="card p-4">
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Preview</h3>
            {!selectedBook ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Search className="mb-2 h-8 w-8" />
                <p className="text-sm">Search and select a book to preview labels.</p>
              </div>
            ) : selectedCopies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <CheckSquare className="mb-2 h-8 w-8" />
                <p className="text-sm">Select copies on the left to see a preview.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {selectedCopies.map((copy) => (
                  <BarcodeLabel key={copy.id} copy={copy} book={selectedBook} size={labelSize} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
