import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
// import { theme } from './theme'; // Remove direct import
import { useTheme } from '../constants/ThemeContext'; // Import useTheme

// Este componente actúa como punto de entrada raíz '/'.
// La lógica de redirección principal está en _layout.js.
// Mostramos un loader breve por si acaso hay un instante antes de la redirección.
export default function RootIndex() {
  const { theme } = useTheme(); // Use the theme hook

  // Define styles inside the component or memoize them if needed
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background, // Use theme color
    },
  });

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} /> // Use theme color
    </View>
  );
}

// Remove the old StyleSheet definition outside the component
// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: theme.colors.background,
//   },
// });