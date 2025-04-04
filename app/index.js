import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

export default function Home() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255,255,255,0.9)', 'rgba(255,255,255,0.6)']}
        style={styles.gradient}
      />
      
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070' }}
        style={styles.backgroundImage}
      />

      <View style={styles.content}>
        <Text style={styles.title}>LimpiVen</Text>
        <Text style={styles.subtitle}>Aseo al instante, resultados brillantes!</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/auth')}
          >
            <Text style={styles.buttonText}>Iniciar Sesión o Registrarse</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.employeeButton]}
            onPress={() => router.push('/employee-signup')}
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
    backgroundColor: '#fff',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.3,
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
    justifyContent: 'flex-end',
    padding: 24,
    zIndex: 2,
  },
  title: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 48,
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 48,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  employeeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  employeeButtonText: {
    color: '#007AFF',
  },
});