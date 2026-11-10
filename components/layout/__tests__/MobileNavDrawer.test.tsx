import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MobileNavDrawer } from '@/components/layout/MobileNavDrawer';

jest.mock('next/navigation', () => ({
  usePathname: () => '/overview',
}));

const DummyIcon = ({ className }: { className?: string }) => (
  <span className={className} />
);

const NAV_ITEMS = [
  { href: '/overview', label: 'Overview', icon: DummyIcon },
  { href: '/payments', label: 'Payments', icon: DummyIcon },
];

describe('MobileNavDrawer — Focus trap and trigger focus restoration (#893)', () => {
  it('wraps focus from the last link back to the close button on Tab, and from close button to last link on Shift+Tab', () => {
    const onClose = jest.fn();
    render(
      <MobileNavDrawer isOpen={true} onClose={onClose} navItems={NAV_ITEMS} />
    );

    const closeButton = screen.getByRole('button', {
      name: /close navigation menu/i,
    });
    const settingsLink = screen.getByRole('link', { name: /settings/i });

    // Focus the last link inside the drawer (Settings)
    settingsLink.focus();
    expect(document.activeElement).toBe(settingsLink);

    // Pressing Tab from the last link wraps focus to the close button
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(closeButton);

    // Pressing Shift+Tab from the close button wraps focus to the last link
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(settingsLink);
  });

  it('closes on Escape and restores focus to the trigger button', () => {
    function Harness() {
      const [isOpen, setIsOpen] = useState(false);
      return (
        <div>
          <button
            type="button"
            data-testid="hamburger-trigger"
            onClick={() => setIsOpen(true)}
          >
            Open Menu
          </button>
          <MobileNavDrawer
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            navItems={NAV_ITEMS}
          />
        </div>
      );
    }

    render(<Harness />);

    const trigger = screen.getByTestId('hamburger-trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);

    const closeButton = screen.getByRole('button', {
      name: /close navigation menu/i,
    });
    expect(document.activeElement).toBe(closeButton);

    // Pressing Escape closes the drawer and restores focus to the trigger button
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.activeElement).toBe(trigger);
  });
});
