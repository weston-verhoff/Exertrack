import { ThemeDefinition } from './types';

// The only hand-authored palette source, including optional Mixed text seeds and gradients.
export const THEME_DEFINITIONS: ThemeDefinition[] = [
  { id: 'default', name: 'Light', mode: 'light', generatorVersion: 1,
    seeds: { canvas: '#f4f4f2', surface: '#ffffff', text: '#242423', primary: '#40586c', secondary: '#000000', info: '#40586c', success: '#367346', danger: '#ac3434' } },
  { id: 'dark', name: 'Dark', mode: 'dark', generatorVersion: 1,
    seeds: { canvas: '#121212', surface: '#252524', text: '#f1f1ef', primary: '#b7c9d9', secondary: '#b9d8c1', info: '#9ab8d2', success: '#86c997', danger: '#f0a0a0' } },
  { id: 'up-and-up', name: 'Up & Up', mode: 'light', generatorVersion: 1,
    seeds: { canvas: '#edf6ff', surface: '#f7fbff', text: '#102a43', primary: '#1769aa', secondary: '#df791f', info: '#1769aa', success: '#327052', danger: '#b63f48' } },
  { id: 'baseball', name: 'Baseball', mode: 'mixed', generatorVersion: 1,
    seeds: { canvas: '#f6f3f7', surface: '#000000', text: '#ffffff', primary: '#cf337f', secondary: '#008eab', info: '#008eab', success: '#397c59', danger: '#b83b48', onSurface: '#ffffff', onCanvas: '#000000' },
    surfaceBackground: '#1D2D40' },
  { id: 'neon', name: 'Neon', mode: 'dark', generatorVersion: 1, brand: 'neon',
    seeds: { canvas: '#0f0b18', surface: '#1a1526', text: '#fffaff', primary: '#ff2ca8', secondary: '#20e3f0', info: '#20e3f0', success: '#65fbd2', danger: '#ff6b82' } },
  { id: 'monokai', name: 'Monokai', mode: 'dark', generatorVersion: 1,
    seeds: { canvas: '#272822', surface: '#32332d', text: '#f8f8f2', primary: '#ff679d', secondary: '#c7a7ff', info: '#8ee7f4', success: '#c4ed6b', danger: '#ff786f' } },
  { id: 'sunset', name: 'Sunset', mode: 'mixed', generatorVersion: 1, decoration: 'atmosphere',
    seeds: { canvas: '#000000', surface: '#4C223E', text: '#ffffff', primary: '#A9D0FC', secondary: '#F95151', info: '#b7b9ff', success: '#8ed9ad', danger: '#DB0015', onSurface: '#ffffff', onCanvas: '#ffffff' },
    gradients: {
      canvas: 'linear-gradient(180deg, #00152D 0%, #ACD3FF 20%, #FFEF97 40%, #DE9000 100%)',
    },
    surfaceBackground: 'linear-gradient(180deg, #C70000 0%, #FF9841 100%)' },
  { id: 'fall', name: 'Fall', mode: 'mixed', generatorVersion: 1, decoration: 'atmosphere',
    seeds: { canvas: '#E4FFBE', surface: '#FFF9E6', text: '#000000', primary: '#740040', secondary: '#b27229', info: '#a7671a', success: '#667e33', danger: '#b95a47' },
    gradients: { canvas: 'linear-gradient(180deg, #D37867 0%, #F6DE87 49.52%, #E4FFBE 100%)' },
    surfaceBackground: '#FFF9E6' },
];
