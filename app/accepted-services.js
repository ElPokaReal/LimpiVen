import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, RefreshControl, Linking, Alert } from 'react-native';
import { Clock, MapPin, User, ChevronRight, CheckCircle, MessageCircle, PlayCircle } from 'lucide-react-native'; // Añadir icono si es necesario
import { useRouter } from 'expo-router';
import { useTheme } from '../constants/ThemeContext'; // Import useTheme
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';

export default function AcceptedServices() {
  const router = useRouter();
  const { theme } = useTheme(); // Use theme hook
  const styles = getStyles(theme); // Get styles from theme

  const [acceptedBookings, setAcceptedBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employeeId, setEmployeeId] = useState(null);

  // --- Función para obtener datos ---
  const fetchAcceptedBookings = useCallback(async () => {
    setLoading(!refreshing); 
    try {
      // 1. Obtener ID del empleado logueado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No autenticado.' });
        router.replace('/(auth)/auth'); // Redirect to auth group
        return;
      }
      setEmployeeId(user.id);
      console.log('Employee ID for Accepted Services:', user.id);

      // 2. Obtener reservas aceptadas por ESTE empleado
      const selectQuery = `
        id,
        scheduled_date,
        status,
        client:users!bookings_client_id_fkey ( 
          full_name,
          phone_number
        ), 
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
        .eq('cleaner_id', user.id) // <- BUSCAR cleaner_id = ESTE empleado
        .in('status', ['confirmado', 'en_progreso']) // <- Solo confirmados o en progreso
        .order('scheduled_date', { ascending: true }); 

      if (bookingsError) {
        console.error("Error fetching accepted bookings:", bookingsError);
        if (bookingsError.message.includes("security policy")) {
            Toast.show({ type: 'error', text1: 'Acceso Denegado', text2: 'Verifica las políticas de seguridad.' });
        } else {
            throw bookingsError;
        }
        setAcceptedBookings([]);
      } else {
        console.log('Accepted bookings data:', bookingsData);
        setAcceptedBookings(bookingsData || []);
      }

    } catch (error) {
      console.error("Generic Error fetching accepted bookings:", error);
      Toast.show({
        type: 'error',
        text1: 'Error cargando servicios aceptados',
        text2: error instanceof Error ? error.message : 'Ocurrió un error'
      });
      setAcceptedBookings([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router, refreshing]); 

  // --- Carga inicial ---
  useEffect(() => {
    // Esperar a tener employeeId podría ser una opción, pero fetchAcceptedBookings ya lo valida
    fetchAcceptedBookings();
  }, []); // Carga solo al montar

  // --- Refresco ---
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchAcceptedBookings();
  }, [fetchAcceptedBookings]);

  // --- Navegación a Detalles ---
  const handleViewDetails = (bookingId) => {
    // Navegar a la misma pantalla de detalles que antes
    router.push({
      pathname: '/booking-detail', 
      params: { bookingId: bookingId },
    });
  };

  // --- Formateo de Fecha/Hora (igual que en services.js) ---
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

  // --- Función para abrir WhatsApp ---
  const handleWhatsAppPress = (phoneNumber, clientName) => {
    if (!phoneNumber) {
      Alert.alert("Error", "El cliente no tiene un número de teléfono registrado.");
      return;
    }

    // Limpiar y formatear número (ajustar según formato en BD)
    let formattedPhone = phoneNumber.replace(/[^0-9]/g, ''); 
    // Considera añadir código de país si es necesario, ej: '58' para Venezuela
    // const countryCode = '58'; 
    // if (!formattedPhone.startsWith(countryCode)) {
    //   formattedPhone = countryCode + formattedPhone;
    // }

    let url = `whatsapp://send?phone=${formattedPhone}`;
    // Opcional: Añadir mensaje predefinido
    // let url = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent('Hola ' + clientName + ', soy tu limpiador de LimpiVen.')}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (!supported) {
          const webUrl = `https://wa.me/${formattedPhone}`;
          Linking.canOpenURL(webUrl).then(supportedWeb => {
              if (supportedWeb) {
                  return Linking.openURL(webUrl);
              } else {
                  Alert.alert('Error', 'No se puede abrir WhatsApp. Asegúrate de tenerlo instalado.');
              }
          }).catch(err => console.error('An error occurred opening wa.me link', err));
        } else {
          return Linking.openURL(url);
        }
      })
      .catch((err) => console.error('An error occurred checking WhatsApp URL', err));
  };

  // --- Función para marcar como En Progreso ---
  const markAsInProgress = async (bookingId) => {
    if (!employeeId) return; // Asegurarse que tenemos el ID
    // Podríamos añadir un estado de loading específico para el botón
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'en_progreso', updated_at: new Date() })
        .eq('id', bookingId)
        .eq('cleaner_id', employeeId)
        .eq('status', 'confirmado');

      if (error) throw error;

      Toast.show({ type: 'success', text1: 'En Progreso', text2: 'Servicio marcado como en progreso.' });
      // Actualizar estado localmente para reflejar el cambio sin recarga completa
      setAcceptedBookings(currentBookings =>
        currentBookings.map(b => 
          b.id === bookingId ? { ...b, status: 'en_progreso' } : b
        )
      );
      // Opcional: podrías llamar a onRefresh() para recargar todo, pero es menos eficiente
    } catch (error) {
      console.error("Error marking as in progress:", error);
      Toast.show({ type: 'error', text1: 'Error', text2: `No se pudo marcar en progreso: ${error.message}` });
    }
  };

  // --- Función para marcar como Completado ---
  const markAsCompleted = async (bookingId) => {
    if (!employeeId) return;
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'completado', updated_at: new Date() })
        .eq('id', bookingId)
        .eq('cleaner_id', employeeId)
        .eq('status', 'en_progreso');

      if (error) throw error;

      Toast.show({ type: 'success', text1: 'Completado', text2: 'Servicio marcado como completado.' });
      // Quitar el servicio de la lista de aceptados/en progreso
      setAcceptedBookings(currentBookings =>
        currentBookings.filter(b => b.id !== bookingId)
      );
    } catch (error) {
      console.error("Error marking as completed:", error);
      Toast.show({ type: 'error', text1: 'Error', text2: `No se pudo marcar como completado: ${error.message}` });
    }
  };

  // --- Helper para obtener el color y texto del status ---
  const getStatusStyle = (status) => {
    switch (status) {
      case 'confirmado': return { color: theme.colors.primary, text: 'Confirmado' };
      case 'en_progreso': return { color: theme.colors.info, text: 'En Progreso' }; // Use info color
      default: return { color: theme.colors.text.secondary, text: status };
    }
  };

  // --- Renderizado ---
  return (
    <View style={styles.outerContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Servicios Aceptados</Text>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent} // Use contentContainerStyle for padding
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]} // Use theme color
            tintColor={theme.colors.primary} // Use theme color
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : acceptedBookings.length === 0 ? (
          <View style={styles.noItemsContainer}>
            <Text style={styles.noItemsText}>No tienes servicios aceptados en este momento.</Text>
             <Text style={styles.noItemsSubText}>Refresca para buscar nuevos servicios.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {acceptedBookings.map((booking) => {
              const statusStyle = getStatusStyle(booking.status);
              return (
              <TouchableOpacity 
                key={booking.id} 
                style={styles.card} 
                activeOpacity={0.8}
                onPress={() => handleViewDetails(booking.id)}
              >
                <View style={styles.cardHeader}>
                   <Text style={styles.serviceName}>{booking.service?.name || 'Servicio Desconocido'}</Text> 
                    <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.text}</Text>
                </View>
                <View style={styles.cardBody}>
                   <View style={styles.detailRow}>
                    <User size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.detailText}>{booking.client?.full_name || 'Cliente Desconocido'}</Text>
                  </View>
                   <View style={styles.detailRow}>
                    <Clock size={16} color={theme.colors.text.secondary} />
                    <Text style={styles.detailText}>{formatDateTime(booking.scheduled_date)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MapPin size={16} color={theme.colors.text.secondary} />
                     <Text style={styles.detailText} numberOfLines={1} ellipsizeMode="tail"> 
                      {booking.location
                          ? `${booking.location.nickname ? `(${booking.location.nickname}) ` : ''}${booking.location.address_line1}`
                          : 'Ubicación no disponible'}
                    </Text>
                  </View>
                </View>
                 <View style={styles.cardFooter}>
                   <TouchableOpacity 
                        style={styles.whatsAppButton}
                        onPress={(e) => {
                            e.stopPropagation(); // Evitar que el TouchableOpacity padre se active
                            handleWhatsAppPress(booking.client?.phone_number, booking.client?.full_name);
                        }}
                    >
                       <MessageCircle size={18} color={theme.colors.success} />
                       <Text style={styles.whatsAppButtonText}>Contactar Cliente</Text>
                    </TouchableOpacity>
                    {booking.status === 'confirmado' && (
                        <TouchableOpacity 
                            style={styles.actionButton}
                            onPress={(e) => { 
                                e.stopPropagation();
                                markAsInProgress(booking.id);
                             }}
                        >
                            <PlayCircle size={18} color={theme.colors.info} />
                            <Text style={styles.actionButtonText}>Iniciar Servicio</Text>
                        </TouchableOpacity>
                    )}
                     {booking.status === 'en_progreso' && (
                        <TouchableOpacity 
                             style={styles.actionButton}
                             onPress={(e) => {
                                e.stopPropagation();
                                markAsCompleted(booking.id);
                             }}
                         >
                            <CheckCircle size={18} color={theme.colors.success} />
                            <Text style={styles.actionButtonText}>Marcar Completado</Text>
                        </TouchableOpacity>
                    )}
                 </View>
                <View style={styles.chevronContainer}>
                   <ChevronRight size={20} color={theme.colors.text.secondary} />
                </View>
              </TouchableOpacity>
            )})} 
          </View>
        )}
      </ScrollView>
       <Toast />
    </View>
  );
}

