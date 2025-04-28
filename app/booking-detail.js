import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { theme } from './theme';
import Toast from 'react-native-toast-message';
import { ArrowLeft, Calendar, Clock, MapPin, User, FileText, CheckCircle, XCircle } from 'lucide-react-native';

export default function BookingDetailScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams(); // Obtener el ID de los parámetros de ruta
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false); // Para botones Aceptar/Rechazar

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
          scheduled_date,
          address,
          status,
          frequency,
          special_instructions,
          client:users!bookings_client_id_fkey ( full_name, phone_number ), 
          service:services ( name, base_price, duration_minutes )
        `)
        .eq('id', bookingId)
        .single(); // Esperamos solo un resultado

      if (error) {
          if (error.code === 'PGRST116') { // Código para "0 rows returned"
               Toast.show({ type: 'error', text1: 'No Encontrado', text2: 'La reserva solicitada no existe.' });
          } else if (error.message.includes("security policy")) {
                Toast.show({ type: 'error', text1: 'Acceso Denegado', text2: 'No tienes permiso para ver esta reserva.' });
          } else {
              throw error;
          }
           router.back(); // Volver si hay error
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
      router.back(); // Volver si hay error genérico
    } finally {
      setLoading(false);
    }
  }, [bookingId, router]);

  // --- Carga inicial --- 
  useEffect(() => {
    fetchBookingDetails();
  }, [fetchBookingDetails]);

  // --- Funciones para Aceptar / Rechazar ---
  const handleUpdateStatus = async (newStatus) => {
    setActionLoading(true);
    try {
      // Necesitamos el ID del limpiador actual para asignarlo si acepta
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo verificar tu sesión.' });
          setActionLoading(false);
          return;
      }
      const currentCleanerId = user.id;

      // Crear objeto de actualización
      let updateData = { status: newStatus };
      if (newStatus === 'confirmado') {
          // Si se acepta, asignar el cleaner_id del usuario actual
          updateData.cleaner_id = currentCleanerId; 
      }
      // Si se rechaza (newStatus = 'cancelado'), no cambiamos el cleaner_id (sigue null)

      // DEBUG LOGS
      console.log('[handleUpdateStatus] Intentando actualizar booking ID:', bookingId);
      console.log('[handleUpdateStatus] Datos de actualización:', JSON.stringify(updateData));
      console.log('[handleUpdateStatus] ID del limpiador actual:', currentCleanerId);

      const { error } = await supabase
        .from('bookings')
        .update(updateData) // <- Usar el objeto de actualización
        .eq('id', bookingId)
        // Opcional: Podríamos añadir una condición extra para evitar race conditions
        // asegurándonos que la reserva sigue pendiente y sin asignar antes de actualizarla.
        // .eq('status', 'pendiente') 
        // .is('cleaner_id', null) 
        ;

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
            text2: `Reserva ${newStatus === 'confirmado' ? 'aceptada y asignada' : 'rechazada'} correctamente.` // Mensaje ajustado
        });
        // Actualizar estado local para reflejar cambio inmediato (incluyendo cleaner_id si se aceptó)
        setBooking(prev => prev ? { ...prev, ...updateData } : null);
        // Deshabilitar botones ya que la acción se completó (showActionButtons se volverá false)
        // router.back(); // Podrías navegar atrás automáticamente si quieres
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

  // --- Alerta de confirmación ---
  const confirmAction = (actionType) => {
      const title = actionType === 'accept' ? 'Confirmar Servicio' : 'Rechazar Servicio';
      const message = actionType === 'accept' 
          ? '¿Estás seguro de que quieres aceptar este servicio?' 
          : '¿Estás seguro de que quieres rechazar este servicio?';
      const newStatus = actionType === 'accept' ? 'confirmado' : 'cancelado'; // O 'rechazado' si prefieres

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

  // --- Formateo de Fecha/Hora --- (similar a otras pantallas)
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

  // --- Renderizado --- 
  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  if (!booking) {
    // Mensaje de error ya mostrado por fetchBookingDetails, pantalla vacía o puedes poner otro mensaje.
    return <View style={styles.container}><Text style={styles.errorText}>No se pudo cargar la reserva.</Text></View>;
  }

  // Solo mostrar botones si el estado es 'pendiente'
  const showActionButtons = booking.status === 'pendiente';

  return (
    <View style={styles.outerContainer}>
       <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalles del Servicio</Text>
      </View>
      
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {/* Detalles del Servicio */}          
          <View style={styles.section}>
              <Text style={styles.sectionTitle}>Servicio Solicitado</Text>
              <Text style={styles.detailValue}>{booking.service?.name || 'N/A'}</Text>
              <Text style={styles.detailLabel}>Precio Base: ${booking.service?.base_price || 'N/A'}</Text>
              <Text style={styles.detailLabel}>Duración Estimada: {booking.service?.duration_minutes || 'N/A'} min</Text>
          </View>

          {/* Detalles del Cliente */}          
          <View style={styles.section}>
              <Text style={styles.sectionTitle}>Información del Cliente</Text>
              <View style={styles.detailRow}>
                <User size={18} color={theme.colors.text.secondary}/>
                <Text style={styles.detailValue}>{booking.client?.full_name || 'N/A'}</Text>
              </View>
              {/* Podrías añadir el teléfono si tienes permisos para verlo */}
              {/* <View style={styles.detailRow}>
                 <Phone size={18} color={theme.colors.text.secondary}/> 
                 <Text style={styles.detailValue}>{booking.client?.phone_number || 'N/A'}</Text>
              </View> */} 
          </View>

          {/* Fecha y Hora */}          
          <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fecha y Hora Programada</Text>
              <View style={styles.detailRow}>
                 <Calendar size={18} color={theme.colors.text.secondary}/>
                 <Text style={styles.detailValue}>{formatDateTime(booking.scheduled_date)}</Text>
              </View>
              <View style={styles.detailRow}>
                 <Clock size={18} color={theme.colors.text.secondary}/>
                 <Text style={styles.detailLabel}>Frecuencia: {formatFrequency(booking.frequency)}</Text>
              </View>
          </View>

          {/* Dirección */}          
          <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dirección</Text>
               <View style={styles.detailRow}>
                 <MapPin size={18} color={theme.colors.text.secondary}/>
                 <Text style={styles.detailValue}>{booking.address || 'No especificada'}</Text>
              </View>
          </View>

           {/* Instrucciones */}          
          {booking.special_instructions && (
             <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Instrucciones Especiales</Text>
                  <View style={styles.detailRow}>
                    <FileText size={18} color={theme.colors.text.secondary}/>
                    <Text style={styles.detailValue}>{booking.special_instructions}</Text>
                 </View>
              </View>
          )}
          
          {/* Estado Actual (Informativo) */} 
          <View style={styles.section}>
              <Text style={styles.sectionTitle}>Estado Actual</Text>
               <Text style={[styles.detailValue, styles.statusText(booking.status)]}>{booking.status.toUpperCase()}</Text>
          </View>

          {/* Botones de Acción */}          
          {showActionButtons && (
            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.rejectButton]} 
                    onPress={() => confirmAction('reject')}
                    disabled={actionLoading}
                >
                    {actionLoading ? <ActivityIndicator color={theme.colors.error} /> : <XCircle size={20} color={theme.colors.error} />} 
                    <Text style={[styles.actionButtonText, styles.rejectButtonText]}>Rechazar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.acceptButton]} 
                    onPress={() => confirmAction('accept')}
                    disabled={actionLoading}
                >
                    {actionLoading ? <ActivityIndicator color={theme.colors.surface} /> : <CheckCircle size={20} color={theme.colors.surface} />} 
                    <Text style={[styles.actionButtonText, styles.acceptButtonText]}>Aceptar</Text>
                </TouchableOpacity>
            </View>
          )}

      </ScrollView>
       <Toast />
    </View>
  );
}

// --- Estilos ---
const styles = StyleSheet.create({
  outerContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
     padding: theme.spacing.lg,
     paddingBottom: theme.spacing.xl * 3, // Más padding al final
  },
   centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
   },
   errorText: {
       ...theme.typography.body,
       color: theme.colors.error,
       textAlign: 'center',
       marginTop: 20,
   },
   header: { // Igual que en la pantalla de lista
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 10 : 48, 
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: { // Igual que en la pantalla de lista
    padding: theme.spacing.sm,
    marginRight: theme.spacing.md,
  },
  headerTitle: { // Igual que en la pantalla de lista
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md, // Más espacio
    marginBottom: theme.spacing.sm,
  },
  detailLabel: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
  },
  detailValue: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    flexShrink: 1,
  },
   statusText: (status) => ({
    fontWeight: 'bold',
    color: status === 'pendiente' ? theme.colors.warning :
           status === 'confirmado' ? theme.colors.success :
           status === 'cancelado' ? theme.colors.error :
           theme.colors.text.primary,
  }),
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  actionButton: {
    flex: 1, // Ocupar espacio disponible
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.md,
    gap: theme.spacing.sm,
  },
  acceptButton: {
    backgroundColor: theme.colors.primary,
  },
  rejectButton: {
    backgroundColor: theme.colors.surface, // Fondo claro para rechazar
    borderWidth: 1,
    borderColor: theme.colors.error, 
  },
  actionButtonText: {
    ...theme.typography.button,
    fontSize: 16, // Ligeramente más grande
  },
  acceptButtonText: {
    color: theme.colors.surface,
  },
  rejectButtonText: {
    color: theme.colors.error,
  },
}); 