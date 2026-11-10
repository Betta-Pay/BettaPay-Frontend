import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  actionsForRole,
  formatShortcutKeys,
  isApplePlatform,
} from '../actions';
import { CommandPalette } from '@/components/command/CommandPalette';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/lib/store/authStore', () => ({
  useAuthStore: (selector: (s: { logout: () => void }) => unknown) =>
    selector({ logout: jest.fn() }),
}));

jest.mock('@/lib/store/walletStore', () => ({
  useWalletStore: (selector: (s: { network: string; setNetwork: () => void }) => unknown) =>
    selector({ network: 'testnet', setNetwork: jest.fn() }),
}));

describe('lib/command/actions shortcut badge metadata (#941)', () => {
  it('includes shortcut definitions on merchant and admin command actions', () => {
    const merchantActions = actionsForRole('merchant');
    expect(merchantActions.length).toBeGreaterThan(0);

    const dashboardAction = merchantActions.find((a) => a.href === '/dashboard');
    expect(dashboardAction?.shortcut).toEqual(['G', 'D']);

    const createPaymentLink = merchantActions.find((a) => a.id === 'create:payment-link');
    expect(createPaymentLink?.shortcut).toEqual(['Mod', 'N']);

    for (const action of merchantActions) {
      expect(Array.isArray(action.shortcut)).toBe(true);
      expect(action.shortcut!.length).toBeGreaterThan(0);
    }
  });

  it('adapts Mod and Shift symbols between Mac (⌘ / ⇧) and Windows/Linux (Ctrl / Shift)', () => {
    expect(isApplePlatform('MacIntel')).toBe(true);
    expect(isApplePlatform('Win32')).toBe(false);

    expect(formatShortcutKeys(['Mod', 'Shift', 'N'], true)).toEqual(['⌘', '⇧', 'N']);
    expect(formatShortcutKeys(['Mod', 'Shift', 'N'], false)).toEqual(['Ctrl', 'Shift', 'N']);
    expect(formatShortcutKeys(['G', 'D'], true)).toEqual(['G', 'D']);
  });

  it('renders <kbd> shortcut badges beside command items in CommandPalette', () => {
    const { container } = render(<CommandPalette role="merchant" />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();

    const kbdBadges = container.querySelectorAll('[role="option"] kbd');
    expect(kbdBadges.length).toBeGreaterThan(0);
    expect(Array.from(kbdBadges).map((el) => el.textContent)).toEqual(
      expect.arrayContaining(['G', 'D', 'N']),
    );
  });
});
