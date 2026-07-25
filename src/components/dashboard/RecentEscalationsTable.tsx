import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Eye, ArrowRight } from 'lucide-react';
import { CATEGORY_LABELS, GrievanceCategory } from '@/types/grievance';

interface RecentEscalationsTableProps {
  escalations: any[];
}

const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/30',
  high:     'bg-orange-500/10 text-orange-400 border-orange-500/30',
  medium:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
  low:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
};

export function RecentEscalationsTable({ escalations }: RecentEscalationsTableProps) {
  const navigate = useNavigate();

  return (
    <Card className="bg-card border-border shadow-card mb-8">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold font-display flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Recent Escalated Grievances (Awaiting Decision)
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/escalations')} className="text-xs gap-1">
          View all escalations <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {escalations.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No pending escalated grievances requiring Principal decision.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur border-b border-border text-xs uppercase text-muted-foreground tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold">Grievance ID</th>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Department</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Escalated By</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Escalation Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {escalations.slice(0, 10).map((g) => (
                  <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                      {g.ticket_number || g.ticketNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{g.is_anonymous ? 'Anonymous' : g.student_name}</div>
                      {!g.is_anonymous && (
                        <div className="text-xs text-muted-foreground">{g.register_number || g.student_id}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {g.student_department || 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-xs capitalize">
                        {CATEGORY_LABELS[g.category as GrievanceCategory] || g.category}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {g.escalated_by_name || 'System / Staff'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${
                        PRIORITY_STYLES[g.priority] || PRIORITY_STYLES.medium
                      }`}>
                        {g.priority || 'medium'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {g.escalation_date
                        ? new Date(g.escalation_date).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })
                        : new Date(g.created_at).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={g.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2.5 text-xs gap-1"
                        onClick={() => navigate(`/grievance/${g.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
