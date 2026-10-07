export type Rgba = [number, number, number, number];

export function parseColor(value: string): Rgba | null {
  const hex = /^#([\da-f]{6})$/i.exec(value.trim());
  if (hex) return [0, 2, 4].map(offset => parseInt(hex[1].slice(offset, offset + 2), 16)).concat(1) as Rgba;
  const rgb = /^rgba?\(([^)]+)\)$/.exec(value.trim());
  if (!rgb) return null;
  const parts = rgb[1].split(/[,\s/]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.some(Number.isNaN)) return null;
  return [parts[0], parts[1], parts[2], parts[3] ?? 1];
}

export function contrastRatio(foreground: string, background: string): number | null {
  const fg = parseColor(foreground);
  const bg = parseColor(background);
  // Transparent backgrounds depend on their backdrop; don't report a guessed pass.
  if (!fg || !bg || bg[3] !== 1) return null;
  const luminance = (channels: number[]) => channels.slice(0, 3).map(channel => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }).reduce((total, c, index) => total + c * [0.2126, 0.7152, 0.0722][index], 0);
  const composite = fg.slice(0, 3).map((channel, index) => channel * fg[3] + bg[index] * (1 - fg[3]));
  const a = luminance(composite);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
