import { evaluateWcagRulesInDom } from "../../e2e/helpers/axe";

describe("AxeBuilder WCAG 2.1 AA DOM evaluator (#939)", () => {
  beforeEach(() => {
    document.documentElement.setAttribute("lang", "en");
    document.body.innerHTML = "";
  });

  it("reports zero critical or serious violations for an accessible public page DOM", () => {
    document.body.innerHTML = `
      <main>
        <h1>BettaPay Cross-Border Checkout</h1>
        <img src="/logo.png" alt="BettaPay logo" />
        <label for="amount-input">Amount</label>
        <input id="amount-input" type="text" />
        <button type="button">Continue to Review</button>
      </main>
    `;

    const results = evaluateWcagRulesInDom(document);
    const severe = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(severe).toEqual([]);
    expect(results.passes).toEqual(
      expect.arrayContaining(["html-has-lang", "image-alt", "button-name", "label"]),
    );
  });

  it("flags missing html[lang], missing img[alt], unnamed buttons, and unlabeled inputs", () => {
    document.documentElement.removeAttribute("lang");
    document.body.innerHTML = `
      <main>
        <img src="/hero.png" />
        <input type="text" />
        <button type="button"></button>
      </main>
    `;

    const results = evaluateWcagRulesInDom(document);
    const ruleIds = results.violations.map((v) => v.id);
    expect(ruleIds).toEqual(
      expect.arrayContaining(["html-has-lang", "image-alt", "button-name", "label"]),
    );
  });
});
