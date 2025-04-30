import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from './theme';

// Este componente actúa como punto de entrada raíz '/'.
// La lógica de redirección principal está en _layout.js.
// Mostramos un loader breve por si acaso hay un instante antes de la redirección.
export default function RootIndex() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});