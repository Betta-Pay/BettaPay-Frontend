import { renderHook, act } from '@testing-library/react';
import {
  usePlatformTicker,
  MIN_TICKER_THROTTLE_MS,
  type TickerData,
} from '../usePlatformTicker';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(() => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  })),
}));

describe('usePlatformTicker 1Hz throttling (#909)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-21T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('throttles 50 high-frequency ticker updates within 1 second down to 1Hz', () => {
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount += 1;
      return usePlatformTicker(3000, MIN_TICKER_THROTTLE_MS);
    });

    const initialRenders = renderCount;

    act(() => {
      for (let i = 1; i <= 50; i++) {
        jest.advanceTimersByTime(10); // 50 * 10ms = 500ms total (< 1000ms window)
        const sample: TickerData = {
          liveVolume: 1_000_000 + i,
          liveFees: 10_000 + i,
          activeMerchants: 100 + i,
          tps: i,
          timestamp: new Date().toISOString(),
        };
        result.current.pushTickerUpdate(sample);
      }
    });

    // Only the first update commits immediately inside the 1000ms window;
    // the remaining 49 updates are coalesced in the ref buffer.
    expect(result.current.ticker.liveVolume).toBe(1_000_001);
    expect(renderCount - initialRenders).toBe(1);

    // Advance past the 1000ms throttle window so the buffered latest update flushes:
    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(result.current.ticker.liveVolume).toBe(1_000_050);
    expect(result.current.ticker.tps).toBe(50);
    expect(renderCount - initialRenders).toBe(2);
  });
});
