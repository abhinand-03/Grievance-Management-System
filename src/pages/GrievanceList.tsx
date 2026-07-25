import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { GrievanceCard } from '@/components/GrievanceCard';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { grievancesApi } from '@/services/api';
import { Grievance } from '@/types/grievance';
import {
  GrievanceStatus,
  GrievanceCategory,
  STATUS_LABELS,
  CATEGORY_LABELS,
} from '@/types/grievance';
import {
  Search,
  Filter,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  User,
  Hash,
  Building2,
  Tag,
  Calendar,
  Shield,
} from 'lucide-react';

// Extended grievance type that includes fields returned from the backend JOIN
interface GrievanceWithStudentInfo extends Grievance {
  registerNumber?: string;
  studentDepartment?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high:     'bg-orange-100 text-orange-800 border-orange-200',
  medium:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  low:      'bg-green-100 text-green-800 border-green-200',
};

export default function GrievanceList() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery]       = useState('');
  const [statusFilter, setStatusFilter]     = useState<GrievanceStatus | 'all' | 'faculty_resolved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<GrievanceCategory | 'all'>('all');

  const [grievances, setGrievances] = useState<GrievanceWithStudentInfo[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const isStudent   = user?.role === 'student';
  const isPrincipal = user?.role === 'admin';

  // ─── Fetch grievances ────────────────────────────────────────────────────────
  const fetchGrievances = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setRefreshing(true);
      setError(null);

      const params: Record<string, string | number> = {};

      // Bug Fix #5 (frontend): pass a large limit so admin/staff never get
      // silently truncated to the default 10-record page.
      if (!isStudent) {
        params.limit = 100;
      }

      if (statusFilter === 'faculty_resolved') {
        params.adminView = 'faculty_resolved';
      } else if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (categoryFilter !== 'all') params.category = categoryFilter;

      const response = await grievancesApi.getAll(params as any);

      // Transform API response from snake_case → camelCase and include new JOIN fields
      const transformed: GrievanceWithStudentInfo[] = (response.grievances || []).map((g: any) => ({
        ...g,
        ticketNumber:      g.ticket_number,
        studentId:         String(g.student_id),
        studentName:       g.student_name,
        studentEmail:      g.student_email,
        isAnonymous:       Boolean(g.is_anonymous),
        assignedTo:        g.assigned_to    ? String(g.assigned_to)    : undefined,
        assignedToName:    g.assigned_to_name,
        attachments:       g.attachments    || [],
        comments:          g.comments       || [],
        statusLogs:        g.statusLogs     || [],
        createdAt:         new Date(g.created_at),
        updatedAt:         new Date(g.updated_at),
        resolvedAt:        g.resolved_at    ? new Date(g.resolved_at)  : undefined,
        escalatedAt:       g.escalated_at   ? new Date(g.escalated_at) : undefined,
        // New: fields from the students JOIN (Bug Fix #3)
        registerNumber:    g.register_number    || undefined,
        studentDepartment: g.student_department || undefined,
        priority:          g.priority           || 'medium',
      }));

      setGrievances(transformed);
    } catch (err: any) {
      console.error('Failed to fetch grievances:', err);
      setError(err?.message || 'Failed to load grievances. Please try again.');
      setGrievances([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, categoryFilter, isStudent]);

  // Initial fetch + on filter change
  useEffect(() => {
    fetchGrievances();
  }, [fetchGrievances]);

  // Auto-refresh every 30 s
  useEffect(() => {
    const id = setInterval(() => fetchGrievances(false), 30000);
    return () => clearInterval(id);
  }, [fetchGrievances]);

  // Refresh on window focus
  useEffect(() => {
    const onFocus = () => fetchGrievances(false);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchGrievances]);

  // Client-side search filter
  const filteredGrievances = grievances.filter((g) => {
    const q = searchQuery.toLowerCase();
    return (
      g.subject.toLowerCase().includes(q) ||
      g.ticketNumber.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q) ||
      (g.studentName  && g.studentName.toLowerCase().includes(q)) ||
      (g.registerNumber && g.registerNumber.toLowerCase().includes(q)) ||
      (g.studentDepartment && g.studentDepartment.toLowerCase().includes(q))
    );
  });

  // ─── Status filter options ───────────────────────────────────────────────────
  const principalStatusOptions: { value: GrievanceStatus | 'faculty_resolved'; label: string }[] = [
    { value: 'pending',          label: STATUS_LABELS.pending },
    { value: 'in_review',        label: STATUS_LABELS.in_review },
    { value: 'resolved',         label: STATUS_LABELS.resolved },
    { value: 'rejected',         label: STATUS_LABELS.rejected },
    { value: 'escalated',        label: STATUS_LABELS.escalated },
    { value: 'solved',           label: STATUS_LABELS.solved },
    { value: 'considered',       label: STATUS_LABELS.considered },
    { value: 'denied',           label: STATUS_LABELS.denied },
    { value: 'faculty_resolved', label: 'Solved by Faculty (Not Forwarded)' },
  ];

  // ─── Skeleton loader ────────────────────────────────────────────────────────
  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  );

  // ─── Error state ─────────────────────────────────────────────────────────────
  const ErrorState = () => (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Failed to load grievances</h3>
      <p className="text-muted-foreground max-w-sm mx-auto mb-4">{error}</p>
      <Button onClick={() => fetchGrievances()}>
        <RefreshCw className="h-4 w-4 mr-2" />
        Retry
      </Button>
    </div>
  );

  // ─── Empty state ──────────────────────────────────────────────────────────────
  const EmptyState = () => (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
        <Filter className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No grievances found</h3>
      <p className="text-muted-foreground max-w-sm mx-auto">
        {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
          ? 'Try adjusting your filters or search query.'
          : isStudent
            ? "You haven't submitted any grievances yet."
            : 'No grievances in the system yet.'}
      </p>
      {isStudent && (
        <Button className="mt-4" onClick={() => navigate('/grievance/new')}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Submit Your First Grievance
        </Button>
      )}
    </div>
  );

  // ─── Principal table view ────────────────────────────────────────────────────
  const PrincipalTable = () => (
    <div className="rounded-xl border border-border overflow-hidden shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> Ticket ID</span>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Student</span>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" /> Reg. No.</span>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Dept.</span>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Category</span>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Subject</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Submitted</span>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Priority</span>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Assigned To</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filteredGrievances.map((g, idx) => (
              <tr
                key={g.id}
                onClick={() => navigate(`/grievance/${g.id}`)}
                className={`border-b border-border last:border-0 cursor-pointer transition-colors hover:bg-primary/5 ${
                  idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                }`}
              >
                {/* Ticket ID */}
                <td className="px-4 py-3 font-mono text-xs font-medium text-primary whitespace-nowrap">
                  {g.ticketNumber}
                </td>

                {/* Student name */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-medium">
                    {g.isAnonymous ? (
                      <span className="text-muted-foreground italic">Anonymous</span>
                    ) : (
                      g.studentName
                    )}
                  </span>
                </td>

                {/* Register Number */}
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {g.isAnonymous ? '—' : (g.registerNumber || '—')}
                </td>

                {/* Department */}
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                  {g.isAnonymous ? '—' : (g.studentDepartment || '—')}
                </td>

                {/* Category */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge variant="outline" className="text-xs capitalize">
                    {CATEGORY_LABELS[g.category] || g.category}
                  </Badge>
                </td>

                {/* Subject + description tooltip */}
                <td className="px-4 py-3 max-w-[220px]">
                  <p className="font-medium truncate" title={g.subject}>{g.subject}</p>
                  <p className="text-xs text-muted-foreground truncate" title={g.description}>
                    {g.description}
                  </p>
                </td>

                {/* Submitted date */}
                <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                  {g.createdAt.toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </td>

                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={g.status} />
                </td>

                {/* Priority */}
                <td className="px-4 py-3 whitespace-nowrap">
                  {g.priority ? (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${
                        PRIORITY_COLORS[g.priority] || PRIORITY_COLORS.medium
                      }`}
                    >
                      {g.priority}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>

                {/* Assigned staff */}
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {g.assignedToName || <span className="italic">Unassigned</span>}
                </td>

                {/* Row action */}
                <td className="px-4 py-3 text-right">
                  <ChevronRight className="h-4 w-4 text-muted-foreground inline-block" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ─── Card grid view (student + staff) ────────────────────────────────────────
  const CardGrid = () => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filteredGrievances.map((grievance) => (
        <GrievanceCard
          key={grievance.id}
          grievance={grievance}
          showStudent={!isStudent}
          onClick={() => navigate(`/grievance/${grievance.id}`)}
        />
      ))}
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">
              {isStudent ? 'My Grievances' : 'All Grievances'}
            </h1>
            <p className="text-muted-foreground">
              {loading
                ? 'Loading…'
                : `${filteredGrievances.length} grievance${filteredGrievances.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchGrievances(false)}
              disabled={refreshing}
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            {isStudent && (
              <Button onClick={() => navigate('/grievance/new')}>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Grievance
              </Button>
            )}
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-col lg:flex-row gap-4 p-4 bg-card rounded-xl border border-border shadow-card">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={
                isPrincipal
                  ? 'Search by subject, ticket number, student name, register no., department…'
                  : 'Search by subject, ticket number, or description…'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status filter */}
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {isPrincipal
                  ? principalStatusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))
                  : (Object.keys(STATUS_LABELS) as GrievanceStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>

            {/* Category filter */}
            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(Object.keys(CATEGORY_LABELS) as GrievanceCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState />
        ) : filteredGrievances.length === 0 ? (
          <EmptyState />
        ) : isPrincipal ? (
          <PrincipalTable />
        ) : (
          <CardGrid />
        )}

      </div>
    </DashboardLayout>
  );
}
