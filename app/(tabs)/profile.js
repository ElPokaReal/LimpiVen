import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Settings, Clock, LogOut } from 'lucide-react-native';
import { useEffect, useRef } from 'react';

export default function Profile() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleLogout = () => {
    // Lógica para cerrar sesión
    router.replace('/');
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.profileHeader}>
        <Text style={styles.profileName}>John Doe</Text>
        <Text style={styles.profileEmail}>john.doe@example.com</Text>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-profile')}>
          <User size={24} color="#6200EE" />
          <Text style={styles.menuText}>Editar Perfil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/job-history')}>
          <Clock size={24} color="#6200EE" />
          <Text style={styles.menuText}>Historial de Trabajos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings')}>
          <Settings size={24} color="#6200EE" />
          <Text style={styles.menuText}>Ajustes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <LogOut size={24} color="#FF0000" />
          <Text style={[styles.menuText, { color: '#FF0000' }]}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200EE',
    marginBottom: 8,
  },
  profileEmail: {
    fontSize: 16,
    color: '#757575',
  },
  menu: {
    marginTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  menuText: {
    marginLeft: 16,
    fontSize: 18,
    color: '#000',
  },
});
