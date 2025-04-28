import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

// Este es ahora el dashboard principal para el grupo (employee)
export default function EmployeeDashboardIndex() { 
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard de Empleado</Text>
      {/* Aquí irá el contenido del dashboard */}
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