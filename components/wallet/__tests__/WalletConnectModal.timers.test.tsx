import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

// Bootstrap the bundled i18next instance so `useAppTranslation` resolves real English text.
import '@/lib/i18n/config';
import { WalletConnectModal } from '../WalletConnectModal';

const connect = jest.fn().mockResolvedValue('wc:test-uri');
const onStatus = jest.fn();
const onSession = jest.fn();
const abortInitialization = jest.fn();
const resetWalletConnectClient = jest.fn();
const isWalletConnectConfigured = jest.fn(() => true);
const getWalletConnectClient = jest.fn().mockReturnValue({
  connect,
  onStatus,
  onSession,
  abortInitialization,
});

jest.mock('@/lib/stellar/walletconnect', () => ({
  getWalletConnectClient: (...args: unknown[]) => getWalletConnectClient(...args),
  resetWalletConnectClient: () => resetWalletConnectClient(),
  isWalletConnectConfigured: () => isWalletConnectConfigured(),
  WalletConnectConfigError: class WalletConnectConfigError extends Error {},
}));

// Capture the close handler the modal hands to Dialog so a test can drive a real
// `onOpenChange(false)` without a Radix portal.
let closeDialog: (() => void) | null = null;

jest.mock('@/components/ui', () => ({
  Dialog: ({
    children,
    open,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open: boolean;
    onOpenChange: (v: boolean) => void;
  }) => {
    closeDialog = () => onOpenChange(false);
    return open ? <div data-testid="dialog">{children}</div> : null;
  },
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

jest.mock('qrcode.react', () => ({
  QRCodeSVG: ({
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    includeMargin: _includeMargin,
    value,
    ...props
  }: React.SVGProps<SVGSVGElement> & { includeMargin?: boolean; value?: string }) => (
    <svg data-testid="qr" data-value={value} {...props} />
  ),
}));

const session = { topic: 'a', accounts: ['stellar:testnet:x'], symmetricKey: 'k' } as never;

function writeTextMock() {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  return writeText;
}

async function renderConnected(onConnected = jest.fn()) {
  const onOpenChange = jest.fn();
  const utils = render(
    <WalletConnectModal
      open
      onOpenChange={onOpenChange}
      network="testnet"
      onConnected={onConnected}
    />,
  );
  await screen.findByTestId('qr');
  return { ...utils, onConnected, onOpenChange };
}

describe('WalletConnectModal timer cleanup (issue #1138)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    closeDialog = null;
    connect.mockResolvedValue('wc:test-uri');
    isWalletConnectConfigured.mockReturnValue(true);
    writeTextMock();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resets the copy confirmation once its own timer fires', async () => {
    const { unmount } = await renderConnected();
    const copyButton = screen.getByRole('button', { name: /copy walletconnect uri/i });

    await act(async () => {
      fireEvent.click(copyButton);
    });
    expect(copyButton).toHaveTextContent('URI copied');

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(copyButton).toHaveTextContent('Copy link URI');

    unmount();
  });

  it('re-copying replaces the pending reset timer instead of stacking two', async () => {
    const { unmount } = await renderConnected();
    const copyButton = screen.getByRole('button', { name: /copy walletconnect uri/i });

    await act(async () => {
      fireEvent.click(copyButton);
    });
    act(() => {
      jest.advanceTimersByTime(1500);
    });
    await act(async () => {
      fireEvent.click(copyButton);
    });

    // With the first timer leaked, this 1000 ms would already have reset the label.
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(copyButton).toHaveTextContent('URI copied');

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(copyButton).toHaveTextContent('Copy link URI');

    unmount();
  });

  it('cancels the pending copy timer when the modal unmounts', async () => {
    const { unmount } = await renderConnected();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /copy walletconnect uri/i }));
    });
    expect(jest.getTimerCount()).toBe(1);

    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('drops the post-connection handoff when the modal is closed before it lands', async () => {
    let emitSession: ((s: never) => void) | null = null;
    onSession.mockImplementation((cb: (s: never) => void) => {
      emitSession = cb;
    });

    const { onConnected, unmount } = await renderConnected();

    act(() => {
      emitSession?.(session);
    });
    expect(jest.getTimerCount()).toBe(1);
    expect(onConnected).not.toHaveBeenCalled();

    await act(async () => {
      closeDialog?.();
    });
    expect(jest.getTimerCount()).toBe(0);

    act(() => {
      jest.advanceTimersByTime(2000);
    });
    expect(onConnected).not.toHaveBeenCalled();
    expect(abortInitialization).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('hands off to onConnected exactly once when the modal stays open', async () => {
    let emitSession: ((s: never) => void) | null = null;
    onSession.mockImplementation((cb: (s: never) => void) => {
      emitSession = cb;
    });

    const { onConnected, unmount } = await renderConnected();

    act(() => {
      emitSession?.(session);
    });
    act(() => {
      jest.advanceTimersByTime(800);
    });

    expect(onConnected).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(onConnected).toHaveBeenCalledWith(session));

    unmount();
  });
});
