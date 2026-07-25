import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { EscalationTable } from '@/components/EscalationTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { escalationsApi, commentsApi } from '@/services/api';
import { EscalatedGrievance, CATEGORY_LABELS, ADMIN_STATUS_OPTIONS, STATUS_LABELS } from '@/types/grievance';
import { toast } from 'sonner';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  AlertCircle,
  Zap,
  User,
  TrendingUp,
  ShieldAlert,
  Filter,
  X,
} from 'lucide-react';

// ─── Departments list (matching the students table) ───────────────────────────
const DEPARTMENTS = [
  'Computer Science',
  'Business Administration',
  'Engineering',
  'Library',
  'Mens Hostel',
  'Womens Hostel',
  'Canteen',
];

// ─── Filter state type ────────────────────────────────────────────────────────
interface Filters {
  search: string;
  department: string;
  category: string;
  status: string;
  priority: string;
  escalation_type: string;
  date_from: string;
  date_to: string;
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  department: '',
  category: '',
  status: '',
  priority: '',
  escalation_type: '',
  date_from: '',
  date_to: '',
};

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  label, value, icon: Icon, color,
}: { label: string; value: number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <Card className="shadow-card">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function EscalationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [escalations, setEscalations]   = useState<EscalatedGrievance[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [autoEscMsg, setAutoEscMsg]     = useState<string | null>(null);
  const [filters, setFilters]           = useState<Filters>(DEFAULT_FILTERS);
  const [activeFilters, setActiveFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [summary, setSummary] = useState({ total: 0, manual_count: 0, auto_count: 0, critical_count: 0 });

  // Dialog — Update Status
  const [statusDialogOpen, setStatusDialogOpen]   = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<EscalatedGrievance | null>(null);
  const [newStatus, setNewStatus]   = useState<'solved' | 'considered' | 'denied' | ''>('');
  const [statusReason, setStatusReason] = useState('');
  const [submittingStatus, setSubmittingStatus] = useState(false);

  // Dialog — Add Remark
  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
  const [remarkGrievance, setRemarkGrievance]   = useState<EscalatedGrievance | null>(null);
  const [remarkText, setRemarkText]             = useState('');
  const [submittingRemark, setSubmittingRemark] = useState(false);

  // ── Redirect non-admin ──────────────────────────────────────────────────────
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
      toast.error('Unauthorized access');
    }
  }, [user, navigate]);

  // ── Transform raw API row → EscalatedGrievance ──────────────────────────────
  const transform = (g: any): EscalatedGrievance => ({
    ...g,
    id:                String(g.id),
    ticketNumber:      g.ticket_number,
    studentId:         String(g.student_id),
    studentName:       g.student_name,
    studentEmail:      g.student_email,
    isAnonymous:       Boolean(g.is_anonymous),
    priority:          g.priority || 'medium',
    assignedTo:        g.assigned_to ? String(g.assigned_to) : undefined,
    assignedToName:    g.assigned_to_name,
    attachments:       g.attachments  || [],
    comments:          g.comments     || [],
    statusLogs:        g.statusLogs   || [],
    createdAt:         new Date(g.created_at),
    updatedAt:         new Date(g.updated_at),
    resolvedAt:        g.resolved_at       ? new Date(g.resolved_at)       : undefined,
    escalatedAt:       g.escalated_at      ? new Date(g.escalated_at)      : undefined,
    // Escalation-specific
    isEscalated:       Boolean(g.is_escalated),
    escalatedTo:       g.escalated_to      || undefined,
    escalationType:    g.escalation_type   || undefined,
    escalatedByName:   g.escalated_by_name || undefined,
    escalationReason:  g.escalation_reason || undefined,
    escalationDate:    g.escalation_date   ? new Date(g.escalation_date)   : undefined,
    pendingWorkingDays: Number(g.pending_working_days ?? 0),
    // Student JOIN fields
    registerNumber:    g.register_number    || undefined,
    studentDepartment: g.student_department || undefined,
  });

  // ── Fetch escalated grievances ───────────────────────────────────────────────
  const fetchEscalations = useCallback(async (showLoading = true, appliedFilters = activeFilters) => {
    if (!user || user.role !== 'admin') return;
    try {
      if (showLoading) setLoading(true);
      setRefreshing(true);
      setError(null);

      const params: Record<string, string | number> = { limit: 100 };
      if (appliedFilters.search)         params.search         = appliedFilters.search;
      if (appliedFilters.department)     params.department     = appliedFilters.department;
      if (appliedFilters.category)       params.category       = appliedFilters.category;
      if (appliedFilters.status)         params.status         = appliedFilters.status;
      if (appliedFilters.priority)       params.priority       = appliedFilters.priority;
      if (appliedFilters.escalation_type) params.escalation_type = appliedFilters.escalation_type;
      if (appliedFilters.date_from)      params.date_from      = appliedFilters.date_from;
      if (appliedFilters.date_to)        params.date_to        = appliedFilters.date_to;

      const resp = await escalationsApi.getAll(params as any);
      setEscalations((resp.escalations || []).map(transform));
      if (resp.summary) setSummary(resp.summary);
    } catch (err: any) {
      console.error('Failed to fetch escalations:', err);
      setError(err?.message || 'Failed to load escalated grievances. Please try again.');
      setEscalations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, activeFilters]);

  // ── Trigger auto-escalation silently on mount ───────────────────────────────
  const triggerAutoEscalate = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    try {
      const result = await escalationsApi.runAutoEscalate();
      if (result.escalated > 0) {
        setAutoEscMsg(`${result.escalated} grievance${result.escalated > 1 ? 's were' : ' was'} automatically escalated (overdue > 7 working days).`);
      }
    } catch {
      // Silent — don't block UI for auto-escalation errors
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'admin') {
      // First trigger auto-escalation, then fetch the list
      triggerAutoEscalate().then(() => fetchEscalations());
    }
  }, [user]);

  // Auto-refresh every 60 s
  useEffect(() => {
    const id = setInterval(() => fetchEscalations(false), 60000);
    return () => clearInterval(id);
  }, [fetchEscalations]);

  // ── Apply filters ────────────────────────────────────────────────────────────
  const applyFilters = () => {
    setActiveFilters(filters);
    fetchEscalations(true, filters);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setActiveFilters(DEFAULT_FILTERS);
    fetchEscalations(true, DEFAULT_FILTERS);
  };

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);

  // ── Handle status update ─────────────────────────────────────────────────────
  const openStatusDialog = (g: EscalatedGrievance) => {
    setSelectedGrievance(g);
    setNewStatus('');
    setStatusReason('');
    setStatusDialogOpen(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedGrievance || !newStatus) {
      toast.error('Please select a decision status');
      return;
    }
    try {
      setSubmittingStatus(true);
      await escalationsApi.updateStatus(selectedGrievance.id, {
        status: newStatus,
        reason: statusReason || undefined,
      });
      toast.success(`Grievance marked as "${STATUS_LABELS[newStatus]}"`);
      setStatusDialogOpen(false);
      fetchEscalations(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status');
    } finally {
      setSubmittingStatus(false);
    }
  };

  // ── Handle add remark ────────────────────────────────────────────────────────
  const openRemarkDialog = (g: EscalatedGrievance) => {
    setRemarkGrievance(g);
    setRemarkText('');
    setRemarkDialogOpen(true);
  };

  const handleAddRemark = async () => {
    if (!remarkGrievance || !remarkText.trim()) {
      toast.error('Please enter a remark');
      return;
    }
    try {
      setSubmittingRemark(true);
      await commentsApi.add(remarkGrievance.id, remarkText.trim());
      toast.success('Remark added successfully');
      setRemarkDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add remark');
    } finally {
      setSubmittingRemark(false);
    }
  };

  // ── Skeleton ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
          </div>
          <div className="h-12 bg-muted rounded-xl animate-pulse" />
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              Escalations
            </h1>
            <p className="text-muted-foreground mt-0.5">
              Grievances forwarded manually by staff or auto-escalated after 7 working days
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchEscalations(false)}
              disabled={refreshing}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const r = await escalationsApi.runAutoEscalate();
                  toast.success(r.message);
                  fetchEscalations(false);
                } catch {
                  toast.error('Auto-escalation check failed');
                }
              }}
              className="gap-2"
            >
              <Zap className="h-4 w-4 text-purple-500" />
              Run Auto-Escalate
            </Button>
          </div>
        </div>

        {/* ── Auto-escalation notification ── */}
        {autoEscMsg && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-200 text-purple-800 text-sm">
            <Zap className="h-4 w-4 shrink-0" />
            <span>{autoEscMsg}</span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto h-6 w-6 text-purple-600"
              onClick={() => setAutoEscMsg(null)}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* ── Error state ── */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span className="flex-1 text-sm">{error}</span>
            <Button size="sm" variant="outline" onClick={() => fetchEscalations()}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        )}

        {/* ── Stats cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Escalated"  value={summary.total}          icon={AlertTriangle}  color="bg-orange-100 text-orange-600" />
          <StatCard label="Manual (by Staff)" value={summary.manual_count}  icon={User}           color="bg-blue-100 text-blue-600" />
          <StatCard label="Automatic (7-day)" value={summary.auto_count}    icon={Zap}            color="bg-purple-100 text-purple-600" />
          <StatCard label="Critical Priority"  value={summary.critical_count} icon={ShieldAlert}   color="bg-red-100 text-red-600" />
        </div>

        {/* ── Filters ── */}
        <div className="p-4 bg-card rounded-xl border border-border shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Filter className="h-4 w-4" /> Filters
            </span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                <X className="h-3.5 w-3.5 mr-1" /> Clear all
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student, register no., ticket…"
                value={filters.search}
                onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                className="pl-10"
              />
            </div>

            {/* Department */}
            <Select value={filters.department} onValueChange={(v) => setFilters(f => ({ ...f, department: v === 'all' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>

            {/* Category */}
            <Select value={filters.category} onValueChange={(v) => setFilters(f => ({ ...f, category: v === 'all' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={filters.status} onValueChange={(v) => setFilters(f => ({ ...f, status: v === 'all' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {(['escalated','solved','considered','denied'] as const).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority */}
            <Select value={filters.priority} onValueChange={(v) => setFilters(f => ({ ...f, priority: v === 'all' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {(['critical','high','medium','low'] as const).map(p => (
                  <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Escalation type */}
            <Select value={filters.escalation_type} onValueChange={(v) => setFilters(f => ({ ...f, escalation_type: v === 'all' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Escalation Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="manual">Manual (by Staff)</SelectItem>
                <SelectItem value="automatic">Automatic (7-day)</SelectItem>
              </SelectContent>
            </Select>

            {/* Date from */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Escalated From</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters(f => ({ ...f, date_from: e.target.value }))}
              />
            </div>

            {/* Date to */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Escalated To</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters(f => ({ ...f, date_to: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={applyFilters} className="gap-2">
              <TrendingUp className="h-4 w-4" /> Apply Filters
            </Button>
          </div>
        </div>

        {/* ── Results count ── */}
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-semibold text-foreground">{escalations.length}</span> escalated grievance{escalations.length !== 1 ? 's' : ''}
          {hasActiveFilters && ' (filtered)'}
        </p>

        {/* ── Table ── */}
        <EscalationTable
          grievances={escalations}
          onStatusUpdate={openStatusDialog}
          onAddRemark={openRemarkDialog}
        />

      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          Dialog — Update Status (Principal Decision)
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Principal Decision
            </DialogTitle>
            <DialogDescription>
              Set the final status for{' '}
              <span className="font-mono font-semibold">
                {selectedGrievance?.ticketNumber}
              </span>
              {selectedGrievance && (
                <span className="block mt-1 font-medium text-foreground">
                  {selectedGrievance.subject}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedGrievance && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                Current status: <StatusBadge status={selectedGrievance.status} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="esc-status">Decision *</Label>
              <Select value={newStatus} onValueChange={(v) => setNewStatus(v as any)}>
                <SelectTrigger id="esc-status">
                  <SelectValue placeholder="Select decision…" />
                </SelectTrigger>
                <SelectContent>
                  {ADMIN_STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="esc-reason">Reason / Remarks (optional)</Label>
              <Textarea
                id="esc-reason"
                placeholder="Add a reason for your decision…"
                rows={3}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)} disabled={submittingStatus}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={!newStatus || submittingStatus}>
              {submittingStatus ? 'Submitting…' : 'Submit Decision'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          Dialog — Add Remark / Comment
      ═══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={remarkDialogOpen} onOpenChange={setRemarkDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Remark</DialogTitle>
            <DialogDescription>
              Leave a remark on{' '}
              <span className="font-mono font-semibold">
                {remarkGrievance?.ticketNumber}
              </span>
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Textarea
              placeholder="Type your remark here…"
              rows={4}
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRemarkDialogOpen(false)} disabled={submittingRemark}>
              Cancel
            </Button>
            <Button onClick={handleAddRemark} disabled={!remarkText.trim() || submittingRemark}>
              {submittingRemark ? 'Posting…' : 'Post Remark'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
