import { GrievanceStatus, STATUS_LABELS } from '@/types/grievance';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  Search, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  ThumbsUp,
  Eye,
  Ban
} from 'lucide-react';

interface StatusBadgeProps {
  status: GrievanceStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const statusConfig: Record<GrievanceStatus, { 
  className: string; 
  icon: React.ComponentType<{ className?: string }>;
}> = {
  pending: { 
    className: 'status-pending', 
    icon: Clock 
  },
  in_review: { 
    className: 'status-in-review', 
    icon: Search 
  },
  resolved: { 
    className: 'status-resolved', 
    icon: CheckCircle2 
  },
  rejected: { 
    className: 'status-rejected', 
    icon: XCircle 
  },
  escalated: { 
    className: 'status-escalated', 
    icon: AlertTriangle 
  },
  solved: { 
    className: 'status-solved', 
    icon: ThumbsUp 
  },
  considered: { 
    className: 'status-considered', 
    icon: Eye 
  },
  denied: { 
    className: 'status-denied', 
    icon: Ban 
  },
};

export function StatusBadge({ status, size = 'md', showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  return (
    <span
      className={cn(
        'status-badge',
        config.className,
        sizeClasses[size]
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {STATUS_LABELS[status]}
    </span>
  );
}
