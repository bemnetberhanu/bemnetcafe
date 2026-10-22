// ─── Habesha Restaurant Design System ────────────────────────────────────────
// Consistent colours, spacing and typography used across every screen.

export const colors = {
  // Brand
  primary: '#c8860a',       // warm Ethiopian gold
  primaryLight: '#f5c97a',
  primaryDark: '#8a5c05',

  // Surfaces
  bg: '#f8f5f0',            // warm off-white background
  surface: '#ffffff',
  surfaceWarm: '#fdf8f2',
  border: '#e8e0d4',

  // Dark sidebar / header
  dark: '#1c1410',
  darkSurface: '#2a1f14',

  // Text
  text: '#1a1208',
  textSecondary: '#6b5e4c',
  muted: '#9e8f7d',
  white: '#ffffff',

  // Status
  success: '#16a34a',
  successLight: '#dcfce7',
  warning: '#d97706',
  warningLight: '#fef3c7',
  danger: '#dc2626',
  dangerLight: '#fee2e2',
  info: '#2563eb',
  infoLight: '#dbeafe',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const typography = {
  h1: { fontSize: 26, fontWeight: '700', color: colors.text },
  h2: { fontSize: 20, fontWeight: '700', color: colors.text },
  h3: { fontSize: 17, fontWeight: '600', color: colors.text },
  body: { fontSize: 14, color: colors.text },
  bodySmall: { fontSize: 12, color: colors.textSecondary },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, color: colors.muted },
  price: { fontSize: 15, fontWeight: '700', color: colors.primary },
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
};
