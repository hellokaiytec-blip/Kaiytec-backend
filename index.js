// src/theme/index.js — Kaiytec Design System
export const Colors = {
  // Brand — Deep forest green + warm gold (Sierra Leone earth tones)
  primary: '#0A3D2A',       // Deep green
  primaryLight: '#1A6B49',  // Medium green
  primarySoft: '#E8F5EF',   // Very light green bg
  accent: '#C9841A',        // Warm gold/amber
  accentLight: '#FFF3DC',   // Light amber bg

  // Neutrals
  white: '#FFFFFF',
  offWhite: '#F8F9FA',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Badges
  verified: '#0A3D2A',
  pending: '#F59E0B',
  rejected: '#EF4444',

  // Map
  mapPin: '#C9841A',

  // Overlays
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.15)',
};

export const Typography = {
  // Sizes
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  display: 38,

  // Weights
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  heavy: '800',

  // Line heights
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.75,
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
};
