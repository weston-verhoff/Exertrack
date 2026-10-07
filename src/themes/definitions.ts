import { ThemeDefinition } from './types';

// The only hand-authored palette source. Eight anchors per theme; no overrides needed.
export const THEME_DEFINITIONS: ThemeDefinition[] = [
  { id: 'default', name: 'Light', mode: 'light', generatorVersion: 1,
    seeds: { canvas: '#f4f4f2', surface: '#ffffff', text: '#242423', primary: '#40586c', secondary: '#557360', info: '#40586c', success: '#367346', danger: '#ac3434' } },
  { id: 'dark', name: 'Dark', mode: 'dark', generatorVersion: 1,
    seeds: { canvas: '#121212', surface: '#252524', text: '#f1f1ef', primary: '#b7c9d9', secondary: '#b9d8c1', info: '#9ab8d2', success: '#86c997', danger: '#f0a0a0' } },
  { id: 'up-and-up', name: 'Up & Up', mode: 'light', generatorVersion: 1,
    seeds: { canvas: '#edf6ff', surface: '#f7fbff', text: '#102a43', primary: '#1769aa', secondary: '#df791f', info: '#1769aa', success: '#327052', danger: '#b63f48' } },
  { id: 'baseball', name: 'Baseball', mode: 'light', generatorVersion: 1,
    seeds: { canvas: '#f6f3f7', surface: '#ffffff', text: '#262334', primary: '#cf337f', secondary: '#008eab', info: '#008eab', success: '#397c59', danger: '#b83b48' } },
  { id: 'neon', name: 'Neon', mode: 'dark', generatorVersion: 1, brand: 'neon',
    seeds: { canvas: '#0f0b18', surface: '#1a1526', text: '#fffaff', primary: '#ff2ca8', secondary: '#20e3f0', info: '#20e3f0', success: '#65fbd2', danger: '#ff6b82' } },
  { id: 'monokai', name: 'Monokai', mode: 'dark', generatorVersion: 1,
    seeds: { canvas: '#272822', surface: '#32332d', text: '#f8f8f2', primary: '#ff679d', secondary: '#c7a7ff', info: '#8ee7f4', success: '#c4ed6b', danger: '#ff786f' } },
  { id: 'sunset', name: 'Sunset', mode: 'dark', generatorVersion: 1, decoration: 'atmosphere',
    seeds: { canvas: '#151326', surface: '#272039', text: '#fff4df', primary: '#ff963d', secondary: '#ff72a8', info: '#b7b9ff', success: '#8ed9ad', danger: '#ff7986' } },
  { id: 'fall', name: 'Fall', mode: 'dark', generatorVersion: 1, decoration: 'atmosphere',
    seeds: { canvas: '#141d16', surface: '#243025', text: '#fff3dc', primary: '#eeaa64', secondary: '#d4ad48', info: '#d4ad48', success: '#b2ce81', danger: '#ef8a75' } },
];
