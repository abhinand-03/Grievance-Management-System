import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { grievancesApi } from '@/services/api';
import { StatusBadge } from '@/components/StatusBadge';
import { CATEGORY_LABELS, GrievanceStatus, GrievanceCategory } from '@/types/grievance';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  BadgeCheck, 
  Calendar,
  GraduationCap,
  Briefcase,
  FileText,
  RefreshCw,
  ExternalLink,
  AlertCircle
} from 'lucide-react';

interface GrievanceItem {
  id: string;
  ticketNumber: string;
  subject: string;
  category: GrievanceCategory;
  status: GrievanceStatus;
  createdAt: string;
}

export default function Profile() {
  const { user } = useAuth();
  const [grievances, setGrievances] = useState<GrievanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGrievances = useCallback(async () => {
    if (user?.role !== 'student') return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await grievancesApi.getAll();
      const transformed = response.grievances.map((g: any) => ({
        id: g.id,
        ticketNumber: g.ticket_number,
        subject: g.subject,
        category: g.category,
        status: g.status,
        createdAt: g.created_at
      }));
      setGrievances(transformed);
    } catch (err: any) {
      setError(err.message || 'Failed to load grievances');
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchGrievances();
  }, [fetchGrievances]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (user?.role !== 'student') return;
    
    const interval = setInterval(fetchGrievances, 30000);
    return () => clearInterval(interval);
  }, [fetchGrievances, user?.role]);

  if (!user) {
    return null;
  }

  const getInitials = (name: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 text-purple-800';
      case 'staff':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: Date | string | undefined | null) => {
    if (!date) return 'Not available';
    try {
      const d = new Date(date);
      if (isNaN(d.getTime())) return 'Not available';
      return d.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Not available';
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return 'Principal';
    if (role === 'staff') return 'Staff';
    if (role === 'student') return 'Student';
    return role?.charAt(0).toUpperCase() + role?.slice(1) || 'User';
  };

  // Safe access to extended user properties
  const mobile = (user as any).mobile;
  const studentId = (user as any).student_id;
  const employeeId = (user as any).employee_id;
  const designation = (user as any).designation;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            View your account information
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Profile Card */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-3xl font-bold text-primary">
                    {getInitials(user.name)}
                  </span>
                </div>
                <h2 className="text-xl font-semibold">{user.name || 'Unknown User'}</h2>
                <p className="text-muted-foreground text-sm">{user.email || 'No email'}</p>
                <Badge className={`mt-3 ${getRoleBadgeColor(user.role)}`}>
                  {getRoleLabel(user.role)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Full Name</p>
                    <p className="font-medium">{user.name || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user.email || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium">{user.department || 'Not assigned'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mobile</p>
                    <p className="font-medium">{mobile || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="font-medium">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Role-specific Info */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  {user.role === 'student' ? (
                    <><GraduationCap className="h-5 w-5" /> Student Details</>
                  ) : (
                    <><Briefcase className="h-5 w-5" /> {user.role === 'admin' ? 'Admin' : 'Staff'} Details</>
                  )}
                </h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-secondary">
                      <BadgeCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {user.role === 'student' ? 'Student ID' : 'Employee ID'}
                      </p>
                      <p className="font-medium">
                        {studentId || employeeId || 'Not assigned'}
                      </p>
                    </div>
                  </div>

                  {user.role !== 'student' && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-secondary">
                        <Briefcase className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Designation</p>
                        <p className="font-medium">{designation || 'Not assigned'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grievances Section - Only for Students */}
        {user.role === 'student' && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  My Grievances
                </CardTitle>
                <CardDescription>
                  Track the status of your submitted grievances
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchGrievances}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button asChild size="sm">
                  <Link to="/grievances">View All</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="flex items-center gap-2 text-red-500 mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
              
              {loading && grievances.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading grievances...
                </div>
              ) : grievances.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    You haven't submitted any grievances yet.
                  </p>
                  <Button asChild>
                    <Link to="/grievances/new">Submit New Grievance</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {grievances.slice(0, 5).map((grievance) => (
                    <div 
                      key={grievance.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0 mb-2 sm:mb-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-muted-foreground">
                            {grievance.ticketNumber}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[grievance.category] || grievance.category}
                          </Badge>
                        </div>
                        <p className="font-medium truncate">{grievance.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Submitted: {new Date(grievance.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={grievance.status} />
                        <Button asChild variant="ghost" size="sm">
                          <Link to={`/grievances/${grievance.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  {grievances.length > 5 && (
                    <div className="text-center pt-2">
                      <Button asChild variant="link">
                        <Link to="/grievances">
                          View all {grievances.length} grievances
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
