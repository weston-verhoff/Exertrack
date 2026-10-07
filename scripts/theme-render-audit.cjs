// Browser-side inspection of actual rendered text/solid backgrounds, not token guesses.
module.exports = function auditRenderedTheme() {
  const parse = value => {
    const parts = value.match(/[\d.]+/g)?.map(Number);
    return parts?.length >= 3 ? [...parts.slice(0, 3), parts[3] ?? 1] : null;
  };
  const luminance = rgb => rgb.slice(0, 3).map(n => n / 255).map(n => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4).reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
  const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
  const failures = [], unsupported = [];
  const elements = document.querySelectorAll(document.querySelector('.drawer-panel') ? '.drawer-panel *' : '#sandbox-surfaces *, #sandbox-components *, #sandbox-screens *');
  let checked = 0;
  for (const element of elements) {
    if (!element.getClientRects().length || element.closest(':disabled, [aria-disabled="true"], .sandbox-swatch, svg, canvas')) continue;
    if (!Array.from(element.childNodes).some(node => node.nodeType === 3 && node.textContent.trim()) && !element.matches('input:not([type=checkbox]):not([type=radio]):not([type=range]), textarea, select')) continue;
    const label = `${element.tagName}.${element.className}: ${(element.textContent || element.value || '').trim().slice(0, 60)}`;
    const style = getComputedStyle(element), foreground = parse(style.color);
    let background, unsupportedReason;
    for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
      const current = getComputedStyle(ancestor), rgb = parse(current.backgroundColor);
      if (Number(current.opacity) < 1) { unsupportedReason = 'opacity'; break; }
      if (current.backgroundImage !== 'none') { unsupportedReason = 'artwork'; break; }
      if (rgb?.[3] === 1) { background = rgb; break; }
      if (rgb && rgb[3] > 0) { unsupportedReason = 'translucent background'; break; }
    }
    if (unsupportedReason || !foreground || !background) { unsupported.push({ label, reason: unsupportedReason || 'unknown backdrop' }); continue; }
    const composite = foreground.slice(0, 3).map((n, i) => n * foreground[3] + background[i] * (1 - foreground[3]));
    const value = contrast(composite, background);
    const minimum = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.667 && parseInt(style.fontWeight) >= 700) ? 3 : 4.5;
    checked++;
    if (value < minimum) failures.push({ label, foreground: style.color, background, ratio: value, minimum });
  }
  return { theme: document.documentElement.dataset.theme, checked, failures, unsupported };
};
