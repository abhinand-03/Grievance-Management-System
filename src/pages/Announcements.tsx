import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { announcementsApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import {
  Megaphone,
  Plus,
  RefreshCw,
  Calendar,
  User,
  Users,
  GraduationCap,
  Briefcase,
  Trash2,
  Edit,
  CheckCircle,
  CheckCheck,
  ChevronDown,
  Building2
} from 'lucide-react';

interface Announcement {
  id: number;
  title: string;
  content: string;
  publisher_id: number;
  publisher_type: string;
  publisher_name: string;
  target_audience: 'all' | 'students' | 'staff' | 'both';
  target_department: string | null;
  is_active: number;
  is_read: number;
  created_at: string;
  updated_at: string;
}

const TARGET_LABELS: Record<string, string> = {
  all: 'Everyone',
  students: 'Students Only',
  staff: 'Staff Only',
  both: 'Staff & Students',
};

const DEPARTMENTS = [
  { value: 'computer_science', label: 'Computer Science' },
  { value: 'information_technology', label: 'Information Technology' },
  { value: 'ece', label: 'Electronics & Communication' },
  { value: 'eee', label: 'Electrical & Electronics' },
  { value: 'mechanical', label: 'Mechanical Engineering' },
];

export default function Announcements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetAudience, setTargetAudience] = useState<'all' | 'students' | 'staff' | 'both'>('all');
  const [targetDepartments, setTargetDepartments] = useState<string[]>([]);
  const [deptPopoverOpen, setDeptPopoverOpen] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const canPublish = user?.role === 'admin' || user?.role === 'staff';
  const isAdmin = user?.role === 'admin';

  const fetchAnnouncements = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setRefreshing(true);
      const response = await announcementsApi.getAll();
      setAnnouncements(response.announcements || []);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
      toast({
        title: 'Error',
        description: 'Failed to load announcements',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchAnnouncements(false), 30000);
    return () => clearInterval(interval);
  }, [fetchAnnouncements]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setTargetAudience(isAdmin ? 'all' : 'students');
    setTargetDepartments([]);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in title and content',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await announcementsApi.create({
        title: title.trim(),
        content: content.trim(),
        targetAudience: user?.role === 'staff' ? 'students' : targetAudience,
        targetDepartment: targetDepartments.length > 0 ? targetDepartments.join(',') : undefined,
      });
      
      toast({
        title: 'Success',
        description: 'Announcement published successfully',
      });
      
      setDialogOpen(false);
      resetForm();
      fetchAnnouncements(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to publish announcement',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await announcementsApi.delete(id);
      toast({
        title: 'Success',
        description: 'Announcement deleted successfully',
      });
      fetchAnnouncements(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete announcement',
        variant: 'destructive',
      });
    }
  };

  const handleClearAll = async () => {
    setClearingAll(true);
    try {
      await announcementsApi.markAllAsRead();
      setAnnouncements([]); // Clear all announcements from view
      toast({
        title: 'Success',
        description: 'All announcements cleared',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to clear announcements',
        variant: 'destructive',
      });
    } finally {
      setClearingAll(false);
    }
  };

  const handleMarkAsRead = async (announcement: Announcement) => {
    if (announcement.is_read) return;
    
    try {
      await announcementsApi.markAsRead(`a_${announcement.id}`);
      setAnnouncements(prev => 
        prev.map(a => a.id === announcement.id ? { ...a, is_read: 1 } : a)
      );
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTargetIcon = (target: string) => {
    switch (target) {
      case 'students':
        return <GraduationCap className="h-3 w-3" />;
      case 'staff':
        return <Briefcase className="h-3 w-3" />;
      case 'both':
      case 'all':
        return <Users className="h-3 w-3" />;
      default:
        return <Users className="h-3 w-3" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Megaphone className="h-8 w-8 text-primary" />
              Announcements
            </h1>
            <p className="text-muted-foreground">
              {canPublish 
                ? 'Publish and manage announcements for students and staff'
                : 'View announcements from the administration'}
            </p>
          </div>
          <div className="flex gap-2">
            {announcements.length > 0 && (
              <Button 
                variant="outline" 
                onClick={handleClearAll}
                disabled={clearingAll}
              >
                <CheckCheck className={`h-4 w-4 mr-2`} />
                {clearingAll ? 'Clearing...' : 'Clear All'}
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => fetchAnnouncements(false)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {canPublish && (
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Publish Announcement</DialogTitle>
                    <DialogDescription>
                      {isAdmin 
                        ? 'Create an announcement visible to selected audience'
                        : 'Create an announcement for students'}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        placeholder="Announcement title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Content</Label>
                      <Textarea
                        id="content"
                        placeholder="Write your announcement here..."
                        rows={4}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                      />
                    </div>
                    {isAdmin && (
                      <div className="space-y-2">
                        <Label htmlFor="target">Target Audience</Label>
                        <Select 
                          value={targetAudience} 
                          onValueChange={(value: any) => setTargetAudience(value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select audience" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                Everyone
                              </div>
                            </SelectItem>
                            <SelectItem value="students">
                              <div className="flex items-center gap-2">
                                <GraduationCap className="h-4 w-4" />
                                Students Only
                              </div>
                            </SelectItem>
                            <SelectItem value="staff">
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4" />
                                Staff Only
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Target Departments</Label>
                      <Popover open={deptPopoverOpen} onOpenChange={setDeptPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between font-normal"
                          >
                            <span className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {targetDepartments.length === 0
                                ? 'All Departments'
                                : targetDepartments.length === DEPARTMENTS.length
                                ? 'All Departments Selected'
                                : `${targetDepartments.length} Department${targetDepartments.length > 1 ? 's' : ''} Selected`}
                            </span>
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <div className="p-2 border-b">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="select-all"
                                checked={targetDepartments.length === DEPARTMENTS.length}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setTargetDepartments(DEPARTMENTS.map(d => d.value));
                                  } else {
                                    setTargetDepartments([]);
                                  }
                                }}
                              />
                              <label
                                htmlFor="select-all"
                                className="text-sm font-medium cursor-pointer flex-1"
                              >
                                Select All Departments
                              </label>
                            </div>
                          </div>
                          <div className="p-2 space-y-2 max-h-[200px] overflow-y-auto">
                            {DEPARTMENTS.map((dept) => (
                              <div key={dept.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={dept.value}
                                  checked={targetDepartments.includes(dept.value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setTargetDepartments([...targetDepartments, dept.value]);
                                    } else {
                                      setTargetDepartments(targetDepartments.filter(d => d !== dept.value));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={dept.value}
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  {dept.label}
                                </label>
                              </div>
                            ))}
                          </div>
                          <div className="p-2 border-t flex items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                              {targetDepartments.length === 0
                                ? 'No selection = Everyone receives this announcement'
                                : 'Only selected departments will receive this announcement'}
                            </p>
                            {targetDepartments.length > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => setTargetDepartments([])}
                              >
                                Clear
                              </Button>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={submitting}>
                      {submitting ? 'Publishing...' : 'Publish'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Announcements List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : announcements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center">
                No announcements yet.
                {canPublish && ' Click "New Announcement" to publish one.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => {
              const isOwner = String(announcement.publisher_id) === String(user?.id) && 
                              announcement.publisher_type === user?.role;
              
              return (
                <Card 
                  key={announcement.id}
                  className={`transition-all ${!announcement.is_read ? 'border-primary/50 bg-primary/5' : ''}`}
                  onClick={() => handleMarkAsRead(announcement)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getTargetIcon(announcement.target_audience)}
                            {TARGET_LABELS[announcement.target_audience]}
                          </Badge>
                          {announcement.target_department && (
                            announcement.target_department.split(',').map((dept) => {
                              const deptInfo = DEPARTMENTS.find(d => d.value === dept.trim());
                              return (
                                <Badge key={dept} variant="secondary">
                                  {deptInfo?.label || dept.trim()}
                                </Badge>
                              );
                            })
                          )}
                          {!announcement.is_read && (
                            <Badge variant="default" className="bg-primary">
                              New
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">{announcement.title}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <User className="h-3 w-3" />
                          {announcement.publisher_name}
                          <span className="text-muted-foreground">•</span>
                          <Calendar className="h-3 w-3" />
                          {formatDate(announcement.created_at)}
                        </CardDescription>
                      </div>
                      {isOwner && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this announcement? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDelete(announcement.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {announcement.content}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
