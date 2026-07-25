import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityLogItem, STATUS_LABELS, GrievanceStatus } from '@/types/grievance';
import { Clock, User, Zap, Shield, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface RecentActivityTimelineProps {
  activities: ActivityLogItem[];
}

export function RecentActivityTimeline({ activities }: RecentActivityTimelineProps) {
  const navigate = useNavigate();

  const getActivityIcon = (type: string, toStatus: string) => {
    if (type === 'admin') return <Shield className="h-3.5 w-3.5 text-blue-400" />;
    if (toStatus === 'escalated') return <Zap className="h-3.5 w-3.5 text-purple-400" />;
    if (toStatus === 'solved' || toStatus === 'resolved') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />;
    return <User className="h-3.5 w-3.5 text-slate-400" />;
  };

  const formatActivityTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="bg-card border-border shadow-card mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold font-display flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Live Audit Trail & Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No recent activity logged in the system.
          </div>
        ) : (
          <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {activities.map((act) => (
              <div
                key={act.id}
                onClick={() => navigate(`/grievance/${act.grievance_id}`)}
                className="flex items-start gap-3 p-3 rounded-xl bg-background/40 hover:bg-background/80 border border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
              >
                <Avatar className="h-9 w-9 shrink-0 border border-border">
                  <AvatarFallback className="bg-muted text-foreground text-xs font-semibold">
                    {act.changed_by_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">
                        {act.changed_by_name || 'System User'}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted border border-border">
                        {getActivityIcon(act.changed_by_type, act.to_status)}
                        <span className="capitalize">{act.changed_by_type || 'User'}</span>
                      </span>
                    </div>

                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {formatActivityTime(act.created_at)}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">
                    {act.from_status ? (
                      <>
                        Changed status of <span className="font-mono text-primary font-semibold">#{act.ticket_number}</span> from{' '}
                        <span className="font-medium text-foreground">{STATUS_LABELS[act.from_status as GrievanceStatus] || act.from_status}</span> to{' '}
                        <span className="font-semibold text-primary">{STATUS_LABELS[act.to_status as GrievanceStatus] || act.to_status}</span>
                      </>
                    ) : (
                      <>
                        Submitted new grievance <span className="font-mono text-primary font-semibold">#{act.ticket_number}</span> as{' '}
                        <span className="font-semibold text-primary">{STATUS_LABELS[act.to_status as GrievanceStatus] || act.to_status}</span>
                      </>
                    )}
                  </p>

                  {act.reason && (
                    <p className="text-xs text-muted-foreground italic mt-1 bg-muted/40 p-2 rounded-lg border border-border/40">
                      "{act.reason}"
                    </p>
                  )}
                </div>

                <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all shrink-0" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
