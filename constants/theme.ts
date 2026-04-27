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
