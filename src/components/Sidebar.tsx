import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Users,
  BarChart3,
  Settings,
  HelpCircle,
  AlertTriangle,
  X,
  UserCheck,
  Megaphone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { grievancesApi } from '@/services/api';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: ('student' | 'staff' | 'admin')[];
  badgeKey?: 'grievances' | 'escalations' | 'myGrievances';
}

const navItems: NavItem[] = [
  { 
    label: 'Dashboard', 
    href: '/dashboard', 
    icon: LayoutDashboard, 
    roles: ['student', 'staff', 'admin'] 
  },
  { 
    label: 'New Grievance', 
    href: '/grievance/new', 
    icon: PlusCircle, 
    roles: ['student'] 
  },
  { 
    label: 'My Grievances', 
    href: '/grievances', 
    icon: FileText, 
    roles: ['student'],
    badgeKey: 'myGrievances'
  },
  { 
    label: 'All Grievances', 
    href: '/grievances', 
    icon: FileText, 
    roles: ['staff', 'admin'],
    badgeKey: 'grievances'
  },
  { 
    label: 'Escalations', 
    href: '/escalations', 
    icon: AlertTriangle, 
    roles: ['admin'],
    badgeKey: 'escalations'
  },
  { 
    label: 'Staff Approvals', 
    href: '/staff-approvals', 
    icon: UserCheck, 
    roles: ['admin'] 
  },
  {
    label: 'Announcements',
    href: '/announcements',
    icon: Megaphone,
    roles: ['student', 'staff', 'admin']
  },
];

const bottomNavItems: NavItem[] = [
  { 
    label: 'Settings', 
    href: '/settings', 
    icon: Settings, 
    roles: ['student', 'staff', 'admin'] 
  },
  { 
    label: 'Help & Support', 
    href: '/help', 
    icon: HelpCircle, 
    roles: ['student', 'staff', 'admin'] 
  },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const userRole = user?.role || 'student';
  const [counts, setCounts] = useState<{ grievances: number; escalations: number; myGrievances: number }>({
    grievances: 0,
    escalations: 0,
    myGrievances: 0,
  });
  const [unreadCounts, setUnreadCounts] = useState<{ grievances: number; escalations: number; myGrievances: number }>({
    grievances: 0,
    escalations: 0,
    myGrievances: 0,
  });

  // Get storage key based on user
  const getStorageKey = (type: string) => `grievance_viewed_${user?.id}_${type}`;

  // Mark as viewed when visiting grievances page
  useEffect(() => {
    if (location.pathname === '/grievances') {
      const now = Date.now();
      if (userRole === 'student') {
        localStorage.setItem(getStorageKey('myGrievances'), JSON.stringify({ count: counts.myGrievances, time: now }));
        setUnreadCounts(prev => ({ ...prev, myGrievances: 0 }));
      } else {
        localStorage.setItem(getStorageKey('grievances'), JSON.stringify({ count: counts.grievances, time: now }));
        setUnreadCounts(prev => ({ ...prev, grievances: 0 }));
      }
    }
    if (location.pathname === '/escalations') {
      const now = Date.now();
      localStorage.setItem(getStorageKey('escalations'), JSON.stringify({ count: counts.escalations, time: now }));
      setUnreadCounts(prev => ({ ...prev, escalations: 0 }));
    }
  }, [location.pathname, counts, userRole, user?.id]);

  // Fetch grievance counts
  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const stats = await grievancesApi.getStats();
        const newCounts = {
          grievances: stats.totalGrievances || 0,
          escalations: stats.escalated || 0,
          myGrievances: stats.totalGrievances || 0,
        };
        setCounts(newCounts);

        // Calculate unread counts by comparing with last viewed
        const lastViewedGrievances = JSON.parse(localStorage.getItem(getStorageKey('grievances')) || '{"count":0}');
        const lastViewedEscalations = JSON.parse(localStorage.getItem(getStorageKey('escalations')) || '{"count":0}');
        const lastViewedMyGrievances = JSON.parse(localStorage.getItem(getStorageKey('myGrievances')) || '{"count":0}');

        setUnreadCounts({
          grievances: Math.max(0, newCounts.grievances - (lastViewedGrievances.count || 0)),
          escalations: Math.max(0, newCounts.escalations - (lastViewedEscalations.count || 0)),
          myGrievances: Math.max(0, newCounts.myGrievances - (lastViewedMyGrievances.count || 0)),
        });
      } catch (error) {
        console.error('Failed to fetch counts:', error);
      }
    };
    
    fetchCounts();
    
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000);
    
    // Refresh when window gains focus
    const handleFocus = () => fetchCounts();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user?.id]);

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole as 'student' | 'staff' | 'admin'));
  const filteredBottomItems = bottomNavItems.filter(item => item.roles.includes(userRole as 'student' | 'staff' | 'admin'));

  const getBadgeCount = (badgeKey?: 'grievances' | 'escalations' | 'myGrievances') => {
    if (!badgeKey) return undefined;
    const count = unreadCounts[badgeKey];
    return count > 0 ? count : undefined;
  };

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen w-64 bg-sidebar/95 backdrop-blur-lg border-r border-sidebar-border/90 transition-transform duration-300 lg:translate-x-0 lg:z-30",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg gradient-accent flex items-center justify-center shadow-md">
                <span className="text-accent-foreground font-bold">G</span>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-sidebar-foreground font-display">
                  Grievance Cell
                </h2>
                <p className="text-xs text-sidebar-foreground/60 capitalize">
                  {userRole} Portal
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              const badgeCount = getBadgeCount(item.badgeKey);
              
              return (
                <NavLink
                  key={item.label}
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-sidebar-primary to-accent text-sidebar-primary-foreground shadow-[0_0_0_1px_hsl(var(--accent)/0.35)]"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent/80 hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {badgeCount !== undefined && badgeCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground px-1.5">
                      {badgeCount}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Bottom Navigation */}
          <div className="border-t border-sidebar-border p-4 space-y-1">
            {filteredBottomItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <NavLink
                  key={item.label}
                  to={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
