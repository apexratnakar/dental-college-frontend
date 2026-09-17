// ── Auth ──────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

// ── Users & Roles ─────────────────────────────────────────────────────────────

export interface RoleSummary {
  id: number;
  name: string;
}

export interface Permission {
  id: number;
  name: string;
  module: string;
  description: string | null;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  permissions: Permission[];
  created_at: string;
}

export interface User {
  id: number;
  email: string | null;
  mobile_number: string | null;
  username: string | null;
  first_name: string;
  last_name: string | null;
  full_name: string;
  is_active: boolean;
  is_blocked: boolean;
  blocked_reason: string | null;
  last_login: string | null;
  profile_photo: string | null;
  roles: RoleSummary[];
  created_at: string;
  updated_at: string;
}

export interface UserCreate {
  first_name: string;
  last_name?: string;
  email?: string;
  mobile_number?: string;
  username?: string;
  password: string;
  role_ids?: number[];
}

export interface UserUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile_number?: string;
  username?: string;
  is_active?: boolean;
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

// ── Phase 2 — Academic ────────────────────────────────────────────────────────

export interface AcademicSession {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  description: string | null;
  created_at: string;
}

export interface Course {
  id: number;
  name: string;
  code: string;
  duration_years: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Section {
  id: number;
  name: string;
  course_id: number;
  course_name: string | null;
  session_id: number;
  session_name: string | null;
  year_of_study: number;
  capacity: number;
  is_active: boolean;
  created_at: string;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  course_id: number;
  course_name: string | null;
  year_of_study: number;
  semester: number;
  credits: number;
  subject_type: string;
  is_active: boolean;
  created_at: string;
}

export interface Faculty {
  id: number;
  user_id: number;
  employee_id: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  designation: string | null;
  department: string | null;
  specialization: string | null;
  qualification: string | null;
  experience_years: number | null;
  date_of_joining: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Student {
  id: number;
  user_id: number;
  enrollment_number: string;
  full_name: string | null;
  email: string | null;
  mobile_number: string | null;
  course_id: number;
  course_name: string | null;
  section_id: number | null;
  section_name: string | null;
  session_id: number;
  session_name: string | null;
  year_of_study: number;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  status: string;
  created_at: string;
}

// ── Phase 3 — Admissions ──────────────────────────────────────────────────────

export type AdmissionStatus =
  | 'pending'
  | 'documents_submitted'
  | 'documents_verified'
  | 'merit_listed'
  | 'counselled'
  | 'approved'
  | 'admitted'
  | 'rejected';

export interface AdmissionDocument {
  id: number;
  document_type: string;
  file_path: string;
  original_filename: string | null;
  is_verified: boolean;
  verified_by_id: number | null;
  verified_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface Admission {
  id: number;
  course_id: number;
  course_name: string | null;
  session_id: number;
  session_name: string | null;
  year_of_study: number;
  first_name: string;
  last_name: string | null;
  full_name: string;
  email: string | null;
  mobile: string | null;
  date_of_birth: string | null;
  gender: string | null;
  category: string | null;
  previous_institution: string | null;
  previous_qualification: string | null;
  merit_score: number | null;
  father_name: string | null;
  mother_name: string | null;
  guardian_name: string | null;
  guardian_mobile: string | null;
  permanent_address: string | null;
  counselling_rank: number | null;
  status: AdmissionStatus;
  rejection_reason: string | null;
  remarks: string | null;
  reviewed_by_id: number | null;
  reviewed_at: string | null;
  student_id: number | null;
  enrollment_number: string | null;
  documents: AdmissionDocument[];
  created_at: string;
}

export interface AdmissionCredentials {
  student_id: number;
  enrollment_number: string;
  username: string;
  temp_password: string;
  email: string | null;
  mobile: string | null;
}

// ── Phase 4 — Examinations ────────────────────────────────────────────────────

export type ExamType = 'internal' | 'mid_term' | 'end_term' | 'annual' | 'practical';
export type ExamStatus = 'draft' | 'open' | 'closed' | 'published';
export type ExamVerificationStatus =
  | 'pending' | 'faculty_submitted'
  | 'hod_verified' | 'hod_rejected'
  | 'exam_cell_approved' | 'exam_cell_rejected';
export type CorrectionStatus = 'pending' | 'approved' | 'rejected';

export interface MarkComponent {
  id: number;
  schedule_id: number;
  component_name: string;
  max_marks: number;
  passing_marks: number;
  weightage: number | null;
  display_order: number;
}

export interface ExamSubjectSchedule {
  id: number;
  exam_id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  section_id: number | null;
  section_name: string | null;
  faculty_id: number | null;
  faculty_name: string | null;
  exam_date: string;
  start_time: string | null;
  end_time: string | null;
  room_no: string | null;
  max_marks: number;
  passing_marks: number;
  marks_entered_count: number;
  has_components: boolean;
  components: MarkComponent[];
}

export interface Exam {
  id: number;
  name: string;
  exam_type: ExamType;
  session_id: number;
  session_name: string | null;
  course_id: number;
  course_name: string | null;
  year_of_study: number;
  semester: number | null;
  start_date: string;
  end_date: string;
  status: ExamStatus;
  is_published: boolean;  // derived: status === 'published'
  description: string | null;
  schedules: ExamSubjectSchedule[];
  created_at: string;
}

export interface StudentMarkEntry {
  student_id: number;
  enrollment_number: string;
  student_name: string;
  marks_obtained: number | null;
  is_absent: boolean;
  remarks: string | null;
  verification_status: string;
}

// Per-component marks for one student in one schedule
export interface ComponentMarkCell {
  component_id: number;
  component_name: string;
  max_marks: number;
  passing_marks: number;
  marks_obtained: number | null;
  is_absent: boolean;
}

export interface StudentComponentMarksRow {
  student_id: number;
  enrollment_number: string;
  student_name: string;
  components: ComponentMarkCell[];
}

// Registration
export interface ExamRegistration {
  id: number;
  exam_id: number;
  student_id: number;
  enrollment_number: string;
  student_name: string;
  is_eligible: boolean;
  registered_at: string | null;
}

// Verification
export interface VerificationRecord {
  id: number;
  schedule_id: number;
  level: 'hod' | 'exam_cell';
  status: string;
  verified_by_name: string | null;
  verified_at: string | null;
  remarks: string | null;
}

// Corrections
export interface CorrectionRecord {
  id: number;
  student_mark_id: number;
  component_id: number | null;
  component_name: string | null;
  student_id: number;
  student_name: string;
  enrollment_number: string;
  subject_name: string;
  old_marks: number | null;
  new_marks: number | null;
  reason: string | null;
  status: CorrectionStatus;
  requested_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
}

// Grading
export interface GradingSchemeEntry {
  id: number;
  exam_id: number;
  grade: string;
  min_percentage: number;
  max_percentage: number;
  points: number | null;
}

export interface SubjectResultItem {
  schedule_id: number | null;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  max_marks: number | null;
  passing_marks: number | null;
  marks_obtained: number | null;
  is_absent: boolean;
  grade: string | null;
  is_pass: boolean | null;
}

export interface StudentExamResult {
  student_id: number;
  enrollment_number: string;
  student_name: string;
  subjects: SubjectResultItem[];
  total_max_marks: number | null;
  total_obtained: number | null;
  percentage: number | null;
  overall_grade: string | null;
  is_pass: boolean | null;
  result_status: string | null;
}

export interface StoredResult {
  id: number;
  exam_id: number;
  student_id: number;
  enrollment_number: string;
  student_name: string;
  total_max_marks: number | null;
  total_obtained: number | null;
  percentage: number | null;
  grade: string | null;
  is_pass: boolean | null;
  result_status: string | null;
  published_at: string | null;
  subjects: SubjectResultItem[];
}

// Audit log
export interface ExamAuditLog {
  id: number;
  exam_id: number;
  schedule_id: number | null;
  student_id: number | null;
  action: string;
  actor_id: number | null;
  actor_name: string | null;
  old_value: string | null;
  new_value: string | null;
  notes: string | null;
  created_at: string;
}

// ── Phase 5 — Attendance ──────────────────────────────────────────────────────

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface AttendanceEntry {
  id: number;
  record_id: number;
  student_id: number;
  enrollment_number: string;
  student_name: string;
  status: AttendanceStatus;
  remarks: string | null;
}

export interface AttendanceRecord {
  id: number;
  academic_session_id: number;
  session_name: string | null;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  section_id: number;
  section_name: string;
  faculty_id: number | null;
  faculty_name: string | null;
  record_date: string;
  start_time: string | null;
  end_time: string | null;
  topic_covered: string | null;
  is_marked: boolean;
  total_entries: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  created_at: string;
}

export interface AttendanceDetail extends AttendanceRecord {
  entries: AttendanceEntry[];
}

export interface SubjectAttendanceSummary {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  total_classes: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  percentage: number;
  has_shortage: boolean;
}

export interface StudentAttendanceReport {
  student_id: number;
  enrollment_number: string;
  student_name: string;
  subjects: SubjectAttendanceSummary[];
  overall_percentage: number | null;
}

// ── Library (Phase 7 + Extension) ────────────────────────────────────────────

export type BookCategory = 'textbook' | 'reference' | 'fiction' | 'non_fiction' | 'journal' | 'magazine' | 'other';
export type IssueStatus = 'issued' | 'returned' | 'overdue' | 'lost';
export type BookType = 'textbook' | 'reference' | 'fiction' | 'non_fiction' | 'journal' | 'magazine' | 'newspaper' | 'ebook' | 'other';
export type CopyStatus = 'available' | 'issued' | 'reserved' | 'lost' | 'damaged' | 'under_repair' | 'discarded';
export type MemberType = 'student' | 'faculty' | 'employee';
export type FineAppliesTo = 'all' | 'student' | 'faculty';
export type ConditionOnReturn = 'good' | 'damaged' | 'lost';
export type ReservationStatus = 'pending' | 'available' | 'fulfilled' | 'cancelled' | 'expired';
export type FinePaymentMode = 'cash' | 'upi' | 'online' | 'cheque' | 'waiver';

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string | null;
  publisher: string | null;
  edition: string | null;
  year_published: number | null;
  category: BookCategory;
  total_copies: number;
  available_copies: number;
  location: string | null;
  description: string | null;
  // Extended fields
  subtitle: string | null;
  language: string | null;
  book_type: BookType | null;
  price: number | null;
  rack: string | null;
  shelf: string | null;
  supplier: string | null;
  purchase_date: string | null;
  cover_image_url: string | null;
  digital_url: string | null;
  pages: number | null;
}

export interface BookCopy {
  id: number;
  book_id: number;
  accession_number: string;
  barcode: string | null;
  copy_status: CopyStatus;
  notes: string | null;
}

export interface LibraryMember {
  id: number;
  member_type: MemberType;
  library_card_number: string;
  student_id: number | null;
  employee_id: number | null;
  member_name: string;
  issue_limit: number;
  loan_days: number;
  max_renewals: number;
  membership_start: string | null;
  membership_end: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface BookRenewal {
  id: number;
  issue_id: number;
  old_due_date: string;
  new_due_date: string;
  renewed_by_name: string | null;
  created_at: string;
}

export interface LibraryFineRule {
  id: number;
  rule_name: string;
  min_overdue_days: number;
  max_overdue_days: number | null;
  fine_per_day: number;
  applies_to: FineAppliesTo;
  is_active: boolean;
}

export interface LibraryDashboardStats {
  total_books: number;
  total_copies: number;
  available_copies: number;
  issued_books: number;
  overdue_books: number;
  total_members: number;
  pending_fines: number;
  today_issues: number;
  today_returns: number;
}

export interface BookIssue {
  id: number;
  book_id: number;
  book_title: string;
  book_isbn: string | null;
  student_id: number;
  student_name: string;
  enrollment_number: string;
  issued_by_name: string | null;
  issue_date: string;
  due_date: string;
  return_date: string | null;
  status: IssueStatus;
  fine_amount: number | null;
  remarks: string | null;
  days_overdue: number | null;
  // Extended fields
  member_id: number | null;
  copy_id: number | null;
  accession_number: string | null;
  renewal_count: number;
  condition_on_return: ConditionOnReturn | null;
  fine_paid: boolean;
}

export interface LibraryReservation {
  id: number;
  book_id: number;
  book_title: string;
  student_id: number | null;
  student_name: string | null;
  member_id: number | null;
  library_card_number: string | null;
  reservation_date: string;
  expiry_date: string | null;
  status: ReservationStatus;
  notes: string | null;
  notified_at: string | null;
  created_at: string;
}

export interface LibraryFinePayment {
  id: number;
  issue_id: number;
  amount: number;
  payment_mode: FinePaymentMode;
  receipt_number: string | null;
  collected_by_name: string | null;
  remarks: string | null;
  created_at: string;
}

// ── Timetable (Phase 6 + Enhancement) ────────────────────────────────────────

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
export type ClassType = 'theory' | 'practical' | 'tutorial';
export type ClassroomType = 'classroom' | 'computer_lab' | 'physics_lab' | 'chemistry_lab' | 'seminar_hall' | 'auditorium' | 'workshop';
export type ClassroomStatus = 'active' | 'inactive' | 'under_maintenance';
export type SlotType = 'period' | 'break' | 'lunch';

export interface TimetableSlot {
  id: number;
  academic_session_id: number;
  section_id: number;
  section_name: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  faculty_id: number | null;
  faculty_name: string | null;
  room_id: number | null;
  room_number: string | null;
  day_of_week: DayOfWeek;
  start_time: string; // "HH:MM:SS" from backend
  end_time: string;
  class_type: ClassType;
}

export interface Classroom {
  id: number;
  room_number: string;
  building: string | null;
  floor: string | null;
  room_type: ClassroomType;
  capacity: number | null;
  department: string | null;
  facilities: string | null;
  status: ClassroomStatus;
}

export interface TimeSlot {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  slot_type: SlotType;
  order_index: number;
  is_active: boolean;
}

export interface FacultySubjectAllocation {
  id: number;
  session_id: number;
  session_name: string;
  section_id: number;
  section_name: string;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  faculty_id: number;
  faculty_name: string;
  hours_per_week: number | null;
}

// ── Hostel (Phase 8) ──────────────────────────────────────────────────────────

export type HostelType = 'boys' | 'girls' | 'mixed';
export type RoomType = 'single' | 'double' | 'triple' | 'dormitory';
export type RoomStatus = 'available' | 'full' | 'maintenance';
export type AllocationStatus = 'active' | 'vacated';

export interface Hostel {
  id: number;
  name: string;
  hostel_type: HostelType;
  address: string | null;
  warden_id: number | null;
  warden_name: string | null;
  room_count: number;
  total_capacity: number;
  occupied_count: number;
  created_at: string;
}

export interface HostelRoom {
  id: number;
  hostel_id: number;
  hostel_name: string;
  room_number: string;
  floor: number | null;
  room_type: RoomType;
  capacity: number;
  status: RoomStatus;
  occupied_count: number;
  created_at: string;
}

export interface HostelAllocation {
  id: number;
  room_id: number;
  room_number: string;
  hostel_id: number;
  hostel_name: string;
  student_id: number;
  student_name: string;
  enrollment_number: string;
  academic_session_id: number;
  session_name: string | null;
  check_in_date: string;
  check_out_date: string | null;
  status: AllocationStatus;
  remarks: string | null;
  created_at: string;
}

export type FeeFrequency = 'one_time' | 'monthly' | 'quarterly' | 'annual';
export type FeePaymentStatus = 'pending' | 'paid' | 'overdue' | 'waived';
export type HostelLeaveType = 'leave' | 'outing';
export type HostelLeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ComplaintPriority = 'low' | 'medium' | 'high';
export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type HostelAttendanceStatus = 'present' | 'absent' | 'on_leave' | 'outing';

export interface HostelFeeType {
  id: number;
  hostel_id: number;
  hostel_name: string;
  name: string;
  amount: number;
  frequency: FeeFrequency;
  is_active: boolean;
}

export interface HostelFeePayment {
  id: number;
  allocation_id: number;
  student_name: string;
  enrollment_number: string;
  hostel_name: string;
  fee_type_name: string | null;
  description: string | null;
  amount: number;
  due_date: string | null;
  paid_date: string | null;
  status: FeePaymentStatus;
  payment_mode: string | null;
  receipt_no: string | null;
  remarks: string | null;
  collected_by_name: string | null;
  created_at: string;
}

export interface HostelLeaveRequest {
  id: number;
  student_id: number;
  student_name: string;
  enrollment_number: string;
  hostel_id: number;
  hostel_name: string;
  leave_type: HostelLeaveType;
  from_date: string;
  to_date: string;
  from_time: string | null;
  to_time: string | null;
  reason: string;
  destination: string | null;
  contact_during_leave: string | null;
  status: HostelLeaveStatus;
  approved_by_name: string | null;
  approved_at: string | null;
  remarks: string | null;
  created_at: string;
}

export interface HostelVisitor {
  id: number;
  hostel_id: number;
  hostel_name: string;
  student_id: number;
  student_name: string;
  enrollment_number: string;
  visitor_name: string;
  visitor_phone: string | null;
  relation: string | null;
  purpose: string | null;
  check_in_time: string;
  check_out_time: string | null;
  approved_by_name: string | null;
  remarks: string | null;
}

export interface HostelComplaint {
  id: number;
  hostel_id: number;
  hostel_name: string;
  student_id: number;
  student_name: string;
  enrollment_number: string;
  room_number: string | null;
  title: string;
  description: string | null;
  complaint_type: string;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  assigned_to_name: string | null;
  resolved_at: string | null;
  resolution_remarks: string | null;
  created_at: string;
}

export interface HostelAttendanceEntry {
  student_id: number;
  student_name: string;
  enrollment_number: string;
  status: HostelAttendanceStatus;
}

export interface HostelAttendanceRecord {
  id: number;
  hostel_id: number;
  hostel_name: string;
  date: string;
  marked_by_name: string | null;
  entries: HostelAttendanceEntry[];
  present_count: number;
  absent_count: number;
  on_leave_count: number;
  outing_count: number;
}

// ── Fee Management (Phase 9) ──────────────────────────────────────────────────

export type FeeCategory = 'tuition' | 'hostel' | 'library' | 'examination' | 'transport' | 'miscellaneous';
export type PaymentMethod = 'cash' | 'upi' | 'online' | 'cheque' | 'neft' | 'dd';

export interface FeeStructure {
  id: number;
  course_id: number;
  course_name: string | null;
  academic_session_id: number;
  session_name: string | null;
  year_of_study: number;
  fee_category: FeeCategory;
  amount: number;
  due_date: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface FeePayment {
  id: number;
  receipt_number: string;
  student_id: number;
  student_name: string | null;
  enrollment_number: string | null;
  fee_structure_id: number | null;
  academic_session_id: number;
  session_name: string | null;
  fee_category: FeeCategory;
  amount_paid: number;
  payment_date: string;
  payment_method: PaymentMethod;
  transaction_id: string | null;
  remarks: string | null;
  collected_by_name: string | null;
  created_at: string;
}

export interface FeeStatementLine {
  fee_structure_id: number | null;
  fee_category: FeeCategory;
  amount_due: number;
  amount_paid: number;
  balance: number;
  due_date: string | null;
  is_overdue: boolean;
  payments: FeePayment[];
}

export interface StudentFeeStatement {
  student_id: number;
  student_name: string | null;
  enrollment_number: string | null;
  academic_session_id: number;
  session_name: string | null;
  lines: FeeStatementLine[];
  total_due: number;
  total_paid: number;
  total_balance: number;
}

// ── API Errors ────────────────────────────────────────────────────────────────

// ── Employee Management (Phase 10) ────────────────────────────────────────────

export type EmploymentType = 'full_time' | 'part_time' | 'contract' | 'intern';
export type EmployeeStatus =
  | 'applicant' | 'selected' | 'joined' | 'active'
  | 'on_leave' | 'suspended' | 'resigned' | 'retired' | 'terminated';
export type EmployeeCategory = 'teaching' | 'administrative' | 'support';
export type Gender = 'male' | 'female' | 'other';
export type DocumentType =
  | 'resume' | 'id_proof' | 'address_proof' | 'qualification'
  | 'experience' | 'photo' | 'offer_letter' | 'appointment_letter' | 'other';

export interface Department {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  head_employee_id: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Designation {
  id: number;
  name: string;
  category: EmployeeCategory;
  grade: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeDocument {
  id: number;
  employee_id: number;
  document_type: DocumentType;
  document_name: string;
  file_url: string | null;
  file_name: string | null;
  remarks: string | null;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
}

export interface EmployeeListItem {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string | null;
  mobile: string | null;
  official_email: string | null;
  category: EmployeeCategory;
  employment_type: EmploymentType;
  status: EmployeeStatus;
  department_name: string | null;
  designation_name: string | null;
  date_of_joining: string | null;
  is_active: boolean;
}

export interface Employee extends EmployeeListItem {
  user_id: number | null;
  date_of_birth: string | null;
  gender: Gender | null;
  personal_email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  pin_code: string | null;
  country: string;
  department_id: number | null;
  designation_id: number | null;
  reporting_manager_id: number | null;
  reporting_manager_name: string | null;
  date_of_leaving: string | null;
  probation_end_date: string | null;
  confirmation_date: string | null;
  highest_qualification: string | null;
  specialization: string | null;
  experience_years: number | null;
  pan_number: string | null;
  aadhaar_last4: string | null;
  pf_account_number: string | null;
  esi_number: string | null;
  uan_number: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  photo_url: string | null;
  remarks: string | null;
  documents: EmployeeDocument[];
  created_at: string;
}

// ── Payroll Management (Phase 11) ─────────────────────────────────────────────

export type ComponentType = 'earning' | 'deduction';
export type CalculationType = 'fixed' | 'percentage' | 'formula';
export type PayrollStatus =
  | 'draft' | 'calculated' | 'under_review' | 'approved' | 'processed' | 'paid' | 'closed';
export type PaymentMode = 'bank_transfer' | 'cash' | 'cheque' | 'neft' | 'rtgs' | 'upi';

export interface SalaryComponent {
  id: number;
  name: string;
  code: string;
  component_type: ComponentType;
  calculation_type: CalculationType;
  base_on: string | null;
  default_value: number;
  is_taxable: boolean;
  is_mandatory: boolean;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface StructureComponentResponse {
  id: number;
  component_id: number;
  component_name: string;
  component_code: string;
  component_type: ComponentType;
  override_value: number | null;
  default_value: number;
  effective_value: number;
  sort_order: number;
}

export interface SalaryStructure {
  id: number;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  components: StructureComponentResponse[];
  created_at: string;
}

export interface EmployeeSalaryStructure {
  id: number;
  employee_id: number;
  employee_name: string | null;
  employee_code: string | null;
  structure_id: number;
  structure_name: string | null;
  effective_from: string;
  effective_to: string | null;
  ctc_annual: number | null;
  basic_monthly: number | null;
  is_current: boolean;
  created_at: string;
}

export interface PayrollPeriod {
  id: number;
  year: number;
  month: number;
  name: string;
  start_date: string;
  end_date: string;
  is_locked: boolean;
  created_at: string;
}

export interface PayrollRun {
  id: number;
  period_id: number;
  period_name: string | null;
  status: PayrollStatus;
  description: string | null;
  total_employees: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  approved_at: string | null;
  created_at: string;
}

export interface EarningLine {
  component_id: number;
  component_name: string;
  component_code: string;
  amount: number;
}

export interface PayrollEmployeeRecord {
  id: number;
  payroll_run_id: number;
  employee_id: number;
  employee_code: string | null;
  employee_name: string | null;
  department: string | null;
  designation: string | null;
  bank_account_number: string | null;
  bank_name: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  total_working_days: number;
  days_present: number;
  days_absent: number;
  days_leave: number;
  days_holiday: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  bonus: number;
  arrears: number;
  loan_deduction: number;
  advance_deduction: number;
  remarks: string | null;
  earnings: EarningLine[];
  deductions: EarningLine[];
  payslip_number: string | null;
  payslip_id: number | null;
}

export interface SalaryPayment {
  id: number;
  payslip_id: number;
  payslip_number: string | null;
  payment_date: string;
  payment_mode: PaymentMode;
  amount: number;
  transaction_reference: string | null;
  remarks: string | null;
  created_at: string;
}

export interface PayslipListItem {
  id: number;
  payslip_number: string;
  record_id: number;
  generated_at: string;
  is_emailed: boolean;
  employee_id: number;
  employee_code: string | null;
  employee_name: string | null;
  department: string | null;
  designation: string | null;
  period_id: number | null;
  period_name: string | null;
  run_id: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  is_paid: boolean;
  created_at: string;
}

export interface PayslipDetail extends PayslipListItem {
  record: PayrollEmployeeRecord;
  payment: SalaryPayment | null;
}

export interface OrganizationSettings {
  id: number;
  org_name: string;
  tagline: string | null;
  logo_data: string | null;
  website: string | null;
  phone_no: string | null;
  email: string | null;
  address: string | null;
  updated_at: string;
}

export interface ApiError {
  detail: string | { msg: string; loc: string[] }[];
}

export function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosErr = error as { response?: { data?: ApiError } };
    const detail = axiosErr.response?.data?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((d) => d.msg).join(', ');
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

// ─── Phase 13: Store Management ──────────────────────────────────────────────

export type ItemType = 'consumable' | 'non_consumable';
export type PRStatus =
  | 'draft' | 'submitted' | 'hod_approved' | 'hod_rejected'
  | 'store_verified' | 'po_created' | 'completed' | 'cancelled';
export type POStatus =
  | 'draft' | 'approved' | 'sent_to_vendor'
  | 'partially_received' | 'received' | 'cancelled';
export type ReceiptStatus = 'draft' | 'approved' | 'rejected';
export type StockIssueStatus = 'draft' | 'approved' | 'issued' | 'cancelled';
export type TransferStatus = 'pending' | 'in_transit' | 'received' | 'cancelled';
export type AdjustmentStatus = 'pending' | 'approved' | 'rejected';
export type AdjustmentReason =
  | 'damaged' | 'lost' | 'expired' | 'theft'
  | 'physical_difference' | 'data_correction';
export type AssetStatus = 'active' | 'in_repair' | 'disposed' | 'lost' | 'condemned';
export type VerificationStatus = 'open' | 'submitted' | 'approved';
export type LedgerTxnType =
  | 'opening' | 'purchase_receipt' | 'issue' | 'return'
  | 'transfer_in' | 'transfer_out' | 'adjustment_in' | 'adjustment_out';
export type ReturnCondition = 'good' | 'damaged' | 'lost';

export interface StoreCategory {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreUnit {
  id: number;
  name: string;
  abbreviation: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreLocation {
  id: number;
  name: string;
  code: string;
  location: string | null;
  incharge_id: number | null;
  contact: string | null;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreVendor {
  id: number;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  pan_number: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_ifsc: string | null;
  payment_terms: string | null;
  is_active: boolean;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreItem {
  id: number;
  name: string;
  code: string | null;
  item_type: ItemType;
  category_id: number | null;
  category: StoreCategory | null;
  unit_id: number | null;
  unit: StoreUnit | null;
  description: string | null;
  specifications: string | null;
  current_stock: number;
  minimum_stock: number;
  reorder_level: number;
  last_purchase_price: number | null;
  shelf_location: string | null;
  hsn_code: string | null;
  is_active: boolean;
  is_low_stock: boolean;
  created_at: string;
  updated_at: string;
}

export interface PRItem {
  id: number;
  item_id: number;
  item: StoreItem | null;
  quantity: number;
  remarks: string | null;
}

export interface PurchaseRequest {
  id: number;
  pr_number: string;
  request_date: string;
  department_id: number | null;
  requested_by_id: number;
  required_date: string | null;
  priority: string;
  purpose: string | null;
  remarks: string | null;
  status: PRStatus;
  approved_by_id: number | null;
  approved_at: string | null;
  rejection_reason: string | null;
  verified_by_id: number | null;
  verified_at: string | null;
  items: PRItem[];
  created_at: string;
  updated_at: string;
}

export interface POItem {
  id: number;
  item_id: number;
  item: StoreItem | null;
  quantity: number;
  unit_price: number;
  gst_percent: number;
  total_price: number;
  remarks: string | null;
}

export interface PurchaseOrder {
  id: number;
  po_number: string;
  order_date: string;
  vendor_id: number;
  vendor: StoreVendor | null;
  pr_id: number | null;
  status: POStatus;
  expected_delivery: string | null;
  delivery_address: string | null;
  payment_terms: string | null;
  approved_by_id: number | null;
  approved_at: string | null;
  remarks: string | null;
  items: POItem[];
  created_at: string;
  updated_at: string;
}

export interface ReceiptItem {
  id: number;
  item_id: number;
  item: StoreItem | null;
  received_quantity: number;
  rejected_quantity: number;
  accepted_quantity: number;
  unit_price: number | null;
  batch_number: string | null;
  expiry_date: string | null;
  remarks: string | null;
}

export interface StockReceipt {
  id: number;
  receipt_number: string;
  receipt_date: string;
  store_id: number;
  store: StoreLocation | null;
  vendor_id: number | null;
  vendor: StoreVendor | null;
  po_id: number | null;
  invoice_number: string | null;
  invoice_date: string | null;
  status: ReceiptStatus;
  approved_by_id: number | null;
  approved_at: string | null;
  remarks: string | null;
  items: ReceiptItem[];
  created_at: string;
  updated_at: string;
}

export interface IssueItem {
  id: number;
  item_id: number;
  item: StoreItem | null;
  quantity: number;
  remarks: string | null;
}

export interface StockIssue {
  id: number;
  issue_number: string;
  issue_date: string;
  store_id: number;
  store: StoreLocation | null;
  department_id: number | null;
  employee_id: number | null;
  purpose: string | null;
  status: StockIssueStatus;
  approved_by_id: number | null;
  approved_at: string | null;
  issued_at: string | null;
  remarks: string | null;
  items: IssueItem[];
  created_at: string;
  updated_at: string;
}

export interface ReturnItem {
  id: number;
  item_id: number;
  item: StoreItem | null;
  quantity: number;
  condition: ReturnCondition;
  remarks: string | null;
}

export interface StockReturn {
  id: number;
  return_number: string;
  return_date: string;
  store_id: number;
  store: StoreLocation | null;
  issue_id: number | null;
  department_id: number | null;
  employee_id: number | null;
  is_processed: boolean;
  processed_by_id: number | null;
  processed_at: string | null;
  remarks: string | null;
  items: ReturnItem[];
  created_at: string;
  updated_at: string;
}

export interface TransferItem {
  id: number;
  item_id: number;
  item: StoreItem | null;
  quantity: number;
  received_quantity: number | null;
  remarks: string | null;
}

export interface StockTransfer {
  id: number;
  transfer_number: string;
  transfer_date: string;
  from_store_id: number;
  from_store: StoreLocation | null;
  to_store_id: number;
  to_store: StoreLocation | null;
  status: TransferStatus;
  dispatched_by_id: number | null;
  dispatched_at: string | null;
  received_by_id: number | null;
  received_at: string | null;
  remarks: string | null;
  items: TransferItem[];
  created_at: string;
  updated_at: string;
}

export interface AdjustmentItem {
  id: number;
  item_id: number;
  item: StoreItem | null;
  system_quantity: number | null;
  physical_quantity: number | null;
  adjustment_quantity: number;
  remarks: string | null;
}

export interface StockAdjustment {
  id: number;
  adjustment_number: string;
  adjustment_date: string;
  store_id: number;
  store: StoreLocation | null;
  reason: AdjustmentReason;
  status: AdjustmentStatus;
  approved_by_id: number | null;
  approved_at: string | null;
  remarks: string | null;
  items: AdjustmentItem[];
  created_at: string;
  updated_at: string;
}

export interface StoreAsset {
  id: number;
  asset_code: string;
  name: string;
  item_id: number | null;
  store_id: number | null;
  store: StoreLocation | null;
  serial_number: string | null;
  make: string | null;
  model_number: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  vendor_id: number | null;
  warranty_expiry: string | null;
  amc_expiry: string | null;
  location: string | null;
  status: AssetStatus;
  assigned_to_id: number | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationItem {
  id: number;
  item_id: number;
  item: StoreItem | null;
  system_quantity: number;
  physical_quantity: number | null;
  difference: number | null;
  remarks: string | null;
}

export interface StockVerification {
  id: number;
  verification_number: string;
  verification_date: string;
  store_id: number;
  store: StoreLocation | null;
  status: VerificationStatus;
  submitted_by_id: number | null;
  submitted_at: string | null;
  approved_by_id: number | null;
  approved_at: string | null;
  remarks: string | null;
  items: VerificationItem[];
  created_at: string;
  updated_at: string;
}

export interface StockLedgerEntry {
  id: number;
  store_item_id: number;
  item: StoreItem | null;
  store_id: number;
  store: StoreLocation | null;
  txn_type: LedgerTxnType;
  txn_date: string;
  quantity_in: number;
  quantity_out: number;
  balance_quantity: number;
  reference_id: number | null;
  reference_type: string | null;
  remarks: string | null;
  created_at: string;
}

export interface StoreDashboard {
  total_items: number;
  low_stock_items: number;
  pending_purchase_requests: number;
  pending_purchase_orders: number;
  pending_receipts: number;
  pending_issues: number;
  total_assets: number;
  active_assets: number;
}
