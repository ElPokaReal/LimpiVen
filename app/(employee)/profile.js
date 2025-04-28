import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function EmployeeProfile() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi Perfil (Empleado)</Text>
      {/* Aquí se mostrará y editará el perfil del empleado */}
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
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
  },
}); 