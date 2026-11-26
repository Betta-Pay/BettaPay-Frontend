/**
 * lib/utils/__tests__/announce.test.ts
 *
 * Issue #1160 — the inner 100ms timer must be tracked (so a rapid follow-up
 * cannot be overwritten by a stale message) and the dedupe guard reset once the
 * live region clears.
 */

describe("announce (#1160)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '<div id="announcer" aria-live="polite"></div>';
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    document.body.innerHTML = "";
  });

  /** Fresh module per test so the module-level timer guards don't leak. */
  function loadAnnounce(): typeof import("../announce") {
    let mod!: typeof import("../announce");
    jest.isolateModules(() => {
      mod = require("../announce");
    });
    return mod;
  }

  it("lets a rapid follow-up replace the pending earlier message", () => {
    const { announce } = loadAnnounce();
    const el = document.getElementById("announcer")!;

    announce("First");
    jest.advanceTimersByTime(300); // earlier debounce still pending
    announce("Second");
    jest.advanceTimersByTime(1000);

    expect(el.textContent).toBe("Second");
  });

  it("clears the tracked inner timer so a stale message never appears", () => {
    const { announce } = loadAnnounce();
    const el = document.getElementById("announcer")!;

    announce("First");
    // Debounce fired; the 100ms inner timer for "First" is queued for ~t+600.
    jest.advanceTimersByTime(550);
    announce("Second");

    // At ~t+650 an untracked inner timer would have written the stale "First".
    jest.advanceTimersByTime(100);
    expect(el.textContent).not.toBe("First");

    jest.advanceTimersByTime(1000);
    expect(el.textContent).toBe("Second");
  });

  it("re-announces the same message after the region clears", () => {
    const { announce } = loadAnnounce();
    const el = document.getElementById("announcer")!;

    announce("Saved");
    jest.advanceTimersByTime(2000); // full cycle incl. the 1000ms clear timer
    expect(el.textContent).toBe("");

    announce("Saved"); // must not be skipped now the guard was reset
    jest.advanceTimersByTime(700);

    expect(el.textContent).toBe("Saved");
  });

  it("is a no-op when the live region is absent", () => {
    const { announce } = loadAnnounce();
    document.body.innerHTML = "";

    expect(() => announce("hello")).not.toThrow();
  });
});
