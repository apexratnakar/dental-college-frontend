import type { ReactElement } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { RequireAccess } from '../components/common/RequireAccess';
import { ACCESS, type Access } from './access';
import { AdminLayout } from '../layouts/AdminLayout';
import { Login } from '../pages/auth/Login';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { ResetPassword } from '../pages/auth/ResetPassword';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
// Student self-service
import { MyProfilePage } from '../pages/my/MyProfilePage';
import { MyTimetablePage } from '../pages/my/MyTimetablePage';
import { MyAttendancePage } from '../pages/my/MyAttendancePage';
import { MyExamsPage } from '../pages/my/MyExamsPage';
import { MyResultsPage } from '../pages/my/MyResultsPage';
import { MyFeesPage } from '../pages/my/MyFeesPage';
import { MyLibraryPage } from '../pages/my/MyLibraryPage';
import { MyHostelPage } from '../pages/my/MyHostelPage';
import { MyLeavePage } from '../pages/my/MyLeavePage';
import { MyWorkAttendancePage } from '../pages/my/MyWorkAttendancePage';
import { MyPayslipsPage } from '../pages/my/MyPayslipsPage';
import { MySalaryPage } from '../pages/my/MySalaryPage';
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

const guard = (access: Access, element: ReactElement) => (
  <RequireAccess access={access}>{element}</RequireAccess>
);

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
          { path: '/dashboard', element: <DashboardPage /> },

          // Student self-service — only the logged-in student's own data
          { path: '/my/profile',    element: guard(ACCESS.student, <MyProfilePage />) },
          { path: '/my/timetable',  element: guard(ACCESS.student, <MyTimetablePage />) },
          { path: '/my/attendance', element: guard(ACCESS.student, <MyAttendancePage />) },
          { path: '/my/exams',      element: guard(ACCESS.student, <MyExamsPage />) },
          { path: '/my/results',    element: guard(ACCESS.student, <MyResultsPage />) },
          { path: '/my/fees',       element: guard(ACCESS.student, <MyFeesPage />) },
          { path: '/my/library',    element: guard(ACCESS.student, <MyLibraryPage />) },
          { path: '/my/hostel',     element: guard(ACCESS.student, <MyHostelPage />) },

          // Employee self-service — only the logged-in employee's own records
          { path: '/my/work-attendance', element: guard(ACCESS.employee, <MyWorkAttendancePage />) },
          { path: '/my/leave',      element: guard(ACCESS.employee, <MyLeavePage />) },
          { path: '/my/payslips',   element: guard(ACCESS.employee, <MyPayslipsPage />) },
          { path: '/my/salary',     element: guard(ACCESS.employee, <MySalaryPage />) },
          { path: '/users', element: guard(ACCESS.users, <UserManagement />) },
          // Placeholders
          { path: '/roles', element: guard(ACCESS.roles, <RolesPage />) },
          { path: '/audit-logs', element: guard(ACCESS.auditLogs, <AuditLogsPage />) },
          { path: '/profile', element: <div className="p-8 text-slate-500">Profile — coming soon</div> },

          // Phase 2 — Academic Masters
          { path: '/academic/sessions', element: guard(ACCESS.sessions, <SessionsPage />) },
          { path: '/academic/courses', element: guard(ACCESS.courses, <CoursesPage />) },
          { path: '/academic/sections', element: guard(ACCESS.sections, <SectionsPage />) },
          { path: '/academic/subjects', element: guard(ACCESS.subjects, <SubjectsPage />) },
          { path: '/faculty', element: guard(ACCESS.faculty, <FacultyPage />) },
          { path: '/students', element: guard(ACCESS.students, <StudentsPage />) },

          // Phase 3 — Admissions
          { path: '/admissions', element: guard(ACCESS.admissions, <AdmissionsPage />) },
          { path: '/admissions/:id', element: guard(ACCESS.admissions, <AdmissionDetailPage />) },

          // Phase 4 — Examinations
          { path: '/examinations', element: guard(ACCESS.exams, <ExamsPage />) },
          { path: '/examinations/:id', element: guard(ACCESS.exams, <ExamDetailPage />) },

          // Phase 5 — Attendance
          { path: '/attendance', element: guard(ACCESS.attendance, <AttendancePage />) },
          { path: '/attendance/report', element: guard(ACCESS.attendanceReport, <AttendanceReportPage />) },
          { path: '/attendance/:id', element: guard(ACCESS.attendance, <AttendanceMarkPage />) },

          // Phase 6 — Timetable (static paths before any future dynamic ones)
          { path: '/timetable',              element: guard(ACCESS.timetableView, <TimetablePage />) },
          { path: '/timetable/rooms',        element: guard(ACCESS.timetableManage, <RoomsPage />) },
          { path: '/timetable/timeslots',    element: guard(ACCESS.timetableManage, <TimeSlotsPage />) },
          { path: '/timetable/allocations',  element: guard(ACCESS.timetableManage, <SubjectAllocationsPage />) },
          { path: '/timetable/faculty-view', element: guard(ACCESS.timetableView, <FacultyTimetablePage />) },
          { path: '/timetable/room-view',    element: guard(ACCESS.timetableView, <RoomTimetablePage />) },

          // Phase 7 — Library
          { path: '/library', element: guard(ACCESS.library, <LibraryDashboardPage />) },
          { path: '/library/books', element: guard(ACCESS.library, <LibraryBooksPage />) },
          { path: '/library/issues', element: guard(ACCESS.library, <LibraryIssuesPage />) },
          { path: '/library/members', element: guard(ACCESS.libraryMembers, <LibraryMembersPage />) },
          { path: '/library/fines', element: guard(ACCESS.libraryFines, <LibraryFinesPage />) },
          { path: '/library/reservations', element: guard(ACCESS.library, <LibraryReservationsPage />) },
          { path: '/library/barcodes', element: guard(ACCESS.libraryBarcodes, <LibraryBarcodePage />) },

          // Phase 8 — Hostel (static paths before dynamic :hostelId)
          { path: '/hostel', element: guard(ACCESS.hostelManage, <HostelPage />) },
          { path: '/hostel/leave-requests', element: guard(ACCESS.hostelGate, <HostelLeaveRequestsPage />) },
          { path: '/hostel/visitors', element: guard(ACCESS.hostelGate, <HostelVisitorsPage />) },
          { path: '/hostel/complaints', element: guard(ACCESS.hostelComplaints, <HostelComplaintsPage />) },
          { path: '/hostel/fee-payments', element: guard(ACCESS.hostelFees, <HostelFeePaymentsPage />) },
          { path: '/hostel/attendance', element: guard(ACCESS.hostelAttendance, <HostelAttendancePage />) },
          { path: '/hostel/:hostelId', element: guard(ACCESS.hostelManage, <HostelDetailPage />) },

          // Phase 9 — Fee Management
          { path: '/fee/structures', element: guard(ACCESS.fee, <FeeStructurePage />) },
          { path: '/fee/payments', element: guard(ACCESS.fee, <FeePaymentsPage />) },

          // Phase 10 — Employee Management
          { path: '/employees/departments', element: guard(ACCESS.employees, <DepartmentsPage />) },
          { path: '/employees/designations', element: guard(ACCESS.employees, <DesignationsPage />) },
          { path: '/employees', element: guard(ACCESS.employees, <EmployeesPage />) },
          { path: '/employees/:id', element: guard(ACCESS.employees, <EmployeeDetailPage />) },

          // Phase 11 — Payroll Management
          { path: '/payroll/components', element: guard(ACCESS.payrollSetup, <SalaryComponentsPage />) },
          { path: '/payroll/structures', element: guard(ACCESS.payrollSetup, <SalaryStructuresPage />) },
          { path: '/payroll/salary', element: guard(ACCESS.payrollSetup, <EmployeeSalaryPage />) },
          { path: '/payroll/runs', element: guard(ACCESS.payroll, <PayrollPage />) },
          { path: '/payroll/payslips', element: guard(ACCESS.payroll, <PayslipsPage />) },
          { path: '/payroll/reports/salary-register', element: guard(ACCESS.payroll, <SalaryRegisterPage />) },
          { path: '/payroll/reports/bank-transfer', element: guard(ACCESS.payroll, <BankTransferPage />) },

          // Phase 12 — Employee Attendance, Leave, Loans, Separation
          { path: '/employees/attendance', element: guard(ACCESS.empAttendance, <EmployeeAttendancePage />) },
          { path: '/leave/types', element: guard(ACCESS.leaveTypes, <LeaveTypesPage />) },
          { path: '/leave/applications', element: guard(ACCESS.leaveApplications, <LeaveApplicationsPage />) },
          { path: '/leave/balances', element: guard(ACCESS.leaveBalances, <LeaveBalancePage />) },
          { path: '/employees/loans', element: guard(ACCESS.loans, <LoansPage />) },
          { path: '/employees/separation', element: guard(ACCESS.separation, <SeparationPage />) },

          // Phase 13 — Store Management
          { path: '/store', element: guard(ACCESS.store, <StoreDashboardPage />) },
          { path: '/store/categories', element: guard(ACCESS.storeMasters, <StoreCategoriesPage />) },
          { path: '/store/items', element: guard(ACCESS.storeMasters, <StoreItemsPage />) },
          { path: '/store/vendors', element: guard(ACCESS.storeMasters, <StoreVendorsPage />) },
          { path: '/store/purchase-requests', element: guard(ACCESS.storePR, <StorePurchaseRequestsPage />) },
          { path: '/store/purchase-orders', element: guard(ACCESS.storePO, <StorePurchaseOrdersPage />) },
          { path: '/store/receipts', element: guard(ACCESS.storeReceipts, <StoreReceiptsPage />) },
          { path: '/store/issues', element: guard(ACCESS.storeIssues, <StoreIssuesPage />) },
          { path: '/store/returns', element: guard(ACCESS.storeReturns, <StoreReturnsPage />) },
          { path: '/store/transfers', element: guard(ACCESS.storeTransfers, <StoreTransferPage />) },
          { path: '/store/adjustments', element: guard(ACCESS.storeAdjustments, <StoreAdjustmentPage />) },
          { path: '/store/assets', element: guard(ACCESS.storeAssets, <StoreAssetsPage />) },
          { path: '/store/verification', element: guard(ACCESS.storeVerify, <StoreVerificationPage />) },
          { path: '/store/ledger', element: guard(ACCESS.storeLedger, <StoreLedgerPage />) },
          { path: '/store/low-stock', element: guard(ACCESS.store, <StoreLowStockPage />) },

          // Organization Settings
          { path: '/settings/organization', element: guard(ACCESS.orgSettings, <OrganizationSettingsPage />) },
        ],
      },
    ],
  },

  { path: '/unauthorized', element: <div className="flex min-h-screen items-center justify-center text-slate-500">Access denied</div> },
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);
