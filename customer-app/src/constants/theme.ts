export const theme = {
  colors: {
    background: '#0F1115', // Deep charcoal
    surface: '#000000', // Pure Black
    surfaceLight: '#121212', // Very dark gray/black
    primary: '#FFC107', // Warm yellow
    primaryDark: '#FFB300',
    secondary: '#1A1D21', // Darker gray
    text: '#FFFFFF',
    textSecondary: '#9E9E9E',
    border: '#1A1D21',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FFC107',
    info: '#2196F3',
    white: '#FFFFFF',
    black: '#000000',
    overlay: 'rgba(0, 0, 0, 0.9)',
    // Modern Glass / Transparency
    glass: 'rgba(0, 0, 0, 0.9)', 
    glassBorder: 'rgba(255, 255, 255, 0.08)',
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
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    round: 999
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700' as '700', color: '#FFFFFF' },
    h2: { fontSize: 24, fontWeight: '700' as '700', color: '#FFFFFF' },
    h3: { fontSize: 20, fontWeight: '600' as '600', color: '#FFFFFF' },
    body: { fontSize: 16, fontWeight: '400' as '400', color: '#FFFFFF' },
    bodySmall: { fontSize: 14, fontWeight: '400' as '400', color: '#9E9E9E' },
    caption: { fontSize: 12, fontWeight: '400' as '400', color: '#757575' },
    button: { fontSize: 16, fontWeight: '600' as '600', color: '#0F1115' }
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
