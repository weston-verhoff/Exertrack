import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '..', '..');

describe('initial-load asset budgets', () => {
  const optimizedAssets = [
    'src/assets/branding/default/mark.webp',
    'src/assets/branding/default/mark-alternate.webp',
    'src/assets/branding/default/wordmark.webp',
    'src/assets/branding/default/wordmark-alternate.webp',
    'src/sunset.webp',
  ];

  it.each(optimizedAssets)('%s stays below 25 KiB', (relativePath) => {
    const bytes = fs.statSync(path.join(projectRoot, relativePath)).size;
    expect(bytes).toBeLessThan(25 * 1024);
  });

  it('uses optimized semantic image references', () => {
    const styles = [
      'src/styles/variables.css',
      'src/styles/color-context.css',
      'src/styles/theme-up-and-up.css',
      'src/styles/theme-sunset.css',
    ].map((relativePath) => fs.readFileSync(path.join(projectRoot, relativePath), 'utf8')).join('\n');

    expect(styles).not.toMatch(/branding\/default\/[^')]+\.png/);
    expect(styles).not.toContain("url('../sunset.png')");
  });

  it('does not retain superseded or unreferenced large PNG sources', () => {
    const removedAssets = [
      'src/assets/branding/default/mark.png',
      'src/assets/branding/default/mark-alternate.png',
      'src/assets/branding/default/wordmark.png',
      'src/assets/branding/default/wordmark-alternate.png',
      'src/sunset.png',
      'src/index-hero-bg.png',
      'src/darkblue-hero-bg.png',
    ];

    removedAssets.forEach((relativePath) => {
      expect(fs.existsSync(path.join(projectRoot, relativePath))).toBe(false);
    });
  });
});

describe('document head delivery', () => {
  const html = fs.readFileSync(path.join(projectRoot, 'public/index.html'), 'utf8');

  it('does not request external font stylesheets', () => {
    expect(html).not.toContain('fonts.googleapis.com');
    expect(html).not.toContain('fonts.gstatic.com');
  });

  it('has one manifest and one theme-color declaration', () => {
    expect(html.match(/rel="manifest"/g)).toHaveLength(1);
    expect(html.match(/name="theme-color"/g)).toHaveLength(1);
  });
});
