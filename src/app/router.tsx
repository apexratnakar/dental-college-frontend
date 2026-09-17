import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { AdminLayout } from '../layouts/AdminLayout';
import { Login } from '../pages/auth/Login';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { ResetPassword } from '../pages/auth/ResetPassword';
import { AdminDashboard } from '../pages/dashboard/AdminDashboard';
import { UserManagement } from '../pages/users/UserManagement';
import { AuditLogsPage } from '../pages/audit/AuditLogsPage';
// Phase 2 — Academic
import { SessionsPage } from '../pages/academic/SessionsPage';
import { CoursesPage } from '../pages/academic/CoursesPage';
import { SectionsPage } from '../pages/academic/SectionsPage';
import { SubjectsPage } from '../pages/academic/SubjectsPage';
import { FacultyPage } from '../pages/faculty/FacultyPage';
import { StudentsPage } from '../pages/students/StudentsPage';
// Phase 3 — Admissions
import { AdmissionsPage } from '../pages/admissions/AdmissionsPage';
import { AdmissionDetailPage } from '../pages/admissions/AdmissionDetailPage';
// Phase 4 — Examinations
import { ExamsPage } from '../pages/examinations/ExamsPage';
import { ExamDetailPage } from '../pages/examinations/ExamDetailPage';
// Phase 5 — Attendance
import { AttendancePage } from '../pages/attendance/AttendancePage';
import { AttendanceMarkPage } from '../pages/attendance/AttendanceMarkPage';
import { AttendanceReportPage } from '../pages/attendance/AttendanceReportPage';
// Phase 6 — Timetable
import { TimetablePage } from '../pages/timetable/TimetablePage';
// Phase 7 — Library
import { LibraryDashboardPage } from '../pages/library/LibraryDashboardPage';
import { LibraryBooksPage } from '../pages/library/LibraryBooksPage';
import { LibraryIssuesPage } from '../pages/library/LibraryIssuesPage';
import { LibraryMembersPage } from '../pages/library/LibraryMembersPage';
import { LibraryFinesPage } from '../pages/library/LibraryFinesPage';
import { LibraryBarcodePage } from '../pages/library/LibraryBarcodePage';
import { LibraryReservationsPage } from '../pages/library/LibraryReservationsPage';
// Timetable enhancement
import { RoomsPage } from '../pages/timetable/RoomsPage';
import { TimeSlotsPage } from '../pages/timetable/TimeSlotsPage';
import { SubjectAllocationsPage } from '../pages/timetable/SubjectAllocationsPage';
import { FacultyTimetablePage } from '../pages/timetable/FacultyTimetablePage';
import { RoomTimetablePage } from '../pages/timetable/RoomTimetablePage';
// Phase 8 — Hostel
import { HostelPage } from '../pages/hostel/HostelPage';
import { HostelDetailPage } from '../pages/hostel/HostelDetailPage';
import { HostelLeaveRequestsPage } from '../pages/hostel/HostelLeaveRequestsPage';
import { HostelVisitorsPage } from '../pages/hostel/HostelVisitorsPage';
import { HostelComplaintsPage } from '../pages/hostel/HostelComplaintsPage';
import { HostelFeePaymentsPage } from '../pages/hostel/HostelFeePaymentsPage';
import { HostelAttendancePage } from '../pages/hostel/HostelAttendancePage';
// Roles & Permissions
import { RolesPage } from '../pages/roles/RolesPage';
// Phase 9 — Fee Management
import { FeeStructurePage } from '../pages/fee/FeeStructurePage';
import { FeePaymentsPage } from '../pages/fee/FeePaymentsPage';
// Phase 10 — Employee Management
import { EmployeesPage } from '../pages/employees/EmployeesPage';
import { EmployeeDetailPage } from '../pages/employees/EmployeeDetailPage';
import { DepartmentsPage } from '../pages/employees/DepartmentsPage';
import { DesignationsPage } from '../pages/employees/DesignationsPage';
// Phase 11 — Payroll Management
import { SalaryComponentsPage } from '../pages/payroll/SalaryComponentsPage';
import { SalaryStructuresPage } from '../pages/payroll/SalaryStructuresPage';
import { EmployeeSalaryPage } from '../pages/payroll/EmployeeSalaryPage';
import { PayrollPage } from '../pages/payroll/PayrollPage';
import { PayslipsPage } from '../pages/payroll/PayslipsPage';
import { SalaryRegisterPage } from '../pages/payroll/SalaryRegisterPage';
import { BankTransferPage } from '../pages/payroll/BankTransferPage';
// Phase 12 — Attendance, Leave, Loans, Separation
import { EmployeeAttendancePage } from '../pages/employees/EmployeeAttendancePage';
import { LeaveTypesPage } from '../pages/leave/LeaveTypesPage';
import { LeaveApplicationsPage } from '../pages/leave/LeaveApplicationsPage';
import { LeaveBalancePage } from '../pages/leave/LeaveBalancePage';
import { LoansPage } from '../pages/loans/LoansPage';
import { SeparationPage } from '../pages/separation/SeparationPage';

