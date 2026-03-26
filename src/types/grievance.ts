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
