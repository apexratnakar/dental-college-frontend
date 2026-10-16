import type { ComponentType } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  Award,
  Banknote,
  BarChart3,
  Barcode,
  BedDouble,
  BookCopy,
  BookMarked,
  BookOpen,
  BookOpenCheck,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarOff,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Clock,
  DollarSign,
  FileCheck,
  FileSignature,
  FileText,
  GraduationCap,
  IndianRupee,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  Library,
  MonitorCheck,
  Package,
  PackageCheck,
  PackageOpen,
  PiggyBank,
  Receipt,
  Scale,
  Shield,
  ShoppingCart,
  SlidersHorizontal,
  Tag,
  Truck,
  Undo2,
  User as UserIcon,
  UserCheck,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  Users2,
  UsersRound,
  Wallet,
} from 'lucide-react';
import { ACCESS, canAccess, type Access } from './access';
import type { User } from '../types';

// Sidebar menu. Each item's `access` decides who sees it (see access.ts);
// the router applies the same rules to block direct URLs.

export interface NavItem {
  label: string;
  to: string;
  /** If defined, active only when current search string matches ('' = no params) */
  matchSearch?: string;
  icon: ComponentType<{ className?: string }>;
  /** Who sees this menu item — see app/access.ts. Omitted = everyone. */
  access?: Access;
}

