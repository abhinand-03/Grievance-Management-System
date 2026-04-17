import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { GrievanceCard } from '@/components/GrievanceCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { grievancesApi } from '@/services/api';
import { Grievance } from '@/types/grievance';
import { 
  GrievanceStatus, 
  GrievanceCategory,
  STATUS_LABELS,
  CATEGORY_LABELS,
} from '@/types/grievance';
import { Search, Filter, PlusCircle, SlidersHorizontal, RefreshCw } from 'lucide-react';

export default function GrievanceList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GrievanceStatus | 'all' | 'faculty_resolved'>('all');
  const [categoryFilter, setCategoryFilter] = useState<GrievanceCategory | 'all'>('all');
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGrievances = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setRefreshing(true);
      const params: Record<string, string> = {};
      if (statusFilter === 'faculty_resolved') {
        params.adminView = 'faculty_resolved';
      } else if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (categoryFilter !== 'all') params.category = categoryFilter;
      const response = await grievancesApi.getAll(params);
      // Transform API response from snake_case to camelCase
      const transformedGrievances = (response.grievances || []).map((g: any) => ({
        ...g,
        ticketNumber: g.ticket_number,
        studentId: String(g.student_id),
        studentName: g.student_name,
        studentEmail: g.student_email,
        isAnonymous: Boolean(g.is_anonymous),
        assignedTo: g.assigned_to ? String(g.assigned_to) : undefined,
        assignedToName: g.assigned_to_name,
        attachments: g.attachments || [],
        comments: g.comments || [],
        statusLogs: g.statusLogs || [],
        createdAt: new Date(g.created_at),
        updatedAt: new Date(g.updated_at),
        resolvedAt: g.resolved_at ? new Date(g.resolved_at) : undefined,
        escalatedAt: g.escalated_at ? new Date(g.escalated_at) : undefined,
      }));
      setGrievances(transformedGrievances);
    } catch (error) {
      console.error('Failed to fetch grievances:', error);
      setGrievances([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, categoryFilter]);

  // Initial fetch and when filters change
  useEffect(() => {
    fetchGrievances();
  }, [fetchGrievances]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchGrievances(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchGrievances]);

  // Refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => fetchGrievances(false);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchGrievances]);

  // Filter grievances by search query (client-side)
  const filteredGrievances = grievances.filter((grievance) => {
    const matchesSearch = 
      grievance.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grievance.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      grievance.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const isStudent = user?.role === 'student';
  const isPrincipal = user?.role === 'admin';

  const principalStatusOptions: { value: GrievanceStatus | 'faculty_resolved'; label: string }[] = [
    { value: 'escalated', label: STATUS_LABELS.escalated },
    { value: 'solved', label: STATUS_LABELS.solved },
    { value: 'considered', label: STATUS_LABELS.considered },
    { value: 'denied', label: STATUS_LABELS.denied },
    { value: 'faculty_resolved', label: 'Solved by Faculty (Not Forwarded)' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">
              {isStudent ? 'My Grievances' : 'All Grievances'}
            </h1>
            <p className="text-muted-foreground">
              {filteredGrievances.length} grievance{filteredGrievances.length !== 1 ? 's' : ''} found
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

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4 p-4 bg-card rounded-xl border border-border shadow-card">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by subject, ticket number, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Selects */}
          <div className="flex flex-wrap gap-3">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {isPrincipal
                  ? principalStatusOptions.map((statusOption) => (
                      <SelectItem key={statusOption.value} value={statusOption.value}>
                        {statusOption.label}
                      </SelectItem>
                    ))
                  : (Object.keys(STATUS_LABELS) as GrievanceStatus[]).map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {(Object.keys(CATEGORY_LABELS) as GrievanceCategory[]).map((category) => (
                  <SelectItem key={category} value={category}>
                    {CATEGORY_LABELS[category]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Grievance Grid */}
        {filteredGrievances.length > 0 ? (
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
        ) : (
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
        )}
      </div>
    </DashboardLayout>
  );
}
