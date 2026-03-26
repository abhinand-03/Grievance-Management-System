import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatsCard } from '@/components/StatsCard';
import { GrievanceCard } from '@/components/GrievanceCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { grievancesApi } from '@/services/api';
import { Grievance, DashboardStats } from '@/types/grievance';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  BarChart3,
  ThumbsUp,
  Eye,
  Ban,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { CATEGORY_LABELS, GrievanceCategory } from '@/types/grievance';

const COLORS = ['#0d9488', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#10b981', '#6b7280'];

const defaultStats: DashboardStats = {
  totalGrievances: 0,
  pending: 0,
  inReview: 0,
  resolved: 0,
  rejected: 0,
  escalated: 0,
  solved: 0,
  considered: 0,
  denied: 0,
  avgResolutionTime: 0,
  categoryBreakdown: { academics: 0, library: 0, mens_hostel: 0, womens_hostel: 0, canteen: 0 },
  priorityBreakdown: { low: 0, medium: 0, high: 0, critical: 0 },
  monthlyTrend: [],
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setRefreshing(true);
      const [statsData, grievancesData] = await Promise.all([
        grievancesApi.getStats(),
        grievancesApi.getAll({ limit: 10 })
      ]);
      // Merge API response with defaults to ensure all fields are present
      setStats({
        ...defaultStats,
        ...statsData,
        totalGrievances: Number(statsData?.totalGrievances) || 0,
        pending: Number(statsData?.pending) || 0,
        inReview: Number(statsData?.inReview) || 0,
        resolved: Number(statsData?.resolved) || 0,
        rejected: Number(statsData?.rejected) || 0,
        escalated: Number(statsData?.escalated) || 0,
        solved: Number(statsData?.solved) || 0,
        considered: Number(statsData?.considered) || 0,
        denied: Number(statsData?.denied) || 0,
        avgResolutionTime: Number(statsData?.avgResolutionTime) || 0,
        categoryBreakdown: statsData?.categoryBreakdown || defaultStats.categoryBreakdown,
        priorityBreakdown: statsData?.priorityBreakdown || defaultStats.priorityBreakdown,
        monthlyTrend: statsData?.monthlyTrend || [],
      });
      // Transform API response from snake_case to camelCase
      const transformedGrievances = (grievancesData.grievances || []).map((g: any) => ({
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
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Refresh when window gains focus
  useEffect(() => {
    const handleFocus = () => fetchData(false);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchData]);

  const recentGrievances = grievances.slice(0, 3);

  // Prepare chart data
  const categoryData = Object.entries(stats.categoryBreakdown).map(([key, value]) => ({
    name: CATEGORY_LABELS[key as GrievanceCategory],
    value,
  }));

  const StudentDashboard = () => (
    <>
      {/* Welcome Banner */}
      <div className="gradient-primary rounded-2xl p-6 sm:p-8 mb-8 text-primary-foreground">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display mb-2">
              Welcome back, {user?.name?.split(' ')[0]}!
            </h1>
            <p className="text-primary-foreground/80">
              Track your grievances and submit new ones from your dashboard.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button 
              variant="heroOutline" 
              size="icon"
              onClick={() => fetchData(false)}
              disabled={refreshing}
              title="Refresh"
            >
              <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              variant="heroOutline" 
              size="lg"
              onClick={() => navigate('/grievance/new')}
            >
              <PlusCircle className="h-5 w-5 mr-2" />
              New Grievance
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Total Submitted"
          value={stats.totalGrievances}
          icon={FileText}
          variant="primary"
          subtitle="All time"
        />
        <StatsCard
          title="Pending"
          value={stats.pending}
          icon={Clock}
          variant="warning"
          subtitle="Awaiting review"
        />
        <StatsCard
          title="Resolved"
          value={stats.resolved}
          icon={CheckCircle2}
          variant="success"
          subtitle="Successfully closed"
        />
        <StatsCard
          title="In Review"
          value={stats.inReview}
          icon={TrendingUp}
          variant="accent"
          subtitle="Being processed"
        />
      </div>

      {/* Recent Grievances */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold font-display">Recent Grievances</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/grievances')}>
            View all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {recentGrievances.map((grievance) => (
            <GrievanceCard
              key={grievance.id}
              grievance={grievance}
              showStudent={false}
              onClick={() => navigate(`/grievance/${grievance.id}`)}
            />
          ))}
        </div>
      </div>
    </>
  );

  const StaffDashboard = () => (
    <>
      {/* Welcome Banner */}
      <div className="gradient-primary rounded-2xl p-6 sm:p-8 mb-8 text-primary-foreground">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display mb-2">
              Staff Dashboard
            </h1>
            <p className="text-primary-foreground/80">
              Review and manage assigned grievances. {stats.pending} pending your attention.
            </p>
          </div>
          <Button 
            variant="heroOutline" 
            size="icon"
            onClick={() => fetchData(false)}
            disabled={refreshing}
            title="Refresh"
            className="flex-shrink-0"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Assigned to You"
          value={stats.pending + stats.inReview}
          icon={FileText}
          variant="primary"
        />
        <StatsCard
          title="Pending Review"
          value={stats.pending}
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          title="In Progress"
          value={stats.inReview}
          icon={TrendingUp}
          variant="accent"
        />
        <StatsCard
          title="Resolved (This Month)"
          value={stats.resolved}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* Grievances List */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold font-display">Requires Attention</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/grievances')}>
            View all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grievances
            .filter(g => g.status === 'pending' || g.status === 'in_review')
            .slice(0, 3)
            .map((grievance) => (
              <GrievanceCard
                key={grievance.id}
                grievance={grievance}
                onClick={() => navigate(`/grievance/${grievance.id}`)}
              />
            ))}
        </div>
      </div>
    </>
  );

  const AdminDashboard = () => (
    <>
      {/* Welcome Banner */}
      <div className="gradient-primary rounded-2xl p-6 sm:p-8 mb-8 text-primary-foreground">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display mb-2">
              Principal Dashboard
            </h1>
            <p className="text-primary-foreground/80">
              Review escalated grievances forwarded by HODs. {stats.escalated} awaiting your decision.
            </p>
          </div>
          <Button 
            variant="heroOutline" 
            size="icon"
            onClick={() => fetchData(false)}
            disabled={refreshing}
            title="Refresh"
            className="flex-shrink-0"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Stats Grid - Principal specific */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Awaiting Decision"
          value={stats.escalated}
          icon={AlertTriangle}
          variant="danger"
          subtitle="Escalated by HODs"
        />
        <StatsCard
          title="Solved"
          value={stats.solved || 0}
          icon={ThumbsUp}
          variant="success"
          subtitle="Resolved by Principal"
        />
        <StatsCard
          title="Considered"
          value={stats.considered || 0}
          icon={Eye}
          variant="accent"
          subtitle="Under consideration"
        />
        <StatsCard
          title="Denied"
          value={stats.denied || 0}
          icon={Ban}
          variant="warning"
          subtitle="Request denied"
        />
      </div>

      {/* Escalated Grievances - Requires Principal Decision */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold font-display flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-purple-600" />
            Escalated Grievances - Awaiting Decision
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/grievances')}>
            View all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {grievances.filter(g => g.status === 'escalated').length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <p>No escalated grievances pending your decision.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {grievances
              .filter(g => g.status === 'escalated')
              .slice(0, 6)
              .map((grievance) => (
                <GrievanceCard
                  key={grievance.id}
                  grievance={grievance}
                  onClick={() => navigate(`/grievance/${grievance.id}`)}
                />
              ))}
          </div>
        )}
      </div>

      {/* Recently Processed by Principal */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold font-display">
            Recently Processed
          </h2>
        </div>
        {grievances.filter(g => ['solved', 'considered', 'denied'].includes(g.status)).length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No processed grievances yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {grievances
              .filter(g => ['solved', 'considered', 'denied'].includes(g.status))
              .slice(0, 3)
              .map((grievance) => (
                <GrievanceCard
                  key={grievance.id}
                  grievance={grievance}
                  onClick={() => navigate(`/grievance/${grievance.id}`)}
                />
              ))}
          </div>
        )}
      </div>
    </>
  );

  return (
    <DashboardLayout>
      {user?.role === 'student' && <StudentDashboard />}
      {user?.role === 'staff' && <StaffDashboard />}
      {user?.role === 'admin' && <AdminDashboard />}
    </DashboardLayout>
  );
}