export interface NavGroup {
  heading: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'General',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    heading: 'My Portal',
    items: [
      { label: 'My Profile',    to: '/my/profile',    icon: UserIcon,          access: ACCESS.student },
      { label: 'My Timetable',  to: '/my/timetable',  icon: CalendarDays,  access: ACCESS.student },
      { label: 'My Attendance', to: '/my/attendance', icon: CalendarCheck, access: ACCESS.student },
      { label: 'My Exams',      to: '/my/exams',      icon: FileCheck,     access: ACCESS.student },
      { label: 'My Results',    to: '/my/results',    icon: Award,         access: ACCESS.student },
      { label: 'My Fees',       to: '/my/fees',       icon: Receipt,       access: ACCESS.student },
      { label: 'My Library',    to: '/my/library',    icon: BookCopy,      access: ACCESS.student },
      { label: 'My Hostel',     to: '/my/hostel',     icon: BedDouble,     access: ACCESS.student },
    ],
  },
  {
    heading: 'My Workspace',
    items: [
      { label: 'My Attendance', to: '/my/work-attendance', icon: ClipboardCheck, access: ACCESS.employee },
      { label: 'My Leave',    to: '/my/leave',    icon: CalendarCheck, access: ACCESS.employee },
      { label: 'My Payslips', to: '/my/payslips', icon: FileText,      access: ACCESS.employee },
      { label: 'My Salary',   to: '/my/salary',   icon: Wallet,        access: ACCESS.employee },
    ],
  },
  {
    heading: 'Administration',
    items: [
      { label: 'Users', to: '/users', icon: Users, access: ACCESS.users },
      { label: 'Roles & Permissions', to: '/roles', icon: Shield, access: ACCESS.roles },
      { label: 'Audit Logs', to: '/audit-logs', icon: ClipboardList, access: ACCESS.auditLogs },
    ],
  },
  {
    heading: 'Academic',
    items: [
      { label: 'Sessions', to: '/academic/sessions', icon: Calendar, access: ACCESS.sessions },
      { label: 'Courses', to: '/academic/courses', icon: BookOpen, access: ACCESS.courses },
      { label: 'Sections', to: '/academic/sections', icon: Layers, access: ACCESS.sections },
      { label: 'Subjects', to: '/academic/subjects', icon: BookMarked, access: ACCESS.subjects },
    ],
  },
  {
    heading: 'People',
    items: [
      { label: 'Faculty', to: '/faculty', icon: UserCheck, access: ACCESS.faculty },
      { label: 'Students', to: '/students', icon: GraduationCap, access: ACCESS.students },
      { label: 'Admissions', to: '/admissions', icon: UserPlus, access: ACCESS.admissions },
    ],
  },
  {
    heading: 'Examinations',
    items: [
      { label: 'All Exams',         to: '/examinations',                  matchSearch: '',                icon: FileCheck,     access: ACCESS.exams },
      { label: 'Active Exams',      to: '/examinations?status=open',      matchSearch: 'status=open',     icon: BookOpenCheck, access: ACCESS.exams },
      { label: 'Grading Queue',     to: '/examinations?status=closed',    matchSearch: 'status=closed',   icon: FileSignature, access: ACCESS.exams },
      { label: 'Published Results', to: '/examinations?status=published', matchSearch: 'status=published',icon: Award,         access: ACCESS.exams },
    ],
  },
  {
    heading: 'Attendance',
    items: [
      { label: 'Attendance', to: '/attendance', icon: CalendarCheck, access: ACCESS.attendance },
      { label: 'Report', to: '/attendance/report', icon: BarChart3, access: ACCESS.attendanceReport },
    ],
  },
  {
    heading: 'Timetable',
    items: [
      { label: 'Section Schedule',    to: '/timetable',              icon: CalendarDays, access: ACCESS.timetableView },
      { label: 'Rooms & Labs',        to: '/timetable/rooms',        icon: Building2,    access: ACCESS.timetableManage },
      { label: 'Time Slots',          to: '/timetable/timeslots',    icon: Clock,        access: ACCESS.timetableManage },
      { label: 'Subject Allocation',  to: '/timetable/allocations',  icon: UserCog,      access: ACCESS.timetableManage },
      { label: 'Faculty View',        to: '/timetable/faculty-view', icon: UserCheck,    access: ACCESS.timetableView },
      { label: 'Room View',           to: '/timetable/room-view',    icon: LayoutGrid,   access: ACCESS.timetableView },
    ],
  },
  {
    heading: 'Library',
    items: [
      { label: 'Dashboard', to: '/library', icon: LayoutGrid, access: ACCESS.library },
      { label: 'Books', to: '/library/books', icon: Library, access: ACCESS.library },
      { label: 'Issues & Returns', to: '/library/issues', icon: BookCopy, access: ACCESS.library },
      { label: 'Reservations', to: '/library/reservations', icon: CalendarClock, access: ACCESS.library },
      { label: 'Members', to: '/library/members', icon: UsersRound, access: ACCESS.libraryMembers },
      { label: 'Fine Rules', to: '/library/fines', icon: Scale, access: ACCESS.libraryFines },
      { label: 'Barcode Labels', to: '/library/barcodes', icon: Barcode, access: ACCESS.libraryBarcodes },
    ],
  },
  {
    heading: 'Hostel',
    items: [
      { label: 'Hostels & Rooms', to: '/hostel', icon: Building2, access: ACCESS.hostelManage },
      { label: 'Leave & Outing', to: '/hostel/leave-requests', icon: CalendarOff, access: ACCESS.hostelGate },
      { label: 'Visitors', to: '/hostel/visitors', icon: Users2, access: ACCESS.hostelGate },
      { label: 'Complaints', to: '/hostel/complaints', icon: AlertCircle, access: ACCESS.hostelComplaints },
      { label: 'Fee Payments', to: '/hostel/fee-payments', icon: BedDouble, access: ACCESS.hostelFees },
      { label: 'Attendance', to: '/hostel/attendance', icon: CheckSquare, access: ACCESS.hostelAttendance },
    ],
  },
  {
    heading: 'Fee Management',
    items: [
      { label: 'Fee Structures', to: '/fee/structures', icon: IndianRupee, access: ACCESS.fee },
      { label: 'Payments', to: '/fee/payments', icon: Receipt, access: ACCESS.fee },
    ],
  },
  {
    heading: 'Employee Management',
    items: [
      { label: 'Employees', to: '/employees', icon: Users, access: ACCESS.employees },
      { label: 'Departments', to: '/employees/departments', icon: Building2, access: ACCESS.employees },
      { label: 'Designations', to: '/employees/designations', icon: Briefcase, access: ACCESS.employees },
      { label: 'Attendance', to: '/employees/attendance', icon: ClipboardCheck, access: ACCESS.empAttendance },
      { label: 'Loans & Advances', to: '/employees/loans', icon: PiggyBank, access: ACCESS.loans },
      { label: 'Separation', to: '/employees/separation', icon: UserMinus, access: ACCESS.separation },
    ],
  },
  {
    heading: 'Leave Management',
    items: [
      { label: 'Leave Types', to: '/leave/types', icon: FileText, access: ACCESS.leaveTypes },
      { label: 'Applications', to: '/leave/applications', icon: CalendarCheck, access: ACCESS.leaveApplications },
      { label: 'Balances', to: '/leave/balances', icon: Wallet, access: ACCESS.leaveBalances },
    ],
  },
  {
    heading: 'Payroll Management',
    items: [
      { label: 'Salary Components', to: '/payroll/components', icon: DollarSign, access: ACCESS.payrollSetup },
      { label: 'Salary Structures', to: '/payroll/structures', icon: Banknote, access: ACCESS.payrollSetup },
      { label: 'Employee Salary', to: '/payroll/salary', icon: IndianRupee, access: ACCESS.payrollSetup },
      { label: 'Payroll Runs', to: '/payroll/runs', icon: Calculator, access: ACCESS.payroll },
      { label: 'Pay Slips', to: '/payroll/payslips', icon: FileText, access: ACCESS.payroll },
      { label: 'Salary Register', to: '/payroll/reports/salary-register', icon: Receipt, access: ACCESS.payroll },
      { label: 'Bank Transfer', to: '/payroll/reports/bank-transfer', icon: Building2, access: ACCESS.payroll },
    ],
  },
  {
    heading: 'Store Management',
    items: [
      { label: 'Dashboard', to: '/store', icon: LayoutGrid, access: ACCESS.store },
      { label: 'Item Master', to: '/store/items', icon: Package, access: ACCESS.storeMasters },
      { label: 'Categories', to: '/store/categories', icon: Tag, access: ACCESS.storeMasters },
      { label: 'Vendors', to: '/store/vendors', icon: Truck, access: ACCESS.storeMasters },
      { label: 'Purchase Requests', to: '/store/purchase-requests', icon: ClipboardList, access: ACCESS.storePR },
      { label: 'Purchase Orders', to: '/store/purchase-orders', icon: ShoppingCart, access: ACCESS.storePO },
      { label: 'Stock Receipt', to: '/store/receipts', icon: PackageCheck, access: ACCESS.storeReceipts },
      { label: 'Stock Issue', to: '/store/issues', icon: PackageOpen, access: ACCESS.storeIssues },
      { label: 'Stock Return', to: '/store/returns', icon: Undo2, access: ACCESS.storeReturns },
      { label: 'Stock Transfer', to: '/store/transfers', icon: ArrowLeftRight, access: ACCESS.storeTransfers },
      { label: 'Stock Adjustment', to: '/store/adjustments', icon: SlidersHorizontal, access: ACCESS.storeAdjustments },
      { label: 'Assets', to: '/store/assets', icon: MonitorCheck, access: ACCESS.storeAssets },
      { label: 'Stock Verification', to: '/store/verification', icon: ClipboardCheck, access: ACCESS.storeVerify },
      { label: 'Stock Ledger', to: '/store/ledger', icon: BookOpen, access: ACCESS.storeLedger },
      { label: 'Low Stock', to: '/store/low-stock', icon: AlertTriangle, access: ACCESS.store },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { label: 'Organization', to: '/settings/organization', icon: Building2, access: ACCESS.orgSettings },
    ],
  },
];

/** Menu groups with only the items this user may open; empty groups removed. */
export function visibleNavGroups(user: User | null | undefined): NavGroup[] {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => canAccess(user, item.access)),
  })).filter((g) => g.items.length > 0);
}
