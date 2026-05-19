/**
 * Rigs Mobile Design Tokens
 * Single source of truth for colors, typography, spacing and shadows.
 * Import this file wherever you need design values in React Native.
 */

// ─── Color Palette ────────────────────────────────────────────────────────────

export const palette = {
  // Brand (nature green)
  brand50:  '#f0fdf4',
  brand100: '#dcfce7',
  brand200: '#bbf7d0',
  brand300: '#86efac',
  brand400: '#4ade80',
  brand500: '#22c55e',
  brand600: '#16a34a',
  brand700: '#15803d',
  brand800: '#166534',
  brand900: '#14532d',

  // Neutral (warm stone)
  white:     '#ffffff',
  neutral50: '#fafaf9',
  neutral100:'#f5f5f4',
  neutral200:'#e7e5e4',
  neutral300:'#d6d3d1',
  neutral400:'#a8a29e',
  neutral500:'#78716c',
  neutral600:'#57534e',
  neutral700:'#44403c',
  neutral800:'#292524',
  neutral900:'#1c1917',
  black:     '#0c0a09',

  // Semantic
  red50:   '#fff1f2',
  red500:  '#f43f5e',
  red600:  '#e11d48',
  amber50: '#fffbeb',
  amber400:'#fbbf24',
  amber500:'#f59e0b',
  amber700:'#b45309',
  blue50:  '#eff6ff',
  blue500: '#3b82f6',
  blue600: '#2563eb',
}

// ─── Semantic color aliases ───────────────────────────────────────────────────

export const colors = {
  // Primary actions
  primary:       palette.brand600,
  primaryLight:  palette.brand100,
  primaryDark:   palette.brand700,

  // Surfaces
  background:    palette.neutral50,
  surface:       palette.white,
  surfaceRaised: palette.white,
  border:        palette.neutral200,
  borderStrong:  palette.neutral300,

  // Text
  text:          palette.neutral900,
  textSecondary: palette.neutral600,
  textTertiary:  palette.neutral400,
  textInverse:   palette.white,
  textBrand:     palette.brand600,

  // Status
  success:       palette.brand600,
  successLight:  palette.brand50,
  warning:       palette.amber500,
  warningLight:  palette.amber50,
  error:         palette.red600,
  errorLight:    palette.red50,
  info:          palette.blue600,
  infoLight:     palette.blue50,
} as const

// ─── Typography ───────────────────────────────────────────────────────────────

export const typography = {
  // Font families
  fontSans: 'System',       // Uses device default (SF Pro on iOS, Roboto on Android)
  fontMono: 'Courier New',

  // Scale
  size2xs: 10,
  sizeXs:  12,
  sizeSm:  13,
  sizeBase:15,
  sizeLg:  17,
  sizeXl:  19,
  size2xl: 22,
  size3xl: 26,
  size4xl: 32,

  // Weight
  weightRegular:  '400' as const,
  weightMedium:   '500' as const,
  weightSemibold: '600' as const,
  weightBold:     '700' as const,
  weightBlack:    '900' as const,

  // Line height multipliers
  lineNone:   1.0,
  lineTight:  1.2,
  lineSnug:   1.35,
  lineNormal: 1.5,
  lineRelaxed:1.65,
} as const

// ─── Spacing (4px base grid) ──────────────────────────────────────────────────

export const spacing = {
  px:   1,
  0:    0,
  0.5:  2,
  1:    4,
  1.5:  6,
  2:    8,
  2.5:  10,
  3:    12,
  3.5:  14,
  4:    16,
  5:    20,
  6:    24,
  7:    28,
  8:    32,
  9:    36,
  10:   40,
  11:   44,
  12:   48,
  14:   56,
  16:   64,
  20:   80,
  24:   96,
  28:   112,
  32:   128,
} as const

// ─── Border radius ────────────────────────────────────────────────────────────

export const radius = {
  none: 0,
  sm:   6,
  base: 8,
  md:   12,
  lg:   16,
  xl:   20,
  '2xl':24,
  full: 9999,
} as const

// ─── Shadows (React Native format) ───────────────────────────────────────────

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 8,
  },
  brand: {
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
} as const

// ─── Z-index ──────────────────────────────────────────────────────────────────

export const zIndex = {
  base:    0,
  raised:  1,
  dropdown:10,
  sticky:  20,
  overlay: 30,
  modal:   40,
  toast:   50,
} as const

// ─── Animation durations (ms) ─────────────────────────────────────────────────

export const duration = {
  fast:   100,
  normal: 200,
  slow:   350,
  slower: 500,
} as const

// ─── Convenience re-export ────────────────────────────────────────────────────

const theme = { palette, colors, typography, spacing, radius, shadows, zIndex, duration }
export default theme
