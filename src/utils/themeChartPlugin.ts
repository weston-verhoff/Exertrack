import { Plugin } from 'chart.js';

/** Resolve canvas-only labels/tooltips from the chart's actual surface on every update. */
export const themeChartPlugin: Plugin<'line'> = {
  id: 'semantic-theme',
  beforeUpdate(chart) {
    const styles = getComputedStyle(chart.canvas.parentElement ?? document.documentElement);
    const read = (name: string) => styles.getPropertyValue(name).trim();
    const content = read('--_context-content') || read('--color-on-surface');
    const muted = read('--_context-content-muted') || read('--color-content-muted');
    const surface = read('--_context-surface') || read('--color-surface-default');
    const border = read('--_context-border-subtle') || read('--color-border-subtle');
    const options = chart.config.options!;
    options.color = content;
    options.plugins ??= {};
    options.plugins.legend ??= {};
    options.plugins.legend.labels = { ...options.plugins.legend.labels, color: content };
    options.plugins.tooltip = { ...options.plugins.tooltip, backgroundColor: surface,
      titleColor: content, bodyColor: content, footerColor: content, borderColor: border, borderWidth: 1 };
    options.scales ??= { x: {}, y: {} };
    Object.values(options.scales).forEach(axis => {
      if (!axis) return;
      axis.ticks = { ...axis.ticks, color: muted };
      axis.grid = { ...axis.grid, color: border };
      axis.border = { ...axis.border, color: border };
      axis.title = { ...axis.title, color: content };
    });
  },
};
