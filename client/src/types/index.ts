export interface Member {
  id: number;
  name: string;
  email: string;
  phone: string;
  birthday: string;
  joined_date: string;
  active: number;
  created_at: string;
  daysUntilBirthday?: number;
  user_id?: number | null;
}

export type AttendanceStatus = 'present' | 'absent' | 'medical' | 'break' | 'not-joined' | 'left-choir' | 'no-practice';

export interface Attendance {
  id: number;
  member_id: number;
  member_name?: string;
  event_type: 'saturday' | 'sunday' | 'special';
  event_name: string;
  date: string;
  status: AttendanceStatus;
  notes: string;
  created_at: string;
}

export type CorrectionRequestStatus = 'pending' | 'approved' | 'rejected';

export interface AttendanceCorrectionRequest {
  id: number;
  member_id: number;
  member_name: string;
  date: string;
  event_type: string;
  event_name: string | null;
  current_status: string;
  requested_status: string;
  reason: string;
  request_status: CorrectionRequestStatus;
  created_at: string;
  decided_by: number | null;
  decided_at: string | null;
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  paid_by: string;
  notes: string;
  created_at: string;
}

export interface QuarterlyAttendance {
  member_id: number;
  member_name: string;
  present: number;
  total: number;
  percentage: number;
}

export interface MonthlyAttendanceMember {
  member_id: number;
  member_name: string;
  byMonth: Array<{ month: number; label: string; present: number; total: number; percentage: number | null }>;
}

/** Logged-in user from server (session). */
export interface AuthUser {
  id: number;
  username: string;
  role: 'admin' | 'member';
  memberId?: number;
}

export interface DashboardData {
  totalMembers: number;
  upcomingBirthdays: number;
  totalIncome: number;
  totalExpenses: number;
  currentBalance: number;
  recentAttendance: Attendance[];
  quarterlyAttendance: QuarterlyAttendance[];
  currentQuarter: number;
  lastQuarterAttendance: QuarterlyAttendance[];
  lastQuarter: number;
  lastQuarterYear: number;
  monthlyAttendance: MonthlyAttendanceMember[];
  currentYear: number;
}
