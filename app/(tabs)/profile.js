import { View, Text, StyleSheet, TouchableOpacity, Animated, RefreshControl, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Settings, Clock, LogOut } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { theme } from '../theme';
import { Toast } from 'react-native-toast-message';

export default function Profile() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [userData, setUserData] = useState({
    name: '',
    email: ''
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadUserData = async () => {
    const name = await AsyncStorage.getItem('full_name');
    const email = await AsyncStorage.getItem('email');
    if (name && email) {
      setUserData({ name, email });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const userId = await AsyncStorage.getItem('id');
      if (userId) {
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (user) {
          setUserData({
            name: user.full_name,
            email: user.email
          });
          await AsyncStorage.setItem('full_name', user.full_name);
          await AsyncStorage.setItem('email', user.email);
        }
      }
    } catch (error) {
      console.error('Error al refrescar:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUserData();

    // Suscribirse a cambios en la tabla users
    const subscription = supabase
      .channel('user_changes')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'users' 
        }, 
        async (payload) => {
          const userId = await AsyncStorage.getItem('id');
          if (payload.new.id === userId) {
            setUserData({
              name: payload.new.full_name,
              email: payload.new.email
            });
            await AsyncStorage.setItem('full_name', payload.new.full_name);
            await AsyncStorage.setItem('email', payload.new.email);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cerrar sesión.' });
      } else {
        console.log("User signed out successfully.");
      }
    } catch (e) {
        console.error("Unexpected error during sign out:", e);
        Toast.show({ type: 'error', text1: 'Error', text2: 'Ocurrió un error inesperado.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.profileHeader}>
          <Text style={styles.profileName}>{userData.name}</Text>
          <Text style={styles.profileEmail}>{userData.email}</Text>
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
      </ScrollView>
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
