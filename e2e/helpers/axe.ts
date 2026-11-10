import type { Page } from '@playwright/test';

export type AxeImpact = 'minor' | 'moderate' | 'serious' | 'critical';

export interface AxeViolationNode {
  html: string;
  target: string[];
  failureSummary: string;
}

export interface AxeViolation {
  id: string;
  impact: AxeImpact;
  tags: string[];
  description: string;
  nodes: AxeViolationNode[];
}

export interface AxeResults {
  violations: AxeViolation[];
  passes: string[];
}

/**
 * Pure DOM WCAG 2.1 A/AA evaluator used by `AxeBuilder.analyze()` in Playwright
 * and directly testable in JSDOM.
 */
export function evaluateWcagRulesInDom(
  doc: Document,
  activeTags: string[] = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
): AxeResults {
  const violations: AxeViolation[] = [];
  const passes: string[] = [];

  // 1. html-has-lang (WCAG 3.1.1 - serious)
  const htmlEl = doc.documentElement;
  const lang = htmlEl?.getAttribute('lang')?.trim();
  if (!lang) {
    violations.push({
      id: 'html-has-lang',
      impact: 'serious',
      tags: ['wcag2a', 'wcag311'],
      description: 'Ensures every HTML document has a lang attribute',
      nodes: [
        {
          html: '<html>',
          target: ['html'],
          failureSummary: 'The <html> element does not have a lang attribute',
        },
      ],
    });
  } else {
    passes.push('html-has-lang');
  }

  // 2. image-alt (WCAG 1.1.1 - critical)
  const missingAltNodes: AxeViolationNode[] = [];
  doc.querySelectorAll('img').forEach((img, idx) => {
    const ariaHidden = img.getAttribute('aria-hidden') === 'true';
    const role = img.getAttribute('role');
    const hasAlt = img.hasAttribute('alt');
    const hasAriaLabel = Boolean(
      img.getAttribute('aria-label')?.trim() || img.getAttribute('aria-labelledby')?.trim(),
    );
    if (!ariaHidden && role !== 'presentation' && role !== 'none' && !hasAlt && !hasAriaLabel) {
      missingAltNodes.push({
        html: img.outerHTML.slice(0, 120),
        target: [`img:nth-of-type(${idx + 1})`],
        failureSummary: 'Element does not have an alt attribute or accessible label',
      });
    }
  });
  if (missingAltNodes.length > 0) {
    violations.push({
      id: 'image-alt',
      impact: 'critical',
      tags: ['wcag2a', 'wcag111'],
      description: 'Ensures <img> elements have alternate text or a role of none or presentation',
      nodes: missingAltNodes,
    });
  } else {
    passes.push('image-alt');
  }

  // 3. button-name (WCAG 4.1.2 - critical)
  const unnamedButtonNodes: AxeViolationNode[] = [];
  doc.querySelectorAll('button').forEach((btn, idx) => {
    if (btn.getAttribute('aria-hidden') === 'true') return;
    const text = btn.textContent?.trim() ?? '';
    const ariaLabel = btn.getAttribute('aria-label')?.trim() ?? '';
    const ariaLabelledBy = btn.getAttribute('aria-labelledby')?.trim() ?? '';
    const title = btn.getAttribute('title')?.trim() ?? '';
    if (!text && !ariaLabel && !ariaLabelledBy && !title) {
      unnamedButtonNodes.push({
        html: btn.outerHTML.slice(0, 120),
        target: [`button:nth-of-type(${idx + 1})`],
        failureSummary: 'Element does not have discernible text or accessible label',
      });
    }
  });
  if (unnamedButtonNodes.length > 0) {
    violations.push({
      id: 'button-name',
      impact: 'critical',
      tags: ['wcag2a', 'wcag412'],
      description: 'Ensures buttons have discernible text',
      nodes: unnamedButtonNodes,
    });
  } else {
    passes.push('button-name');
  }

  // 4. label (WCAG 1.3.1 / 4.1.2 - critical)
  const unlabeledInputNodes: AxeViolationNode[] = [];
  doc
    .querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])')
    .forEach((input, idx) => {
      if (input.getAttribute('aria-hidden') === 'true') return;
      const id = input.getAttribute('id');
      const hasForLabel = id ? Boolean(doc.querySelector(`label[for="${CSS.escape(id)}"]`)) : false;
      const hasWrappingLabel = Boolean(input.closest('label'));
      const hasAriaLabel = Boolean(
        input.getAttribute('aria-label')?.trim() ||
          input.getAttribute('aria-labelledby')?.trim() ||
          input.getAttribute('title')?.trim() ||
          input.getAttribute('placeholder')?.trim(),
      );
      if (!hasForLabel && !hasWrappingLabel && !hasAriaLabel) {
        unlabeledInputNodes.push({
          html: input.outerHTML.slice(0, 120),
          target: [`input:nth-of-type(${idx + 1})`],
          failureSummary: 'Form element does not have an associated label',
        });
      }
    });
  if (unlabeledInputNodes.length > 0) {
    violations.push({
      id: 'label',
      impact: 'critical',
      tags: ['wcag2a', 'wcag131', 'wcag412'],
      description: 'Ensures every form element has a label',
      nodes: unlabeledInputNodes,
    });
  } else {
    passes.push('label');
  }

  const filtered =
    activeTags.length > 0
      ? violations.filter((v) => v.tags.some((t) => activeTags.includes(t)))
      : violations;

  return { violations: filtered, passes };
}

