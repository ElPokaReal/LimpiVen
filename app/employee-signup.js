import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';

export default function EmployeeSignup() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <ArrowLeft size={24} color="#1a1a1a" />
      </TouchableOpacity>

      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070' }}
        style={styles.backgroundImage}
      />

      <View style={styles.content}>
        <Text style={styles.title}>Únete a nuestro equipo</Text>
        <Text style={styles.subtitle}>
          Forma parte de la comunidad de profesionales de limpieza más grande
        </Text>

        <View style={styles.benefitsContainer}>
          <Text style={styles.benefitsTitle}>Beneficios</Text>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitText}>• Horarios flexibles</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitText}>• Excelentes ingresos</Text>
          </View>
          <View style={styles.benefitItem}>
            <Text style={styles.benefitText}>• Capacitación continua</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button}>
          <Text style={styles.buttonText}>Comenzar Registro</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 16,
    position: 'absolute',
    zIndex: 10,
  },
  backgroundImage: {
    width: '100%',
    height: '40%',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    lineHeight: 24,
  },
  benefitsContainer: {
    marginBottom: 32,
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  benefitItem: {
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 16,
    color: '#444',
    lineHeight: 24,
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
});