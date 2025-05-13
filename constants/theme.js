// Define el tema claro (anteriormente 'theme')
export const lightTheme = {
  colors: {
    primary: '#4A7AFF',       // Azul principal más similar al logo
    secondary: '#2D4899',     // Azul oscuro como el "ven" del logo
    accent: '#33C9FF',        // Azul claro complementario
    background: '#F8F9FA',    // Fondo claro
    surface: '#FFFFFF',       // Superficies claras (cards, etc.)
    text: {
      primary: '#2D3748',     // Texto oscuro sobre fondo claro
      secondary: '#4A5568',
      light: '#A0AEC0',
      placeholder: '#A0A0A0',
    },
    border: '#E2E8F0',
    error: '#FF5252',
    success: '#38B2AC',       // Verde azulado
    warning: '#F6AD55',       // Naranja suave
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    // Tipografía generalmente se mantiene igual, pero podrías ajustarla si es necesario
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    caption: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 24,
    },
  },
  shadows: {
    // Las sombras pueden necesitar ajustes o desactivarse en modo oscuro
    // Aquí se mantienen igual como ejemplo, pero considera usar overlay/niveles de gris
    sm: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.2,
      shadowRadius: 12,
      elevation: 6,
    },
  },
}; 

// Define el tema oscuro
export const darkTheme = {
  // Hereda spacing, borderRadius, typography y shadows
  ...lightTheme,
  colors: {
    primary: '#6D92FF',       // Azul claro como "Limpi" pero para fondo oscuro
    secondary: '#3B5BC9',     // Azul medio-oscuro
    accent: '#00B4FF',        // Azul brillante acentuado
    background: '#0F172A',    // Fondo azul muy oscuro
    surface: '#1E2A4A',       // Superficies azul oscuro
    text: {
      primary: '#E2E8F0',     // Texto claro sobre fondo oscuro
      secondary: '#A0AEC0',
      light: '#718096',
      placeholder: '#4A5568',
    },
    border: '#2D3748',        // Bordes azul oscuro
    error: '#FC8181',         // Rojo más suave para modo oscuro
    success: '#4FD1C5',       // Verde azulado más brillante
    warning: '#F6AD55',       // Naranja suave
  },
  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.3,     // Sombra más pronunciada para modo oscuro
      shadowRadius: 4,
      elevation: 3,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.35,    // Sombra más pronunciada para modo oscuro
      shadowRadius: 8,
      elevation: 5,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 6,
      },
      shadowOpacity: 0.4,     // Sombra más pronunciada para modo oscuro
      shadowRadius: 12,
      elevation: 7,
    },
  },
}; 