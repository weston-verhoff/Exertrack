import fs from 'fs';
import path from 'path';
import {
  BRAND_IMAGE_TOKEN_CONTRACT,
  OPTIONAL_THEME_IMAGE_TOKEN_CONTRACT,
  THEME_CONTRAST_PAIRS,
  THEME_TOKEN_CONTRACT,
} from './colorTokens';

const stylesDirectory = path.resolve(__dirname, '../styles');
const sourceDirectory = path.resolve(__dirname, '..');
const themeFiles = [
  'theme-default.css',
  'theme-dark.css',
  'theme-up-and-up.css',
  'theme-baseball.css',
  'theme-neon.css',
  'theme-monokai.css',
  'theme-sunset.css',
];

const readStyle = (filename: string) =>
  fs.readFileSync(path.join(stylesDirectory, filename), 'utf8');

const getSourceFiles = (directory: string): string[] =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return getSourceFiles(entryPath);
    return /\.(css|ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });

const getDeclarations = (css: string) => {
  const declarations = new Map<string, string>();
  const counts = new Map<string, number>();
  const pattern = /^\s*(--[_a-z0-9-]+):\s*([^;]+);/gm;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(css))) {
    declarations.set(match[1], match[2].trim());
    counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }

  return { declarations, counts };
};

const getRuleDeclarations = (css: string, selector: string) => {
  const marker = `${selector} {`;
  const start = css.indexOf(marker);
  if (start < 0) throw new Error(`Missing selector: ${selector}`);
  const bodyStart = start + marker.length;
  const bodyEnd = css.indexOf('}', bodyStart);
  if (bodyEnd < 0) throw new Error(`Unclosed selector: ${selector}`);
  return getDeclarations(css.slice(bodyStart, bodyEnd)).declarations;
};

const resolveValue = (
  token: string,
  declarations: Map<string, string>,
  seen = new Set<string>()
): string => {
  if (seen.has(token)) throw new Error(`Circular token reference: ${token}`);
  seen.add(token);

  const value = declarations.get(token);
  if (!value) throw new Error(`Missing token: ${token}`);

  return value.replace(/var\((--[_a-z0-9-]+)\)/g, (_, reference: string) =>
    resolveValue(reference, declarations, new Set(seen))
  );
};

type RgbColor = [number, number, number];

const parseColor = (value: string, backdrop: RgbColor): RgbColor => {
  if (value.startsWith('#')) {
    return value
      .slice(1)
      .match(/.{2}/g)!
      .map((channel) => parseInt(channel, 16)) as RgbColor;
  }

  const match = value.match(
    /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*\)$/i
  );
  if (!match) throw new Error(`Unsupported color: ${value}`);

  const alpha = Number(match[4]);
  return [Number(match[1]), Number(match[2]), Number(match[3])].map(
    (channel, index) => channel * alpha + backdrop[index] * (1 - alpha)
  ) as RgbColor;
};

