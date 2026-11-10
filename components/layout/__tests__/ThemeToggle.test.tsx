import React from 'react';
import { act, render } from '@testing-library/react';
import { useTheme } from 'next-themes';
import {
  SYSTEM_COLOR_SCHEME_QUERY,
  ThemeToggle,
} from '@/components/layout/ThemeToggle';

jest.mock('next-themes', () => ({
  useTheme: jest.fn(),
}));

const mockUseTheme = useTheme as jest.Mock;

describe('ThemeToggle — System theme change event listener (#890)', () => {
  let changeListeners: Array<(e: { matches: boolean }) => void> = [];
  let addEventListenerSpy: jest.Mock;
  let removeEventListenerSpy: jest.Mock;

  beforeEach(() => {
    changeListeners = [];
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.style.colorScheme = '';

    addEventListenerSpy = jest.fn((event: string, cb: (e: { matches: boolean }) => void) => {
      if (event === 'change') {
        changeListeners.push(cb);
      }
    });
    removeEventListenerSpy = jest.fn((event: string, cb: (e: { matches: boolean }) => void) => {
      if (event === 'change') {
        changeListeners = changeListeners.filter((fn) => fn !== cb);
      }
    });

    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: addEventListenerSpy,
      removeEventListener: removeEventListenerSpy,
    }));
  });

  it('updates document.documentElement.classList ("dark") immediately when OS theme changes in system mode and removes listener on unmount', () => {
    mockUseTheme.mockReturnValue({
      theme: 'system',
      setTheme: jest.fn(),
    });

    const { unmount } = render(<ThemeToggle />);

    expect(window.matchMedia).toHaveBeenCalledWith(SYSTEM_COLOR_SCHEME_QUERY);
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );

    // Simulate OS switching to Dark mode
    act(() => {
      changeListeners.forEach((listener) => listener({ matches: true }));
    });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('dark');

    // Simulate OS switching back to Light mode
    act(() => {
      changeListeners.forEach((listener) => listener({ matches: false }));
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(true);
    expect(document.documentElement.style.colorScheme).toBe('light');

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  it('does not attach system matchMedia listener when an explicit theme ("dark" or "light") is active', () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: jest.fn(),
    });

    render(<ThemeToggle />);
    expect(addEventListenerSpy).not.toHaveBeenCalled();
  });
});
