import React, { createContext, useState, useContext, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from './theme'; // Actualiza la ruta de importación

// 1. Crear el Contexto
const ThemeContext = createContext();

// 2. Crear el Proveedor del Tema
export const ThemeProvider = ({ children }) => {
  const systemScheme = useColorScheme(); // Detecta el tema del sistema ('light', 'dark', null)
  
  // Estado para guardar el modo actual ('light' o 'dark')
  // Inicializa con el tema del sistema como fallback si no hay nada guardado
  const [themeMode, setThemeMode] = useState(systemScheme || 'light');

  // Efecto para cargar la preferencia guardada al montar el componente
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedThemeMode = await AsyncStorage.getItem('themeMode');
        if (savedThemeMode) {
          setThemeMode(savedThemeMode);
        } else {
          // Si no hay nada guardado, usa el del sistema
          setThemeMode(systemScheme || 'light');
        }
      } catch (error) {
        console.error('Error cargando la preferencia de tema desde AsyncStorage:', error);
        // En caso de error, usa el tema del sistema
        setThemeMode(systemScheme || 'light');
      }
    };
    loadThemePreference();
  }, [systemScheme]); // Se re-ejecuta si el tema del sistema cambia (y no había preferencia guardada)

  // Efecto para guardar la preferencia cuando themeMode cambia
  useEffect(() => {
    const saveThemePreference = async () => {
      try {
        await AsyncStorage.setItem('themeMode', themeMode);
      } catch (error) {
        console.error('Error guardando la preferencia de tema en AsyncStorage:', error);
      }
    };
    // No guardar si aún está en el estado inicial basado solo en systemScheme (pre-carga)
    // Opcional: podrías querer guardarlo siempre, depende de la lógica deseada
    if (themeMode) { // Asegura que no sea null/undefined si hubo error inicial
        saveThemePreference();
    }
  }, [themeMode]);

  // Selecciona el objeto de tema correcto basado en el modo actual
  const currentTheme = themeMode === 'dark' ? darkTheme : lightTheme;

  // Valor que proporcionará el contexto
  const value = {
    theme: currentTheme,    // El objeto de tema actual (light o dark)
    themeMode: themeMode,   // El modo actual ('light' o 'dark')
    setThemeMode: setThemeMode, // Función para cambiar el modo
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// 3. Hook personalizado para usar el contexto fácilmente
export const useTheme = () => useContext(ThemeContext); 