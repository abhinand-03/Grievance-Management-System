import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatsCard } from '@/components/StatsCard';
import { GrievanceCard } from '@/components/GrievanceCard';
import { Button } from '@/components/ui/button';
import { grievancesApi, principalDashboardApi } from '@/services/api';
import { Grievance, DashboardStats, PrincipalDashboardResponse } from '@/types/grievance';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { CATEGORY_LABELS } from '@/types/grievance';

// Principal Dashboard Modular Components
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { PrincipalStatsCards } from '@/components/dashboard/PrincipalStatsCards';
import { PrincipalCharts } from '@/components/dashboard/PrincipalCharts';


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

  // Student/Staff state
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  
  // Principal Dashboard state
  const [principalData, setPrincipalData] = useState<PrincipalDashboardResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── 1. Fetch Principal Dashboard Data (Admin Only) ──
  const fetchPrincipalData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setRefreshing(true);
      setError(null);

      const response = await principalDashboardApi.getDashboardData();
      setPrincipalData(response);
    } catch (err: any) {
      console.error('Failed to fetch principal dashboard data:', err);
      setError(err?.message || 'Failed to load principal dashboard statistics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);


  // ── 2. Fetch Student / Staff Dashboard Data ──
  const fetchStudentStaffData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setRefreshing(true);
      setError(null);

      const [statsData, grievancesData] = await Promise.all([
        grievancesApi.getStats(),
        grievancesApi.getAll({ limit: 10 }),
      ]);

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
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err?.message || 'Failed to load dashboard statistics.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshCurrentView = useCallback((showLoading = false) => {
    if (user?.role === 'admin') {
      fetchPrincipalData(showLoading);
    } else if (user) {
      fetchStudentStaffData(showLoading);
    }
  }, [user, fetchPrincipalData, fetchStudentStaffData]);

  // Initial Fetch on mount or user change
  useEffect(() => {
    if (user?.role === 'admin') {
      fetchPrincipalData(true);
    } else if (user) {
      fetchStudentStaffData(true);
    }
  }, [user, fetchPrincipalData, fetchStudentStaffData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshCurrentView(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshCurrentView]);

  // Refresh on window focus
  useEffect(() => {
    const handleFocus = () => refreshCurrentView(false);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshCurrentView]);

  // Handle Principal Filters
  const handleApplyFilters = (filters: DashboardFilterState) => {
    setActiveFilters(filters);
    fetchPrincipalData(true, filters);
  };

  const handleResetFilters = () => {
    setActiveFilters(INITIAL_FILTER_STATE);
    fetchPrincipalData(true, INITIAL_FILTER_STATE);
  };

  // ── Skeleton Loader ──
  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-32 bg-card/60 rounded-2xl animate-pulse border border-border" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-28 bg-card/60 rounded-xl animate-pulse border border-border" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 bg-card/60 rounded-xl animate-pulse border border-border" />
            <div className="h-72 bg-card/60 rounded-xl animate-pulse border border-border" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Error State ──
  if (error && !principalData && grievances.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <div className="p-4 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold">Unable to Load Dashboard</h2>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
          <Button onClick={() => refreshCurrentView(true)} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Retry Loading
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // ── Student Dashboard View ──
  const StudentDashboard = () => (
    <>
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
              onClick={() => fetchStudentStaffData(false)}
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

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold font-display">Recent Grievances</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/grievances')}>
            View all
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grievances.slice(0, 3).map((grievance) => (
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

  // ── Staff Dashboard View ──
  const StaffDashboard = () => (
    <>
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
            onClick={() => fetchStudentStaffData(false)}
            disabled={refreshing}
            title="Refresh"
            className="flex-shrink-0"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

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
          title="Resolved"
          value={stats.resolved}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

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
            .filter((g) => g.status === 'pending' || g.status === 'in_review')
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

  // ── Principal / Admin Executive Dashboard View ──
  const PrincipalDashboardView = () => {
    if (!principalData) return null;

    return (
      <div className="space-y-6">
        {/* Header */}
        <DashboardHeader
          userName={user?.name}
          lastUpdated={
            principalData.timestamp
              ? new Date(principalData.timestamp).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : new Date().toLocaleTimeString()
          }
          refreshing={refreshing}
          unreadNotifications={principalData.unreadNotifications || 0}
          onRefresh={() => fetchPrincipalData(false)}
        />

        {/* 8 Live Statistics Cards */}
        <PrincipalStatsCards
          stats={principalData.stats}
          departmentStats={principalData.departmentStats}
        />

        {/* 4 Interactive Recharts */}
        <PrincipalCharts
          monthlyStats={principalData.monthlyStats}
          statusDistribution={principalData.statusDistribution}
          departmentStats={principalData.departmentStats}
          categoryStats={principalData.categoryStats}
        />
      </div>
    );
  };


  return (
    <DashboardLayout>
      {user?.role === 'student' && <StudentDashboard />}
      {user?.role === 'staff' && <StaffDashboard />}
      {user?.role === 'admin' && <PrincipalDashboardView />}
    </DashboardLayout>
  );
}
