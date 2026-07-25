import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText,
  AlertTriangle,
  BarChart3,
  Megaphone,
  UserCheck,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';

export function QuickActionsGrid() {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'View All Grievances',
      description: 'Search, filter, and inspect all student submissions',
      icon: FileText,
      color: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      path: '/grievances',
    },
    {
      title: 'Escalated Cases',
      description: 'Review grievances requiring Principal intervention',
      icon: AlertTriangle,
      color: 'bg-red-500/10 text-red-500 border-red-500/20',
      path: '/escalations',
    },
    {
      title: 'Generate Reports',
      description: 'Export resolution metrics and department analytics',
      icon: BarChart3,
      color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      onClick: () => {
        toast.info('Report Generation', {
          description: 'Exporting complete analytics summary PDF/CSV...',
        });
      },
    },
    {
      title: 'Announcements',
      description: 'Publish notices to students and faculty staff',
      icon: Megaphone,
      color: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      path: '/announcements',
    },
    {
      title: 'Staff Approvals',
      description: 'Approve new staff registrations and manage access',
      icon: UserCheck,
      color: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      path: '/staff-approvals',
    },
  ];

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold font-display text-foreground mb-4">Quick Executive Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <Card
              key={idx}
              onClick={() => {
                if (action.path) navigate(action.path);
                if (action.onClick) action.onClick();
              }}
              className="bg-card border-border shadow-card hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group"
            >
              <CardContent className="p-4 flex flex-col justify-between h-full space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-xl border ${action.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-transform" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                    {action.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{action.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
