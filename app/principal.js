import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, SafeAreaView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '../constants/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function PrincipalScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primary + '99', theme.colors.background]}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <View style={styles.content}>
        <View style={styles.headerContent}>
          <Image 
            source={require('../assets/images/limpiven-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(auth)/auth')} 
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Iniciar Sesión / Registrarse</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.employeeButton]}
            onPress={() => router.push('/(auth)/employee-signup')}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, styles.employeeButtonText]}>
              ¿Deseas ser empleado? ¡Regístrate!
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradientBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.08,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: Platform.OS === 'android' ? theme.spacing.xl : theme.spacing.lg,
    paddingTop: height * 0.1,
    paddingBottom: height * 0.08,
    zIndex: 2,
    width: '100%',
  },
  headerContent: {
    paddingTop: height * 0.1,
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
  },
  logo: {
    width: 300,
    height: 300,
    marginBottom: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
    fontSize: 36,
    marginBottom: theme.spacing.sm,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '90%',
    maxWidth: 400,
    gap: theme.spacing.md,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.full,
    alignItems: 'center',
    ...theme.shadows.md,
    width: '100%',
  },
  buttonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  },
  employeeButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  employeeButtonText: {
    color: theme.colors.primary,
  },
}); 