// Phase 13 — Store Management
import { StoreDashboardPage } from '../pages/store/StoreDashboardPage';
import { StoreCategoriesPage } from '../pages/store/StoreCategoriesPage';
import { StoreItemsPage } from '../pages/store/StoreItemsPage';
import { StoreVendorsPage } from '../pages/store/StoreVendorsPage';
import { StorePurchaseRequestsPage } from '../pages/store/StorePurchaseRequestsPage';
import { StorePurchaseOrdersPage } from '../pages/store/StorePurchaseOrdersPage';
import { StoreReceiptsPage } from '../pages/store/StoreReceiptsPage';
import { StoreIssuesPage } from '../pages/store/StoreIssuesPage';
import { StoreReturnsPage } from '../pages/store/StoreReturnsPage';
import { StoreTransferPage } from '../pages/store/StoreTransferPage';
import { StoreAdjustmentPage } from '../pages/store/StoreAdjustmentPage';
import { StoreAssetsPage } from '../pages/store/StoreAssetsPage';
import { StoreVerificationPage } from '../pages/store/StoreVerificationPage';
import { StoreLedgerPage } from '../pages/store/StoreLedgerPage';
import { StoreLowStockPage } from '../pages/store/StoreLowStockPage';

// Organization Settings
import { OrganizationSettingsPage } from '../pages/settings/OrganizationSettingsPage';

