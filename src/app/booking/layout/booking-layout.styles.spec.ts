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

/**
 * At-rules that are global by nature: a keyframes name, a font family, an import or a page rule
 * cannot be hung from `.csp-booking`, so the stylesheet must not declare any. `@media` and
 * `@supports` only wrap style rules and are walked into.
 */
function globalAtRulesOf(rules: CSSRuleList): string[] {
  return Array.from(rules).flatMap((rule) => {
    if (rule instanceof CSSStyleRule) return [];
    if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) return globalAtRulesOf(rule.cssRules);
    return [rule.cssText.slice(0, 40)];
  });
}

/** The stylesheet of the layout, recognized by a rule that only the layout declares (not by its position). */
function layoutStylesheet(): CSSStyleSheet | undefined {
  TestBed.configureTestingModule({ imports: [BookingLayoutComponent], providers: [provideRouter([])] })
    .createComponent(BookingLayoutComponent)
    .detectChanges();
  return Array.from(document.styleSheets).find((sheet) => {
    try {
      return styleRulesOf(sheet.cssRules).some((rule) => rule.selectorText.includes('.csp-booking .seat'));
    } catch {
      return false; // a stylesheet of another origin cannot be read
    }
  });
}

describe('booking layout stylesheet', () => {
  it('is found in the document once the layout is rendered, so that the guards below are not vacuous', () => {
    const sheet = layoutStylesheet();

    expect(sheet).withContext('the layout stylesheet').toBeDefined();
    expect(styleRulesOf(sheet!.cssRules).length).toBeGreaterThan(0);
  });

  it('scopes every selector of every rule under .csp-booking', () => {
    const unscoped = styleRulesOf(layoutStylesheet()!.cssRules)
      .flatMap((rule) => selectorsOf(rule.selectorText))
      .filter((selector) => !SCOPE.test(selector));

    expect(unscoped).withContext('selectors outside .csp-booking').toEqual([]);
  });

  it('declares no at-rule that is global by nature (keyframes, font faces, imports, page rules)', () => {
    expect(globalAtRulesOf(layoutStylesheet()!.cssRules)).withContext('global at-rules').toEqual([]);
  });
});

describe('selectorsOf', () => {
  it('splits a selector list on its top-level commas', () => {
    expect(selectorsOf('.csp-booking a, .seat')).toEqual(['.csp-booking a', '.seat']);
  });

  it('does not split on a comma inside :not(...) or :is(...)', () => {
    expect(selectorsOf('.csp-booking:not(.a, .b), .x')).toEqual(['.csp-booking:not(.a, .b)', '.x']);
    expect(selectorsOf('.csp-booking :is(h1, h2)')).toEqual(['.csp-booking :is(h1, h2)']);
  });

  it('leaves a single selector as it is', () => {
    expect(selectorsOf('.csp-booking .seat:hover:not(:disabled)')).toEqual(['.csp-booking .seat:hover:not(:disabled)']);
  });
});

describe('the scope pattern', () => {
  it('accepts the scope class alone, with a descendant, a pseudo-class or a second class', () => {
    for (const selector of ['.csp-booking', '.csp-booking h1', '.csp-booking:hover', '.csp-booking.dark .x']) {
      expect(SCOPE.test(selector)).withContext(selector).toBeTrue();
    }
  });

  it('rejects the document selectors, bare classes and look-alike class names', () => {
    for (const selector of ['body', ':root', 'html', '.seat', '.csp-bookingx h1', '.csp-booking-x', 'div .csp-booking']) {
      expect(SCOPE.test(selector)).withContext(selector).toBeFalse();
    }
  });
});
