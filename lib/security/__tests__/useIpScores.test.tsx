import { act, renderHook } from "@testing-library/react";
import { useIpScores } from "../useIpScores";

const payload = { data: [], threshold: 20 };
let visibility: "visible" | "hidden" = "visible";

beforeEach(() => {
  jest.useFakeTimers();
  visibility = "visible";
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => visibility });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => payload }) as unknown as typeof fetch;
});
afterEach(() => jest.useRealTimers());

const setVisibility = (v: "visible" | "hidden") => {
  visibility = v;
  document.dispatchEvent(new Event("visibilitychange"));
};

it("polls, pauses while hidden, resumes with an immediate refetch, and cleans up", async () => {
  const fetchMock = global.fetch as jest.Mock;
  const { unmount } = renderHook(() => useIpScores("", 1000));
  await act(async () => {});
  expect(fetchMock).toHaveBeenCalledTimes(1);

  await act(async () => void jest.advanceTimersByTime(2000));
  expect(fetchMock).toHaveBeenCalledTimes(3);

  act(() => setVisibility("hidden"));
  await act(async () => void jest.advanceTimersByTime(5000));
  expect(fetchMock).toHaveBeenCalledTimes(3);

  await act(async () => setVisibility("visible"));
  expect(fetchMock).toHaveBeenCalledTimes(4);
  await act(async () => void jest.advanceTimersByTime(1000));
  expect(fetchMock).toHaveBeenCalledTimes(5);

  unmount();
  await act(async () => void jest.advanceTimersByTime(5000));
  expect(fetchMock).toHaveBeenCalledTimes(5);
});

it("keeps the last good payload when a later poll fails", async () => {
  const fetchMock = global.fetch as jest.Mock;
  const { result } = renderHook(() => useIpScores("", 1000));
  await act(async () => {});
  expect(result.current.data).toEqual(payload);
  fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
  await act(async () => void jest.advanceTimersByTime(1000));
  expect(result.current.error).toMatch(/500/);
  expect(result.current.data).toEqual(payload);
});
