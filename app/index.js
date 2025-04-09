import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { theme } from './theme';

const { width, height } = Dimensions.get('window');

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(108, 99, 255, 0.1)', 'rgba(255, 101, 132, 0.05)']}
        style={styles.gradient}
      />
      
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070' }}
        style={styles.backgroundImage}
      />

      <View style={styles.content}>
        <View>
          <Text style={styles.title}>LimpiVen</Text>
          <Text style={styles.subtitle}>Aseo al instante, resultados brillantes!</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/auth')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Iniciar Sesión o Registrarse</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.employeeButton]}
            onPress={() => router.push('/employee-signup')}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, styles.employeeButtonText]}>
              ¿Deseas ser empleado? ¡Regístrate!
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width * 0.9,
    maxWidth: 500,
    alignSelf: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.2,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
    zIndex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: theme.spacing.xl,
    zIndex: 2,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xxl,
  },
  buttonContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xxl,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  buttonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  },
  employeeButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  employeeButtonText: {
    color: theme.colors.primary,
  },
});