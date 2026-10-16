export const inr = (n: number | null | undefined) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n ?? 0);

/** "09:30:00" → "9:30 AM" */
export function time12(t: string | null | undefined): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${suffix}`;
}

export const humanize = (s: string | null | undefined) =>
  (s ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** "2026-10-11" → "Today" / "Tomorrow" / "In 3 days" (local calendar days). */
export function daysUntil(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

export const PAPER_KIND: Record<string, { label: string; cls: string }> = {
  theory:    { label: 'Theory',              cls: 'bg-blue-50 text-blue-700' },
  practical: { label: 'Practical',           cls: 'bg-violet-50 text-violet-700' },
  both:      { label: 'Theory & Practical',  cls: 'bg-amber-50 text-amber-800' },
};

/** Most colleges require 75% attendance to sit exams. */
export const ATTENDANCE_MIN = 75;

/** Staff attendance status labels and badge styles. */
export const ATTENDANCE_STATUS: Record<string, { label: string; cls: string }> = {
  present:  { label: 'Present',         cls: 'badge-green' },
  late:     { label: 'Late',            cls: 'badge-yellow' },
  half_day: { label: 'Half day',        cls: 'bg-orange-100 text-orange-800' },
  wfh:      { label: 'Work from home',  cls: 'badge-blue' },
  leave:    { label: 'On leave',        cls: 'bg-violet-100 text-violet-800' },
  holiday:  { label: 'Holiday',         cls: 'bg-slate-100 text-slate-700' },
  week_off: { label: 'Week off',        cls: 'bg-slate-100 text-slate-700' },
  absent:   { label: 'Absent',          cls: 'badge-red' },
};
