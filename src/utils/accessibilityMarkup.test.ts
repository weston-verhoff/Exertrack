import fs from 'fs';
import path from 'path';

const srcRoot = path.resolve(__dirname, '..');

function collectTsxFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectTsxFiles(entryPath);
    return entry.name.endsWith('.tsx') ? [entryPath] : [];
  });
}

describe('accessible names on generic elements', () => {
  it('only names divs and spans that have an explicit semantic role', () => {
    const violations = collectTsxFiles(srcRoot).flatMap((filePath) => {
      const source = fs.readFileSync(filePath, 'utf8');
      const tags = source.match(/<(?:div|span)\b[^>]*\baria-label\s*=.*?>/gs) ?? [];
      return tags
        .filter((tag) => !/\brole\s*=/.test(tag))
        .map((tag) => `${path.relative(srcRoot, filePath)}: ${tag.replace(/\s+/g, ' ')}`);
    });

    expect(violations).toEqual([]);
  });
});