export const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <Login /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },

  // Protected routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { path: '/', element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <AdminDashboard /> },
          {
            path: '/users',
            element: (
              <ProtectedRoute allowedRoles={['Super Admin', 'Admin']} />
            ),
            children: [{ index: true, element: <UserManagement /> }],
          },
          // Placeholders
          { path: '/roles', element: <RolesPage /> },
          { path: '/audit-logs', element: <AuditLogsPage /> },
          { path: '/profile', element: <div className="p-8 text-slate-500">Profile — coming soon</div> },

          // Phase 2 — Academic Masters
          { path: '/academic/sessions', element: <SessionsPage /> },
          { path: '/academic/courses', element: <CoursesPage /> },
          { path: '/academic/sections', element: <SectionsPage /> },
          { path: '/academic/subjects', element: <SubjectsPage /> },
          { path: '/faculty', element: <FacultyPage /> },
          { path: '/students', element: <StudentsPage /> },

          // Phase 3 — Admissions
          { path: '/admissions', element: <AdmissionsPage /> },
          { path: '/admissions/:id', element: <AdmissionDetailPage /> },

          // Phase 4 — Examinations
          { path: '/examinations', element: <ExamsPage /> },
          { path: '/examinations/:id', element: <ExamDetailPage /> },

          // Phase 5 — Attendance
          { path: '/attendance', element: <AttendancePage /> },
          { path: '/attendance/report', element: <AttendanceReportPage /> },
          { path: '/attendance/:id', element: <AttendanceMarkPage /> },

          // Phase 6 — Timetable (static paths before any future dynamic ones)
          { path: '/timetable',              element: <TimetablePage /> },
          { path: '/timetable/rooms',        element: <RoomsPage /> },
          { path: '/timetable/timeslots',    element: <TimeSlotsPage /> },
          { path: '/timetable/allocations',  element: <SubjectAllocationsPage /> },
          { path: '/timetable/faculty-view', element: <FacultyTimetablePage /> },
          { path: '/timetable/room-view',    element: <RoomTimetablePage /> },

          // Phase 7 — Library
          { path: '/library', element: <LibraryDashboardPage /> },
          { path: '/library/books', element: <LibraryBooksPage /> },
          { path: '/library/issues', element: <LibraryIssuesPage /> },
          { path: '/library/members', element: <LibraryMembersPage /> },
          { path: '/library/fines', element: <LibraryFinesPage /> },
          { path: '/library/reservations', element: <LibraryReservationsPage /> },
          { path: '/library/barcodes', element: <LibraryBarcodePage /> },

          // Phase 8 — Hostel (static paths before dynamic :hostelId)
          { path: '/hostel', element: <HostelPage /> },
          { path: '/hostel/leave-requests', element: <HostelLeaveRequestsPage /> },
          { path: '/hostel/visitors', element: <HostelVisitorsPage /> },
          { path: '/hostel/complaints', element: <HostelComplaintsPage /> },
          { path: '/hostel/fee-payments', element: <HostelFeePaymentsPage /> },
          { path: '/hostel/attendance', element: <HostelAttendancePage /> },
          { path: '/hostel/:hostelId', element: <HostelDetailPage /> },

          // Phase 9 — Fee Management
          { path: '/fee/structures', element: <FeeStructurePage /> },
          { path: '/fee/payments', element: <FeePaymentsPage /> },

          // Phase 10 — Employee Management
          { path: '/employees/departments', element: <DepartmentsPage /> },
          { path: '/employees/designations', element: <DesignationsPage /> },
          { path: '/employees', element: <EmployeesPage /> },
          { path: '/employees/:id', element: <EmployeeDetailPage /> },

          // Phase 11 — Payroll Management
          { path: '/payroll/components', element: <SalaryComponentsPage /> },
          { path: '/payroll/structures', element: <SalaryStructuresPage /> },
          { path: '/payroll/salary', element: <EmployeeSalaryPage /> },
          { path: '/payroll/runs', element: <PayrollPage /> },
          { path: '/payroll/payslips', element: <PayslipsPage /> },
          { path: '/payroll/reports/salary-register', element: <SalaryRegisterPage /> },
          { path: '/payroll/reports/bank-transfer', element: <BankTransferPage /> },

          // Phase 12 — Employee Attendance, Leave, Loans, Separation
          { path: '/employees/attendance', element: <EmployeeAttendancePage /> },
          { path: '/leave/types', element: <LeaveTypesPage /> },
          { path: '/leave/applications', element: <LeaveApplicationsPage /> },
          { path: '/leave/balances', element: <LeaveBalancePage /> },
          { path: '/employees/loans', element: <LoansPage /> },
          { path: '/employees/separation', element: <SeparationPage /> },

          // Phase 13 — Store Management
          { path: '/store', element: <StoreDashboardPage /> },
          { path: '/store/categories', element: <StoreCategoriesPage /> },
          { path: '/store/items', element: <StoreItemsPage /> },
          { path: '/store/vendors', element: <StoreVendorsPage /> },
          { path: '/store/purchase-requests', element: <StorePurchaseRequestsPage /> },
          { path: '/store/purchase-orders', element: <StorePurchaseOrdersPage /> },
          { path: '/store/receipts', element: <StoreReceiptsPage /> },
          { path: '/store/issues', element: <StoreIssuesPage /> },
          { path: '/store/returns', element: <StoreReturnsPage /> },
          { path: '/store/transfers', element: <StoreTransferPage /> },
          { path: '/store/adjustments', element: <StoreAdjustmentPage /> },
          { path: '/store/assets', element: <StoreAssetsPage /> },
          { path: '/store/verification', element: <StoreVerificationPage /> },
          { path: '/store/ledger', element: <StoreLedgerPage /> },
          { path: '/store/low-stock', element: <StoreLowStockPage /> },

          // Organization Settings
          { path: '/settings/organization', element: <OrganizationSettingsPage /> },
        ],
      },
    ],
  },

  { path: '/unauthorized', element: <div className="flex min-h-screen items-center justify-center text-slate-500">Access denied</div> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
