import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../constants/ThemeContext';
import { useRouter } from 'expo-router';
import { Briefcase } from 'lucide-react-native';

// Este es ahora el dashboard principal para el grupo (employee)
export default function EmployeeDashboardIndex() { 
  const router = useRouter();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const navigateToAcceptedServices = () => {
    router.push('/accepted-services');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
         <Text style={styles.title}>Dashboard</Text>
      </View>

      <View style={styles.content}>

          <TouchableOpacity 
            style={styles.dashboardButton}
            onPress={navigateToAcceptedServices}
            activeOpacity={0.7}
          >
            <Briefcase size={24} color={theme.colors.primary} />
            <Text style={styles.buttonText}>Mis Servicios Aceptados</Text>
          </TouchableOpacity>

      </View>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 10 : 48,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  buttonText: {
    ...theme.typography.button,
    color: theme.colors.text.primary,
    fontSize: 16,
  }
}); 