const luminance = (color: RgbColor) => {
  const channels = color
    .map((value) => value / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrast = (first: string, second: string, backdrop?: string) => {
  const backdropColor = backdrop
    ? parseColor(backdrop, [255, 255, 255])
    : [255, 255, 255] as RgbColor;
  const light = Math.max(
    luminance(parseColor(first, backdropColor)),
    luminance(parseColor(second, backdropColor))
  );
  const dark = Math.min(
    luminance(parseColor(first, backdropColor)),
    luminance(parseColor(second, backdropColor))
  );
  return (light + 0.05) / (dark + 0.05);
};

describe.each(themeFiles)('%s token contract', (themeFile) => {
  const css = readStyle(themeFile);
  const { declarations, counts } = getDeclarations(css);

  it('declares every system token exactly once', () => {
    THEME_TOKEN_CONTRACT.forEach((token) => {
      expect(counts.get(token)).toBe(1);
    });
  });

  it('declares each optional brand image token at most once', () => {
    BRAND_IMAGE_TOKEN_CONTRACT.forEach((token) => {
      expect(counts.get(token) ?? 0).toBeLessThanOrEqual(1);
    });
  });

  it('declares each optional theme image token at most once', () => {
    OPTIONAL_THEME_IMAGE_TOKEN_CONTRACT.forEach((token) => {
      expect(counts.get(token) ?? 0).toBeLessThanOrEqual(1);
    });
  });

  it('does not declare tokens outside the shared contract', () => {
    const contract = new Set<string>([
      ...THEME_TOKEN_CONTRACT,
      ...OPTIONAL_THEME_IMAGE_TOKEN_CONTRACT,
      ...BRAND_IMAGE_TOKEN_CONTRACT,
    ]);
    const declaredSystemTokens = Array.from(declarations.keys()).filter((token) =>
      /^(--color-|--shadow-|--image-)/.test(token)
    );
    declaredSystemTokens.forEach((token) => expect(contract.has(token)).toBe(true));
  });

  it.each(THEME_CONTRAST_PAIRS)(
    'keeps %s and %s at normal-text contrast',
    (surface, content) => {
      const surfaceValue = resolveValue(surface, declarations);
      const contentValue = resolveValue(content, declarations);
      const canvasValue = resolveValue('--color-surface-canvas', declarations);
      expect(surfaceValue).toMatch(/^(?:#[0-9a-f]{6}|rgba\(.+\))$/i);
      expect(contentValue).toMatch(/^#[0-9a-f]{6}$/i);
      expect(contrast(surfaceValue, contentValue, canvasValue)).toBeGreaterThanOrEqual(4.5);
    }
  );
});

describe('token architecture', () => {
  it('defines one global fallback for every brand image token', () => {
    const { declarations, counts } = getDeclarations(readStyle('variables.css'));

    BRAND_IMAGE_TOKEN_CONTRACT.forEach((token) => {
      expect(counts.get(token)).toBe(1);
      expect(declarations.get(token)).toMatch(/^(?:url\(|var\(--image-brand-)/);
    });
  });

  it('defines a global fallback for optional theme images', () => {
    const { declarations, counts } = getDeclarations(readStyle('variables.css'));

    OPTIONAL_THEME_IMAGE_TOKEN_CONTRACT.forEach((token) => {
      expect(counts.get(token)).toBe(1);
      expect(declarations.get(token)).toBe('none');
    });
  });

  it('uses custom canvas artwork only for themes that provide it', () => {
    ['theme-up-and-up.css', 'theme-sunset.css'].forEach((themeFile) => {
      const { declarations } = getDeclarations(readStyle(themeFile));
      expect(declarations.has('--image-surface-canvas')).toBe(true);
      expect(declarations.get('--image-surface-canvas')).not.toBe('none');
    });

    ['theme-default.css', 'theme-dark.css', 'theme-baseball.css', 'theme-neon.css', 'theme-monokai.css'].forEach((themeFile) => {
      const { declarations } = getDeclarations(readStyle(themeFile));
      expect(declarations.has('--image-surface-canvas')).toBe(false);
    });
  });

  it('layers optional canvas artwork over the planner fallback color', () => {
    const plannerStyles = readStyle('plan.css');

    expect(plannerStyles).toContain('background-color: var(--_plan-canvas);');
    expect(plannerStyles).toContain('background-image: var(--image-surface-canvas);');
    expect(plannerStyles).toContain('background-size: 100% 100%;');
    expect(plannerStyles).toContain('background-repeat: no-repeat;');
  });

  it('uses custom brand images only for themes that provide them', () => {
    const upAndUpTokens = getDeclarations(readStyle('theme-up-and-up.css')).declarations;
    const neonTokens = getDeclarations(readStyle('theme-neon.css')).declarations;

    expect(upAndUpTokens.get('--image-brand-mark-alternate')).toContain(
      'branding/default/mark-alternate.png'
    );
    BRAND_IMAGE_TOKEN_CONTRACT.forEach((token) => {
      expect(neonTokens.has(token)).toBe(true);
    });

    ['theme-default.css', 'theme-dark.css', 'theme-baseball.css', 'theme-monokai.css', 'theme-sunset.css'].forEach((themeFile) => {
      const { declarations } = getDeclarations(readStyle(themeFile));
      BRAND_IMAGE_TOKEN_CONTRACT.forEach((token) => {
        expect(declarations.has(token)).toBe(false);
      });
    });
  });

  it('keeps reference tokens inside theme files', () => {
    const nonThemeFiles = fs
      .readdirSync(stylesDirectory)
      .filter((filename) => filename.endsWith('.css') && !filename.startsWith('theme-'));

    nonThemeFiles.forEach((filename) => {
      expect(readStyle(filename)).not.toMatch(/var\(--ref-/);
    });
  });

  it('keeps every system-token consumer on the shared contract', () => {
    const contract = new Set<string>([
      ...THEME_TOKEN_CONTRACT,
      ...OPTIONAL_THEME_IMAGE_TOKEN_CONTRACT,
      ...BRAND_IMAGE_TOKEN_CONTRACT,
    ]);

    getSourceFiles(sourceDirectory)
      .filter((filename) => !path.basename(filename).startsWith('theme-'))
      .forEach((filename) => {
        const source = fs.readFileSync(filename, 'utf8');
        const usages = source.match(/var\((--(?:color|shadow|image)-[a-z0-9-]+)/g) ?? [];
        usages.forEach((usage) => {
          const token = usage.slice(4);
          expect(contract.has(token)).toBe(true);
        });
      });
  });

  it('keeps raw color values inside theme files', () => {
    getSourceFiles(sourceDirectory)
      .filter((filename) => !path.basename(filename).startsWith('theme-'))
      .forEach((filename) => {
        const source = fs.readFileSync(filename, 'utf8');
        expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|rgba?\(/i);
      });
  });

  it('keeps component, page, hue, and appearance names out of the contract', () => {
    const prohibited = /(plan|header|workout|drawer|account|warm|dark|black|blue|pink|orange|green|red|cyan|purple|yellow)/;
    [...THEME_TOKEN_CONTRACT, ...OPTIONAL_THEME_IMAGE_TOKEN_CONTRACT, ...BRAND_IMAGE_TOKEN_CONTRACT]
      .forEach((token) => expect(token).not.toMatch(prohibited));
  });

  it('defines complete recipe triplets without reference values', () => {
    const recipes = readStyle('color-context.css');
    expect(recipes).not.toMatch(/var\(--ref-/);

    ['canvas', 'default', 'raised', 'inverse', 'selected', 'info', 'success', 'danger']
      .forEach((name) => {
        const block = recipes.match(
          new RegExp(`\\.color-context--${name}\\s*\\{([\\s\\S]*?)\\}`)
        )?.[1] ?? '';
        expect(block).toContain('--_context-surface:');
        expect(block).toContain('--_context-content:');
        expect(block).toContain('--_context-border:');
      });
  });

  it('keeps non-interactive card headers on non-interactive, non-feedback tokens', () => {
    const cardStyles = readStyle('WorkoutCard.css');
    const headerRecipes = cardStyles.match(/--_card-header-(?:surface|content):[^;]+;/g) ?? [];

    expect(headerRecipes.length).toBeGreaterThan(0);
    headerRecipes.forEach((recipe) => {
      expect(recipe).not.toContain('--color-interactive-');
      expect(recipe).not.toContain('--color-feedback-');
      expect(recipe).not.toContain('--color-on-feedback-');
    });
  });
});

describe('Sunset functional tone recipes', () => {
  const css = readStyle('theme-sunset.css');
  const themeDeclarations = getDeclarations(css).declarations;
  const tonePairs = [
    ['--_tone-surface-sunken', '--_tone-content'],
    ['--_tone-surface', '--_tone-content'],
    ['--_tone-surface-raised', '--_tone-content'],
    ['--_tone-strong', '--_tone-on-strong'],
    ['--_tone-strong-hover', '--_tone-on-strong'],
  ] as const;

  it.each(['workout', 'library', 'selection'])('%s stays within one accessible tonal recipe', (tone) => {
    const toneDeclarations = getRuleDeclarations(
      css,
      `[data-theme='sunset'] [data-tone='${tone}']`
    );
    const declarations = new Map([
      ...Array.from(themeDeclarations.entries()),
      ...Array.from(toneDeclarations.entries()),
    ]);

    tonePairs.forEach(([surface, content]) => {
      const surfaceValue = resolveValue(surface, declarations);
      const contentValue = resolveValue(content, declarations);
      expect(surfaceValue).toMatch(
        surface.startsWith('--_tone-surface')
          ? /^rgba\(.+\)$/i
          : /^#[0-9a-f]{6}$/i
      );
      expect(contentValue).toMatch(/^#[0-9a-f]{6}$/i);
      expect(
        contrast(
          surfaceValue,
          contentValue,
          resolveValue('--color-surface-canvas', declarations)
        )
      ).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('keeps the canvas opaque while making semantic surfaces translucent', () => {
    const configuredOpacity = Number(
      themeDeclarations.get('--sunset-surface-opacity')
    );
    expect(configuredOpacity).toBeGreaterThan(0);
    expect(configuredOpacity).toBeLessThan(1);
    expect(resolveValue('--color-surface-canvas', themeDeclarations)).toMatch(
      /^#[0-9a-f]{6}$/i
    );

    [
      '--color-surface-default',
      '--color-surface-raised',
      '--color-surface-sunken',
      '--color-surface-inverse',
      '--color-surface-inverse-subtle',
      '--color-surface-overlay',
      '--color-accent-primary-subtle',
      '--color-accent-secondary-subtle',
      '--color-feedback-info-surface',
      '--color-feedback-success-surface',
      '--color-feedback-danger-surface',
    ].forEach((token) => {
      const resolvedSurface = resolveValue(token, themeDeclarations);
      const alpha = resolvedSurface.match(/,\s*([01](?:\.\d+)?)\)$/)?.[1];
      expect(resolvedSurface).toMatch(/^rgba\(.+\)$/i);
      expect(Number(alpha)).toBe(configuredOpacity);
    });
  });

  it('keeps the drawer shell translucent and its tonal contents opaque', () => {
    const drawerDeclarations = getRuleDeclarations(
      css,
      "[data-theme='sunset'] .drawer-panel"
    );
    const declarations = new Map([
      ...Array.from(themeDeclarations.entries()),
      ...Array.from(drawerDeclarations.entries()),
    ]);

    expect(resolveValue('--_drawer-surface', declarations)).toMatch(/^rgba\(.+\)$/i);

    ['workout', 'library', 'selection'].forEach((tone) => {
      const selector =
        `[data-theme='sunset'] .drawer-panel[data-tone='${tone}'], ` +
        `[data-theme='sunset'] .drawer-panel [data-tone='${tone}']`;
      const opaqueToneDeclarations = getRuleDeclarations(css, selector);
      const opaqueDeclarations = new Map([
        ...Array.from(themeDeclarations.entries()),
        ...Array.from(opaqueToneDeclarations.entries()),
      ]);

      [
        '--_tone-surface-sunken',
        '--_tone-surface',
        '--_tone-surface-raised',
      ].forEach((token) => {
        expect(resolveValue(token, opaqueDeclarations)).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  it('keeps planner actions tonal while preserving destructive semantics', () => {
    const plannerStyles = readStyle('plan.css');
    expect(plannerStyles).toContain(
      'background: var(--_tone-strong, var(--color-interactive-positive));'
    );
    expect(plannerStyles).toContain('background: var(--color-interactive-danger);');
  });

  it('does not define functional recipes in other themes', () => {
    ['theme-default.css', 'theme-dark.css', 'theme-up-and-up.css', 'theme-baseball.css', 'theme-neon.css', 'theme-monokai.css']
      .forEach((themeFile) => expect(readStyle(themeFile)).not.toContain('[data-tone='));
  });
});
