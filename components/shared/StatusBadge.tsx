import { Badge } from '@/components/ui';
import { PAYMENT_STATUS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils';
import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const normalizedStatus = status.toLowerCase();

  const config: Record<string, { label: string; icon: React.ElementType; className: string }> = {
    [PAYMENT_STATUS.SUCCESS]: {
      label: 'Success',
      icon: CheckCircle2,
      className: 'bg-success/10 text-success hover:bg-success/20 border-success/20',
    },
    [PAYMENT_STATUS.PENDING]: {
      label: 'Pending',
      icon: Clock,
      className: 'bg-warning/10 text-warning hover:bg-warning/20 border-warning/20',
    },
    [PAYMENT_STATUS.PROCESSING]: {
      label: 'Processing',
      icon: Loader2,
      className: 'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20',
    },
    [PAYMENT_STATUS.FAILED]: {
      label: 'Failed',
      icon: XCircle,
      className: 'bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20',
    },
  };

  const currentConfig = config[normalizedStatus] || {
    label: status,
    icon: Clock,
    className: 'bg-muted text-muted-foreground',
  };

  const Icon = currentConfig.icon;

  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', currentConfig.className, className)}>
      <Icon className={cn('w-3 h-3', normalizedStatus === PAYMENT_STATUS.PROCESSING && 'animate-spin')} />
      {currentConfig.label}
    </Badge>
  );
};
