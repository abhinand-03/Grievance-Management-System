import { Card, CardContent } from '@/components/ui/card';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  CalendarDays,
  Timer,
  Building2,
} from 'lucide-react';
import { DepartmentStatItem } from '@/types/grievance';

interface PrincipalStatsCardsProps {
  stats: {
    totalGrievances: number;
    pendingEscalations: number;
    resolvedToday: number;
    underReview: number;
    rejected: number;
    pending7Days: number;
    averageResolutionHours: number;
    averageResolutionTime: string;
  };
  departmentStats: DepartmentStatItem[];
}

export function PrincipalStatsCards({ stats, departmentStats }: PrincipalStatsCardsProps) {
  const topDepartment = departmentStats[0]?.department || 'None';
  const topDepartmentCount = departmentStats[0]?.count || 0;

  const cards = [
    {
      title: 'Pending Escalations',
      value: stats.pendingEscalations,
      subtitle: 'Awaiting Principal decision',
      icon: AlertTriangle,
      iconBg: 'bg-red-500/10 text-red-500 border-red-500/20',
      valueColor: 'text-red-500',
    },
    {
      title: 'Resolved Today',
      value: stats.resolvedToday,
      subtitle: 'Resolved on current date',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      valueColor: 'text-emerald-500',
    },
    {
      title: 'Under Review',
      value: stats.underReview,
      subtitle: 'Currently in progress',
      icon: Clock,
      iconBg: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      valueColor: 'text-blue-500',
    },
    {
      title: 'Rejected',
      value: stats.rejected,
      subtitle: 'Denied or invalid requests',
      icon: XCircle,
      iconBg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      valueColor: 'text-amber-500',
    },
    {
      title: 'Total Grievances',
      value: stats.totalGrievances,
      subtitle: 'All time submissions',
      icon: FileText,
      iconBg: 'bg-primary/10 text-primary border-primary/20',
      valueColor: 'text-foreground',
    },
    {
      title: 'Pending > 7 Days',
      value: stats.pending7Days,
      subtitle: 'Overdue > 7 working days',
      icon: CalendarDays,
      iconBg: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      valueColor: 'text-purple-400',
    },
    {
      title: 'Avg Resolution Time',
      value: stats.averageResolutionTime,
      subtitle: 'From submission to resolution',
      icon: Timer,
      iconBg: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      valueColor: 'text-cyan-400',
      isTextValue: true,
    },
    {
      title: 'Highest Complaint Dept',
      value: topDepartment,
      subtitle: `${topDepartmentCount} total complaints`,
      icon: Building2,
      iconBg: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
      valueColor: 'text-indigo-400',
      isTextValue: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card key={idx} className="bg-card border-border shadow-card hover:border-primary/40 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {card.title}
                  </p>
                  <div className={`text-2xl sm:text-3xl font-bold font-display ${card.valueColor} truncate`}>
                    {card.value}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{card.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl border ${card.iconBg} shrink-0`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
