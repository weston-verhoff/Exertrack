export const COMPONENT_TONES = ['workout', 'library', 'selection'] as const;

export type ComponentTone = (typeof COMPONENT_TONES)[number];
