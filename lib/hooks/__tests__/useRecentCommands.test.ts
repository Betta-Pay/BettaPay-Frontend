import { renderHook, act } from '@testing-library/react';
import {
  useRecentCommands,
  MAX_RECENT_COMMANDS,
  getRecentCommandsStorageKey,
} from '../useRecentCommands';

describe('useRecentCommands (#910)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('caps recent command history at 10 items in state and localStorage when 15 commands are executed', () => {
    expect(MAX_RECENT_COMMANDS).toBe(10);
    const { result } = renderHook(() => useRecentCommands('merchant'));

    act(() => {
      for (let i = 1; i <= 15; i++) {
        result.current.push(`cmd:${i}`);
      }
    });

    expect(result.current.recent).toHaveLength(10);
    expect(result.current.recent[0]).toBe('cmd:15');
    expect(result.current.recent[9]).toBe('cmd:6');

    const stored = JSON.parse(
      localStorage.getItem(getRecentCommandsStorageKey('merchant')) ?? '[]',
    ) as string[];
    expect(stored).toHaveLength(10);
    expect(stored[0]).toBe('cmd:15');
    expect(stored[9]).toBe('cmd:6');
  });

  it('deduplicates commands and bumps re-executed commands to the top of the list', () => {
    const { result } = renderHook(() => useRecentCommands('merchant'));

    act(() => {
      result.current.push('nav:merchant:/dashboard');
      result.current.push('nav:merchant:/payments');
      result.current.push('nav:merchant:/wallet');
      result.current.push('nav:merchant:/dashboard');
    });

    expect(result.current.recent).toEqual([
      'nav:merchant:/dashboard',
      'nav:merchant:/wallet',
      'nav:merchant:/payments',
    ]);
  });

  it('truncates oversized pre-existing localStorage arrays on initial read', () => {
    const oversized = Array.from({ length: 20 }, (_, i) => `legacy-cmd-${i}`);
    localStorage.setItem(
      getRecentCommandsStorageKey('admin'),
      JSON.stringify(oversized),
    );

    const { result } = renderHook(() => useRecentCommands('admin'));
    expect(result.current.recent).toHaveLength(10);
    expect(result.current.recent[0]).toBe('legacy-cmd-0');
    expect(result.current.recent[9]).toBe('legacy-cmd-9');
  });
});
