export const Colors = {
  // Brand
  primary: '#002D62',
  secondary: '#FFCD00',
  primaryDark: '#001224',
  primaryLight: '#E8EEF8',
  accent: '#00C2FF',      // Electric cyan accent
  accentPurple: '#7C3AED',

  // UI
  background: '#06101F',  // Deep dark navy
  surface: '#0D1F38',     // Card surface
  surfaceRaised: '#112445', // Elevated surface
  border: '#1E3358',
  divider: '#152B4A',
  glass: 'rgba(255,255,255,0.06)',
  glassStrong: 'rgba(255,255,255,0.10)',

  // Text
  textPrimary: '#EDF2FF',
  textSecondary: '#7A9BBF',
  textMuted: '#3D5A80',
  white: '#FFFFFF',

  // Status
  success: '#00D68F',
  successLight: 'rgba(0,214,143,0.15)',
  warning: '#FFB800',
  warningLight: 'rgba(255,184,0,0.15)',
  error: '#FF4757',
  errorLight: 'rgba(255,71,87,0.15)',
  info: '#00C2FF',
  infoLight: 'rgba(0,194,255,0.12)',
};

/** Light theme — same keys as Colors so they're interchangeable */
export const LightColors: typeof Colors = {
  // Brand (keep brand colors the same)
  primary: '#002D62',
  secondary: '#D4A600',       // Slightly deeper gold for contrast on white
  primaryDark: '#001224',
  primaryLight: '#E8EEF8',
  accent: '#0096CC',          // Darker cyan for readability
  accentPurple: '#6D28D9',

  // UI
  background: '#F5F7FA',      // Soft off-white
  surface: '#FFFFFF',         // White cards
  surfaceRaised: '#F0F2F5',   // Slightly tinted elevated surface
  border: '#D1D9E6',
  divider: '#E2E8F0',
  glass: 'rgba(0,0,0,0.04)',
  glassStrong: 'rgba(0,0,0,0.08)',

  // Text
  textPrimary: '#1A202C',     // Near-black for readability
  textSecondary: '#4A5568',   // Dark grey
  textMuted: '#A0AEC0',       // Medium grey
  white: '#FFFFFF',

  // Status
  success: '#00B377',
  successLight: 'rgba(0,179,119,0.12)',
  warning: '#D99700',
  warningLight: 'rgba(217,151,0,0.12)',
  error: '#E53E3E',
  errorLight: 'rgba(229,62,62,0.12)',
  info: '#0096CC',
  infoLight: 'rgba(0,150,204,0.10)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 38,
};

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
};
