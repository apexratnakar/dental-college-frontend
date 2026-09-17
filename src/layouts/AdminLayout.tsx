import { Fragment, useState } from 'react';
import { NavLink, Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  ChevronLeft,
  ChevronRight,
  Bell,
  LogOut,
  User,
  ChevronDown,
  Menu,
  Shield,
  Search,
  X,
  ClipboardList,
  BookOpen,
  Layers,
  Calendar,
  BookMarked,
  UserCheck,
  UserPlus,
  FileCheck,
  BookOpenCheck,
  FileSignature,
  Award,
  CalendarCheck,
  BarChart3,
  CalendarDays,
  Library,
  BookCopy,
  Building2,
  IndianRupee,
  Receipt,
  Briefcase,
  DollarSign,
  Banknote,
  Calculator,
  LayoutGrid,
  UsersRound,
  Scale,
  Barcode,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Wallet,
  UserMinus,
  PiggyBank,
  Package,
  Tag,
  Truck,
  ShoppingCart,
  PackageCheck,
  PackageOpen,
  Undo2,
  ArrowLeftRight,
  SlidersHorizontal,
  MonitorCheck,
  AlertTriangle,
  CalendarOff,
  Users2,
  AlertCircle,
  CheckSquare,
  BedDouble,
  Clock,
  UserCog,
  Home,
  Maximize2,
  Minimize2,
  Settings,
} from 'lucide-react';
import { cn } from '../utils';
import { useAuth } from '../hooks/useAuth';

