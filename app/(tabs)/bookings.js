import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { Clock, MapPin, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { theme } from '../theme';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';

export default function BookingsScreen() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Función reutilizable para cargar las reservas
  const fetchBookings = useCallback(async () => {
    setLoading(true); // Mostrar loader al cargar/refrescar inicialmente
    try {
      // 1. Obtener usuario de Supabase Auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No autenticado. Inicia sesión.' });
        router.replace('/auth'); // Asegúrate que la ruta de login sea correcta
        return;
      }

      // Log para verificar el ID obtenido
      console.log('Usuario autenticado en BookingsScreen:', user.id);

      // 2. Obtener reservas del usuario usando user.id
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          scheduled_date,
          status,
          services ( name ),
          location:user_locations (
            address_line1,
            address_line2
          )
        `)
        .eq('client_id', user.id) // <- Usar user.id directamente
        .order('scheduled_date', { ascending: false });

      if (bookingsError) {
          // Log específico del error de Supabase
          console.error("Supabase bookings fetch error:", bookingsError);
          // Revisar si es un error RLS (puede que no siempre sea explícito)
          if (bookingsError.message.includes("security policy")) {
              Toast.show({
                  type: 'error',
                  text1: 'Acceso Denegado',
                  text2: 'Verifica las políticas de seguridad para reservas.'
              });
          } else {
              throw bookingsError; // Lanzar otros errores para el catch general
          }
          setBookings([]); // Dejar lista vacía si hay error
      } else {
         // Log para ver qué datos se reciben
         console.log('Bookings data received:', bookingsData);
         setBookings(bookingsData || []);
      }

    } catch (error) {
      console.error("Error fetching bookings:", error);
      Toast.show({
        type: 'error',
        text1: 'Error cargando reservas',
        text2: error instanceof Error ? error.message : 'Ocurrió un error'
      });
      setBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false); // Asegurarse que refreshing termine aquí también
    }
  }, [router]); // Incluir router como dependencia si se usa para redirección

  // Carga inicial
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]); // fetchBookings es ahora la dependencia

  // Función para el RefreshControl
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings(); // Llama a la misma función de carga
  }, [fetchBookings]); // Dependencia de fetchBookings

  const handleRequestService = () => {
    router.push('/request-service');
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return 'Fecha no disponible';
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ', ' + 
               date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
        return 'Fecha inválida';
    }
  };
  
  const getStatusStyle = (status) => {
      switch (status) {
          case 'pendiente':
              return { badge: styles.pendingBadge, text: styles.pendingText, label: 'Pendiente' };
          case 'confirmado':
              return { badge: styles.confirmedBadge, text: styles.confirmedText, label: 'Confirmado' };
          case 'en_progreso':
               return { badge: styles.inProgressBadge, text: styles.inProgressText, label: 'En Progreso' };
          case 'completado':
              return { badge: styles.completedBadge, text: styles.completedText, label: 'Completado' };
          case 'cancelado':
              return { badge: styles.cancelledBadge, text: styles.cancelledText, label: 'Cancelado' };
          default:
              return { badge: styles.statusBadge, text: styles.statusText, label: status }; 
      }
  };

  return (
    <View style={styles.outerContainer}> 
        <View style={styles.header}>
            <Text style={styles.title}>Mis Reservas</Text>
            <TouchableOpacity onPress={handleRequestService} style={styles.addButton}>
            <Plus size={28} color={theme.colors.primary} />
            </TouchableOpacity>
        </View>

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
            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
            ) : bookings.length === 0 ? (
                <View style={styles.noBookingsContainer}>
                    <Text style={styles.noBookingsText}>Aún no tienes reservas.</Text>
                </View>
            ) : (
                <View style={styles.bookingsList}>
                {bookings.map((booking) => {
                    const statusInfo = getStatusStyle(booking.status);
                    const serviceName = booking.services?.name || 'Servicio Desconocido';
                    
                    return (
                        <TouchableOpacity key={booking.id} style={styles.bookingCard} activeOpacity={0.7}>
                        <View style={styles.bookingHeader}>
                            <Text style={styles.bookingType}>{serviceName}</Text>
                            <View style={[styles.statusBadgeBase, statusInfo.badge]}>
                                <Text style={[styles.statusTextBase, statusInfo.text]}>{statusInfo.label}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.bookingDetails}>
                            <View style={styles.detailRow}>
                                <Clock size={16} color={theme.colors.text.secondary} />
                                <Text style={styles.detailText}>{formatDateTime(booking.scheduled_date)}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <MapPin size={16} color={theme.colors.text.secondary} />
                                <Text style={styles.detailText}>{
                                  booking.location 
                                  ? `${booking.location.address_line1}${booking.location.address_line2 ? ', '+booking.location.address_line2 : ''}`
                                  : 'Dirección no especificada'
                                }</Text>
                            </View>
                        </View>
                        </TouchableOpacity>
                    );
                })}
                </View>
            )}
        </ScrollView>
        <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
      flex: 1,
      backgroundColor: theme?.colors?.background || '#f8f9fa',
  },
  container: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 10 : 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
  },
  addButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
  },
  loader: {
      marginTop: 50,
  },
  bookingsList: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  bookingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    ...theme.shadows.md,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  bookingType: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    flexShrink: 1,
    marginRight: theme.spacing.sm,
  },
  statusBadgeBase: {
    paddingVertical: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
  },
  statusTextBase: {
     ...theme.typography.caption,
     fontWeight: '600',
  },
  pendingBadge: { backgroundColor: theme.colors.warningLight },
  pendingText: { color: theme.colors.warning },
  confirmedBadge: { backgroundColor: theme.colors.infoLight }, 
  confirmedText: { color: theme.colors.info },
  inProgressBadge: { backgroundColor: theme.colors.primaryLight },
  inProgressText: { color: theme.colors.primary },
  completedBadge: { backgroundColor: theme.colors.successLight },
  completedText: { color: theme.colors.success },
  cancelledBadge: { backgroundColor: theme.colors.errorLight },
  cancelledText: { color: theme.colors.error },
  statusBadge: { backgroundColor: theme.colors.border },
  statusText: { color: theme.colors.text.secondary },
  
  bookingDetails: {
    gap: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  detailText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    flexShrink: 1,
  },
  noBookingsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    minHeight: 200,
  },
  noBookingsText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  requestButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
  },
  requestButtonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  }
});