import { Grievance, CATEGORY_LABELS } from '@/types/grievance';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge } from './StatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { 
  MessageSquare, 
  Paperclip, 
  User, 
  EyeOff,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GrievanceCardProps {
  grievance: Grievance;
  onClick?: () => void;
  showStudent?: boolean;
}

export function GrievanceCard({ grievance, onClick, showStudent = true }: GrievanceCardProps) {
  return (
    <Card 
      className={cn(
        "shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer group",
        "border border-border/50 hover:border-accent/30"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-muted-foreground">
                {grievance.ticketNumber}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span className="text-xs text-muted-foreground">
                {CATEGORY_LABELS[grievance.category]}
              </span>
            </div>
            <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-accent transition-colors">
              {grievance.subject}
            </h3>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground/40 group-hover:text-accent group-hover:translate-x-1 transition-all flex-shrink-0" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {grievance.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={grievance.status} size="sm" />
          </div>
          
          <div className="flex items-center gap-3 text-muted-foreground">
            {grievance.isAnonymous && (
              <span className="flex items-center gap-1 text-xs">
                <EyeOff className="h-3.5 w-3.5" />
              </span>
            )}
            {grievance.attachments.length > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <Paperclip className="h-3.5 w-3.5" />
                {grievance.attachments.length}
              </span>
            )}
            {grievance.comments.length > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <MessageSquare className="h-3.5 w-3.5" />
                {grievance.comments.length}
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
          {showStudent && (
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              <span>{grievance.isAnonymous ? 'Anonymous' : grievance.studentName}</span>
            </div>
          )}
          <span>
            {formatDistanceToNow(grievance.createdAt, { addSuffix: true })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
