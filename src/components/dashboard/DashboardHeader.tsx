import { Button } from '@/components/ui/button';
import { RefreshCw, Bell, Shield } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  userName?: string;
  lastUpdated: string;
  refreshing: boolean;
  unreadNotifications: number;
  onRefresh: () => void;
}

export function DashboardHeader({
  userName = 'Dr. Principal',
  lastUpdated,
  refreshing,
  unreadNotifications,
  onRefresh,
}: DashboardHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-card/90 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-border shadow-card mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Shield className="h-3.5 w-3.5" />
              Executive Dashboard
            </span>
            <span className="text-xs text-muted-foreground">
              Last Updated: <span className="font-mono font-medium text-foreground">{lastUpdated}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold font-display text-foreground">
            Principal Dashboard
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl leading-relaxed">
            Welcome back, <span className="text-foreground font-semibold">{userName}</span>.
            Monitor escalated grievances, review pending decisions, and track grievance resolution statistics in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <Button
            variant="outline"
            size="lg"
            onClick={onRefresh}
            disabled={refreshing}
            className="border-border hover:bg-muted gap-2 font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="relative h-11 w-11 border-border">
                <Bell className="h-5 w-5 text-foreground" />
                {unreadNotifications > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse">
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-4 bg-card border-border shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                <h4 className="font-semibold text-sm">Notifications Alert</h4>
                <Badge variant="outline" className="text-xs">
                  {unreadNotifications} Unread
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                You have {unreadNotifications} unread notification(s) regarding escalations or pending decisions.
              </p>
              <Button
                variant="default"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate('/announcements')}
              >
                View Notifications Center
              </Button>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