interface NavItem {
  label: string;
  to: string;
  /** If defined, active only when current search string matches ('' = no params) */
  matchSearch?: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    heading: 'General',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    heading: 'Administration',
    items: [
      { label: 'Users', to: '/users', icon: Users },
      { label: 'Roles & Permissions', to: '/roles', icon: Shield },
      { label: 'Audit Logs', to: '/audit-logs', icon: ClipboardList },
    ],
  },
  {
    heading: 'Academic',
    items: [
      { label: 'Sessions', to: '/academic/sessions', icon: Calendar },
      { label: 'Courses', to: '/academic/courses', icon: BookOpen },
      { label: 'Sections', to: '/academic/sections', icon: Layers },
      { label: 'Subjects', to: '/academic/subjects', icon: BookMarked },
    ],
  },
  {
    heading: 'People',
    items: [
      { label: 'Faculty', to: '/faculty', icon: UserCheck },
      { label: 'Students', to: '/students', icon: GraduationCap },
      { label: 'Admissions', to: '/admissions', icon: UserPlus },
    ],
  },
  {
    heading: 'Examinations',
    items: [
      { label: 'All Exams',         to: '/examinations',                  matchSearch: '',                icon: FileCheck },
      { label: 'Active Exams',      to: '/examinations?status=open',      matchSearch: 'status=open',     icon: BookOpenCheck },
      { label: 'Grading Queue',     to: '/examinations?status=closed',    matchSearch: 'status=closed',   icon: FileSignature },
      { label: 'Published Results', to: '/examinations?status=published', matchSearch: 'status=published',icon: Award },
    ],
  },
  {
    heading: 'Attendance',
    items: [
      { label: 'Attendance', to: '/attendance', icon: CalendarCheck },
      { label: 'Report', to: '/attendance/report', icon: BarChart3 },
    ],
  },
  {
    heading: 'Timetable',
    items: [
      { label: 'Section Schedule',    to: '/timetable',              icon: CalendarDays },
      { label: 'Rooms & Labs',        to: '/timetable/rooms',        icon: Building2 },
      { label: 'Time Slots',          to: '/timetable/timeslots',    icon: Clock },
      { label: 'Subject Allocation',  to: '/timetable/allocations',  icon: UserCog },
      { label: 'Faculty View',        to: '/timetable/faculty-view', icon: UserCheck },
      { label: 'Room View',           to: '/timetable/room-view',    icon: LayoutGrid },
    ],
  },
  {
    heading: 'Library',
    items: [
      { label: 'Dashboard', to: '/library', icon: LayoutGrid },
      { label: 'Books', to: '/library/books', icon: Library },
      { label: 'Issues & Returns', to: '/library/issues', icon: BookCopy },
      { label: 'Reservations', to: '/library/reservations', icon: CalendarClock },
      { label: 'Members', to: '/library/members', icon: UsersRound },
      { label: 'Fine Rules', to: '/library/fines', icon: Scale },
      { label: 'Barcode Labels', to: '/library/barcodes', icon: Barcode },
    ],
  },
  {
    heading: 'Hostel',
    items: [
      { label: 'Hostels & Rooms', to: '/hostel', icon: Building2 },
      { label: 'Leave & Outing', to: '/hostel/leave-requests', icon: CalendarOff },
      { label: 'Visitors', to: '/hostel/visitors', icon: Users2 },
      { label: 'Complaints', to: '/hostel/complaints', icon: AlertCircle },
      { label: 'Fee Payments', to: '/hostel/fee-payments', icon: BedDouble },
      { label: 'Attendance', to: '/hostel/attendance', icon: CheckSquare },
    ],
  },
  {
    heading: 'Fee Management',
    items: [
      { label: 'Fee Structures', to: '/fee/structures', icon: IndianRupee },
      { label: 'Payments', to: '/fee/payments', icon: Receipt },
    ],
  },
  {
    heading: 'Employee Management',
    items: [
      { label: 'Employees', to: '/employees', icon: Users },
      { label: 'Departments', to: '/employees/departments', icon: Building2 },
      { label: 'Designations', to: '/employees/designations', icon: Briefcase },
      { label: 'Attendance', to: '/employees/attendance', icon: ClipboardCheck },
      { label: 'Loans & Advances', to: '/employees/loans', icon: PiggyBank },
      { label: 'Separation', to: '/employees/separation', icon: UserMinus },
    ],
  },
  {
    heading: 'Leave Management',
    items: [
      { label: 'Leave Types', to: '/leave/types', icon: FileText },
      { label: 'Applications', to: '/leave/applications', icon: CalendarCheck },
      { label: 'Balances', to: '/leave/balances', icon: Wallet },
    ],
  },
  {
    heading: 'Payroll Management',
    items: [
      { label: 'Salary Components', to: '/payroll/components', icon: DollarSign },
      { label: 'Salary Structures', to: '/payroll/structures', icon: Banknote },
      { label: 'Employee Salary', to: '/payroll/salary', icon: IndianRupee },
      { label: 'Payroll Runs', to: '/payroll/runs', icon: Calculator },
      { label: 'Pay Slips', to: '/payroll/payslips', icon: FileText },
      { label: 'Salary Register', to: '/payroll/reports/salary-register', icon: Receipt },
      { label: 'Bank Transfer', to: '/payroll/reports/bank-transfer', icon: Building2 },
    ],
  },
  {
    heading: 'Store Management',
    items: [
      { label: 'Dashboard', to: '/store', icon: LayoutGrid },
      { label: 'Item Master', to: '/store/items', icon: Package },
      { label: 'Categories', to: '/store/categories', icon: Tag },
      { label: 'Vendors', to: '/store/vendors', icon: Truck },
      { label: 'Purchase Requests', to: '/store/purchase-requests', icon: ClipboardList },
      { label: 'Purchase Orders', to: '/store/purchase-orders', icon: ShoppingCart },
      { label: 'Stock Receipt', to: '/store/receipts', icon: PackageCheck },
      { label: 'Stock Issue', to: '/store/issues', icon: PackageOpen },
      { label: 'Stock Return', to: '/store/returns', icon: Undo2 },
      { label: 'Stock Transfer', to: '/store/transfers', icon: ArrowLeftRight },
      { label: 'Stock Adjustment', to: '/store/adjustments', icon: SlidersHorizontal },
      { label: 'Assets', to: '/store/assets', icon: MonitorCheck },
      { label: 'Stock Verification', to: '/store/verification', icon: ClipboardCheck },
      { label: 'Stock Ledger', to: '/store/ledger', icon: BookOpen },
      { label: 'Low Stock', to: '/store/low-stock', icon: AlertTriangle },
    ],
  },
  {
    heading: 'Settings',
    items: [
      { label: 'Organization', to: '/settings/organization', icon: Building2 },
    ],
  },
];

