import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { Clock, MapPin, Plus } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../constants/ThemeContext';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';

export default function BookingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    setLoading(!refreshing);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No autenticado. Inicia sesión.' });
        router.replace('/(auth)/auth');
        return;
      }

      console.log('Usuario autenticado en BookingsScreen:', user.id);

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          scheduled_date,
          status,
          services ( name ),
          location:user_locations (
            address_line1,
            address_line2,
            nickname
          )
        `)
        .eq('client_id', user.id)
        .order('scheduled_date', { ascending: false });

      if (bookingsError) {
          console.error("Supabase bookings fetch error:", bookingsError);
          if (bookingsError.message.includes("security policy")) {
              Toast.show({
                  type: 'error',
                  text1: 'Acceso Denegado',
                  text2: 'Verifica las políticas de seguridad para reservas.'
              });
          } else {
              throw bookingsError;
          }
          setBookings([]);
      } else {
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
      setRefreshing(false);
    }
  }, [router, refreshing]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
  }, []);

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
  
  const getStatusInfo = (status) => {
      switch (status) {
          case 'pendiente': return { style: styles.pending, label: 'Pendiente' };
          case 'confirmado': return { style: styles.confirmed, label: 'Confirmado' };
          case 'en_progreso': return { style: styles.inProgress, label: 'En Progreso' };
          case 'completado': return { style: styles.completed, label: 'Completado' };
          case 'cancelado': return { style: styles.cancelled, label: 'Cancelado' };
          default: return { style: styles.defaultStatus, label: status }; 
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
         contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
            {loading && !refreshing ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
            ) : bookings.length === 0 ? (
                <View style={styles.noBookingsContainer}>
                    <Text style={styles.noBookingsText}>Aún no tienes reservas.</Text>
                     <TouchableOpacity onPress={handleRequestService} style={styles.requestButtonSmall}>
                        <Text style={styles.requestButtonText}>Solicitar Servicio</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.bookingsList}>
                {bookings.map((booking) => {
                    const statusInfo = getStatusInfo(booking.status);
                    const serviceName = booking.services?.name || 'Servicio Desconocido';
                    const locationName = booking.location?.nickname ? `${booking.location.nickname} (${booking.location.address_line1})` 
                                       : booking.location ? booking.location.address_line1 : 'Ubicación no especificada';
                    
                    return (
                        <TouchableOpacity 
                            key={booking.id} 
                            style={styles.bookingCard} 
                            activeOpacity={0.7}
                            onPress={() => router.push({ pathname: '/booking-detail', params: { bookingId: booking.id } })}
                        >
                        <View style={styles.bookingHeader}>
                            <Text style={styles.bookingType} numberOfLines={1}>{serviceName}</Text>
                            <View style={[styles.statusBadgeBase, statusInfo.style]}>
                                <Text style={styles.statusTextBase}>{statusInfo.label}</Text>
                            </View>
                        </View>
                        
                        <View style={styles.bookingDetails}>
                            <View style={styles.detailRow}>
                                <Clock size={16} color={theme.colors.text.secondary} />
                                <Text style={styles.detailText}>{formatDateTime(booking.scheduled_date)}</Text>
                            </View>
                            <View style={styles.detailRow}>
                                <MapPin size={16} color={theme.colors.text.secondary} />
                                <Text style={styles.detailText} numberOfLines={1} ellipsizeMode="tail">{locationName}</Text>
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

const getStyles = (theme) => StyleSheet.create({
  outerContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
      flexGrow: 1,
      paddingBottom: theme.spacing.xl,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 10 : 48,
    paddingBottom: theme.spacing.md,
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
    fontSize: 24,
  },
  addButton: {
    padding: theme.spacing.sm,
  },
  loader: {
      marginTop: 50,
  },
  bookingsList: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  bookingCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
     borderWidth: 1,
     borderColor: theme.colors.border,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  bookingType: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    flex: 1,
    marginRight: theme.spacing.sm,
    fontSize: 18,
  },
  statusBadgeBase: {
    paddingVertical: theme.spacing.xxs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.full,
    alignSelf: 'flex-start',
  },
  statusTextBase: {
     ...theme.typography.caption,
     fontWeight: 'bold',
     fontSize: 12,
  },
  pending: {
      backgroundColor: theme.colors.warning + '20',
      color: theme.colors.warning,
  },
  confirmed: {
      backgroundColor: theme.colors.primary + '20',
      color: theme.colors.primary,
  },
   inProgress: {
      backgroundColor: theme.colors.info + '20',
      color: theme.colors.info,
  },
  completed: {
      backgroundColor: theme.colors.success + '20',
      color: theme.colors.success,
  },
  cancelled: {
      backgroundColor: theme.colors.error + '20',
      color: theme.colors.error,
  },
  defaultStatus: {
      backgroundColor: theme.colors.border,
      color: theme.colors.text.secondary,
  },
  bookingDetails: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  detailText: {
    ...theme.typography.body2,
    color: theme.colors.text.secondary,
    flexShrink: 1,
  },
  noBookingsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginTop: -50,
  },
  noBookingsText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  requestButtonSmall: {
      backgroundColor: theme.colors.primary,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
  },
  requestButtonText: {
      ...theme.typography.button,
      color: theme.colors.surface,
      fontSize: 14,
  }
});