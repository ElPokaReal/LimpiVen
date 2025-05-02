import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useTheme } from '../constants/ThemeContext';
import Toast from 'react-native-toast-message';
import { ArrowLeft, Calendar, Clock, MapPin, User, FileText, CheckCircle, XCircle, Star } from 'lucide-react-native';
import RatingModal from './components/RatingModal';

export default function BookingDetailScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isRatingModalVisible, setIsRatingModalVisible] = useState(false);
  const [currentUserRole, setCurrentUserRole] = useState(null);

  // --- Función para cargar detalles --- 
  const fetchBookingDetails = useCallback(async () => {
    if (!bookingId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'ID de reserva no encontrado.' });
      router.back();
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          client_id,
          cleaner_id,
          scheduled_date,
          status,
          frequency,
          special_instructions,
          client:users!bookings_client_id_fkey ( full_name, phone_number ), 
          cleaner:users!bookings_cleaner_id_fkey ( id, full_name ),
          service:services ( name, base_price, duration_minutes ),
          location:user_locations (
            address_line1,
            address_line2,
            nickname
          ),
          reviews ( count )
        `)
        .eq('id', bookingId)
        .single();

      if (error) {
          if (error.code === 'PGRST116') {
               Toast.show({ type: 'error', text1: 'No Encontrado', text2: 'La reserva solicitada no existe.' });
          } else if (error.message.includes("security policy")) {
                Toast.show({ type: 'error', text1: 'Acceso Denegado', text2: 'No tienes permiso para ver esta reserva.' });
          } else {
              throw error;
          }
           router.back();
      } else {
        console.log('Booking details:', data);
        setBooking(data);
      }

    } catch (error) {
      console.error("Error fetching booking details:", error);
      Toast.show({
        type: 'error',
        text1: 'Error cargando detalles',
        text2: error instanceof Error ? error.message : 'Ocurrió un error'
      });
      router.back();
    } finally {
      setLoading(false);
    }
  }, [bookingId, router]);

  // --- Determinar rol del usuario ---
  useEffect(() => {
    const getUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData, error: userError } = await supabase
          .from('users') 
          .select('role')
          .eq('id', user.id)
          .single();
        if (userData) {
          setCurrentUserRole(userData.role);
        }
      }
    };
    getUserRole();
  }, []);

  // --- Carga inicial ---
  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

  // --- Funciones para Aceptar / Rechazar ---
  const handleUpdateStatus = async (newStatus) => {
    setActionLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo verificar tu sesión.' });
          setActionLoading(false);
          return;
      }
      const currentCleanerId = user.id;

      let updateData = { status: newStatus };
      if (newStatus === 'confirmado') {
          updateData.cleaner_id = currentCleanerId; 
      }

      console.log('[handleUpdateStatus] Intentando actualizar booking ID:', bookingId);
      console.log('[handleUpdateStatus] Datos de actualización:', JSON.stringify(updateData));
      console.log('[handleUpdateStatus] ID del limpiador actual:', currentCleanerId);

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId);

      if (error) {
        if (error.message.includes("security policy")) {
             Toast.show({ type: 'error', text1: 'Error de Permiso', text2: 'No puedes actualizar esta reserva.' });
        } else {
            throw error;
        }
      } else {
        Toast.show({ 
            type: 'success', 
            text1: 'Éxito', 
            text2: `Reserva ${newStatus === 'confirmado' ? 'aceptada y asignada' : 'rechazada'} correctamente.`
        });
        setBooking(prev => prev ? { ...prev, ...updateData } : null);
      }
    } catch (error) {
       console.error(`Error updating booking status to ${newStatus}:`, error);
       Toast.show({
        type: 'error',
        text1: 'Error al actualizar',
        text2: error instanceof Error ? error.message : 'Ocurrió un error'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // --- Función para Enviar Calificación (Cliente) ---
  const submitReview = async (rating, comment) => {
    if (!booking || !booking.client_id || !booking.cleaner_id || !rating) {
       Toast.show({ type: 'error', text1: 'Datos incompletos', text2: 'Faltan datos para enviar la reseña.' });
       return;
    }
     if (rating < 1 || rating > 5) {
         Toast.show({ type: 'error', text1: 'Calificación inválida', text2: 'La calificación debe ser entre 1 y 5.' });
         return;
     }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          booking_id: booking.id,
          client_id: booking.client_id,
          cleaner_id: booking.cleaner_id,
          rating: rating,
          comment: comment || null
        });
      
      if (error) throw error;

      Toast.show({ type: 'success', text1: 'Reseña Enviada', text2: '¡Gracias por tu calificación!' });
      setIsRatingModalVisible(false);
      fetchBookingDetails(); 

    } catch (error) {
      console.error("Error submitting review:", error);
      Toast.show({ type: 'error', text1: 'Error al enviar reseña', text2: error.message });
    } finally {
      setActionLoading(false);
    }
  };

  // --- Alerta de confirmación ---
  const confirmAction = (actionType) => {
      const title = actionType === 'accept' ? 'Confirmar Servicio' : 'Rechazar Servicio';
      const message = actionType === 'accept' 
          ? '¿Estás seguro de que quieres aceptar este servicio?' 
          : '¿Estás seguro de que quieres rechazar este servicio?';
      const newStatus = actionType === 'accept' ? 'confirmado' : 'cancelado';

      Alert.alert(
          title,
          message,
          [
              { text: 'Cancelar', style: 'cancel' },
              { text: actionType === 'accept' ? 'Aceptar' : 'Rechazar', 
                style: actionType === 'accept' ? 'default' : 'destructive', 
                onPress: () => handleUpdateStatus(newStatus) }
          ]
      );
  };

  // --- Formateo de Fecha/Hora/Frecuencia ---
   const formatDateTime = (isoString) => {
    if (!isoString) return '-';
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) + ' a las ' + 
               date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
        return 'Inválido';
    }
  };
  
   const formatFrequency = (freq) => {
       const map = { 'una_vez': 'Una Vez', 'semanal': 'Semanal', 'quincenal': 'Quincenal', 'mensual': 'Mensual' };
       return map[freq] || freq || 'No especificada';
   }

   // --- Helper para obtener el color y texto del status ---
   const getStatusStyle = (status) => {
    switch (status) {
      case 'pendiente': return { color: theme.colors.warning, text: 'Pendiente' };
      case 'confirmado': return { color: theme.colors.primary, text: 'Confirmado' };
      case 'completado': return { color: theme.colors.success, text: 'Completado' };
      case 'cancelado': return { color: theme.colors.error, text: 'Cancelado' };
      default: return { color: theme.colors.text.secondary, text: status };
    }
  };

  // --- Renderizado --- 
  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  if (!booking) {
    return <View style={styles.container}><Text style={styles.errorText}>No se pudo cargar la reserva.</Text></View>;
  }

  const statusStyle = getStatusStyle(booking.status);
  const hasBeenReviewed = booking.reviews && booking.reviews.length > 0 && booking.reviews[0].count > 0;
  const canReview = currentUserRole === 'cliente' && booking.status === 'completado' && !hasBeenReviewed;
  const showActionButtons = currentUserRole === 'limpiador' && booking.status === 'pendiente' && !booking.cleaner_id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles de la Reserva</Text>
         <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Servicio Solicitado</Text>
          <View style={styles.infoRow}>
            <FileText size={20} color={theme.colors.text.secondary} />
            <Text style={styles.infoText}>{booking.service?.name || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
             <Text style={[styles.label, { width: 80 }]}>Estado:</Text>
             <Text style={[styles.infoText, { color: statusStyle.color, fontWeight: 'bold' }]}>{statusStyle.text}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { width: 80 }]}>Frecuencia:</Text>
            <Text style={styles.infoText}>{formatFrequency(booking.frequency)}</Text>
          </View>
          <View style={styles.infoRow}>
             <Text style={[styles.label, { width: 80 }]}>Precio:</Text>
             <Text style={styles.infoText}>{booking.service?.base_price ? `$${booking.service.base_price.toFixed(2)}` : '-'}</Text>
          </View>
          {booking.special_instructions && (
            <View style={styles.infoRowFlexStart}>
              <Text style={styles.label}>Instrucciones:</Text>
              <Text style={styles.infoText}>{booking.special_instructions}</Text>
            </View>
          )}
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fecha y Hora</Text>
          <View style={styles.infoRow}>
            <Calendar size={20} color={theme.colors.text.secondary} />
            <Text style={styles.infoText}>{formatDateTime(booking.scheduled_date)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Clock size={20} color={theme.colors.text.secondary} />
            <Text style={styles.infoText}>Duración estimada: {booking.service?.duration_minutes || '?'} min</Text>
          </View>
        </View>

        {booking.location && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            <View style={styles.infoRow}>
              <MapPin size={20} color={theme.colors.text.secondary} />
              <View style={styles.locationTextContainer}>
                {booking.location.nickname && <Text style={styles.infoTextBold}>{booking.location.nickname}</Text>}
                <Text style={styles.infoText}>{booking.location.address_line1 || '-'}</Text>
                {booking.location.address_line2 && <Text style={styles.infoText}>{booking.location.address_line2}</Text>}
              </View>
            </View>
          </View>
        )}

        {currentUserRole === 'limpiador' && booking.client && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Información del Cliente</Text>
            <View style={styles.infoRow}>
              <User size={20} color={theme.colors.text.secondary} />
              <Text style={styles.infoText}>{booking.client.full_name}</Text>
            </View>
             {booking.client.phone_number && (
                <View style={styles.infoRow}>

                   <Text style={styles.infoText}>Tel: {booking.client.phone_number}</Text>
                </View>
             )}
          </View>
        )}

        {currentUserRole === 'cliente' && booking.cleaner && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Limpiador Asignado</Text>
            <View style={styles.infoRow}>
              <User size={20} color={theme.colors.text.secondary} />
              <Text style={styles.infoText}>{booking.cleaner.full_name}</Text>
            </View>

             <TouchableOpacity 
                style={styles.viewProfileButton}
                onPress={() => router.push({ pathname: 'cleaner-profile', params: { cleanerId: booking.cleaner.id } })}
             >
                 <Text style={styles.viewProfileButtonText}>Ver Perfil del Limpiador</Text>
             </TouchableOpacity>
          </View>
        )}

        {showActionButtons && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton, actionLoading && styles.buttonDisabled]}
              onPress={() => confirmAction('accept')}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <>
                  <CheckCircle size={20} color={theme.colors.surface} />
                  <Text style={styles.buttonText}>Aceptar Servicio</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton, actionLoading && styles.buttonDisabled]}
              onPress={() => confirmAction('reject')}
              disabled={actionLoading}
            >
               {actionLoading ? (
                <ActivityIndicator color={theme.colors.error} /> // Use theme color for loader too
              ) : (
                 <>
                  <XCircle size={20} color={theme.colors.error} />
                  <Text style={styles.rejectButtonText}>Rechazar</Text>
                 </>
              )}
            </TouchableOpacity>
          </View>
        )}


        {canReview && (
           <TouchableOpacity 
             style={[styles.button, styles.reviewButton, actionLoading && styles.buttonDisabled]} 
             onPress={() => setIsRatingModalVisible(true)}
             disabled={actionLoading}
           >
             {actionLoading ? (
                 <ActivityIndicator color={theme.colors.primary} />
             ) : (
                 <>
                     <Star size={20} color={theme.colors.primary} />
                     <Text style={styles.reviewButtonText}>Dejar Reseña</Text>
                 </>
             )}
           </TouchableOpacity>
        )}

      </ScrollView>


      <RatingModal
          visible={isRatingModalVisible}
          onClose={() => setIsRatingModalVisible(false)}
          onSubmit={submitReview}
          // theme={theme} // Pasar theme si RatingModal lo requiere directamente (mejor si usa useTheme)
      />

      <Toast />
    </View>
  );
}

// Function to generate styles based on the theme
const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background, // Use theme color
  },
  header: {
    backgroundColor: theme.colors.surface, // Use theme color
    paddingHorizontal: theme.spacing.lg,
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 10 : 48,
    paddingBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border, // Use theme color
    ...theme.shadows.sm,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary, // Use theme color
    textAlign: 'center',
    flex: 1,
  },
  headerPlaceholder: {
      width: 24 + theme.spacing.sm * 2, // Match back button size + padding
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background, // Use theme color
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error, // Use theme error color
    textAlign: 'center',
    padding: theme.spacing.lg,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl, // Extra padding at bottom
  },
  section: {
    backgroundColor: theme.colors.surface, // Use theme color
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border, // Use theme color
    ...theme.shadows.xs,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary, // Use theme color
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border, // Use theme color
    paddingBottom: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
   infoRowFlexStart: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align top for multi-line text
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.text.secondary, // Use theme color
    // width: 80, // Consider removing fixed width or adjusting based on content
  },
  infoText: {
    ...theme.typography.body1,
    color: theme.colors.text.primary, // Use theme color
    flex: 1, // Allow text to wrap if needed
  },
  infoTextBold: {
    ...theme.typography.body1,
    color: theme.colors.text.primary,
    fontWeight: 'bold',
  },
  locationTextContainer: {
      flex: 1, // Take remaining space
  },
  viewProfileButton: {
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      alignSelf: 'flex-start', // Don't stretch full width
  },
  viewProfileButtonText: {
      ...theme.typography.button,
      color: theme.colors.primary, // Use theme color
      fontSize: 14,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    gap: theme.spacing.sm,
    flex: 1, // Make buttons share space
    ...theme.shadows.sm,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary, // Use theme color
  },
  rejectButton: {
    backgroundColor: theme.colors.surface, // Use theme color
    borderWidth: 1,
    borderColor: theme.colors.error, // Use theme error color
  },
  reviewButton: {
     backgroundColor: theme.colors.surface, // Use theme color
     borderWidth: 1,
     borderColor: theme.colors.primary,
     marginTop: theme.spacing.lg,
     flex: 0, // Don't make it flex 1
     alignSelf: 'center',
  },
  buttonText: {
    ...theme.typography.button,
    color: theme.colors.surface, // Use theme color (text on primary)
  },
  rejectButtonText: {
     ...theme.typography.button,
    color: theme.colors.error, // Use theme error color (text on surface for reject)
  },
  reviewButtonText: {
      ...theme.typography.button,
      color: theme.colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6, // Generic disabled style
  },
}); 