// Function to generate styles based on the theme
const getStyles = (theme) => StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: theme.colors.background, // Use theme color
  },
  header: {
    backgroundColor: theme.colors.surface, // Use theme color
    padding: theme.spacing.lg,
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 15 : 50,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border, // Use theme color
    ...theme.shadows.sm,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary, // Use theme color
    fontSize: 24, // Adjust size if needed
  },
  container: {
    flex: 1,
  },
  scrollContent: {
      flexGrow: 1, // Ensure scrollview takes height for loader/empty message
      padding: theme.spacing.lg,
  },
  loader: {
    marginTop: theme.spacing.xxl,
  },
  noItemsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  noItemsText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary, // Use theme color
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  noItemsSubText: {
      ...theme.typography.caption,
      color: theme.colors.text.tertiary,
      textAlign: 'center',
  },
  list: {
    gap: theme.spacing.lg, // Space between cards
  },
  card: {
    backgroundColor: theme.colors.surface, // Use theme color
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
    borderWidth: 1,
    borderColor: theme.colors.border, // Use theme color
    position: 'relative', // For absolute positioning of chevron
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Align top for potentially wrapping text
    marginBottom: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border, // Use theme color
  },
  serviceName: {
    ...theme.typography.h3,
    color: theme.colors.text.primary, // Use theme color
    flex: 1, // Allow wrapping
    marginRight: theme.spacing.sm,
  },
  statusText: {
      ...theme.typography.caption,
      fontWeight: 'bold',
      marginLeft: theme.spacing.sm, // Space from service name
  },
  cardBody: {
    marginBottom: theme.spacing.md,
    gap: theme.spacing.xs, // Space between detail rows
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  detailText: {
    ...theme.typography.body2,
    color: theme.colors.text.secondary, // Use theme color
    flexShrink: 1, // Allow text to shrink if needed
  },
  cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.md,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border, // Use theme color
      gap: theme.spacing.md,
  },
  whatsAppButton: {
     flexDirection: 'row',
     alignItems: 'center',
     gap: theme.spacing.xs,
     padding: theme.spacing.xs,
  },
  whatsAppButtonText: {
      ...theme.typography.caption,
      color: theme.colors.success,
      fontWeight: 'bold',
  },
  actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      padding: theme.spacing.xs,
  },
  actionButtonText: {
      ...theme.typography.caption,
      color: theme.colors.text.primary,
      fontWeight: 'bold',
  },
  chevronContainer: {
    position: 'absolute',
    right: theme.spacing.md,
    top: '50%', // Adjust vertical position
    transform: [{ translateY: -10 }], // Center vertically
  },
}); 