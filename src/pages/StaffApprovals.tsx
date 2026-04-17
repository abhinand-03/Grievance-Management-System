import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usersApi } from '@/services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  UserCheck,
  UserX,
  Clock,
  Building,
  Mail,
  Phone,
  IdCard,
  CheckCircle2,
  XCircle,
  Users,
  ArrowRightLeft,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface PendingStaff {
  id: number;
  email: string;
  name: string;
  department: string;
  mobile: string;
  employee_id: string;
  designation: string;
  is_approved: number;
  created_at: string;
}

export default function StaffApprovals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingStaff, setPendingStaff] = useState<PendingStaff[]>([]);
  const [allStaff, setAllStaff] = useState<PendingStaff[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [transferMode, setTransferMode] = useState<'permanent' | 'temporary'>('permanent');
  const [newPrincipalName, setNewPrincipalName] = useState('');
  const [newPrincipalEmail, setNewPrincipalEmail] = useState('');
  const [newPrincipalMobile, setNewPrincipalMobile] = useState('');
  const [temporaryStaffId, setTemporaryStaffId] = useState('');
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferringPrincipal, setTransferringPrincipal] = useState(false);
  const [inviteSetupUrl, setInviteSetupUrl] = useState('');

  const approvedStaff = allStaff
    .filter((staff) => Boolean(staff.is_approved))
    .sort((a, b) => a.name.localeCompare(b.name));
  const selectedTemporaryStaff = approvedStaff.find((staff) => String(staff.id) === temporaryStaffId);

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/dashboard');
      toast.error('Unauthorized access');
    }
  }, [user, navigate]);

  // Fetch data when component mounts or user changes
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      
      const [pendingData, allData] = await Promise.all([
        usersApi.getPendingStaff(),
        usersApi.getStaffList(),
      ]);
      
      setPendingStaff(pendingData.pending_staff || []);
      setAllStaff(allData.staff || []);
    } catch (error: any) {
      console.error('StaffApprovals: Failed to fetch staff data:', error);
      setFetchError(error.message || 'Unknown error');
      toast.error('Failed to load staff data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number, name: string) => {
    try {
      await usersApi.approveStaff(id);
      toast.success(`${name} has been approved`, {
        description: 'They can now login to their account.',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to approve staff:', error);
      toast.error('Failed to approve staff');
    }
  };

  const handleReject = async (id: number, name: string) => {
    try {
      await usersApi.rejectStaff(id);
      toast.success(`${name}'s registration has been rejected`, {
        description: 'Their account has been removed.',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to reject staff:', error);
      toast.error('Failed to reject staff');
    }
  };

  const handlePrincipalAssignment = async () => {
    setTransferringPrincipal(true);
    try {
      if (transferMode === 'permanent') {
        if (!newPrincipalName || !newPrincipalEmail || !newPrincipalMobile) {
          toast.error('Name, email, and mobile number are required');
          return;
        }

        const response = await usersApi.transferPrincipal({
          name: newPrincipalName,
          email: newPrincipalEmail,
          mobile: newPrincipalMobile,
        });
        setInviteSetupUrl(response.setupUrl || '');
        toast.success('Principal invite sent', {
          description: response.emailSent
            ? 'The setup link was emailed to the new principal.'
            : 'The invite was created. Email delivery was not confirmed.',
        });
      } else {
        if (!temporaryStaffId) {
          toast.error('Please choose a staff member for temporary principal access');
          return;
        }

        await usersApi.assignTemporaryPrincipal(temporaryStaffId);
        toast.success('Temporary principal assigned successfully');
      }

      setTransferDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error('Failed to process principal assignment', {
        description: error.message || 'Please try again.',
      });
    } finally {
      setTransferringPrincipal(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Staff Approvals
          </h1>
          <p className="text-muted-foreground">
            Manage staff registration requests and account approvals
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-amber-100">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingStaff.length}</p>
                  <p className="text-sm text-muted-foreground">Pending Approvals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-100">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {allStaff.filter(s => s.is_approved).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Approved Staff</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{allStaff.length}</p>
                  <p className="text-sm text-muted-foreground">Total Staff</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Principal Assignment
            </CardTitle>
            <CardDescription>
              Invite a new principal or assign an approved staff member as temporary principal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="transferMode">Assignment Type</Label>
              <Select value={transferMode} onValueChange={(value) => setTransferMode(value as 'permanent' | 'temporary')}>
                <SelectTrigger id="transferMode" className="max-w-md">
                  <SelectValue placeholder="Select assignment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent principal invite</SelectItem>
                  <SelectItem value="temporary">Temporary principal from staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {transferMode === 'permanent' ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="principalName">Principal Name</Label>
                  <Input
                    id="principalName"
                    placeholder="Enter name"
                    value={newPrincipalName}
                    onChange={(e) => setNewPrincipalName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="principalEmail">Principal Email</Label>
                  <Input
                    id="principalEmail"
                    type="email"
                    placeholder="Enter email"
                    value={newPrincipalEmail}
                    onChange={(e) => setNewPrincipalEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="principalMobile">Mobile Number</Label>
                  <Input
                    id="principalMobile"
                    placeholder="Enter mobile number"
                    value={newPrincipalMobile}
                    onChange={(e) => setNewPrincipalMobile(e.target.value)}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-w-md">
                <Label htmlFor="temporaryStaff">Select Approved Staff</Label>
                <Select value={temporaryStaffId} onValueChange={setTemporaryStaffId}>
                  <SelectTrigger id="temporaryStaff">
                    <SelectValue placeholder="Choose a staff member" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedStaff.length === 0 ? (
                      <SelectItem value="staff-none" disabled>
                        No approved staff available
                      </SelectItem>
                    ) : (
                      approvedStaff.map((member) => (
                        <SelectItem key={member.id} value={String(member.id)}>
                          {member.name} {member.department ? `(${member.department})` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedTemporaryStaff && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm space-y-1">
                    <p className="font-medium">Temporary Principal</p>
                    <p>Name: {selectedTemporaryStaff.name}</p>
                    <p>Email: {selectedTemporaryStaff.email}</p>
                    <p>Department: {selectedTemporaryStaff.department || 'Not available'}</p>
                  </div>
                )}
              </div>
            )}

            {inviteSetupUrl && transferMode === 'permanent' && (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm break-all">
                <p className="font-medium mb-1">Invite link</p>
                <p className="text-muted-foreground">{inviteSetupUrl}</p>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-muted-foreground">
                {transferMode === 'permanent'
                  ? 'Current principal access remains active until the new principal completes setup and logs in.'
                  : 'The selected staff account will be promoted as temporary principal.'}
              </p>

              <AlertDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={transferringPrincipal}
                  onClick={() => setTransferDialogOpen(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  {transferMode === 'permanent' ? 'Send Setup Link' : 'Assign Temporary Principal'}
                </Button>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {transferMode === 'permanent' ? 'Send principal setup link?' : 'Assign temporary principal?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {transferMode === 'permanent'
                        ? `A setup link will be sent to ${newPrincipalEmail || 'the provided email address'}.`
                        : `You are about to grant temporary principal access to ${selectedTemporaryStaff?.name || 'the selected staff member'}.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={transferringPrincipal}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePrincipalAssignment} disabled={transferringPrincipal}>
                      {transferringPrincipal ? 'Processing...' : 'Confirm'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border pb-2">
          <Button
            variant={activeTab === 'pending' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('pending')}
            className="relative"
          >
            Pending Approvals
            {pendingStaff.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {pendingStaff.length}
              </Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'all' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('all')}
          >
            All Staff
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'pending' && (
          <>
            {pendingStaff.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <h3 className="text-lg font-semibold mb-1">No Pending Approvals</h3>
                  <p className="text-muted-foreground">
                    All staff registrations have been processed.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pendingStaff.map((staff) => (
                  <Card key={staff.id} className="shadow-card hover:shadow-card-hover transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{staff.name}</CardTitle>
                          <CardDescription>{staff.designation || 'Staff Member'}</CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{staff.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building className="h-4 w-4" />
                          <span>{staff.department}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{staff.mobile}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <IdCard className="h-4 w-4" />
                          <span>Employee ID: {staff.employee_id}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>Applied: {format(new Date(staff.created_at), 'PPp')}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          className="flex-1"
                          onClick={() => handleApprove(staff.id, staff.name)}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="flex-1">
                              <UserX className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Reject Staff Registration?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete {staff.name}'s registration request.
                                They will need to register again if they want to access the system.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleReject(staff.id, staff.name)}
                              >
                                Reject
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'all' && (
          <div className="space-y-4">
            {allStaff.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-1">No Staff Members</h3>
                  <p className="text-muted-foreground">
                    No staff have registered yet.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-card">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-4 font-medium">Name</th>
                          <th className="text-left p-4 font-medium">Email</th>
                          <th className="text-left p-4 font-medium">Department</th>
                          <th className="text-left p-4 font-medium">Employee ID</th>
                          <th className="text-left p-4 font-medium">Status</th>
                          <th className="text-left p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allStaff.map((staff) => (
                          <tr key={staff.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-4">
                              <div>
                                <p className="font-medium">{staff.name}</p>
                                <p className="text-xs text-muted-foreground">{staff.designation}</p>
                              </div>
                            </td>
                            <td className="p-4 text-sm">{staff.email}</td>
                            <td className="p-4 text-sm">{staff.department}</td>
                            <td className="p-4 text-sm">{staff.employee_id}</td>
                            <td className="p-4">
                              {staff.is_approved ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Approved
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              )}
                            </td>
                            <td className="p-4">
                              {!staff.is_approved && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => handleApprove(staff.id, staff.name)}
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleReject(staff.id, staff.name)}
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
