import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, RefreshControl, Linking, Alert } from 'react-native';
import { Clock, MapPin, User, ChevronRight, CheckCircle, MessageCircle, PlayCircle } from 'lucide-react-native'; // Añadir icono si es necesario
import { useRouter } from 'expo-router';
import { theme } from './theme';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';

export default function AcceptedServices() {
  const router = useRouter();
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
        router.replace('/auth'); 
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

  // --- Renderizado ---
  return (
    <View style={styles.outerContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Servicios Aceptados</Text>
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
        ) : acceptedBookings.length === 0 ? (
          <View style={styles.noItemsContainer}>
            <Text style={styles.noItemsText}>No tienes servicios aceptados en este momento.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {acceptedBookings.map((booking) => (
              <TouchableOpacity 
                key={booking.id} 
                style={styles.card} 
                activeOpacity={0.7}
                onPress={() => handleViewDetails(booking.id)}
              >
                <View style={styles.cardHeader}>
                   <Text style={styles.serviceName}>{booking.service?.name || 'Servicio Desconocido'}</Text> 
                   {/* Podríamos añadir el estado aquí si queremos */}
                   <Text style={styles.statusText}>Estado: {booking.status}</Text>
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
                   {/* --- Botón WhatsApp --- */}
                   {booking.client?.phone_number && (
                    <TouchableOpacity 
                      style={styles.whatsappButton} 
                      onPress={() => handleWhatsAppPress(booking.client.phone_number, booking.client.full_name)}
                    >
                      <MessageCircle size={18} color={theme.colors.success} /> 
                      <Text style={styles.whatsappButtonText}>Contactar Cliente</Text>
                    </TouchableOpacity>
                  )}
                </View>
                 <View style={styles.cardFooter}>
                   <Text style={styles.detailsLink}>Ver Detalles</Text>
                  <ChevronRight size={20} color={theme.colors.primary} />
                </View>
                {/* --- Botones de Acción --- */}
                <View style={styles.actionButtonsContainer}>
                  {booking.status === 'confirmado' && (
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.inProgressButton]}
                      onPress={() => markAsInProgress(booking.id)}
                    >
                      <PlayCircle size={16} color={theme.colors.white} />
                      <Text style={styles.actionButtonText}>Marcar en Progreso</Text>
                    </TouchableOpacity>
                  )}
                  {booking.status === 'en_progreso' && (
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.completedButton]}
                      onPress={() => markAsCompleted(booking.id)}
                    >
                      <CheckCircle size={16} color={theme.colors.white} />
                      <Text style={styles.actionButtonText}>Marcar Completado</Text>
                    </TouchableOpacity>
                  )}
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

// --- Estilos (Copiados de services.js, ajustar si es necesario) ---
const styles = StyleSheet.create({
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
    overflow: 'hidden', 
  },
   cardHeader: {
     paddingHorizontal: theme.spacing.lg,
     paddingTop: theme.spacing.lg,
     paddingBottom: theme.spacing.md,
     flexDirection: 'row', // Para poner nombre y estado en la misma línea
     justifyContent: 'space-between', // Separar nombre y estado
     alignItems: 'center',
   },
   serviceName: {
     ...theme.typography.h3,
     color: theme.colors.text.primary,
     flexShrink: 1, // Permitir que el nombre se acorte si es largo
     marginRight: theme.spacing.md, // Espacio entre nombre y estado
   },
   statusText: { // Estilo para el texto del estado
     ...theme.typography.caption,
     color: theme.colors.primary, // O un color que represente el estado
     fontWeight: 'bold',
     textTransform: 'capitalize',
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
    flexShrink: 1, 
  },
  cardFooter: {
     flexDirection: 'row',
     justifyContent: 'flex-end',
     alignItems: 'center',
     backgroundColor: theme.colors.background, 
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
  // --- Estilos WhatsApp ---
  whatsappButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm, // Aumentar un poco el espacio
    paddingVertical: theme.spacing.xs, // Menos padding vertical
    marginTop: theme.spacing.sm, // Espacio arriba
    alignSelf: 'flex-start', // Para que no ocupe todo el ancho
    // backgroundColor: '#e7f8e8', // Fondo sutil opcional
    // borderRadius: theme.borderRadius.sm,
    // paddingHorizontal: theme.spacing.md,
  },
  whatsappButtonText: {
     ...theme.typography.body, // Usar tamaño body
     color: theme.colors.success, 
     fontWeight: '600', // Un poco más grueso
  },
  // --- Estilos Botones de Acción ---
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // O 'flex-end' si los quieres a la derecha
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1, // Separador visual ligero
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.surface, // Mismo fondo que la tarjeta
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
    ...theme.shadows.sm, // Sombra sutil
  },
  actionButtonText: {
    ...theme.typography.button, // Estilo de botón
    color: theme.colors.white, // Texto blanco
    fontWeight: '600',
  },
  inProgressButton: {
    backgroundColor: theme.colors.primary, // Azul primario
  },
  completedButton: {
    backgroundColor: theme.colors.success, // Verde éxito
  },
}); 