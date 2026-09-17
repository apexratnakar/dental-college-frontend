import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, User, Building2, FileText, IndianRupee, X } from 'lucide-react';
import { employeeApi, payrollApi } from '../../services/api';
import type { Employee, EmployeeSalaryStructure, PayrollEmployeeRecord } from '../../types';
import { getErrorMessage } from '../../types';

type Tab = 'personal' | 'documents' | 'salary';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  on_leave: 'bg-yellow-100 text-yellow-700',
  resigned: 'bg-red-100 text-red-700',
  terminated: 'bg-red-100 text-red-700',
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="mt-0.5 text-sm text-slate-900">{value || '—'}</p>
    </div>
  );
}

export function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const empId = Number(id);

  const [tab, setTab] = useState<Tab>('personal');
  const [error, setError] = useState('');

  const { data: emp, isLoading } = useQuery<Employee>({
    queryKey: ['employee', empId],
    queryFn: () => employeeApi.getEmployee(empId).then((r: { data: Employee }) => r.data),
    enabled: !isNaN(empId),
  });

  const { data: salaryHistory } = useQuery<EmployeeSalaryStructure[]>({
    queryKey: ['emp-salary', empId],
    queryFn: () => payrollApi.listSalaryAssignments({ employee_id: empId }).then((r: { data: EmployeeSalaryStructure[] }) => r.data),
    enabled: tab === 'salary' && !isNaN(empId),
  });

  const { data: payrollHistory } = useQuery<PayrollEmployeeRecord[]>({
    queryKey: ['emp-payroll-history', empId],
    queryFn: () => payrollApi.getEmployeeHistory(empId).then((r: { data: PayrollEmployeeRecord[] }) => r.data),
    enabled: tab === 'salary' && !isNaN(empId),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: number) => employeeApi.deleteDocument(empId, docId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee', empId] }),
    onError: (err) => setError(getErrorMessage(err)),
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Loading...</div>;
  }
  if (!emp) {
    return <div className="text-center py-16 text-slate-500">Employee not found.</div>;
  }

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'personal', label: 'Personal Info', icon: User },
    { key: 'documents', label: 'Documents', icon: FileText },
    { key: 'salary', label: 'Salary & Payroll', icon: IndianRupee },
  ];
  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/employees')} className="mt-1 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {emp.first_name} {emp.last_name ?? ''}
            </h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[emp.status] ?? 'bg-slate-100 text-slate-600'}`}>
              {emp.status.replace('_', ' ')}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
            <span className="font-mono">{emp.employee_code}</span>
            {emp.department_name && <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5" />{emp.department_name}</span>}
            {emp.designation_name && <span>{emp.designation_name}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'personal' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Date of Birth" value={emp.date_of_birth} />
              <Field label="Gender" value={emp.gender} />
              <Field label="Mobile" value={emp.mobile} />
              <Field label="Personal Email" value={emp.personal_email} />
              <Field label="Official Email" value={emp.official_email} />
              <Field label="Country" value={emp.country} />
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <Field label="Address" value={[emp.address_line1, emp.address_line2, emp.city, emp.state, emp.pin_code].filter(Boolean).join(', ')} />
            </div>
          </div>
          {/* Employment */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Employment Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Category" value={emp.category} />
              <Field label="Employment Type" value={emp.employment_type.replace('_', ' ')} />
              <Field label="Date of Joining" value={emp.date_of_joining} />
              <Field label="Probation End" value={emp.probation_end_date} />
              <Field label="Confirmation Date" value={emp.confirmation_date} />
              <Field label="Date of Leaving" value={emp.date_of_leaving} />
              <Field label="Reporting Manager" value={emp.reporting_manager_name} />
            </div>
          </div>
          {/* Qualification */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Qualification & Experience</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Highest Qualification" value={emp.highest_qualification} />
              <Field label="Specialization" value={emp.specialization} />
              <Field label="Experience (Years)" value={emp.experience_years?.toString()} />
            </div>
          </div>
          {/* Statutory */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Statutory & Bank Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="PAN" value={emp.pan_number} />
              <Field label="Aadhaar (Last 4)" value={emp.aadhaar_last4} />
              <Field label="PF Account" value={emp.pf_account_number} />
              <Field label="ESI Number" value={emp.esi_number} />
              <Field label="UAN" value={emp.uan_number} />
              <Field label="Bank" value={emp.bank_name} />
              <Field label="Account No." value={emp.bank_account_number} />
              <Field label="IFSC" value={emp.bank_ifsc} />
              <Field label="Branch" value={emp.bank_branch} />
            </div>
          </div>
        </div>
      )}

      {tab === 'documents' && (
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900">Documents</h3>
          </div>
          {error && <p className="px-6 py-2 text-sm text-red-600">{error}</p>}
          {emp.documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400">
              <FileText className="h-8 w-8 mb-2" />
              <p>No documents uploaded</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Document Name</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Type</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Verified</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {emp.documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium">{doc.document_name}</td>
                    <td className="px-6 py-3 text-slate-500">{doc.document_type.replace('_', ' ')}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${doc.is_verified ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {doc.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => deleteDocMutation.mutate(doc.id)}
                        disabled={deleteDocMutation.isPending}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'salary' && (
        <div className="space-y-6">
          {/* Current salary structure */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Salary Structure Assignments</h3>
            </div>
            {!salaryHistory || salaryHistory.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No salary structure assigned</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Structure</th>
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Effective From</th>
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Basic Monthly</th>
                    <th className="text-left px-6 py-3 font-medium text-slate-600">CTC Annual</th>
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Current</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salaryHistory.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-medium">{s.structure_name}</td>
                      <td className="px-6 py-3 text-slate-500">{s.effective_from}</td>
                      <td className="px-6 py-3">₹{s.basic_monthly?.toLocaleString('en-IN') ?? '—'}</td>
                      <td className="px-6 py-3">₹{s.ctc_annual?.toLocaleString('en-IN') ?? '—'}</td>
                      <td className="px-6 py-3">
                        {s.is_current && <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">Current</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {/* Payroll history */}
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Payroll History</h3>
            </div>
            {!payrollHistory || payrollHistory.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No payroll records yet</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Payslip</th>
                    <th className="text-right px-6 py-3 font-medium text-slate-600">Gross</th>
                    <th className="text-right px-6 py-3 font-medium text-slate-600">Deductions</th>
                    <th className="text-right px-6 py-3 font-medium text-slate-600">Net</th>
                    <th className="text-left px-6 py-3 font-medium text-slate-600">Days Present</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payrollHistory.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-mono text-xs">{r.payslip_number ?? '—'}</td>
                      <td className="px-6 py-3 text-right">₹{r.gross_salary.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-3 text-right text-red-600">₹{r.total_deductions.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-3 text-right font-semibold text-green-700">₹{r.net_salary.toLocaleString('en-IN')}</td>
                      <td className="px-6 py-3">{r.days_present} / {r.total_working_days}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

