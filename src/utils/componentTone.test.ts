import { COMPONENT_TONES } from './componentTone';
import fs from 'fs';
import path from 'path';

describe('component tones', () => {
  it('uses stable functional roles instead of positional accent slots', () => {
    expect(COMPONENT_TONES).toEqual(['workout', 'library', 'selection']);
  });

  it('contains no index-based tone cycling helper', () => {
    const utilitySource = fs.readFileSync(path.resolve(__dirname, 'componentTone.ts'), 'utf8');
    expect(utilitySource).not.toContain('getComponentTone');
    expect(utilitySource).not.toContain('accent-1');
  });
});
