import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Save, BarChart3 } from 'lucide-react';
import api from '../../services/api';
import { PageTitle } from '../../components/common/PageTitle';

type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave' | 'holiday' | 'week_off' | 'late' | 'wfh';

interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department_name: string | null;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: AttendanceStatus;
  remarks: string | null;
}

interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string | null;
  department_name: string | null;
}

interface SummaryRecord {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  department_name: string | null;
  present_days: number;
  absent_days: number;
  late_days: number;
  half_days: number;
  leave_days: number;
  wfh_days: number;
  holiday_days: number;
  week_off_days: number;
  total_marked: number;
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string }[] = [
  { value: 'present',  label: 'Present',  color: 'bg-green-100 text-green-800' },
  { value: 'absent',   label: 'Absent',   color: 'bg-red-100 text-red-800' },
  { value: 'half_day', label: 'Half Day', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'leave',    label: 'Leave',    color: 'bg-purple-100 text-purple-800' },
  { value: 'late',     label: 'Late',     color: 'bg-orange-100 text-orange-800' },
  { value: 'wfh',      label: 'WFH',      color: 'bg-blue-100 text-blue-800' },
  { value: 'holiday',  label: 'Holiday',  color: 'bg-slate-100 text-slate-800' },
  { value: 'week_off', label: 'Week Off', color: 'bg-slate-100 text-slate-600' },
];

function statusColor(s: AttendanceStatus) {
  return STATUS_OPTIONS.find((x) => x.value === s)?.color ?? 'bg-slate-100 text-slate-700';
}

const today = new Date().toISOString().split('T')[0];

