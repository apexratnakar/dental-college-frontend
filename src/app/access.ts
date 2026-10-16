import type { User } from '../types';

/**
 * Who may open a screen. Used by both the sidebar (to hide menus) and the
 * router (to block direct URLs), so the two always agree.
 *   perms   – user needs at least ONE of these permissions
 *   student – user must be linked to a student record (My Portal pages)
 * No access rule = every logged-in user.
 */
export interface Access {
  perms?: string[];
  student?: boolean;
  /** user must be linked to an employee record (My Workspace pages) */
  employee?: boolean;
}

export function canAccess(user: User | null | undefined, access?: Access): boolean {
  if (!access) return true;
  if (!user) return false;
  if (access.student) return !!user.student_id;
  if (access.employee) return !!user.employee_id;
  if (access.perms) {
    const granted = user.permissions ?? [];
    return access.perms.some((p) => granted.includes(p));
  }
  return true;
}

const any = (...perms: string[]): Access => ({ perms });

// Screens that are staff tools use "manage" permissions, so roles that only
// hold a read permission for lookups (e.g. teachers reading the faculty list
// for timetable names) don't get the admin screen in their menu.
export const ACCESS = {
  // Administration
  users:        any('users:create', 'users:update', 'users:block'),
  roles:        any('permissions:read'),
  auditLogs:    any('audit_logs:read'),
  orgSettings:  any('settings:update'),

  // Academic masters
  sessions:     any('sessions:create', 'sessions:update'),
  courses:      any('courses:create', 'courses:update'),
  sections:     any('sections:create', 'sections:update'),
  subjects:     any('subjects:create', 'subjects:update'),

  // People — admissions:read marks academic administration (Admin, Principal, VP)
  faculty:      any('faculty:create', 'faculty:update', 'admissions:read'),
  students:     any('students:update', 'attendance:mark', 'admissions:read'),
  admissions:   any('admissions:read'),

  // Examinations — any exam duty (not plain exams:read)
  exams:        any('exams:create', 'exams:update', 'exams:register', 'exams:marks_entry',
                    'exams:verify', 'exams:result_publish', 'exams:admit_card'),

  // Attendance
  attendance:       any('attendance:mark', 'attendance:report'),
  attendanceReport: any('attendance:report'),

  // Timetable
  timetableView:   any('schedule:read'),
  timetableManage: any('schedule:create', 'schedule:update'),

  // Library
  library:          any('library:read'),
  libraryMembers:   any('library:member'),
  libraryFines:     any('library:fine'),
  libraryBarcodes:  any('library:create'),

  // Hostel
  hostelManage:     any('hostel:create', 'hostel:update', 'hostel:reports'),
  hostelGate:       any('hostel:read'),                       // leave/outing + visitors (incl. Guard)
  hostelComplaints: any('hostel:update', 'hostel:reports'),
  hostelFees:       any('hostel:create', 'hostel:reports'),
  hostelAttendance: any('hostel:attendance', 'hostel:reports'),

  // Fee
  fee:              any('fee:read'),

  // HR
  employees:        any('employees:read'),
  empAttendance:    any('emp_attendance:read'),
  loans:            any('loans:read', 'advances:read'),
  separation:       any('separation:read'),
  leaveTypes:       any('leave_types:read'),
  leaveApplications: any('leave:read'),
  leaveBalances:    any('leave_balance:read'),

  // Payroll
  payrollSetup:     any('payroll:create', 'payroll:update'),
  payroll:          any('payroll:read'),

  // Store
  store:            any('store:read'),
  storeMasters:     any('store:create', 'store:update'),
  storePR:          any('store:purchase_request'),
  storePO:          any('store:purchase_order'),
  storeReceipts:    any('store:receive'),
  storeIssues:      any('store:issue'),
  storeReturns:     any('store:return'),
  storeTransfers:   any('store:transfer'),
  storeAdjustments: any('store:adjust'),
  storeAssets:      any('store:asset'),
  storeVerify:      any('store:verify'),
  storeLedger:      any('store:reports'),

  // Student self-service
  student:          { student: true } as Access,
  // Employee self-service
  employee:         { employee: true } as Access,
} satisfies Record<string, Access>;
