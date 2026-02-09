export const theme = {
  colors: {
    // Premium Dark Theme (New)
    background: '#0F1115', // Deep charcoal / almost black
    surface: '#181A20',    // Slightly lighter for cards
    surfaceLight: '#262A34', // Even lighter for inputs/hovers
    
    primary: '#FFD700',    // Premium Gold
    primaryDark: '#FFB300',
    primaryLight: '#FFE57F',
    
    secondary: '#E0E0E0',  // Light Gray for secondary text
    accent: '#4B5D67',     // Slate gray
    
    text: '#FFFFFF',       // Primary text
    textPrimary: '#FFFFFF', // Alias for primary text
    textSecondary: '#A0A3BD', // Secondary text (readable gray)
    textTertiary: '#5F6479',  // Disabled/subtle text
    
    border: '#2F3342',     // Subtle border
    divider: '#262A34',
    
    success: '#00BFA6',    // Modern Teal Green
    error: '#FF5252',      // Soft Red
    warning: '#FFB74D',    // Orange-ish
    info: '#448AFF',       // Blue
    
    white: '#FFFFFF',
    black: '#000000',
    transparent: 'transparent',
    
    // Glassmorphism
    glass: 'rgba(24, 26, 32, 0.85)',
    glassBorder: 'rgba(255, 255, 255, 0.08)',
    overlay: 'rgba(0, 0, 0, 0.7)',
  },
  
  spacing: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },
  
  borderRadius: {
    xs: 4,
    s: 8,
    m: 12,
    l: 16,
    xl: 24,
    xxl: 32,
    round: 9999,
  },
  
  typography: {
    h1: { fontSize: 32, fontWeight: '700' as '700', color: '#FFFFFF', lineHeight: 40 },
    h2: { fontSize: 24, fontWeight: '700' as '700', color: '#FFFFFF', lineHeight: 32 },
    h3: { fontSize: 20, fontWeight: '600' as '600', color: '#FFFFFF', lineHeight: 28 },
    h4: { fontSize: 18, fontWeight: '600' as '600', color: '#FFFFFF', lineHeight: 24 },
    body: { fontSize: 16, fontWeight: '400' as '400', color: '#FFFFFF', lineHeight: 24 },
    bodyMedium: { fontSize: 14, fontWeight: '500' as '500', color: '#FFFFFF', lineHeight: 20 },
    bodySmall: { fontSize: 14, fontWeight: '400' as '400', color: '#A0A3BD', lineHeight: 20 },
    caption: { fontSize: 12, fontWeight: '400' as '400', color: '#5F6479', lineHeight: 16 },
    button: { fontSize: 16, fontWeight: '600' as '600', color: '#0F1115', letterSpacing: 0.5 },
  },
  
  shadows: {
    small: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 3.84,
      elevation: 2,
    },
    medium: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },
    large: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 15,
      elevation: 10,
    },
    glow: {
      shadowColor: "#FFD700",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 10,
      elevation: 10,
    }
  },
  
  layout: {
    screenPadding: 20,
    cardPadding: 16,
  }
};

export const lightTheme = {
  ...theme,
  colors: {
    ...theme.colors,
    // Light Theme (Old Style)
    background: '#F8F9FA', // Light Gray/White
    surface: '#FFFFFF',    // White for cards
    surfaceLight: '#F0F2F5', // Light gray for inputs
    
    // Keep Primary Gold (Brand)
    primary: '#FFD700',
    primaryDark: '#FFB300',
    primaryLight: '#FFE57F',
    
    secondary: '#757575',
    accent: '#4B5D67',
    
    text: '#1A1D1E',       // Dark text
    textPrimary: '#1A1D1E',
    textSecondary: '#6C757D', // Gray text
    textTertiary: '#ADB5BD',
    
    border: '#E9ECEF',
    divider: '#DEE2E6',
    
    // Glassmorphism - irrelevant for solid, but kept for type compatibility
    glass: 'rgba(255, 255, 255, 0.9)',
    glassBorder: 'rgba(0, 0, 0, 0.05)',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  typography: {
    ...theme.typography,
    h1: { ...theme.typography.h1, color: '#1A1D1E' },
    h2: { ...theme.typography.h2, color: '#1A1D1E' },
    h3: { ...theme.typography.h3, color: '#1A1D1E' },
    h4: { ...theme.typography.h4, color: '#1A1D1E' },
    body: { ...theme.typography.body, color: '#1A1D1E' },
    bodyMedium: { ...theme.typography.bodyMedium, color: '#1A1D1E' },
    bodySmall: { ...theme.typography.bodySmall, color: '#6C757D' },
  }
};