export function EmployeeAttendancePage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'daily' | 'summary'>('daily');
  const [selectedDate, setSelectedDate] = useState(today);
  const [deptId, setDeptId] = useState('');
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear());
  const [summaryMonth, setSummaryMonth] = useState(new Date().getMonth() + 1);
  // Local edits: employee_id → row data
  const [edits, setEdits] = useState<Record<number, { status: AttendanceStatus; check_in: string; check_out: string; remarks: string }>>({});

  // Departments
  const { data: departments = [] } = useQuery<{ id: number; name: string }[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/employees/departments?is_active=true').then((r) => r.data),
  });

  // Active employees
  const { data: empData } = useQuery<{ items: Employee[]; total: number }>({
    queryKey: ['employees-list', deptId],
    queryFn: () =>
      api
        .get(`/employees?is_active=true&per_page=200${deptId ? `&department_id=${deptId}` : ''}`)
        .then((r) => r.data),
  });
  const employees: Employee[] = empData?.items ?? [];

  // Existing attendance for the date
  const { data: attendanceData = [], isFetching: loadingAtt } = useQuery<AttendanceRecord[]>({
    queryKey: ['emp-attendance', selectedDate, deptId],
    queryFn: () =>
      api
        .get(`/employees/attendance?date=${selectedDate}${deptId ? `&department_id=${deptId}` : ''}`)
        .then((r) => r.data),
    enabled: tab === 'daily',
  });

  // Summary
  const { data: summaryData = [], isFetching: loadingSummary } = useQuery<SummaryRecord[]>({
    queryKey: ['emp-att-summary', summaryYear, summaryMonth, deptId],
    queryFn: () =>
      api
        .get(`/employees/attendance/summary?year=${summaryYear}&month=${summaryMonth}${deptId ? `&department_id=${deptId}` : ''}`)
        .then((r) => r.data),
    enabled: tab === 'summary',
  });

  // Build initial edits from server data + fill missing employees with "present"
  useEffect(() => {
    const existing: Record<number, AttendanceRecord> = {};
    for (const r of attendanceData) existing[r.employee_id] = r;
    const init: typeof edits = {};
    for (const emp of employees) {
      const ex = existing[emp.id];
      init[emp.id] = {
        status: ex?.status ?? 'present',
        check_in: ex?.check_in ?? '',
        check_out: ex?.check_out ?? '',
        remarks: ex?.remarks ?? '',
      };
    }
    setEdits(init);
  }, [attendanceData, employees]);

  const bulkMutation = useMutation({
    mutationFn: (payload: object) => api.post('/employees/attendance/bulk', payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['emp-attendance'] }),
  });

  const handleSaveAll = () => {
    const records = employees.map((emp) => ({
      employee_id: emp.id,
      status: edits[emp.id]?.status ?? 'present',
      check_in: edits[emp.id]?.check_in || null,
      check_out: edits[emp.id]?.check_out || null,
      remarks: edits[emp.id]?.remarks || null,
    }));
    bulkMutation.mutate({ date: selectedDate, records });
  };

  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  return (
    <div className="space-y-6">
      <PageTitle title="Employee Attendance" subtitle="Mark and track daily attendance" />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setTab('daily')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'daily' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <Calendar className="inline h-4 w-4 mr-1" />
          Daily Attendance
        </button>
        <button
          onClick={() => setTab('summary')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === 'summary' ? 'border-primary-600 text-primary-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          <BarChart3 className="inline h-4 w-4 mr-1" />
          Monthly Summary
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        {tab === 'daily' ? (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
              <input
                type="number"
                value={summaryYear}
                onChange={(e) => setSummaryYear(Number(e.target.value))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
              <select
                value={summaryMonth}
                onChange={(e) => setSummaryMonth(Number(e.target.value))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
              </select>
            </div>
          </>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Department</label>
          <select
            value={deptId}
            onChange={(e) => setDeptId(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </div>

      {/* Daily Attendance Table */}
      {tab === 'daily' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-700">
              {employees.length} employees — {selectedDate}
            </p>
            <button
              onClick={handleSaveAll}
              disabled={bulkMutation.isPending || employees.length === 0}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {bulkMutation.isPending ? 'Saving...' : 'Save All'}
            </button>
          </div>
          {loadingAtt ? (
            <p className="p-8 text-center text-slate-400">Loading...</p>
          ) : employees.length === 0 ? (
            <p className="p-8 text-center text-slate-400">No employees found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Department</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Check In</th>
                    <th className="px-4 py-3 text-left">Check Out</th>
                    <th className="px-4 py-3 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map((emp) => {
                    const row = edits[emp.id] ?? { status: 'present' as AttendanceStatus, check_in: '', check_out: '', remarks: '' };
                    return (
                      <tr key={emp.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-xs text-slate-500">{emp.employee_code}</td>
                        <td className="px-4 py-2 font-medium text-slate-800">{emp.first_name} {emp.last_name ?? ''}</td>
                        <td className="px-4 py-2 text-slate-500">{emp.department_name ?? '—'}</td>
                        <td className="px-4 py-2">
                          <select
                            value={row.status}
                            onChange={(e) =>
                              setEdits((prev) => ({ ...prev, [emp.id]: { ...prev[emp.id], status: e.target.value as AttendanceStatus } }))
                            }
                            className={`rounded-md border-0 px-2 py-1 text-xs font-medium ${statusColor(row.status)} focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer`}
                          >
                            {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="time"
                            value={row.check_in}
                            onChange={(e) => setEdits((prev) => ({ ...prev, [emp.id]: { ...prev[emp.id], check_in: e.target.value } }))}
                            className="rounded border border-slate-200 px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="time"
                            value={row.check_out}
                            onChange={(e) => setEdits((prev) => ({ ...prev, [emp.id]: { ...prev[emp.id], check_out: e.target.value } }))}
                            className="rounded border border-slate-200 px-2 py-1 text-xs w-28 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => setEdits((prev) => ({ ...prev, [emp.id]: { ...prev[emp.id], remarks: e.target.value } }))}
                            placeholder="Optional"
                            className="rounded border border-slate-200 px-2 py-1 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Monthly Summary Table */}
      {tab === 'summary' && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-700">
              Summary — {MONTHS[summaryMonth - 1]} {summaryYear}
            </p>
          </div>
          {loadingSummary ? (
            <p className="p-8 text-center text-slate-400">Loading...</p>
          ) : summaryData.length === 0 ? (
            <p className="p-8 text-center text-slate-400">No attendance records for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Employee</th>
                    <th className="px-4 py-3 text-left">Dept</th>
                    <th className="px-3 py-3 text-center">Present</th>
                    <th className="px-3 py-3 text-center">Absent</th>
                    <th className="px-3 py-3 text-center">Late</th>
                    <th className="px-3 py-3 text-center">Half Day</th>
                    <th className="px-3 py-3 text-center">Leave</th>
                    <th className="px-3 py-3 text-center">WFH</th>
                    <th className="px-3 py-3 text-center">Holiday</th>
                    <th className="px-3 py-3 text-center">Week Off</th>
                    <th className="px-3 py-3 text-center">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summaryData.map((row) => (
                    <tr key={row.employee_id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <p className="font-medium text-slate-800">{row.employee_name}</p>
                        <p className="text-xs text-slate-400">{row.employee_code}</p>
                      </td>
                      <td className="px-4 py-2 text-slate-500">{row.department_name ?? '—'}</td>
                      <td className="px-3 py-2 text-center"><span className="font-medium text-green-700">{row.present_days}</span></td>
                      <td className="px-3 py-2 text-center"><span className="font-medium text-red-600">{row.absent_days}</span></td>
                      <td className="px-3 py-2 text-center text-orange-600">{row.late_days}</td>
                      <td className="px-3 py-2 text-center text-yellow-600">{row.half_days}</td>
                      <td className="px-3 py-2 text-center text-purple-600">{row.leave_days}</td>
                      <td className="px-3 py-2 text-center text-blue-600">{row.wfh_days}</td>
                      <td className="px-3 py-2 text-center text-slate-500">{row.holiday_days}</td>
                      <td className="px-3 py-2 text-center text-slate-400">{row.week_off_days}</td>
                      <td className="px-3 py-2 text-center font-medium text-slate-700">{row.total_marked}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {bulkMutation.isSuccess && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Attendance saved successfully.
        </div>
      )}
      {bulkMutation.isError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          Failed to save attendance. Please try again.
        </div>
      )}
    </div>
  );
}
