import { useNavigate } from 'react-router-dom';
import { EscalatedGrievance, CATEGORY_LABELS, STATUS_LABELS } from '@/types/grievance';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Eye,
  MessageSquarePlus,
  CheckCircle2,
  Hash,
  User,
  Building2,
  Tag,
  Calendar,
  Clock,
  Zap,
  ChevronRight,
} from 'lucide-react';

interface EscalationTableProps {
  grievances: EscalatedGrievance[];
  onStatusUpdate: (grievance: EscalatedGrievance) => void;
  onAddRemark:    (grievance: EscalatedGrievance) => void;
}

// ─── Priority styling ─────────────────────────────────────────────────────────
const PRIORITY_STYLES: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  high:     'bg-orange-100 text-orange-800 border-orange-300',
  medium:   'bg-yellow-100 text-yellow-800 border-yellow-300',
  low:      'bg-green-100 text-green-800 border-green-300',
};

// ─── Escalation type badge ────────────────────────────────────────────────────
function EscalationTypeBadge({ type }: { type?: string }) {
  if (!type) return <span className="text-muted-foreground text-xs">—</span>;
  const isManual = type === 'manual';
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
        isManual
          ? 'bg-blue-100 text-blue-800 border-blue-300'
          : 'bg-purple-100 text-purple-800 border-purple-300'
      }`}
    >
      {isManual ? <User className="h-3 w-3" /> : <Zap className="h-3 w-3" />}
      {isManual ? 'Manual' : 'Automatic'}
    </span>
  );
}

// ─── Days pending pill ────────────────────────────────────────────────────────
function DaysPendingPill({ days }: { days: number }) {
  const color =
    days >= 14 ? 'bg-red-100 text-red-700 border-red-300' :
    days >= 7  ? 'bg-orange-100 text-orange-700 border-orange-300' :
                 'bg-muted text-muted-foreground border-border';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      <Clock className="h-3 w-3" />
      {days}d
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function EscalationTable({ grievances, onStatusUpdate, onAddRemark }: EscalationTableProps) {
  const navigate = useNavigate();

  if (grievances.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted mb-5">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No escalated grievances</h3>
        <p className="text-muted-foreground max-w-sm mx-auto">
          All grievances are within the 7-working-day resolution window, or filters
          returned no results.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* ── Headers ── */}
          <thead>
            <tr className="bg-muted/60 border-b border-border text-xs uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" />Ticket</span>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" />Student</span>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Reg. No.</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Dept.</span>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Category</span>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Subject</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Priority</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Assigned Staff</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Esc. Type</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Escalated By</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Reason</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Submitted</span>
              </th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">Esc. Date</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground whitespace-nowrap">
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />Days Pending</span>
              </th>
              <th className="px-4 py-3 font-semibold text-muted-foreground text-center">Actions</th>
            </tr>
          </thead>

          {/* ── Body ── */}
          <tbody>
            {grievances.map((g, idx) => (
              <tr
                key={g.id}
                className={`border-b border-border last:border-0 transition-colors hover:bg-primary/5 ${
                  idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                }`}
              >
                {/* Ticket */}
                <td className="px-4 py-3 font-mono text-xs font-semibold text-primary whitespace-nowrap">
                  {g.ticketNumber}
                </td>

                {/* Student name */}
                <td className="px-4 py-3 whitespace-nowrap font-medium">
                  {g.isAnonymous ? (
                    <span className="text-muted-foreground italic text-xs">Anonymous</span>
                  ) : g.studentName}
                </td>

                {/* Register number */}
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">
                  {g.isAnonymous ? '—' : (g.registerNumber || '—')}
                </td>

                {/* Department */}
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {g.isAnonymous ? '—' : (g.studentDepartment || '—')}
                </td>

                {/* Category */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge variant="outline" className="text-xs capitalize">
                    {CATEGORY_LABELS[g.category] || g.category}
                  </Badge>
                </td>

                {/* Subject + description */}
                <td className="px-4 py-3 max-w-[200px]">
                  <p className="font-medium truncate" title={g.subject}>{g.subject}</p>
                  <p className="text-xs text-muted-foreground truncate" title={g.description}>
                    {g.description}
                  </p>
                </td>

                {/* Priority */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${
                    PRIORITY_STYLES[g.priority] ?? PRIORITY_STYLES.medium
                  }`}>
                    {g.priority}
                  </span>
                </td>

                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={g.status} />
                </td>

                {/* Assigned staff */}
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {g.assignedToName || <span className="italic">Unassigned</span>}
                </td>

                {/* Escalation type */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <EscalationTypeBadge type={g.escalationType} />
                </td>

                {/* Escalated by */}
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {g.escalatedByName || '—'}
                </td>

                {/* Reason */}
                <td className="px-4 py-3 max-w-[180px]">
                  <p
                    className="text-xs text-muted-foreground truncate"
                    title={g.escalationReason}
                  >
                    {g.escalationReason || '—'}
                  </p>
                </td>

                {/* Submitted date */}
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {g.createdAt.toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </td>

                {/* Escalation date */}
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {g.escalationDate
                    ? g.escalationDate.toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })
                    : '—'}
                </td>

                {/* Days pending */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <DaysPendingPill days={g.pendingWorkingDays} />
                </td>

                {/* Actions */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 justify-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => navigate(`/grievance/${g.id}`)}
                      title="View full grievance"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs"
                      onClick={() => onStatusUpdate(g)}
                      title="Update status"
                    >
                      <ChevronRight className="h-3.5 w-3.5 mr-1" />
                      Decide
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => onAddRemark(g)}
                      title="Add remark"
                    >
                      <MessageSquarePlus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
