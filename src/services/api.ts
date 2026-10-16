import axios from 'axios';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { TokenResponse } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

// ── Token storage helpers ─────────────────────────────────────────────────────

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setTokens: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

// ── Axios instance ────────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Attach access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = tokenStorage.getAccess();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Refresh token logic ───────────────────────────────────────────────────────

let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = tokenStorage.getRefresh();
      if (!refreshToken) {
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise<string>((resolve) => {
          refreshQueue.push(resolve);
        }).then((token) => {
          if (original.headers) {
            original.headers.Authorization = `Bearer ${token}`;
          }
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post<TokenResponse>(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        tokenStorage.setTokens(data.access_token, data.refresh_token);
        onRefreshed(data.access_token);
        if (original.headers) {
          original.headers.Authorization = `Bearer ${data.access_token}`;
        }
        return api(original);
      } catch {
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── API functions ─────────────────────────────────────────────────────────────

export const authApi = {
  login: (identifier: string, password: string) =>
    api.post<TokenResponse>('/auth/login', { identifier, password }),

  logout: (refresh_token: string) =>
    api.post('/auth/logout', { refresh_token }),

  refresh: (refresh_token: string) =>
    api.post<TokenResponse>('/auth/refresh', { refresh_token }),

  changePassword: (current_password: string, new_password: string, confirm_password: string) =>
    api.post('/auth/change-password', { current_password, new_password, confirm_password }),

  forgotPassword: (identifier: string) =>
    api.post('/auth/forgot-password', { identifier }),

  resetPassword: (token: string, new_password: string, confirm_password: string) =>
    api.post('/auth/reset-password', { token, new_password, confirm_password }),
};

export const usersApi = {
  getMe: () => api.get('/users/me'),

  list: (params?: {
    page?: number;
    per_page?: number;
    search?: string;
    role_id?: number;
    is_active?: boolean;
    is_blocked?: boolean;
  }) => api.get('/users', { params }),

  get: (id: number) => api.get(`/users/${id}`),

  create: (data: unknown) => api.post('/users', data),

  update: (id: number, data: unknown) => api.put(`/users/${id}`, data),

  delete: (id: number) => api.delete(`/users/${id}`),

  block: (id: number, reason?: string) =>
    api.post(`/users/${id}/block`, { reason }),

  unblock: (id: number) => api.post(`/users/${id}/unblock`),

  /** Omit newPassword to have the server generate a temporary one (returned once). */
  resetPassword: (id: number, newPassword?: string) =>
    api.post<{ message: string; temp_password: string | null }>(`/users/${id}/reset-password`, {
      new_password: newPassword || null,
    }),

  assignRole: (id: number, role_id: number) =>
    api.post(`/users/${id}/assign-role`, { role_id }),

  revokeRole: (userId: number, roleId: number) =>
    api.delete(`/users/${userId}/revoke-role/${roleId}`),
};

export const rolesApi = {
  list: () => api.get('/roles'),
  listPermissions: () => api.get('/permissions'),
  auditLogs: (params?: { page?: number; per_page?: number; user_id?: number; resource?: string; action?: string; date_from?: string; date_to?: string }) =>
    api.get('/audit-logs', { params }),
};

export const sessionsApi = {
  list: () => api.get('/sessions'),
  getCurrent: () => api.get('/sessions/current'),
  get: (id: number) => api.get(`/sessions/${id}`),
  create: (data: unknown) => api.post('/sessions', data),
  update: (id: number, data: unknown) => api.put(`/sessions/${id}`, data),
  delete: (id: number) => api.delete(`/sessions/${id}`),
};

export const coursesApi = {
  list: (params?: { page?: number; per_page?: number; search?: string; is_active?: boolean }) =>
    api.get('/courses', { params }),
  get: (id: number) => api.get(`/courses/${id}`),
  create: (data: unknown) => api.post('/courses', data),
  update: (id: number, data: unknown) => api.put(`/courses/${id}`, data),
  delete: (id: number) => api.delete(`/courses/${id}`),
};

export const sectionsApi = {
  list: (params?: {
    page?: number; per_page?: number;
    course_id?: number; session_id?: number; year_of_study?: number;
  }) => api.get('/sections', { params }),
  get: (id: number) => api.get(`/sections/${id}`),
  create: (data: unknown) => api.post('/sections', data),
  update: (id: number, data: unknown) => api.put(`/sections/${id}`, data),
  delete: (id: number) => api.delete(`/sections/${id}`),
};

export const subjectsApi = {
  list: (params?: {
    page?: number; per_page?: number;
    search?: string; course_id?: number; year_of_study?: number;
  }) => api.get('/subjects', { params }),
  get: (id: number) => api.get(`/subjects/${id}`),
  create: (data: unknown) => api.post('/subjects', data),
  update: (id: number, data: unknown) => api.put(`/subjects/${id}`, data),
  delete: (id: number) => api.delete(`/subjects/${id}`),
};

export const facultyApi = {
  list: (params?: {
    page?: number; per_page?: number;
    search?: string; department?: string; is_active?: boolean;
  }) => api.get('/faculty', { params }),
  get: (id: number) => api.get(`/faculty/${id}`),
  create: (data: unknown) => api.post('/faculty', data),
  update: (id: number, data: unknown) => api.put(`/faculty/${id}`, data),
  delete: (id: number) => api.delete(`/faculty/${id}`),
};

export const studentsApi = {
  list: (params?: {
    page?: number; per_page?: number;
    search?: string; course_id?: number; section_id?: number;
    session_id?: number; year_of_study?: number; status?: string;
  }) => api.get('/students', { params }),
  get: (id: number) => api.get(`/students/${id}`),
  create: (data: unknown) => api.post('/students', data),
  update: (id: number, data: unknown) => api.put(`/students/${id}`, data),
  delete: (id: number) => api.delete(`/students/${id}`),
};

export const admissionsApi = {
  list: (params?: {
    page?: number; per_page?: number;
    search?: string; course_id?: number; session_id?: number; status?: string;
  }) => api.get('/admissions', { params }),
  statusCounts: (session_id?: number) =>
    api.get('/admissions/status-counts', { params: session_id ? { session_id } : undefined }),
  get: (id: number) => api.get(`/admissions/${id}`),
  create: (data: unknown) => api.post('/admissions', data),
  update: (id: number, data: unknown) => api.put(`/admissions/${id}`, data),
  delete: (id: number) => api.delete(`/admissions/${id}`),
  updateStatus: (
    id: number,
    data: { status: string; rejection_reason?: string; remarks?: string },
  ) => api.post(`/admissions/${id}/status`, data),
  approve: (id: number, section_id?: number) =>
    api.post(`/admissions/${id}/approve`, { section_id }),
};

export const examsApi = {
  // ── Exam CRUD & Status ────────────────────────────────────────────────────
  list: (params?: {
    page?: number; per_page?: number;
    session_id?: number; course_id?: number; year_of_study?: number;
    exam_type?: string; status?: string;
  }) => api.get('/exams', { params }),
  get: (id: number) => api.get(`/exams/${id}`),
  create: (data: unknown) => api.post('/exams', data),
  update: (id: number, data: unknown) => api.put(`/exams/${id}`, data),
  delete: (id: number) => api.delete(`/exams/${id}`),
  open: (id: number) => api.post(`/exams/${id}/open`),
  close: (id: number) => api.post(`/exams/${id}/close`),
  publish: (id: number) => api.post(`/exams/${id}/publish`),

  // ── Schedules ─────────────────────────────────────────────────────────────
  addSchedule: (examId: number, data: unknown) =>
    api.post(`/exams/${examId}/schedules`, data),
  updateSchedule: (scheduleId: number, data: unknown) =>
    api.put(`/exams/schedules/${scheduleId}`, data),
  deleteSchedule: (scheduleId: number) =>
    api.delete(`/exams/schedules/${scheduleId}`),

  // ── Mark Components ───────────────────────────────────────────────────────
  listComponents: (scheduleId: number) =>
    api.get(`/exams/schedules/${scheduleId}/components`),
  createComponent: (scheduleId: number, data: unknown) =>
    api.post(`/exams/schedules/${scheduleId}/components`, data),
  updateComponent: (componentId: number, data: unknown) =>
    api.put(`/exams/components/${componentId}`, data),
  deleteComponent: (componentId: number) =>
    api.delete(`/exams/components/${componentId}`),

  // ── Marks (legacy single-component) ──────────────────────────────────────
  getMarks: (scheduleId: number) =>
    api.get(`/exams/schedules/${scheduleId}/marks`),
  saveMarks: (scheduleId: number, marks: unknown[]) =>
    api.post(`/exams/schedules/${scheduleId}/marks`, { marks }),
  submitMarks: (scheduleId: number) =>
    api.post(`/exams/schedules/${scheduleId}/submit-marks`),

  // ── Component Marks ───────────────────────────────────────────────────────
  getComponentMarks: (scheduleId: number) =>
    api.get(`/exams/schedules/${scheduleId}/component-marks`),
  saveComponentMarks: (scheduleId: number, marks: unknown[]) =>
    api.post(`/exams/schedules/${scheduleId}/component-marks`, { marks }),

  // ── Registrations ─────────────────────────────────────────────────────────
  listRegistrations: (examId: number, params?: { page?: number; per_page?: number }) =>
    api.get(`/exams/${examId}/registrations`, { params }),
  bulkRegister: (examId: number, student_ids: number[]) =>
    api.post(`/exams/${examId}/registrations/bulk`, { student_ids }),
  updateRegistration: (regId: number, data: { is_eligible: boolean }) =>
    api.put(`/exams/registrations/${regId}`, data),

  // ── Admit Cards ───────────────────────────────────────────────────────────
  downloadAdmitCard: (examId: number, studentId: number) =>
    api.get(`/exams/${examId}/admit-cards/${studentId}/pdf`, { responseType: 'blob' }),
  downloadReportCard: (examId: number, studentId: number) =>
    api.get(`/exams/${examId}/report-cards/${studentId}/pdf`, { responseType: 'blob' }),

  // ── Verification ──────────────────────────────────────────────────────────
  getVerification: (scheduleId: number) =>
    api.get(`/exams/schedules/${scheduleId}/verification`),
  hodVerify: (scheduleId: number, data: { action: string; remarks?: string }) =>
    api.post(`/exams/schedules/${scheduleId}/hod-verify`, data),
  examCellApprove: (scheduleId: number, data: { action: string; remarks?: string }) =>
    api.post(`/exams/schedules/${scheduleId}/exam-cell-approve`, data),

  // ── Corrections ───────────────────────────────────────────────────────────
  listCorrections: (examId: number, params?: { status?: string; page?: number; per_page?: number }) =>
    api.get(`/exams/${examId}/corrections`, { params }),
  requestCorrection: (markId: number, data: { component_id?: number; new_marks: number; reason: string }) =>
    api.post(`/exams/marks/${markId}/correction-request`, data),
  reviewCorrection: (correctionId: number, data: { action: string; review_note?: string }) =>
    api.put(`/exams/corrections/${correctionId}/review`, data),

  // ── Grading Scheme ────────────────────────────────────────────────────────
  getGradingScheme: (examId: number) =>
    api.get(`/exams/${examId}/grading-scheme`),
  setGradingScheme: (examId: number, grades: unknown[]) =>
    api.put(`/exams/${examId}/grading-scheme`, { grades }),

  // ── Results ───────────────────────────────────────────────────────────────
  results: (id: number) => api.get(`/exams/${id}/results`),
  publishedResults: (id: number) => api.get(`/exams/${id}/results/published`),

  // ── Audit Logs ────────────────────────────────────────────────────────────
  auditLogs: (examId: number, params?: { page?: number; per_page?: number }) =>
    api.get(`/exams/${examId}/audit-logs`, { params }),
};

export const attendanceApi = {
  list: (params?: {
    page?: number; per_page?: number;
    academic_session_id?: number; subject_id?: number;
    section_id?: number; faculty_id?: number;
    date_from?: string; date_to?: string;
  }) => api.get('/attendance', { params }),
  get: (id: number) => api.get(`/attendance/${id}`),
  create: (data: unknown) => api.post('/attendance', data),
  update: (id: number, data: unknown) => api.put(`/attendance/${id}`, data),
  delete: (id: number) => api.delete(`/attendance/${id}`),
  mark: (id: number, entries: unknown[]) =>
    api.post(`/attendance/${id}/mark`, { entries }),
  report: (params: {
    academic_session_id: number;
    section_id: number;
    subject_id?: number;
  }) => api.get('/attendance/report', { params }),
};

export const timetableApi = {
  // Timetable slots
  list: (params?: {
    academic_session_id?: number;
    section_id?: number;
    faculty_id?: number;
    day_of_week?: string;
    room_id?: number;
  }) => api.get('/timetable', { params }),
  get: (id: number) => api.get(`/timetable/${id}`),
  create: (data: unknown) => api.post('/timetable', data),
  update: (id: number, data: unknown) => api.put(`/timetable/${id}`, data),
  delete: (id: number) => api.delete(`/timetable/${id}`),

  // Classrooms
  listClassrooms: (params?: { room_type?: string; status?: string }) =>
    api.get('/timetable/classrooms', { params }),
  getClassroom: (id: number) => api.get(`/timetable/classrooms/${id}`),
  createClassroom: (data: unknown) => api.post('/timetable/classrooms', data),
  updateClassroom: (id: number, data: unknown) => api.put(`/timetable/classrooms/${id}`, data),
  deleteClassroom: (id: number) => api.delete(`/timetable/classrooms/${id}`),

  // Time slots master
  listTimeSlots: (activeOnly?: boolean) =>
    api.get('/timetable/timeslots', { params: activeOnly ? { active_only: true } : undefined }),
  createTimeSlot: (data: unknown) => api.post('/timetable/timeslots', data),
  updateTimeSlot: (id: number, data: unknown) => api.put(`/timetable/timeslots/${id}`, data),
  deleteTimeSlot: (id: number) => api.delete(`/timetable/timeslots/${id}`),

  // Faculty subject allocations
  listAllocations: (params?: {
    session_id?: number;
    section_id?: number;
    faculty_id?: number;
    subject_id?: number;
  }) => api.get('/timetable/allocations', { params }),
  createAllocation: (data: unknown) => api.post('/timetable/allocations', data),
  updateAllocation: (id: number, data: unknown) => api.put(`/timetable/allocations/${id}`, data),
  deleteAllocation: (id: number) => api.delete(`/timetable/allocations/${id}`),
};

export const libraryApi = {
  // Dashboard
  getDashboard: () => api.get('/library/dashboard'),

  // Books
  listBooks: (params?: {
    page?: number; per_page?: number;
    search?: string; category?: string; available_only?: boolean;
  }) => api.get('/library/books', { params }),
  getBook: (id: number) => api.get(`/library/books/${id}`),
  addBook: (data: unknown) => api.post('/library/books', data),
  updateBook: (id: number, data: unknown) => api.put(`/library/books/${id}`, data),
  deleteBook: (id: number) => api.delete(`/library/books/${id}`),
  issueBook: (bookId: number, data: unknown) =>
    api.post(`/library/books/${bookId}/issue`, data),

  // Book copies
  getBookCopies: (bookId: number) => api.get(`/library/books/${bookId}/copies`),

  // Issues
  listIssues: (params?: {
    page?: number; per_page?: number;
    student_id?: number; book_id?: number; status?: string;
  }) => api.get('/library/issues', { params }),
  getOverdue: () => api.get('/library/issues/overdue'),
  returnBook: (issueId: number, data: unknown) =>
    api.post(`/library/issues/${issueId}/return`, data),

  // Renewals
  renewIssue: (issueId: number, data: unknown) =>
    api.post(`/library/issues/${issueId}/renew`, data),

  // Members
  listMembers: (params?: {
    page?: number; per_page?: number;
    search?: string; member_type?: string; is_active?: boolean;
  }) => api.get('/library/members', { params }),
  getMember: (id: number) => api.get(`/library/members/${id}`),
  createMember: (data: unknown) => api.post('/library/members', data),
  updateMember: (id: number, data: unknown) => api.put(`/library/members/${id}`, data),
  deleteMember: (id: number) => api.delete(`/library/members/${id}`),

  // Fine rules
  listFineRules: (params?: { active_only?: boolean }) =>
    api.get('/library/fine-rules', { params }),
  createFineRule: (data: unknown) => api.post('/library/fine-rules', data),
  updateFineRule: (id: number, data: unknown) => api.put(`/library/fine-rules/${id}`, data),
  deleteFineRule: (id: number) => api.delete(`/library/fine-rules/${id}`),

  // Reservations
  listReservations: (params?: {
    page?: number; per_page?: number;
    book_id?: number; student_id?: number; status?: string;
  }) => api.get('/library/reservations', { params }),
  createReservation: (bookId: number, data: unknown) =>
    api.post(`/library/books/${bookId}/reserve`, data),
  cancelReservation: (id: number) => api.delete(`/library/reservations/${id}`),
  getBookReservations: (bookId: number) =>
    api.get(`/library/books/${bookId}/reservations`),

  // Fine payments
  getOutstandingFines: (params?: { page?: number; per_page?: number }) =>
    api.get('/library/fines/outstanding', { params }),
  payFine: (issueId: number, data: unknown) =>
    api.post(`/library/issues/${issueId}/pay-fine`, data),
};

export const feeApi = {
  // Structures
  listStructures: (params?: {
    course_id?: number; academic_session_id?: number;
    year_of_study?: number; is_active?: boolean;
  }) => api.get('/fee/structures', { params }),
  getStructure: (id: number) => api.get(`/fee/structures/${id}`),
  createStructure: (data: unknown) => api.post('/fee/structures', data),
  updateStructure: (id: number, data: unknown) => api.put(`/fee/structures/${id}`, data),
  deleteStructure: (id: number) => api.delete(`/fee/structures/${id}`),
  // Payments
  listPayments: (params?: {
    page?: number; per_page?: number;
    student_id?: number; academic_session_id?: number;
    fee_structure_id?: number; fee_category?: string;
    payment_method?: string;
  }) => api.get('/fee/payments', { params }),
  getPayment: (id: number) => api.get(`/fee/payments/${id}`),
  recordPayment: (data: unknown) => api.post('/fee/payments', data),
  // Statement
  getStatement: (studentId: number, academicSessionId: number) =>
    api.get(`/fee/students/${studentId}/statement`, {
      params: { academic_session_id: academicSessionId },
    }),
};

export const hostelApi = {
  // Hostels
  listHostels: () => api.get('/hostel/hostels'),
  getHostel: (id: number) => api.get(`/hostel/hostels/${id}`),
  createHostel: (data: unknown) => api.post('/hostel/hostels', data),
  updateHostel: (id: number, data: unknown) => api.put(`/hostel/hostels/${id}`, data),
  deleteHostel: (id: number) => api.delete(`/hostel/hostels/${id}`),
  // Rooms
  listRooms: (params?: { hostel_id?: number }) => api.get('/hostel/rooms', { params }),
  getRoom: (id: number) => api.get(`/hostel/rooms/${id}`),
  createRoom: (data: unknown) => api.post('/hostel/rooms', data),
  updateRoom: (id: number, data: unknown) => api.put(`/hostel/rooms/${id}`, data),
  deleteRoom: (id: number) => api.delete(`/hostel/rooms/${id}`),
  allocateRoom: (roomId: number, data: unknown) =>
    api.post(`/hostel/rooms/${roomId}/allocate`, data),
  // Allocations
  listAllocations: (params?: {
    page?: number; per_page?: number;
    hostel_id?: number; room_id?: number;
    student_id?: number; academic_session_id?: number;
    status?: string;
  }) => api.get('/hostel/allocations', { params }),
  vacate: (allocId: number, data: unknown) =>
    api.post(`/hostel/allocations/${allocId}/vacate`, data),
  // Fee Types
  listFeeTypes: (params?: { hostel_id?: number; active_only?: boolean }) =>
    api.get('/hostel/fee-types', { params }),
  createFeeType: (data: unknown) => api.post('/hostel/fee-types', data),
  updateFeeType: (id: number, data: unknown) => api.put(`/hostel/fee-types/${id}`, data),
  deleteFeeType: (id: number) => api.delete(`/hostel/fee-types/${id}`),
  // Fee Payments
  listFeePayments: (params?: {
    page?: number; per_page?: number;
    hostel_id?: number; allocation_id?: number; status?: string;
  }) => api.get('/hostel/fee-payments', { params }),
  createFeePayment: (data: unknown) => api.post('/hostel/fee-payments', data),
  updateFeePayment: (id: number, data: unknown) => api.put(`/hostel/fee-payments/${id}`, data),
  // Leave Requests
  listLeaveRequests: (params?: {
    page?: number; per_page?: number;
    hostel_id?: number; student_id?: number; status?: string;
  }) => api.get('/hostel/leave-requests', { params }),
  createLeaveRequest: (data: unknown) => api.post('/hostel/leave-requests', data),
  approveLeaveRequest: (id: number, data?: unknown) =>
    api.post(`/hostel/leave-requests/${id}/approve`, data ?? {}),
  rejectLeaveRequest: (id: number, data?: unknown) =>
    api.post(`/hostel/leave-requests/${id}/reject`, data ?? {}),
  cancelLeaveRequest: (id: number) => api.post(`/hostel/leave-requests/${id}/cancel`),
  // Visitors
  listVisitors: (params?: {
    page?: number; per_page?: number;
    hostel_id?: number; student_id?: number; checked_in_only?: boolean;
  }) => api.get('/hostel/visitors', { params }),
  createVisitor: (data: unknown) => api.post('/hostel/visitors', data),
  checkoutVisitor: (id: number) => api.post(`/hostel/visitors/${id}/checkout`),
  // Complaints
  listComplaints: (params?: {
    page?: number; per_page?: number;
    hostel_id?: number; student_id?: number; status?: string;
  }) => api.get('/hostel/complaints', { params }),
  createComplaint: (data: unknown) => api.post('/hostel/complaints', data),
  updateComplaint: (id: number, data: unknown) => api.put(`/hostel/complaints/${id}`, data),
  // Attendance
  listAttendance: (params: { hostel_id: number; page?: number; per_page?: number }) =>
    api.get('/hostel/attendance', { params }),
  getAttendance: (hostelId: number, date: string) =>
    api.get(`/hostel/attendance/${hostelId}/${date}`),
  submitAttendance: (data: unknown) => api.post('/hostel/attendance', data),
};

// Phase 10 - Employee Management

export const employeeApi = {
  listDepartments: (params?: unknown) => api.get('/employees/departments', { params }),
  createDepartment: (data: unknown) => api.post('/employees/departments', data),
  updateDepartment: (id: number, data: unknown) => api.put(`/employees/departments/${id}`, data),
  deleteDepartment: (id: number) => api.delete(`/employees/departments/${id}`),
  listDesignations: (params?: unknown) => api.get('/employees/designations', { params }),
  createDesignation: (data: unknown) => api.post('/employees/designations', data),
  updateDesignation: (id: number, data: unknown) => api.put(`/employees/designations/${id}`, data),
  deleteDesignation: (id: number) => api.delete(`/employees/designations/${id}`),
  listEmployees: (params?: unknown) => api.get('/employees', { params }),
  /** id + code + name only — usable by modules without employees:read (e.g. library). */
  lookupEmployees: (search?: string) => api.get('/employees/lookup', { params: { search } }),
  createEmployee: (data: unknown) => api.post('/employees', data),
  getEmployee: (id: number) => api.get(`/employees/${id}`),
  updateEmployee: (id: number, data: unknown) => api.put(`/employees/${id}`, data),
  deleteEmployee: (id: number) => api.delete(`/employees/${id}`),
  listDocuments: (empId: number) => api.get(`/employees/${empId}/documents`),
  addDocument: (empId: number, data: unknown) => api.post(`/employees/${empId}/documents`, data),
  deleteDocument: (empId: number, docId: number) => api.delete(`/employees/${empId}/documents/${docId}`),
};

// Phase 11 - Payroll Management

export const payrollApi = {
  listComponents: (params?: unknown) => api.get('/payroll/components', { params }),
  createComponent: (data: unknown) => api.post('/payroll/components', data),
  updateComponent: (id: number, data: unknown) => api.put(`/payroll/components/${id}`, data),
  deleteComponent: (id: number) => api.delete(`/payroll/components/${id}`),
  listStructures: (params?: unknown) => api.get('/payroll/structures', { params }),
  createStructure: (data: unknown) => api.post('/payroll/structures', data),
  getStructure: (id: number) => api.get(`/payroll/structures/${id}`),
  updateStructure: (id: number, data: unknown) => api.put(`/payroll/structures/${id}`, data),
  deleteStructure: (id: number) => api.delete(`/payroll/structures/${id}`),
  listSalaryAssignments: (params?: unknown) => api.get('/payroll/salary-assignments', { params }),
  assignSalaryStructure: (data: unknown) => api.post('/payroll/salary-assignments', data),
  listPeriods: () => api.get('/payroll/periods'),
  createPeriod: (data: unknown) => api.post('/payroll/periods', data),
  lockPeriod: (id: number) => api.post(`/payroll/periods/${id}/lock`),
  listRuns: (params?: unknown) => api.get('/payroll/runs', { params }),
  createRun: (data: unknown) => api.post('/payroll/runs', data),
  getRun: (id: number) => api.get(`/payroll/runs/${id}`),
  calculatePayroll: (runId: number, workingDays: number) => api.post(`/payroll/runs/${runId}/calculate`, { working_days: workingDays }),
  submitForReview: (runId: number) => api.post(`/payroll/runs/${runId}/submit-for-review`),
  approveRun: (runId: number) => api.post(`/payroll/runs/${runId}/approve`),
  generatePayslips: (runId: number) => api.post(`/payroll/runs/${runId}/generate-payslips`),
  markPaid: (runId: number) => api.post(`/payroll/runs/${runId}/mark-paid`),
  listRecords: (runId: number) => api.get(`/payroll/runs/${runId}/records`),
  getEmployeeHistory: (empId: number) => api.get(`/payroll/employees/${empId}/records`),
  listPayments: (params?: unknown) => api.get('/payroll/payments', { params }),
  recordPayment: (data: unknown) => api.post('/payroll/payments', data),
  // Payslips
  listPayslips: (params?: unknown) => api.get('/payroll/payslips', { params }),
  getPayslip: (id: number) => api.get(`/payroll/payslips/${id}`),
  downloadPayslip: (id: number) =>
    api.get(`/payroll/payslips/${id}/download`, { responseType: 'blob' }),
};

// Phase 13 — Store Management

export const storeApi = {
  // Dashboard
  getDashboard: () => api.get('/store/dashboard'),

  // Categories
  listCategories: (params?: unknown) => api.get('/store/categories', { params }),
  createCategory: (data: unknown) => api.post('/store/categories', data),
  getCategory: (id: number) => api.get(`/store/categories/${id}`),
  updateCategory: (id: number, data: unknown) => api.put(`/store/categories/${id}`, data),
  deleteCategory: (id: number) => api.delete(`/store/categories/${id}`),

  // Units
  listUnits: (params?: unknown) => api.get('/store/units', { params }),
  createUnit: (data: unknown) => api.post('/store/units', data),
  getUnit: (id: number) => api.get(`/store/units/${id}`),
  updateUnit: (id: number, data: unknown) => api.put(`/store/units/${id}`, data),
  deleteUnit: (id: number) => api.delete(`/store/units/${id}`),

  // Stores (locations)
  listStores: (params?: unknown) => api.get('/store/stores', { params }),
  createStore: (data: unknown) => api.post('/store/stores', data),
  getStore: (id: number) => api.get(`/store/stores/${id}`),
  updateStore: (id: number, data: unknown) => api.put(`/store/stores/${id}`, data),
  deleteStore: (id: number) => api.delete(`/store/stores/${id}`),

  // Vendors
  listVendors: (params?: unknown) => api.get('/store/vendors', { params }),
  createVendor: (data: unknown) => api.post('/store/vendors', data),
  getVendor: (id: number) => api.get(`/store/vendors/${id}`),
  updateVendor: (id: number, data: unknown) => api.put(`/store/vendors/${id}`, data),
  deleteVendor: (id: number) => api.delete(`/store/vendors/${id}`),

  // Items
  listItems: (params?: unknown) => api.get('/store/items', { params }),
  getLowStockItems: (params?: unknown) => api.get('/store/items/low-stock', { params }),
  createItem: (data: unknown) => api.post('/store/items', data),
  getItem: (id: number) => api.get(`/store/items/${id}`),
  updateItem: (id: number, data: unknown) => api.put(`/store/items/${id}`, data),
  deleteItem: (id: number) => api.delete(`/store/items/${id}`),

  // Purchase Requests
  listPRs: (params?: unknown) => api.get('/store/purchase-requests', { params }),
  createPR: (data: unknown) => api.post('/store/purchase-requests', data),
  getPR: (id: number) => api.get(`/store/purchase-requests/${id}`),
  updatePR: (id: number, data: unknown) => api.put(`/store/purchase-requests/${id}`, data),
  submitPR: (id: number) => api.post(`/store/purchase-requests/${id}/submit`),
  approvePR: (id: number, data?: unknown) => api.post(`/store/purchase-requests/${id}/approve`, data || {}),
  rejectPR: (id: number, data?: unknown) => api.post(`/store/purchase-requests/${id}/reject`, data || {}),
  verifyPR: (id: number) => api.post(`/store/purchase-requests/${id}/verify`),
  cancelPR: (id: number) => api.post(`/store/purchase-requests/${id}/cancel`),

  // Purchase Orders
  listPOs: (params?: unknown) => api.get('/store/purchase-orders', { params }),
  createPO: (data: unknown) => api.post('/store/purchase-orders', data),
  getPO: (id: number) => api.get(`/store/purchase-orders/${id}`),
  updatePO: (id: number, data: unknown) => api.put(`/store/purchase-orders/${id}`, data),
  approvePO: (id: number) => api.post(`/store/purchase-orders/${id}/approve`),
  sendPOToVendor: (id: number) => api.post(`/store/purchase-orders/${id}/send-to-vendor`),
  cancelPO: (id: number) => api.post(`/store/purchase-orders/${id}/cancel`),

  // Receipts (GRN)
  listReceipts: (params?: unknown) => api.get('/store/receipts', { params }),
  createReceipt: (data: unknown) => api.post('/store/receipts', data),
  getReceipt: (id: number) => api.get(`/store/receipts/${id}`),
  approveReceipt: (id: number) => api.post(`/store/receipts/${id}/approve`),

  // Issues
  listIssues: (params?: unknown) => api.get('/store/issues', { params }),
  createIssue: (data: unknown) => api.post('/store/issues', data),
  getIssue: (id: number) => api.get(`/store/issues/${id}`),
  approveIssue: (id: number) => api.post(`/store/issues/${id}/approve`),
  doIssue: (id: number) => api.post(`/store/issues/${id}/issue`),
  cancelIssue: (id: number) => api.post(`/store/issues/${id}/cancel`),

  // Returns
  listReturns: (params?: unknown) => api.get('/store/returns', { params }),
  createReturn: (data: unknown) => api.post('/store/returns', data),
  getReturn: (id: number) => api.get(`/store/returns/${id}`),
  processReturn: (id: number) => api.post(`/store/returns/${id}/process`),

  // Transfers
  listTransfers: (params?: unknown) => api.get('/store/transfers', { params }),
  createTransfer: (data: unknown) => api.post('/store/transfers', data),
  getTransfer: (id: number) => api.get(`/store/transfers/${id}`),
  dispatchTransfer: (id: number) => api.post(`/store/transfers/${id}/dispatch`),
  receiveTransfer: (id: number) => api.post(`/store/transfers/${id}/receive`),

  // Adjustments
  listAdjustments: (params?: unknown) => api.get('/store/adjustments', { params }),
  createAdjustment: (data: unknown) => api.post('/store/adjustments', data),
  getAdjustment: (id: number) => api.get(`/store/adjustments/${id}`),
  approveAdjustment: (id: number) => api.post(`/store/adjustments/${id}/approve`),
  rejectAdjustment: (id: number) => api.post(`/store/adjustments/${id}/reject`),

  // Assets
  listAssets: (params?: unknown) => api.get('/store/assets', { params }),
  createAsset: (data: unknown) => api.post('/store/assets', data),
  getAsset: (id: number) => api.get(`/store/assets/${id}`),
  updateAsset: (id: number, data: unknown) => api.put(`/store/assets/${id}`, data),
  assignAsset: (id: number, data: unknown) => api.post(`/store/assets/${id}/assign`, data),
  returnAsset: (id: number, data?: unknown) => api.post(`/store/assets/${id}/return-asset`, data || {}),

  // Verifications
  listVerifications: (params?: unknown) => api.get('/store/verifications', { params }),
  createVerification: (data: unknown) => api.post('/store/verifications', data),
  getVerification: (id: number) => api.get(`/store/verifications/${id}`),
  submitCount: (id: number, data: unknown) => api.post(`/store/verifications/${id}/submit-count`, data),
  approveVerification: (id: number) => api.post(`/store/verifications/${id}/approve`),

  // Ledger
  getLedger: (params?: unknown) => api.get('/store/ledger', { params }),
};

// Organization Settings
export const settingsApi = {
  getOrgSettings: () => api.get('/settings/organization'),
  updateOrgSettings: (data: unknown) => api.put('/settings/organization', data),
};

// Student self-service — always the logged-in student's own data
export const meApi = {
  profile: () => api.get('/me/student'),
  timetable: () => api.get('/me/timetable'),
  attendance: () => api.get('/me/attendance'),
  exams: () => api.get('/me/exams'),
  admitCard: (examId: number) =>
    api.get(`/me/exams/${examId}/admit-card`, { responseType: 'blob' }),
  results: () => api.get('/me/results'),
  reportCard: (examId: number) =>
    api.get(`/me/results/${examId}/report-card`, { responseType: 'blob' }),
  fees: (academicSessionId?: number) =>
    api.get('/me/fees', { params: { academic_session_id: academicSessionId } }),
  library: () => api.get('/me/library'),
  hostel: () => api.get('/me/hostel'),

  // Employee self-service
  employee: () => api.get('/me/employee'),
  leaveTypes: () => api.get('/me/leave/types'),
  leaveBalances: (year?: number) => api.get('/me/leave/balances', { params: { year } }),
  leaveApplications: () => api.get('/me/leave/applications'),
  applyLeave: (data: { leave_type_id: number; from_date: string; to_date: string; is_half_day: boolean; reason: string }) =>
    api.post('/me/leave/applications', data),
  withdrawLeave: (id: number) => api.put(`/me/leave/applications/${id}/withdraw`),
  salary: () => api.get('/me/salary'),
  attendanceToday: () => api.get('/me/staff-attendance/today'),
  checkIn: (data: { work_from_home: boolean; remarks?: string }) => api.post('/me/staff-attendance/check-in', data),
  checkOut: () => api.post('/me/staff-attendance/check-out'),
  attendanceMonth: (year: number, month: number) => api.get('/me/staff-attendance', { params: { year, month } }),
  payslips: () => api.get('/me/payslips'),
  payslip: (id: number) => api.get(`/me/payslips/${id}`),
  payslipPdf: (id: number) => api.get(`/me/payslips/${id}/download`, { responseType: 'blob' }),
};

export default api;

