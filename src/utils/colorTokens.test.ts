import { APP_THEMES } from '../themes/registry.generated';
import fs from 'fs';
import path from 'path';
import {
  BRAND_IMAGE_TOKEN_CONTRACT,
  COLOR_CONTEXT_TOKEN_CONTRACT,
  OPTIONAL_THEME_IMAGE_TOKEN_CONTRACT,
  THEME_CONTRAST_PAIRS,
  THEME_TOKEN_CONTRACT,
} from './colorTokens';

const stylesDirectory = path.resolve(__dirname, '../styles');
const sourceDirectory = path.resolve(__dirname, '..');
const themeFiles = APP_THEMES.map(id => `theme-${id}.css`);

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
    /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+(?:\.\d+)?%?)\s*\)$/i
  );
  if (!match) throw new Error(`Unsupported color: ${value}`);

  const alpha = match[4].endsWith('%')
    ? Number(match[4].slice(0, -1)) / 100
    : Number(match[4]);
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

describe('shared theme architecture', () => {
  it('keeps every named theme out of component recipes', () => {
    fs.readdirSync(stylesDirectory).filter(file => file.endsWith('.css') && !file.startsWith('theme-'))
      .forEach(file => expect(readStyle(file)).not.toMatch(/\[data-theme\s*=/));
  });
  it('defines complete contexts with separate action and emphasis roles', () => {
    const recipes = readStyle('color-context.css');
    ['canvas', 'default', 'raised', 'inverse', 'selected', 'info', 'success', 'danger'].forEach(name => {
      const block = recipes.match(new RegExp(`\\.color-context--${name}\\s*\\{([\\s\\S]*?)\\}`))?.[1] ?? '';
      COLOR_CONTEXT_TOKEN_CONTRACT.forEach(token => expect(block).toContain(`${token}:`));
    });
    expect(readStyle('WorkoutCard.css')).not.toMatch(/var\(--_context-(?:strong|on-strong)\)/);
    expect(readStyle('plan.css')).not.toMatch(/var\(--_context-(?:strong|on-strong)\)/);
    expect(readStyle('workout-button.css')).not.toContain('var(--_context-emphasis)');
    expect(recipes).toContain('--_context-emphasis: var(--color-accent-secondary-subtle)');
    expect(recipes).toContain('--_context-on-emphasis: var(--color-on-accent-secondary-subtle)');
  });
  it('declares complete image resets and root-only generated themes', () => {
    expect(readStyle('variables.css')).toContain(':where(:root)');
    themeFiles.forEach(file => {
      const css = readStyle(file);
      const { declarations } = getDeclarations(css);
      [...BRAND_IMAGE_TOKEN_CONTRACT, ...OPTIONAL_THEME_IMAGE_TOKEN_CONTRACT].forEach(token => expect(declarations.has(token)).toBe(true));
      expect(css).toContain('Generated by npm run themes:generate');
      expect(css.replace(/\/\*[\s\S]*?\*\//g, '').match(/\{/g)).toHaveLength(1);
    });
  });
  it('keeps component color references on the public contract and raw colors in palettes', () => {
    const contract = new Set<string>([...THEME_TOKEN_CONTRACT, ...BRAND_IMAGE_TOKEN_CONTRACT, ...OPTIONAL_THEME_IMAGE_TOKEN_CONTRACT]);
    getSourceFiles(sourceDirectory).filter(file => !file.includes(`${path.sep}themes${path.sep}`) && !file.includes('.test.') && !path.basename(file).startsWith('theme-') && !file.endsWith('themeContrast.ts'))
      .forEach(file => {
        const source = fs.readFileSync(file, 'utf8');
        (source.match(/var\((--(?:color|shadow|image)-[a-z0-9-]+)/g) ?? []).forEach(usage => expect(contract.has(usage.slice(4))).toBe(true));
        expect(source).not.toMatch(/#[0-9a-f]{3,8}\b|(?:rgba?|hsla?)\(/i);
      });
  });
  it('keeps functional styles free of theme gradients', () => {
    ['WorkoutCard.css', 'workout-button.css', 'drawer.css', 'segmented-control.css'].forEach(file => {
      expect(readStyle(file)).not.toMatch(/gradient\(|--_context-(?:surface|strong)-image/);
    });
  });
});
