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

/**
 * The selectors of a rule, split on the top-level commas: a comma inside `:not(...)` or inside a quoted
 * attribute value (`[data-list="a,b"]`) does not split, and a parenthesis inside a quoted value does not count.
 */
function selectorsOf(selectorText: string): string[] {
  const selectors: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = '';
  for (const char of selectorText) {
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
    } else if (char === ',' && depth === 0) {
      selectors.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  selectors.push(current.trim());
  return selectors;
}

/** The selectors of the given rules that do not start with the scope class. */
function unscopedSelectorsOf(rules: CSSStyleRule[]): string[] {
  return rules.flatMap((rule) => selectorsOf(rule.selectorText)).filter((selector) => !SCOPE.test(selector));
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
    const unscoped = unscopedSelectorsOf(styleRulesOf(layoutStylesheet()!.cssRules));

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

describe('selectorsOf, quoted values', () => {
  it('does not split on a comma inside a quoted attribute value', () => {
    expect(selectorsOf('.csp-booking [data-list="a,b"], .x')).toEqual(['.csp-booking [data-list="a,b"]', '.x']);
    expect(selectorsOf(".csp-booking [title='a,b']")).toEqual([".csp-booking [title='a,b']"]);
  });

  it('does not count a parenthesis inside a quoted value', () => {
    expect(selectorsOf('.csp-booking [title="a)b"], .x')).toEqual(['.csp-booking [title="a)b"]', '.x']);
  });
});

/** A stylesheet built on purpose, so that the guards are proven to fire without editing the real CSS. */
function sheetOf(css: string): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  return sheet;
}

describe('the guards on a stylesheet that breaks the rule', () => {
  it('reports every selector outside the scope, including the one of a selector list that starts well', () => {
    const sheet = sheetOf(`
      body { color: red; }
      :root { --leak: 1; }
      .csp-booking a, .seat { color: blue; }
      .csp-bookingx h1 { color: green; }
      @media (min-width: 1px) { html { color: red; } }
      .csp-booking .ok { color: black; }
    `);

    expect(unscopedSelectorsOf(styleRulesOf(sheet.cssRules))).toEqual(['body', ':root', '.seat', '.csp-bookingx h1', 'html']);
  });

  it('reports nothing for a stylesheet that is entirely scoped', () => {
    const sheet = sheetOf('.csp-booking { color: red; } .csp-booking a, .csp-booking:not(.a, .b) { color: blue; }');

    expect(unscopedSelectorsOf(styleRulesOf(sheet.cssRules))).toEqual([]);
  });

  it('reports the at-rules that are global by nature, also inside @media', () => {
    const sheet = sheetOf(`
      .csp-booking a { color: red; }
      @keyframes leak { from { opacity: 0; } to { opacity: 1; } }
      @media (min-width: 1px) { @font-face { font-family: Leak; src: local(Arial); } .csp-booking b { color: red; } }
    `);

    const found = globalAtRulesOf(sheet.cssRules);

    expect(found.length).toBe(2);
    expect(found.some((text) => text.startsWith('@keyframes'))).toBeTrue();
    expect(found.some((text) => text.startsWith('@font-face'))).toBeTrue();
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
