// theme-config.ts

export const DEFAULT_THEME = {
  preset: 'soft-sage',
  radius: 'md',
  scale: 'none',
  contentLayout: 'full',
} as const;

export type ThemeType = typeof DEFAULT_THEME;

export const THEMES = [
  {
    name: 'Soft Sage',
    value: 'soft-sage',
    colors: ['oklch(0.82 0.05 140)', 'oklch(0.9 0.02 100)'],
  },
  {
    name: 'Blush Mist',
    value: 'blush-mist',
    colors: ['oklch(0.88 0.09 15)', 'oklch(0.94 0.03 30)'],
  },
  {
    name: 'Midnight Velvet',
    value: 'midnight-velvet',
    colors: ['oklch(0.28 0.05 260)', 'oklch(0.18 0.02 240)'],
  },
  {
    name: 'Sandstone Calm',
    value: 'sandstone-calm',
    colors: ['oklch(0.83 0.07 60)', 'oklch(0.94 0.02 90)'],
  },
  {
    name: 'Iris Haze',
    value: 'iris-haze',
    colors: ['oklch(0.72 0.08 290)', 'oklch(0.86 0.03 280)'],
  },
];
