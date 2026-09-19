import fs from 'fs';
import path from 'path';
import {
  BRAND_IMAGE_TOKEN_CONTRACT,
  THEME_CONTRAST_PAIRS,
  THEME_TOKEN_CONTRACT,
} from './colorTokens';

const stylesDirectory = path.resolve(__dirname, '../styles');
const sourceDirectory = path.resolve(__dirname, '..');
const themeFiles = [
  'theme-default.css',
  'theme-baseball.css',
  'theme-neon.css',
  'theme-monokai.css',
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
  const pattern = /^\s*(--[a-z0-9-]+):\s*([^;]+);/gm;
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

  const reference = value.match(/^var\((--[a-z0-9-]+)\)$/);
  return reference ? resolveValue(reference[1], declarations, seen) : value;
};

const luminance = (hex: string) => {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((value) => parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    );

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrast = (first: string, second: string) => {
  const light = Math.max(luminance(first), luminance(second));
  const dark = Math.min(luminance(first), luminance(second));
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

  it('does not declare tokens outside the shared contract', () => {
    const contract = new Set<string>([
      ...THEME_TOKEN_CONTRACT,
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
      expect(surfaceValue).toMatch(/^#[0-9a-f]{6}$/i);
      expect(contentValue).toMatch(/^#[0-9a-f]{6}$/i);
      expect(contrast(surfaceValue, contentValue)).toBeGreaterThanOrEqual(4.5);
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

  it('uses custom brand images only for themes that provide them', () => {
    const defaultTokens = getDeclarations(readStyle('theme-default.css')).declarations;
    const neonTokens = getDeclarations(readStyle('theme-neon.css')).declarations;

    expect(defaultTokens.get('--image-brand-mark-alternate')).toContain(
      'branding/default/mark-alternate.png'
    );
    BRAND_IMAGE_TOKEN_CONTRACT.forEach((token) => {
      expect(neonTokens.has(token)).toBe(true);
    });

    ['theme-baseball.css', 'theme-monokai.css'].forEach((themeFile) => {
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
    [...THEME_TOKEN_CONTRACT, ...BRAND_IMAGE_TOKEN_CONTRACT]
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
});
