import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockNotify = {
  success: jest.fn(),
  error: jest.fn(),
};

const currentSession = {
  id: 'current',
  device: 'Chrome on Windows',
  ipAddress: '192.0.2.10',
  lastActivityAt: '2026-08-24T10:00:00.000Z',
  expiresAt: '2026-08-25T10:00:00.000Z',
  status: 'active' as const,
  isCurrent: true,
};

const otherSession = {
  id: 'other',
  device: 'Safari on iPhone',
  ipAddress: '192.0.2.20',
  lastActivityAt: '2026-08-23T10:00:00.000Z',
  expiresAt: '2026-08-24T18:00:00.000Z',
  status: 'active' as const,
  isCurrent: false,
};

type Session = Omit<typeof currentSession, 'status'> & {
  status: 'active' | 'revoked';
  revokedAt?: string;
};

let sessions: { active: Session[]; history: Session[] } = {
  active: [currentSession, otherSession],
  history: [],
};
const mockRevokeSession = jest.fn(async (sessionId: string) => {
  const session = sessions.active.find((item) => item.id === sessionId);
  sessions = {
    active: sessions.active.filter((item) => item.id !== sessionId),
    history: session
      ? [{ ...session, status: 'revoked' as const, revokedAt: '2026-08-24T11:00:00.000Z' }, ...sessions.history]
      : sessions.history,
  };
});

jest.mock('lucide-react', () => {
  const Icon = () => <svg aria-hidden="true" />;
  return { AlertTriangle: Icon, Clock3: Icon, Laptop: Icon, MapPin: Icon, ShieldCheck: Icon };
});

jest.mock('@/lib/api/hooks', () => ({
  useAuthSessions: () => ({
    data: sessions,
    isLoading: false,
    error: null,
    revokeSession: mockRevokeSession,
    isRevoking: false,
  }),
}));

jest.mock('@/lib/hooks/useNotify', () => ({
  useNotify: () => mockNotify,
}));

jest.mock('@/components/ui', () => {
  const passthrough = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div {...props}>{children}</div>
  );
  const Button = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <button {...props}>{children}</button>
  );
  const Dialog = ({ open, children }: React.PropsWithChildren<{ open?: boolean }>) =>
    open ? <div role="dialog">{children}</div> : null;
  return {
    Button,
    Card: passthrough,
    CardContent: passthrough,
    CardDescription: passthrough,
    CardHeader: passthrough,
    CardTitle: passthrough,
    Dialog,
    DialogContent: passthrough,
    DialogDescription: passthrough,
    DialogFooter: passthrough,
    DialogHeader: passthrough,
    DialogTitle: passthrough,
  };
});

import SessionsPage from '../page';

describe('SessionsPage', () => {
  beforeEach(() => {
    sessions = { active: [currentSession, otherSession], history: [] };
    jest.clearAllMocks();
  });

  it('does not offer revocation for the current session', () => {
    render(<SessionsPage />);

    expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
    expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Revoke session' })).toHaveLength(1);
  });

  it('revokes a non-current session and moves it to history', async () => {
    const user = userEvent.setup();
    render(<SessionsPage />);

    await user.click(screen.getByRole('button', { name: 'Revoke session' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Safari on iPhone');

    await user.click(screen.getByRole('dialog').querySelector('button:last-child') as HTMLButtonElement);

    await waitFor(() => {
      expect(mockRevokeSession).toHaveBeenCalledWith('other');
      expect(screen.getAllByText('Safari on iPhone')).toHaveLength(1);
      expect(screen.queryByRole('button', { name: 'Revoke session' })).not.toBeInTheDocument();
      expect(screen.getByText('Revoked')).toBeInTheDocument();
      expect(mockNotify.success).toHaveBeenCalledWith('Session revoked');
    });
  });
});
