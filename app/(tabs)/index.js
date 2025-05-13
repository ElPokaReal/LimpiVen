import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Clock, Star, Sparkles, Check, ChevronRight } from 'lucide-react-native';
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
    console.log("Navigating to service details for:", serviceType);
    router.push({ pathname: '/service-details', params: { serviceType: serviceType } });
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

      {/* Sección de Paquetes Vertical */}
      <View style={styles.section}>
        <Text style={styles.packageHeading}>Nuestros Paquetes de Limpieza</Text>
        
        <View style={styles.packagesContainerVertical}>
          {/* Paquete Básico */}
          <TouchableOpacity 
            style={[styles.packageCardVertical, styles.basicPackageBorder]} 
            onPress={() => navigateToService('basic')} 
            activeOpacity={0.8}
          >
            <View style={styles.packageHeaderVertical}>
              <Text style={styles.packageTitleVertical}>Básico</Text>
              <Text style={styles.packagePriceVertical}>$35</Text>
            </View>
            <View style={styles.packageFeaturesVertical}>
              <Text style={styles.packageFeatureText}>Limpieza de baños y cocina.</Text>
              <Text style={styles.packageFeatureText}>Aspirado general.</Text>
            </View>
            <View style={styles.packageFooter}>
              <Text style={styles.packageLink}>Conoce más</Text>
              <ChevronRight size={18} color={theme.colors.primary} />
            </View>
          </TouchableOpacity>

          {/* Paquete Mediano */}
          <TouchableOpacity 
            style={[styles.packageCardVertical, styles.mediumPackageBorder]} 
            onPress={() => navigateToService('medium')} 
            activeOpacity={0.8}
          >
            <View style={styles.packageHeaderVertical}>
              <Text style={styles.packageTitleVertical}>Mediano</Text>
              <Text style={[styles.packagePriceVertical, { color: theme.colors.secondary }]}>$50</Text>
            </View>
            <View style={styles.packageFeaturesVertical}>
              <Text style={styles.packageFeatureText}>Incluye Básico + Limpieza de ventanas.</Text>
              <Text style={styles.packageFeatureText}>Organización ligera.</Text>
            </View>
             <View style={styles.packageFooter}>
              <Text style={styles.packageLink}>Conoce más</Text>
              <ChevronRight size={18} color={theme.colors.secondary} />
            </View>
          </TouchableOpacity>

          {/* Paquete Premium */}
          <TouchableOpacity 
            style={[styles.packageCardVertical, styles.premiumPackageStyle]} 
            onPress={() => navigateToService('premium')} 
            activeOpacity={0.8}
          >
            <View style={styles.packageHeaderVertical}>
              <Text style={[styles.packageTitleVertical, styles.premiumText]}>Premium</Text>
              <Text style={[styles.packagePriceVertical, styles.premiumPriceText]}>$90</Text>
            </View>
            <View style={styles.packageFeaturesVertical}>
              <Text style={[styles.packageFeatureText, styles.premiumText]}>Incluye Mediano + Limpieza profunda.</Text>
              <Text style={[styles.packageFeatureText, styles.premiumText]}>Desinfección completa.</Text>
            </View>
             <View style={styles.packageFooter}>
              <Text style={[styles.packageLink, styles.premiumLink]}>Conoce más</Text>
              <ChevronRight size={18} color={theme.colors.surface} />
            </View>
          </TouchableOpacity>
        </View>
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
    paddingBottom: theme.spacing.xxl,
  },
  header: {
    padding: theme.spacing.xl,
    paddingTop: 48,
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
    ...theme.shadows.md,
    marginBottom: theme.spacing.lg,
  },
  greeting: {
    ...theme.typography.h1,
    color: theme.colors.surface,
    fontSize: 28,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.surface + 'D0',
    marginTop: theme.spacing.xs,
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  packageHeading: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    fontSize: 22,
    textAlign: 'left',
  },
  packagesContainerVertical: {
    flexDirection: 'column',
    gap: theme.spacing.md,
  },
  packageCardVertical: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  basicPackageBorder: {
     borderLeftColor: theme.colors.primary,
     borderLeftWidth: 5,
  },
  mediumPackageBorder: {
     borderLeftColor: theme.colors.secondary,
     borderLeftWidth: 5,
  },
  premiumPackageStyle: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    position: 'relative',
     borderLeftColor: theme.colors.accent,
     borderLeftWidth: 5,
  },
  premiumBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent + 'E0',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    gap: theme.spacing.xs,
    zIndex: 1,
  },
  premiumBadgeText: {
    ...theme.typography.caption,
    color: theme.colors.surface,
    fontWeight: '600',
    fontSize: 12,
  },
  packageHeaderVertical: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  packageTitleVertical: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    fontSize: 20,
    flexShrink: 1,
    marginRight: theme.spacing.sm,
  },
  packagePriceVertical: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 20,
    textAlign: 'right',
  },
  premiumText: {
    color: theme.colors.surface,
  },
  premiumPriceText: {
    color: theme.colors.surface,
  },
  packageFeaturesVertical: {
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  packageFeatureText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    lineHeight: 22,
  },
  packageFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      marginTop: theme.spacing.sm,
      gap: theme.spacing.xs,
  },
  packageLink: {
      ...theme.typography.button,
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '500',
  },
  servicesGrid: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md,
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
    height: 100,
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
    marginTop: 'auto',
  },
  serviceDetail: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    fontSize: 22,
    textAlign: 'left',
  },
  featuredServicesScroll: {
    marginHorizontal: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  featuredCard: {
    width: 260,
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
    height: 140,
  },
  featuredContent: {
    padding: theme.spacing.md,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '20',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
    gap: 4,
  },
  featuredBadgeText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  specialBadge: {
    backgroundColor: theme.colors.secondary + '20',
  },
  specialBadgeText: {
    color: theme.colors.secondary,
  },
  featuredTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: 4,
    fontSize: 18,
  },
  featuredPrice: {
    ...theme.typography.body,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  premiumLink: {
    color: theme.colors.surface + 'D0',
  },
});