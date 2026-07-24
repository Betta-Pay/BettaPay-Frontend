'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui';

interface SessionTimeoutModalProps {
  open: boolean;
  secondsRemaining: number;
  onDismiss: () => void;
}

export function SessionTimeoutModal({
  open,
  secondsRemaining,
  onDismiss,
}: SessionTimeoutModalProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onDismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Session Expiring</DialogTitle>
          <DialogDescription>
            Your session will expire due to inactivity in{' '}
            <span className="font-semibold text-foreground">
              {secondsRemaining} second{secondsRemaining !== 1 ? 's' : ''}
            </span>
            .
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onDismiss}>Stay Logged In</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
