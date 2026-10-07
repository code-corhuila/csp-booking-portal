import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookingLayoutComponent } from './booking-layout.component';

/**
 * The layout renders its stylesheet with ViewEncapsulation.None so that it reaches the routed pages. That
 * is only safe because every rule hangs from `.csp-booking`, which only the layout renders: this guard
 * fails the build if one unscoped rule (`body`, `h1`, `:root`, a bare class) ever slips into the file and
 * would become a global rule of the shell and of the sibling portals.
 */
const SCOPE = /^\.csp-booking(?![\w-])/;

/** The selectors of a rule, split on the top-level commas (a comma inside `:not(...)` does not split). */
function selectorsOf(selectorText: string): string[] {
  const selectors: string[] = [];
  let depth = 0;
  let current = '';
  for (const char of selectorText) {
    if (char === '(') depth++;
    if (char === ')') depth--;
    if (char === ',' && depth === 0) {
      selectors.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  selectors.push(current.trim());
  return selectors;
}

function styleRulesOf(rules: CSSRuleList): CSSStyleRule[] {
  return Array.from(rules).flatMap((rule) => {
    if (rule instanceof CSSStyleRule) return [rule];
    if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) return styleRulesOf(rule.cssRules);
    return [];
  });
}

function rulesOfLayoutStylesheet(): CSSStyleRule[] {
  TestBed.configureTestingModule({ imports: [BookingLayoutComponent], providers: [provideRouter([])] })
    .createComponent(BookingLayoutComponent)
    .detectChanges();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSStyleRule[];
    try {
      rules = styleRulesOf(sheet.cssRules);
    } catch {
      continue; // a stylesheet of another origin cannot be read
    }
    if (rules.some((rule) => rule.selectorText.includes('.csp-booking .seat'))) return rules;
  }
  return [];
}

describe('booking layout stylesheet', () => {
  it('is found in the document once the layout is rendered, so that the guard below is not vacuous', () => {
    expect(rulesOfLayoutStylesheet().length).toBeGreaterThan(30);
  });

  it('scopes every selector of every rule under .csp-booking', () => {
    const unscoped = rulesOfLayoutStylesheet()
      .flatMap((rule) => selectorsOf(rule.selectorText))
      .filter((selector) => !SCOPE.test(selector));

    expect(unscoped).withContext('selectors outside .csp-booking').toEqual([]);
  });
});
