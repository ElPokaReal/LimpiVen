import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { Clock, MapPin, User, ChevronRight } from 'lucide-react-native'; // Importar iconos necesarios
import { useRouter } from 'expo-router';
import { useTheme } from '../../constants/ThemeContext'; // Importar hook
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';

export default function EmployeeServices() {
  const router = useRouter();
  const { theme } = useTheme(); // Obtener theme
  const styles = getStyles(theme); // Pasar theme a la función de estilos
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employeeId, setEmployeeId] = useState(null);

  // --- Función para obtener datos ---
  const fetchPendingBookings = useCallback(async () => {
    setLoading(!refreshing); // Solo mostrar loader grande en carga inicial
    try {
      // 1. Obtener ID del empleado logueado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No autenticado.' });
        router.replace('/auth'); // O tu pantalla de login
        return;
      }
      setEmployeeId(user.id);
      console.log('Employee ID:', user.id);

      // 2. Obtener reservas pendientes SIN ASIGNAR
      const selectQuery = `
        id,
        scheduled_date,
        status,
        client:users!bookings_client_id_fkey ( full_name ), 
        service:services ( name ),
        location:user_locations (
          address_line1,
          address_line2,
          nickname
        )
      `;
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(selectQuery)
        .is('cleaner_id', null) // <- BUSCAR cleaner_id NULO
        .eq('status', 'pendiente') // <- Solo las pendientes
        .order('scheduled_date', { ascending: true }); // <- Próximas primero

      if (bookingsError) {
        console.error("Error fetching pending bookings:", bookingsError);
        // Manejar errores específicos (ej. RLS)
        if (bookingsError.message.includes("security policy")) {
            Toast.show({ type: 'error', text1: 'Acceso Denegado', text2: 'Verifica las políticas de seguridad.' });
        } else {
            throw bookingsError;
        }
        setPendingBookings([]);
      } else {
        console.log('Pending bookings data:', bookingsData);
        setPendingBookings(bookingsData || []);
      }

    } catch (error) {
      console.error("Generic Error fetching pending bookings:", error);
      Toast.show({
        type: 'error',
        text1: 'Error cargando servicios',
        text2: error instanceof Error ? error.message : 'Ocurrió un error'
      });
      setPendingBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, refreshing]); // Añadir refreshing a dependencias

  // --- Carga inicial ---
  useEffect(() => {
    fetchPendingBookings();
  }, []); // Carga solo al montar

  // --- Refresco ---
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPendingBookings();
  }, [fetchPendingBookings]);

  // --- Navegación a Detalles ---
  const handleViewDetails = (bookingId) => {
    router.push({
      pathname: '/booking-detail', // Asegúrate que esta ruta exista
      params: { bookingId: bookingId },
    });
  };

  // --- Formateo de Fecha/Hora (similar a bookings.js) ---
   const formatDateTime = (isoString) => {
    if (!isoString) return 'Fecha no disponible';
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ', ' + 
               date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
        return 'Fecha inválida';
    }
  };

  // --- Renderizado ---
  return (
    <View style={styles.outerContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Nuevos Servicios</Text>
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
        ) : pendingBookings.length === 0 ? (
          <View style={styles.noItemsContainer}>
            <Text style={styles.noItemsText}>No tienes servicios pendientes asignados.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {pendingBookings.map((booking) => (
              <TouchableOpacity 
                key={booking.id} 
                style={styles.card} 
                activeOpacity={0.7}
                onPress={() => handleViewDetails(booking.id)}
              >
                <View style={styles.cardHeader}>
                   <Text style={styles.serviceName}>{booking.service?.name || 'Servicio Desconocido'}</Text> 
                </View>
                <View style={styles.cardBody}>
                   <View style={styles.detailRow}>
                    <User size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.detailText}>Cliente: {booking.client?.full_name || 'Cliente Desconocido'}</Text>
                  </View>
                   <View style={styles.detailRow}>
                    <Clock size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.detailText}>{formatDateTime(booking.scheduled_date)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MapPin size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.detailText} numberOfLines={1}>{ 
                      booking.location
                      ? `${booking.location.address_line1}${booking.location.address_line2 ? ', '+booking.location.address_line2 : ''}`
                      : 'Dirección no especificada'
                    }</Text>
                  </View>
                </View>
                 <View style={styles.cardFooter}>
                   <Text style={styles.detailsLink}>Ver Detalles</Text>
                  <ChevronRight size={20} color={theme.colors.primary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
      <Toast />
    </View>
  );
}

// --- Estilos (Adaptados para un look profesional) ---
const getStyles = (theme) => StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    padding: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 10 : 48,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
  },
  loader: {
    marginTop: 50,
  },
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
    overflow: 'hidden', // Para asegurar bordes redondeados consistentes
  },
   cardHeader: {
     paddingHorizontal: theme.spacing.lg,
     paddingTop: theme.spacing.lg,
     paddingBottom: theme.spacing.md,
   },
   serviceName: {
     ...theme.typography.h3,
     color: theme.colors.text.primary,
   },
   cardBody: {
     paddingHorizontal: theme.spacing.lg,
     paddingBottom: theme.spacing.md,
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
    flexShrink: 1, // Para que el texto se ajuste si es largo
  },
  cardFooter: {
     flexDirection: 'row',
     justifyContent: 'flex-end',
     alignItems: 'center',
     backgroundColor: theme.colors.background, // Un fondo ligeramente diferente
     paddingHorizontal: theme.spacing.lg,
     paddingVertical: theme.spacing.md,
     borderTopWidth: 1,
     borderTopColor: theme.colors.border,
     gap: theme.spacing.xs,
  },
  detailsLink: {
     ...theme.typography.button,
     color: theme.colors.primary,
     fontWeight: '600',
  },
  noItemsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    minHeight: 200,
  },
  noItemsText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
}); 