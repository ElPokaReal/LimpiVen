import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Clock, Star, Sparkles } from 'lucide-react-native';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../constants/ThemeContext';
import { useAuth } from '../../app/_layout';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { userDetails, loading: authLoading } = useAuth();
  const styles = getStyles(theme);
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    console.log("Pull-to-refresh llamado, pero la recarga de datos ahora está centralizada.");
    setRefreshing(false);
  }, []);

  const navigateToService = (serviceType) => {
    console.log("Navigating to service request for:", serviceType);
    router.push('/request-service');
  };

  const displayName = userDetails?.full_name;

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
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
        <Text style={styles.greeting}>¡Hola, {authLoading ? '...' : (displayName || 'Usuario')}!</Text>
        <Text style={styles.subtitle}>¿Qué servicio necesitas hoy?</Text>
      </View>

      <View style={styles.servicesGrid}>
        <TouchableOpacity style={styles.serviceCard} onPress={() => navigateToService('regular')} activeOpacity={0.8}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=500' }}
            style={styles.serviceImage}
          />
          <Text style={styles.serviceTitle}>Limpieza Regular</Text>
          <View style={styles.serviceInfo}>
            <Clock size={16} color={theme.colors.text.secondary} />
            <Text style={styles.serviceDetail}>2-3 horas</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceCard} onPress={() => navigateToService('deep')} activeOpacity={0.8}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=500' }}
            style={styles.serviceImage}
          />
          <Text style={styles.serviceTitle}>Limpieza Profunda</Text>
          <View style={styles.serviceInfo}>
            <Clock size={16} color={theme.colors.text.secondary} />
            <Text style={styles.serviceDetail}>4-6 horas</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Servicios Destacados</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.featuredServicesScroll}>
          <TouchableOpacity style={styles.featuredCard} onPress={() => navigateToService('office')} activeOpacity={0.8}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500' }}
              style={styles.featuredImage}
            />
            <View style={styles.featuredContent}>
              <View style={styles.featuredBadge}>
                <Star size={12} color={theme.colors.primary} />
                <Text style={styles.featuredBadgeText}>Popular</Text>
              </View>
              <Text style={styles.featuredTitle}>Limpieza de Oficinas</Text>
              <Text style={styles.featuredPrice}>Desde $299</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.featuredCard} onPress={() => navigateToService('post-event')} activeOpacity={0.8}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1527515862127-a4fc05baf7a5?w=500' }}
              style={styles.featuredImage}
            />
            <View style={styles.featuredContent}>
              <View style={[styles.featuredBadge, styles.specialBadge]}>
                <Sparkles size={12} color={theme.colors.secondary} />
                <Text style={[styles.featuredBadgeText, styles.specialBadgeText]}>Nuevo</Text>
              </View>
              <Text style={styles.featuredTitle}>Limpieza Post-Evento</Text>
              <Text style={styles.featuredPrice}>Desde $399</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
      <Toast />
    </ScrollView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingBottom: theme.spacing.lg,
  },
  header: {
    padding: theme.spacing.xl,
    paddingTop: 48,
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
    ...theme.shadows.md,
  },
  greeting: {
    ...theme.typography.h1,
    color: theme.colors.surface,
    fontSize: 28,
  },
  subtitle: {
    ...theme.typography.body1,
    color: theme.colors.surface + 'B3',
    marginTop: theme.spacing.xs,
  },
  servicesGrid: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md,
    marginTop: -theme.spacing.xl,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  serviceImage: {
    width: '100%',
    height: 120,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  serviceTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    fontSize: 16,
  },
  serviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  serviceDetail: {
    ...theme.typography.body2,
    color: theme.colors.text.secondary,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    fontSize: 20,
  },
  featuredServicesScroll: {
    marginHorizontal: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  featuredCard: {
    width: 280,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  featuredImage: {
    width: '100%',
    height: 160,
  },
  featuredContent: {
    padding: theme.spacing.md,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '20',
    paddingVertical: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.sm,
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