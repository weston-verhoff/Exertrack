// OKLab matrices from CSS Color 4. Work in OKLCH, serialize to bounded sRGB.
export type Lch = [number, number, number];
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function toLch(hex: string): Lch {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, Math.hypot(a, bb), Math.atan2(bb, a)];
}
function linearRgb([L, C, H]: Lch): number[] {
  const a = C * Math.cos(H), b = C * Math.sin(H);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
export function fromLch([lightness, chroma, hue]: Lch): string {
  const L = clamp(lightness);
  let lo = 0, hi = Math.max(0, chroma);
  let rgb = linearRgb([L, hi, hue]);
  const inGamut = (values: number[]) => values.every(n => n >= -0.000001 && n <= 1.000001);
  if (!inGamut(rgb)) {
    for (let i = 0; i < 22; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(linearRgb([L, mid, hue]))) lo = mid; else hi = mid;
    }
    rgb = linearRgb([L, lo, hue]);
  }
  return '#' + rgb.map(n => {
    n = clamp(n);
    return Math.round(255 * (n <= 0.0031308 ? 12.92 * n : 1.055 * n ** (1 / 2.4) - 0.055)).toString(16).padStart(2, '0');
  }).join('');
}
export function tone(seed: string, lightness: number, maxChroma = 1): string {
  const [, c, h] = toLch(seed);
  return fromLch([lightness, Math.min(c, maxChroma), h]);
}
export function rgba(hex: string, alpha: number): string {
  return `rgba(${[1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', ')}, ${alpha})`;
}
