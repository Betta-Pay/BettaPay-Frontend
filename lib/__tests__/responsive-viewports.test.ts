import { MOBILE_CHECKOUT_VIEWPORTS, VIEWPORTS } from "../../e2e/helpers/viewports";

describe("MOBILE_CHECKOUT_VIEWPORTS (#940)", () => {
  it("defines 375x667 (iPhone SE) and 390x844 (iPhone 12) viewports below the md breakpoint", () => {
    expect(MOBILE_CHECKOUT_VIEWPORTS).toEqual([
      { name: "iPhone SE (375x667)", width: 375, height: 667 },
      { name: "iPhone 12 (390x844)", width: 390, height: 844 },
    ]);
    expect(VIEWPORTS.mobileCompact).toEqual({ width: 375, height: 667 });
    expect(VIEWPORTS.mobile).toEqual({ width: 390, height: 844 });
    for (const vp of MOBILE_CHECKOUT_VIEWPORTS) {
      expect(vp.width).toBeLessThan(768);
    }
  });
});
