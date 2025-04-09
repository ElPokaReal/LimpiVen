import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Clock, Star, Sparkles } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { theme } from '../theme';

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadUserData = async () => {
    const name = await AsyncStorage.getItem('full_name');
    if (name) setUserName(name);
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
          setUserName(user.full_name);
          await AsyncStorage.setItem('full_name', user.full_name);
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
            setUserName(payload.new.full_name);
            await AsyncStorage.setItem('full_name', payload.new.full_name);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
          tintColor={theme.colors.primary}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>¡Hola, {userName}!</Text>
        <Text style={styles.subtitle}>¿Qué servicio necesitas hoy?</Text>
      </View>

      <View style={styles.servicesGrid}>
        <TouchableOpacity style={styles.serviceCard}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=500' }}
            style={styles.serviceImage}
          />
          <Text style={styles.serviceTitle}>Limpieza Regular</Text>
          <View style={styles.serviceInfo}>
            <Clock size={16} color="#666" />
            <Text style={styles.serviceDetail}>2-3 horas</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceCard}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=500' }}
            style={styles.serviceImage}
          />
          <Text style={styles.serviceTitle}>Limpieza Profunda</Text>
          <View style={styles.serviceInfo}>
            <Clock size={16} color="#666" />
            <Text style={styles.serviceDetail}>4-6 horas</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Servicios Destacados</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredServices}>
          <TouchableOpacity style={styles.featuredCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500' }}
              style={styles.featuredImage}
            />
            <View style={styles.featuredContent}>
              <View style={styles.featuredBadge}>
                <Star size={12} color="#6200EE" />
                <Text style={styles.featuredBadgeText}>Popular</Text>
              </View>
              <Text style={styles.featuredTitle}>Limpieza de Oficinas</Text>
              <Text style={styles.featuredPrice}>Desde $299</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featuredCard}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?w=500' }}
              style={styles.featuredImage}
            />
            <View style={styles.featuredContent}>
              <View style={[styles.featuredBadge, styles.specialBadge]}>
                <Sparkles size={12} color="#6200EE" />
                <Text style={[styles.featuredBadgeText, styles.specialBadgeText]}>Nuevo</Text>
              </View>
              <Text style={styles.featuredTitle}>Limpieza Post-Evento</Text>
              <Text style={styles.featuredPrice}>Desde $399</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 24,
    paddingTop: 48,
    backgroundColor: '#6200EE',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  servicesGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
    marginTop: -20,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    elevation: 4,
  },
  serviceImage: {
    width: '100%',
    height: 120,
    borderRadius: 4,
    marginBottom: 12,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceDetail: {
    fontSize: 14,
    color: '#757575',
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  featuredServices: {
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  featuredCard: {
    width: 280,
    marginRight: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 4,
  },
  featuredImage: {
    width: '100%',
    height: 160,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  featuredContent: {
    padding: 16,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  featuredBadgeText: {
    fontSize: 12,
    color: '#6200EE',
    fontWeight: '500',
  },
  specialBadge: {
    backgroundColor: '#E8EAF6',
  },
  specialBadgeText: {
    color: '#3F51B5',
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  featuredPrice: {
    fontSize: 16,
    color: '#6200EE',
    fontWeight: '500',
  },
});