// Maps URL path segments → human-readable labels for breadcrumbs
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'Users',
  roles: 'Roles & Permissions',
  'audit-logs': 'Audit Logs',
  academic: 'Academic',
  sessions: 'Sessions',
  courses: 'Courses',
  sections: 'Sections',
  subjects: 'Subjects',
  faculty: 'Faculty',
  students: 'Students',
  admissions: 'Admissions',
  examinations: 'Examinations',
  attendance: 'Attendance',
  report: 'Report',
  timetable: 'Timetable',
  rooms: 'Rooms & Labs',
  timeslots: 'Time Slots',
  allocations: 'Subject Allocation',
  'faculty-view': 'Faculty View',
  'room-view': 'Room View',
  library: 'Library',
  books: 'Books',
  issues: 'Issues & Returns',
  reservations: 'Reservations',
  members: 'Members',
  fines: 'Fine Rules',
  barcodes: 'Barcode Labels',
  hostel: 'Hostel',
  'leave-requests': 'Leave & Outing',
  visitors: 'Visitors',
  complaints: 'Complaints',
  'fee-payments': 'Fee Payments',
  fee: 'Fee Management',
  structures: 'Structures',
  payments: 'Payments',
  employees: 'Employees',
  departments: 'Departments',
  designations: 'Designations',
  loans: 'Loans & Advances',
  separation: 'Separation',
  leave: 'Leave',
  types: 'Leave Types',
  applications: 'Applications',
  balances: 'Balances',
  payroll: 'Payroll',
  components: 'Components',
  salary: 'Salary',
  runs: 'Payroll Runs',
  payslips: 'Pay Slips',
  reports: 'Reports',
  'salary-register': 'Salary Register',
  'bank-transfer': 'Bank Transfer',
  store: 'Store Management',
  items: 'Item Master',
  categories: 'Categories',
  vendors: 'Vendors',
  'purchase-requests': 'Purchase Requests',
  'purchase-orders': 'Purchase Orders',
  receipts: 'Stock Receipt',
  returns: 'Stock Return',
  transfers: 'Stock Transfer',
  adjustments: 'Stock Adjustment',
  assets: 'Assets',
  verification: 'Stock Verification',
  ledger: 'Stock Ledger',
  'low-stock': 'Low Stock',
  settings: 'Settings',
  organization: 'Organization',
  profile: 'Profile',
};

function useBreadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: { label: string; to: string }[] = [];
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    // Skip purely numeric segments (entity IDs) — they have no meaningful label
    if (/^\d+$/.test(seg)) continue;
    const label = ROUTE_LABELS[seg] ?? seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    const to = '/' + segments.slice(0, i + 1).join('/');
    crumbs.push({ label, to });
  }
  return crumbs;
}

// ── Sidebar (top-level component so React never remounts it on parent re-renders) ──

interface SidebarProps {
  mobile?: boolean;
  collapsed: boolean;
  visibleGroups: NavGroup[];
  navSearch: string;
  setNavSearch: (v: string) => void;
  setMobileOpen: (open: boolean) => void;
  user: ReturnType<typeof useAuth>['user'];
}

