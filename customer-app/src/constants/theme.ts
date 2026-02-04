export const theme = {
  colors: {
    background: '#0c0a09', // Dark background based on OKLCH
    surface: '#1c1917', // Card background
    surfaceLight: '#292524',
    primary: '#fbbf24', // Gold/Yellow accent
    primaryDark: '#d97706',
    secondary: '#292524',
    text: '#fafaf9', // Foreground
    textSecondary: '#a8a29e', // Muted
    border: '#292524',
    success: '#22c55e',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6',
    white: '#ffffff',
    black: '#000000',
    overlay: 'rgba(0,0,0,0.8)',
    // Modern Glass / Transparency
    glass: 'rgba(28, 25, 23, 0.9)', 
    glassBorder: 'rgba(255, 255, 255, 0.1)',
  },
  spacing: {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48
  },
  borderRadius: {
    s: 6,
    m: 10,
    l: 14,
    xl: 24,
    round: 999
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700' as '700', color: '#fafaf9' },
    h2: { fontSize: 24, fontWeight: '700' as '700', color: '#fafaf9' },
    h3: { fontSize: 20, fontWeight: '600' as '600', color: '#fafaf9' },
    body: { fontSize: 16, fontWeight: '400' as '400', color: '#fafaf9' },
    bodySmall: { fontSize: 14, fontWeight: '400' as '400', color: '#a8a29e' },
    caption: { fontSize: 12, fontWeight: '400' as '400', color: '#78716c' },
    button: { fontSize: 16, fontWeight: '600' as '600', color: '#0c0a09' }
  },
  shadows: {
    small: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 2,
    },
    medium: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8,
    }
  }
};
