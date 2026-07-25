import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Eye, ArrowRight } from 'lucide-react';

interface RecentlyResolvedTableProps {
  resolvedGrievances: any[];
}

export function RecentlyResolvedTable({ resolvedGrievances }: RecentlyResolvedTableProps) {
  const navigate = useNavigate();

  return (
    <Card className="bg-card border-border shadow-card mb-8">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-semibold font-display flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          Recently Resolved Grievances
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/grievances')} className="text-xs gap-1">
          View all grievances <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {resolvedGrievances.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            No recently resolved grievances recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur border-b border-border text-xs uppercase text-muted-foreground tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Resolved By</th>
                  <th className="px-4 py-3 font-semibold">Resolution Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {resolvedGrievances.slice(0, 10).map((g) => (
                  <tr key={g.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      {g.is_anonymous ? 'Anonymous' : g.student_name}
                      {!g.is_anonymous && (
                        <div className="text-xs text-muted-foreground">{g.register_number || g.student_id}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[220px]">
                      <p className="font-medium truncate" title={g.subject}>{g.subject}</p>
                      <p className="text-xs text-muted-foreground font-mono">{g.ticket_number || g.ticketNumber}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {g.resolved_by_name || g.assigned_to_name || 'Principal / Staff'}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {g.resolved_at
                        ? new Date(g.resolved_at).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })
                        : new Date(g.updated_at).toLocaleDateString('en-IN', {
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
