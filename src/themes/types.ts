export const SEED_NAMES = ['canvas', 'surface', 'text', 'primary', 'secondary', 'info', 'success', 'danger'] as const;
export type SeedName = typeof SEED_NAMES[number];
export type FamilyName = 'primary' | 'secondary' | 'info' | 'success' | 'danger';
export interface ThemeDefinition {
  id: string;
  name: string;
  mode: 'light' | 'dark';
  generatorVersion: 1;
  seeds: Record<SeedName, string>;
  decoration?: 'none' | 'atmosphere';
  brand?: 'default' | 'neon';
  /** Family anchors regenerate foregrounds, states, borders and all aliases. */
  overrides?: Partial<Record<FamilyName, { color: string; reason: string }>>;
}
export interface Diagnostic { severity: 'error' | 'warning'; message: string; token?: string }
export interface Pairing { background: string; foreground: string; minimum: number; purpose: string }
export interface CompiledTheme {
  tokens: Record<string, string>;
  diagnostics: Diagnostic[];
  provenance: Record<string, { source: string; rule: string }>;
  pairings: Pairing[];
  valid: boolean;
}