/**
 * Playwright-compatible `AxeBuilder` wrapper that runs automated WCAG 2.1 A/AA
 * audits on any page and reports critical/serious violations.
 */
export class AxeBuilder {
  private readonly page: Page;
  private tags: string[] = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
  private disabledRules: Set<string> = new Set();

  constructor({ page }: { page: Page }) {
    this.page = page;
  }

  withTags(tags: string | string[]): this {
    this.tags = Array.isArray(tags) ? tags : [tags];
    return this;
  }

  disableRules(rules: string | string[]): this {
    const list = Array.isArray(rules) ? rules : [rules];
    list.forEach((r) => this.disabledRules.add(r));
    return this;
  }

  async analyze(): Promise<AxeResults> {
    const activeTags = [...this.tags];
    const disabled = Array.from(this.disabledRules);

    return this.page.evaluate(
      ({ tags, disabledRules }) => {
        const violations: AxeViolation[] = [];
        const passes: string[] = [];
        const htmlEl = document.documentElement;
        const lang = htmlEl?.getAttribute('lang')?.trim();
        if (!disabledRules.includes('html-has-lang')) {
          if (!lang) {
            violations.push({
              id: 'html-has-lang',
              impact: 'serious',
              tags: ['wcag2a', 'wcag311'],
              description: 'Ensures every HTML document has a lang attribute',
              nodes: [
                {
                  html: '<html>',
                  target: ['html'],
                  failureSummary: 'The <html> element does not have a lang attribute',
                },
              ],
            });
          } else {
            passes.push('html-has-lang');
          }
        }

        if (!disabledRules.includes('image-alt')) {
          const missingAltNodes: AxeViolationNode[] = [];
          document.querySelectorAll('img').forEach((img, idx) => {
            const ariaHidden = img.getAttribute('aria-hidden') === 'true';
            const role = img.getAttribute('role');
            const hasAlt = img.hasAttribute('alt');
            const hasAriaLabel = Boolean(
              img.getAttribute('aria-label')?.trim() ||
                img.getAttribute('aria-labelledby')?.trim(),
            );
            if (
              !ariaHidden &&
              role !== 'presentation' &&
              role !== 'none' &&
              !hasAlt &&
              !hasAriaLabel
            ) {
              missingAltNodes.push({
                html: img.outerHTML.slice(0, 120),
                target: [`img:nth-of-type(${idx + 1})`],
                failureSummary: 'Element does not have an alt attribute or accessible label',
              });
            }
          });
          if (missingAltNodes.length > 0) {
            violations.push({
              id: 'image-alt',
              impact: 'critical',
              tags: ['wcag2a', 'wcag111'],
              description:
                'Ensures <img> elements have alternate text or a role of none or presentation',
              nodes: missingAltNodes,
            });
          } else {
            passes.push('image-alt');
          }
        }

        if (!disabledRules.includes('button-name')) {
          const unnamedButtonNodes: AxeViolationNode[] = [];
          document.querySelectorAll('button').forEach((btn, idx) => {
            if (btn.getAttribute('aria-hidden') === 'true') return;
            const text = btn.textContent?.trim() ?? '';
            const ariaLabel = btn.getAttribute('aria-label')?.trim() ?? '';
            const ariaLabelledBy = btn.getAttribute('aria-labelledby')?.trim() ?? '';
            const title = btn.getAttribute('title')?.trim() ?? '';
            if (!text && !ariaLabel && !ariaLabelledBy && !title) {
              unnamedButtonNodes.push({
                html: btn.outerHTML.slice(0, 120),
                target: [`button:nth-of-type(${idx + 1})`],
                failureSummary: 'Element does not have discernible text or accessible label',
              });
            }
          });
          if (unnamedButtonNodes.length > 0) {
            violations.push({
              id: 'button-name',
              impact: 'critical',
              tags: ['wcag2a', 'wcag412'],
              description: 'Ensures buttons have discernible text',
              nodes: unnamedButtonNodes,
            });
          } else {
            passes.push('button-name');
          }
        }

        const filtered =
          tags.length > 0
            ? violations.filter((v) => v.tags.some((t) => tags.includes(t)))
            : violations;

        return { violations: filtered, passes };
      },
      { tags: activeTags, disabledRules: disabled },
    );
  }
}
