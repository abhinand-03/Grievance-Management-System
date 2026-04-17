import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { grievancesApi, commentsApi } from '@/services/api';
import { Grievance } from '@/types/grievance';
import { 
  CATEGORY_LABELS, 
  GrievanceStatus, 
  STATUS_LABELS,
  ADMIN_STATUS_OPTIONS,
  STAFF_STATUS_OPTIONS,
  STAFF_ACTION_LABELS
} from '@/types/grievance';
import { format } from 'date-fns';
import {
  Home,
  FileText,
  User,
  Calendar,
  Paperclip,
  MessageSquare,
  Send,
  Clock,
  CheckCircle2,
  ArrowLeft,
  EyeOff,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function GrievanceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [newStatus, setNewStatus] = useState<GrievanceStatus | ''>('');
  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const transformGrievanceData = (data: any): Grievance => ({
    ...data,
    ticketNumber: data.ticket_number,
    studentId: String(data.student_id),
    studentName: data.student_name,
    studentEmail: data.student_email,
    isAnonymous: Boolean(data.is_anonymous),
    assignedTo: data.assigned_to ? String(data.assigned_to) : undefined,
    assignedToName: data.assigned_to_name,
    statusLogs: (data.statusLogs || []).map((log: any) => ({
      ...log,
      fromStatus: log.from_status,
      toStatus: log.to_status,
      changedBy: log.changed_by,
      changedByName: log.changed_by_name,
      createdAt: new Date(log.created_at)
    })),
    comments: (data.comments || []).map((c: any) => ({
      ...c,
      grievanceId: c.grievance_id,
      userId: c.user_id,
      userName: c.user_name,
      userRole: c.user_role,
      isInternal: Boolean(c.is_internal),
      createdAt: new Date(c.created_at)
    })),
    attachments: data.attachments || [],
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    resolvedAt: data.resolved_at ? new Date(data.resolved_at) : undefined,
    escalatedAt: data.escalated_at ? new Date(data.escalated_at) : undefined,
  });

  const fetchGrievance = useCallback(async (showLoading = true) => {
    if (!id) return;
    try {
      if (showLoading) setLoading(true);
      setRefreshing(true);
      const data = await grievancesApi.getById(id);
      setGrievance(transformGrievanceData(data));
    } catch (error) {
      console.error('Failed to fetch grievance:', error);
      setGrievance(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  // Initial fetch
  useEffect(() => {
    fetchGrievance();
  }, [fetchGrievance]);

  // Auto-refresh every 15 seconds to get latest updates
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGrievance(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchGrievance]);

  // Refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => fetchGrievance(false);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchGrievance]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!grievance) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">Grievance not found</h2>
          <Button onClick={() => navigate('/grievances')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to list
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isStudent = user?.role === 'student';
  const canUpdateStatus = user?.role === 'staff' || user?.role === 'admin';
  const finalDecisionLog = [...grievance.statusLogs]
    .slice()
    .reverse()
    .find((log) => ['resolved', 'solved', 'considered', 'denied'].includes(log.toStatus));
  const finalDecisionLabel = grievance.status === 'solved'
    ? 'Solved by'
    : grievance.status === 'resolved'
      ? 'Resolved by'
      : finalDecisionLog
        ? 'Processed by'
        : '';

  const handleAddComment = async () => {
    if (!newComment.trim() || !id) {
      toast.error('Please enter a comment');
      return;
    }
    try {
      await commentsApi.add(id, newComment.trim());
      toast.success('Comment added successfully');
      setNewComment('');
      // Refresh grievance data
      await fetchGrievance(false);
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || !id) {
      toast.error('Please select a status');
      return;
    }
    try {
      await grievancesApi.update(id, { status: newStatus });
      toast.success(`Status updated to ${STATUS_LABELS[newStatus]}`);
      setNewStatus('');
      // Refresh grievance data
      await fetchGrievance(false);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/dashboard" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Dashboard
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/grievances">Grievances</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{grievance.ticketNumber}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {grievance.ticketNumber}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-sm text-muted-foreground">
                {CATEGORY_LABELS[grievance.category]}
              </span>
              {grievance.isAnonymous && (
                <>
                  <span className="text-muted-foreground/40">•</span>
                  <span className="flex items-center gap-1 text-sm text-amber-600">
                    <EyeOff className="h-3.5 w-3.5" />
                    Anonymous
                  </span>
                </>
              )}
            </div>
            <h1 className="text-2xl font-bold font-display text-foreground mb-3">
              {grievance.subject}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={grievance.status} />
            </div>
          </div>

          {canUpdateStatus && (
            <div className="flex flex-col gap-3 p-4 bg-card rounded-xl border border-border shadow-card">
              {user?.role === 'admin' && grievance.status === 'escalated' && (
                <div className="text-sm text-muted-foreground mb-1">
                  <AlertTriangle className="h-4 w-4 inline mr-1 text-purple-600" />
                  Escalated by HOD - Requires Principal Decision
                </div>
              )}
              {user?.role === 'staff' && (
                <div className="text-sm text-muted-foreground mb-1">
                  Take action on this grievance
                </div>
              )}
              <div className="flex items-center gap-3">
                <Select value={newStatus} onValueChange={(v) => setNewStatus(v as GrievanceStatus)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder={user?.role === 'admin' ? "Principal Decision" : "Select Action"} />
                  </SelectTrigger>
                  <SelectContent>
                    {user?.role === 'admin' ? (
                      // Admin (Principal) can only set solved, considered, denied
                      ADMIN_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </SelectItem>
                      ))
                    ) : (
                      // Staff/HOD options: Solved, Rejected, Forward to Principal
                      STAFF_STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          {STAFF_ACTION_LABELS[status]}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button onClick={handleUpdateStatus} disabled={!newStatus}>
                  {user?.role === 'admin' ? 'Submit Decision' : 'Submit'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {grievance.description}
                </p>
              </CardContent>
            </Card>

            {/* Attachments */}
            {grievance.attachments.length > 0 && (
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                    Attachments ({grievance.attachments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {grievance.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
                      >
                        <div className="p-2 bg-accent/10 rounded">
                          <FileText className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(attachment.size / 1024).toFixed(1)} KB
                          </p>
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-accent hover:underline"
                          >
                            Open file
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comments */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  Comments ({grievance.comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Comment List */}
                {grievance.comments.length > 0 ? (
                  <div className="space-y-4">
                    {grievance.comments.map((comment) => (
                      <div key={comment.id} className="flex gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-accent/10 text-accent text-sm">
                            {comment.userName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{comment.userName}</span>
                            <span className="text-xs text-muted-foreground capitalize">
                              ({comment.userRole})
                            </span>
                            <span className="text-xs text-muted-foreground">
                              • {format(comment.createdAt, 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          <p className="text-sm text-foreground bg-secondary/30 p-3 rounded-lg">
                            {comment.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">
                    No comments yet. Be the first to add one.
                  </p>
                )}

                {/* Add Comment */}
                <div className="pt-4 border-t border-border">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="mb-3"
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleAddComment}>
                      <Send className="h-4 w-4 mr-2" />
                      Post Comment
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Details Card */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!grievance.isAnonymous && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Submitted by</p>
                      <p className="font-medium">{grievance.studentName}</p>
                      <p className="text-sm text-muted-foreground">{grievance.studentEmail}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted on</p>
                    <p className="font-medium">
                      {format(grievance.createdAt, 'MMMM d, yyyy')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {format(grievance.createdAt, 'h:mm a')}
                    </p>
                  </div>
                </div>

                {grievance.assignedToName && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Assigned to</p>
                      <p className="font-medium">{grievance.assignedToName}</p>
                    </div>
                  </div>
                )}

                {grievance.resolvedAt && (
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-status-resolved mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Resolved on</p>
                      <p className="font-medium">
                        {format(grievance.resolvedAt, 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}

                {finalDecisionLog && finalDecisionLabel && (
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">{finalDecisionLabel}</p>
                      <p className="font-medium">{finalDecisionLog.changedByName}</p>
                    </div>
                  </div>
                )}

                {grievance.escalatedAt && (
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Escalated on</p>
                      <p className="font-medium">
                        {format(grievance.escalatedAt, 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Status Timeline */}
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Status History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {grievance.statusLogs.map((log, index) => (
                    <div key={log.id} className="flex gap-3 pb-4 last:pb-0">
                      <div className="relative">
                        <div className="h-3 w-3 rounded-full bg-accent mt-1.5" />
                        {index !== grievance.statusLogs.length - 1 && (
                          <div className="absolute top-4 left-1.5 w-0.5 h-full -translate-x-1/2 bg-border" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {log.fromStatus
                            ? `${STATUS_LABELS[log.fromStatus]} → ${STATUS_LABELS[log.toStatus]}`
                            : `Created as ${STATUS_LABELS[log.toStatus]}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.toStatus === 'solved'
                            ? `Solved by ${log.changedByName}`
                            : log.toStatus === 'resolved'
                              ? `Resolved by ${log.changedByName}`
                              : `by ${log.changedByName}`} • {format(log.createdAt, 'MMM d, h:mm a')}
                        </p>
                        {log.reason && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            "{log.reason}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
