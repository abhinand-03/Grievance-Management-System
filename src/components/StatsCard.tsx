import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'accent' | 'warning' | 'success' | 'danger';
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-primary/5 border-primary/20',
  accent: 'bg-accent/5 border-accent/20',
  warning: 'bg-amber-50 border-amber-200',
  success: 'bg-emerald-50 border-emerald-200',
  danger: 'bg-red-50 border-red-200',
};

const iconStyles = {
  default: 'bg-secondary text-foreground',
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  warning: 'bg-amber-100 text-amber-600',
  success: 'bg-emerald-100 text-emerald-600',
  danger: 'bg-red-100 text-red-600',
};

export function StatsCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend,
  variant = 'default' 
}: StatsCardProps) {
  return (
    <Card className={cn(
      "shadow-card hover:shadow-card-hover transition-all duration-300",
      variantStyles[variant]
    )}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold font-display text-foreground">
                {value}
              </p>
              {trend && (
                <span className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-emerald-600" : "text-red-600"
                )}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-xl",
            iconStyles[variant]
          )}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
