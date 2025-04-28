import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function EmployeeServices() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Servicios</Text>
      {/* Aquí se listarán los servicios asignados */}
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