function Sidebar({
  mobile = false,
  collapsed,
  visibleGroups,
  navSearch,
  setNavSearch,
  setMobileOpen,
  user,
}: SidebarProps) {
  const { pathname, search } = useLocation();

  const isItemActive = (item: NavItem) => {
    if (item.matchSearch === undefined) return undefined;
    const itemPath = item.to.split('?')[0];
    const expected = item.matchSearch ? `?${item.matchSearch}` : '';
    // For the "no filter" entry (matchSearch=''), also highlight when on a child route (e.g. /examinations/16)
    if (!item.matchSearch && pathname.startsWith(itemPath + '/')) return true;
    return pathname === itemPath && search === expected;
  };

  // Build a set of all base paths so we can detect which items are prefixes of others.
  // Those items need React Router's `end` prop (exact match) to avoid staying
  // active when a sibling child path is selected (e.g. /attendance vs /attendance/report).
  const allBasePaths = visibleGroups.flatMap((g) =>
    g.items.map((i) => i.to.split('?')[0])
  );
  const needsEnd = (itemPath: string) =>
    allBasePaths.some((p) => p !== itemPath && p.startsWith(itemPath + '/'));

  const q = navSearch.trim().toLowerCase();
  const filteredGroups = q
    ? visibleGroups
        .map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) }))
        .filter((g) => g.items.length > 0)
    : visibleGroups;

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-slate-900 text-slate-100',
        mobile ? 'w-72' : collapsed ? 'w-16' : 'w-64',
        'transition-all duration-300'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-600">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        {(!collapsed || mobile) && (
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-white truncate">College Management</p>
            <p className="text-xs text-slate-400">Admin Portal</p>
          </div>
        )}
      </div>

      {/* Search */}
      {(!collapsed || mobile) && (
        <div className="px-3 py-2 border-b border-slate-700/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search menu…"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              className="w-full rounded-md bg-slate-800 py-1.5 pl-8 pr-7 text-xs text-slate-200 placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            />
            {navSearch && (
              <button
                onClick={() => setNavSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-4">
        {filteredGroups.length === 0 && (
          <p className="px-3 text-xs text-slate-500 text-center py-4">
            No results for &ldquo;{navSearch}&rdquo;
          </p>
        )}
        {filteredGroups.map((group) => (
          <div key={group.heading}>
            {(!collapsed || mobile) && (
              <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {group.heading}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={needsEnd(item.to.split('?')[0])}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => {
                    const customActive = isItemActive(item);
                    const active = customActive !== undefined ? customActive : isActive;
                    return cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary-600 text-white'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    );
                  }}
                  title={collapsed && !mobile ? item.label : undefined}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {(!collapsed || mobile) && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User info at bottom */}
      {(!collapsed || mobile) && user && (
        <div className="border-t border-slate-700/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-xs font-semibold text-white">
              {user.first_name[0]}
              {user.last_name?.[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{user.full_name}</p>
              <p className="text-xs text-slate-400 truncate">
                {user.roles[0]?.name ?? 'No role'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main layout ────────────────────────────────────────────────────────────────

export function AdminLayout() {
  const { user, logout, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [navSearch, setNavSearch] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const breadcrumbs = useBreadcrumbs();
  const currentPageTitle = breadcrumbs[breadcrumbs.length - 1]?.label ?? 'Dashboard';

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => !item.roles || hasAnyRole(...item.roles)),
  })).filter((g) => g.items.length > 0);

  const handleLogout = async () => {
    await logout();
  };

  const sidebarProps: SidebarProps = {
    collapsed,
    visibleGroups,
    navSearch,
    setNavSearch,
    setMobileOpen,
    user,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden md:flex relative flex-col">
        <Sidebar {...sidebarProps} />
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-slate-200 text-slate-500 hover:text-slate-700 z-10"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative z-50">
            <Sidebar {...sidebarProps} mobile />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* ── Top header ── */}
        <header className="flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 shadow-sm">

          {/* Left: mobile hamburger + breadcrumbs */}
          <div className="flex items-center gap-2 min-w-0">
            {/* Mobile hamburger */}
            <button
              className="md:hidden rounded-lg p-2 text-slate-500 hover:bg-slate-100 shrink-0"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Mobile: current page title */}
            <span className="md:hidden font-semibold text-slate-800 truncate text-sm">
              {currentPageTitle}
            </span>

            {/* Desktop: breadcrumbs */}
            <nav className="hidden md:flex items-center gap-0.5 text-sm min-w-0">
              <Link
                to="/dashboard"
                className="rounded p-1 text-slate-400 hover:text-primary-600 hover:bg-slate-100 transition-colors shrink-0"
                title="Dashboard"
              >
                <Home className="h-4 w-4" />
              </Link>
              {breadcrumbs.map((crumb, idx) => (
                <Fragment key={crumb.to}>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  {idx === breadcrumbs.length - 1 ? (
                    <span className="font-semibold text-slate-800 truncate max-w-xs px-1">
                      {crumb.label}
                    </span>
                  ) : (
                    <Link
                      to={crumb.to}
                      className="text-slate-500 hover:text-primary-600 truncate max-w-30 px-1 rounded hover:bg-slate-100 transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  )}
                </Fragment>
              ))}
            </nav>
          </div>

          {/* Right: actions + user menu */}
          <div className="flex items-center gap-1 shrink-0">

            {/* Full-screen toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              {isFullscreen
                ? <Minimize2 className="h-4.5 w-4.5" />
                : <Maximize2 className="h-4.5 w-4.5" />}
            </button>

            {/* Notifications */}
            <button
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              title="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
                3
              </span>
            </button>

            {/* Divider */}
            <div className="w-px h-6 bg-slate-200 mx-1" />

            {/* User menu */}
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-lg pl-1 pr-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 transition-colors"
                onClick={() => setUserMenuOpen((v) => !v)}
              >
                {/* Avatar */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary-500 to-primary-700 text-xs font-bold text-white shadow-sm">
                  {user?.first_name[0]}{user?.last_name?.[0]}
                </div>
                {/* Name + role (desktop) */}
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-semibold text-slate-800 leading-tight">{user?.full_name}</p>
                  <p className="text-[10px] text-slate-500 leading-tight">{user?.roles[0]?.name ?? 'No role'}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1.5 z-20 w-56 rounded-xl bg-white shadow-lg ring-1 ring-slate-200 overflow-hidden">
                    {/* User info header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-primary-500 to-primary-700 text-sm font-bold text-white">
                        {user?.first_name[0]}{user?.last_name?.[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{user?.full_name}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email ?? user?.mobile_number}</p>
                      </div>
                    </div>
                    {/* Role badge */}
                    <div className="px-4 py-2 border-b border-slate-100">
                      <span className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary-700">
                        {user?.roles[0]?.name ?? 'No role'}
                      </span>
                    </div>
                    {/* Actions */}
                    <div className="py-1">
                      <button
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => { setUserMenuOpen(false); navigate('/profile'); }}
                      >
                        <User className="h-4 w-4 text-slate-400" />
                        My Profile
                      </button>
                      <button
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        onClick={() => { setUserMenuOpen(false); navigate('/settings/organization'); }}
                      >
                        <Settings className="h-4 w-4 text-slate-400" />
                        Settings
                      </button>
                    </div>
                    <div className="border-t border-slate-100 py-1">
                      <button
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        onClick={handleLogout}
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
