// Define el tema claro (anteriormente 'theme')
export const lightTheme = {
  colors: {
    primary: '#5D5FEF',
    secondary: '#FF6584',
    accent: '#00C9A7',
    background: '#F8F9FA', // Fondo claro
    surface: '#FFFFFF',    // Superficies claras (cards, etc.)
    text: {
      primary: '#2D3436',   // Texto oscuro sobre fondo claro
      secondary: '#636E72',
      light: '#B2BEC3',
      placeholder: '#A0A0A0',
    },
    border: '#E0E0E0',
    error: '#FF5252',
    success: '#4CAF50',
    warning: '#FFC107',
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
  // Hereda spacing, borderRadius, typography y shadows (puedes sobreescribirlos si es necesario)
  ...lightTheme, // Empieza con los valores del tema claro para no repetir todo
  colors: {
    // Sobreescribe solo los colores
    primary: '#8F90F3',    // <-- Nuevo azul primario (oscuro)
    secondary: '#FF8A9F', // Mantenido y ajustado para modo oscuro
    accent: '#2CE6C1',    // Mantenido y ajustado para modo oscuro
    background: '#121212', // Fondo oscuro principal
    surface: '#1E1E1E',    // Superficies oscuras (cards, etc.)
    text: {
      primary: '#E1E1E1',   // Texto claro sobre fondo oscuro
      secondary: '#A8A8A8',
      light: '#757575',
      placeholder: '#AAAAAA',
    },
    border: '#2D2D2D',    // Bordes oscuros
    error: '#FF7C7C',    // Ajustado
    success: '#7EDD81',   // Ajustado
    warning: '#FFD85A',   // Ajustado
  },
  // Ejemplo: podrías querer desactivar o cambiar las sombras en modo oscuro
  /*
  shadows: {
    sm: { elevation: 0, shadowOpacity: 0 }, // Sin sombra
    md: { elevation: 0, shadowOpacity: 0 },
    lg: { elevation: 0, shadowOpacity: 0 },
  }
  */
}; 