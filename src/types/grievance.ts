export type UserRole = 'student' | 'staff' | 'admin';

export type GrievanceCategory = 
  | 'academics'
  | 'library'
  | 'mens_hostel'
  | 'womens_hostel'
  | 'canteen';

export type GrievanceStatus = 'pending' | 'in_review' | 'resolved' | 'rejected' | 'escalated' | 'solved' | 'considered' | 'denied';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  avatar?: string;
  principalType?: 'permanent' | 'temporary';
  createdAt: Date;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'pdf' | 'document';
  size: number;
}

export interface Comment {
  id: string;
  grievanceId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  content: string;
  createdAt: Date;
  isInternal?: boolean;
}

export interface StatusLog {
  id: string;
  grievanceId: string;
  fromStatus: GrievanceStatus | null;
  toStatus: GrievanceStatus;
  changedBy: string;
  changedByName: string;
  reason?: string;
  createdAt: Date;
}

export interface Grievance {
  id: string;
  ticketNumber: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  category: GrievanceCategory;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: GrievanceStatus;
  subject: string;
  description: string;
  isAnonymous: boolean;
  attachments: Attachment[];
  assignedTo?: string;
  assignedToName?: string;
  comments: Comment[];
  statusLogs: StatusLog[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  escalatedAt?: Date;
}

/** Extended Grievance returned by the escalations API. */
export interface EscalatedGrievance extends Grievance {
  /** Register number from the students table (via JOIN). */
  registerNumber?: string;
  /** Department from the students table (via JOIN). */
  studentDepartment?: string;
  /** True when the escalation process has been triggered. */
  isEscalated: boolean;
  /** Target of escalation — always "Principal" for now. */
  escalatedTo?: string;
  /** How the escalation was triggered. */
  escalationType?: 'manual' | 'automatic';
  /** Name of the staff member or "System" that escalated. */
  escalatedByName?: string;
  /** Human-readable reason entered at escalation time. */
  escalationReason?: string;
  /** Timestamp when the escalation was recorded. */
  escalationDate?: Date;
  /** Working days elapsed since submission (recomputed live by backend). */
  pendingWorkingDays: number;
}


export interface DashboardStats {
  totalGrievances: number;
  pending: number;
  inReview: number;
  resolved: number;
  rejected: number;
  escalated: number;
  solved: number;
  considered: number;
  denied: number;
  avgResolutionTime: number; // in hours
  categoryBreakdown: Record<GrievanceCategory, number>;
  monthlyTrend: { month: string; count: number }[];
}

export const CATEGORY_LABELS: Record<GrievanceCategory, string> = {
  academics: 'Academics',
  library: 'Library',
  mens_hostel: "Men's Hostel",
  womens_hostel: "Women's Hostel",
  canteen: 'Canteen',
};

export const STATUS_LABELS: Record<GrievanceStatus, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  resolved: 'Resolved',
  rejected: 'Rejected',
  escalated: 'Escalated',
  solved: 'Solved',
  considered: 'Considered',
  denied: 'Denied',
};

// Statuses that only admin/principal can set
export const ADMIN_STATUS_OPTIONS: GrievanceStatus[] = ['solved', 'considered', 'denied'];

// Statuses that staff/HOD can set
export const STAFF_STATUS_OPTIONS: GrievanceStatus[] = ['resolved', 'rejected', 'escalated'];

// Labels for staff actions
export const STAFF_ACTION_LABELS: Record<string, string> = {
  resolved: 'Solved',
  rejected: 'Rejected',
  escalated: 'Forward to Principal',
};

export interface ActivityLogItem {
  id: string;
  grievance_id: number;
  ticket_number: string;
  grievance_subject: string;
  from_status: GrievanceStatus | null;
  to_status: GrievanceStatus;
  changed_by_name: string;
  changed_by_type: string;
  reason?: string;
  created_at: string;
}

export interface DepartmentStatItem {
  department: string;
  count: number;
}

export interface PrincipalDashboardResponse {
  stats: {
    totalGrievances: number;
    pendingEscalations: number;
    resolvedToday: number;
    underReview: number;
    rejected: number;
    pending7Days: number;
    averageResolutionHours: number;
    averageResolutionTime: string;
  };
  departmentStats: DepartmentStatItem[];
  monthlyStats: { month: string; count: number }[];
  categoryStats: { category: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  recentEscalations: any[];
  recentResolved: any[];
  recentActivities: ActivityLogItem[];
  unreadNotifications: number;
  timestamp: string;
}

