import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, ScrollView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase'; // Asegúrate que la ruta sea correcta
import { useTheme } from '../../constants/ThemeContext'; // Import useTheme
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Trash2, BellRing, CheckCircle, AlertCircle } from 'lucide-react-native'; // Añadir iconos relevantes
import { useRouter } from 'expo-router'; // Importar useRouter

// --- Helper para formatear y traducir tipos de notificación ---
const formatNotification = (item, theme) => {
  let title = item.type; // Valor por defecto
  let Icon = BellRing; // Icono por defecto
  let iconColor = !item.is_read ? theme.colors.primary : theme.colors.text.secondary;
  const message = item.message || 'Detalles no disponibles.'; // Mensaje principal

  switch (item.type) {
    case 'booking_confirmed':
      title = 'Reserva Confirmada';
      Icon = CheckCircle;
      iconColor = theme.colors.success;
      break;
    case 'booking_cancelled':
      title = 'Reserva Cancelada';
      Icon = AlertCircle;
      iconColor = theme.colors.error;
      break;
    case 'new_booking_request':
      title = 'Nueva Solicitud de Reserva';
      // Icon = ... (otro icono si quieres)
      break;
    case 'rating_reminder':
        title = 'Califica tu último servicio';
        // Icon = ...
        break;
    // Añade más casos según los tipos que uses
    default:
      // Intentar formatear un poco el tipo por defecto
      title = item.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  return { title, message, Icon, defaultIconColor: iconColor };
};

export default function Notifications() {
  const router = useRouter(); // Inicializar router
  const { theme } = useTheme(); // Use theme hook
  const styles = getStyles(theme); // Get styles from theme
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);

  // Obtener ID del usuario
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      } else {
         // Redirigir si no está autenticado (opcional, depende de tu flujo)
         // router.replace('/auth'); 
         Toast.show({ type: 'error', text1: 'Error', text2: 'Usuario no autenticado.' });
      }
    };
    fetchUser();
  }, []);

  // Función para obtener notificaciones (incluyendo related_entity_id)
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;
    console.log('[Notifications] Fetching notifications for user:', userId); // Log para depuración
    setLoading(!refreshing);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, related_entity_id') // Asegurarse de seleccionar la nueva columna
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('[Notifications] Fetched data:', data); // Ver qué datos llegan
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      Toast.show({ type: 'error', text1: 'Error al cargar notificaciones', text2: error.message });
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, refreshing]);

  // Cargar notificaciones cuando el userId esté disponible
  useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId, fetchNotifications]); // Ejecutar cuando userId cambie o se refresque

  // Función para refrescar
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // fetchNotifications se llamará automáticamente por el useEffect que depende de refreshing
  }, []); // No necesita fetchNotifications aquí

  // Función para marcar como leída
  const markAsRead = async (notificationId) => {
    // Optimistic UI update: Marcar como leída localmente primero
    setNotifications(prev => prev.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
    ));

    try {
      const { error, count } = await supabase // Capturar también count
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('is_read', false); // Solo actualizar si no está ya leída

      // Verificar explícitamente el error O si no se actualizó nada
      if (error || count === 0) { 
        console.warn("Error marking notification as read OR no rows updated:", error, "Count:", count); // Usar warn para diferenciar
        // Revertir el cambio local si falla la actualización en la DB
        setNotifications(prev => prev.map(n => 
            n.id === notificationId ? { ...n, is_read: false } : n
        ));
        // Mostrar mensaje más específico si es posible
        const errorMessage = error ? error.message : 'No se pudo actualizar la notificación (posiblemente ya leída).'
        Toast.show({ type: 'warning', text1: 'Atención', text2: errorMessage }); // Usar warning
      } else {
          // Éxito: La suscripción en _layout.js debería actualizar el badge
          console.log('Notification successfully marked as read in DB:', notificationId, "Count:", count);
      }
    } catch (catchError) { // Renombrar error del catch para evitar confusión
      console.error("Generic catch error marking as read:", catchError);
       // Revertir el cambio local
       setNotifications(prev => prev.map(n => 
           n.id === notificationId ? { ...n, is_read: false } : n
       ));
       Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo marcar como leída.' });
    }
  };

  // Función al presionar una notificación
  const handleNotificationPress = (item) => {
    console.log("Notification pressed:", item);
    // 1. Marcar como leída (si no lo está ya)
    if (!item.is_read) {
      markAsRead(item.id);
    }

    // 2. Navegar si es relevante (ej. a detalles de reserva)
    // Ajustar según los tipos de notificaciones y las rutas de tu app
    if ((item.type === 'booking_confirmed' || item.type === 'booking_cancelled' || item.type === 'rating_reminder') && item.related_entity_id) {
      console.log(`Navigating to booking-detail with ID: ${item.related_entity_id}`);
      router.push({
        pathname: '/booking-detail', // Ruta a los detalles de la reserva
        params: { bookingId: item.related_entity_id },
      });
    } else if (item.type === 'new_booking_request') {
       // Quizás navegar a la lista de servicios pendientes si eres limpiador?
       // router.push('/pending-services'); // Ejemplo
       console.log('Navigation for new_booking_request not implemented yet.');
    } else {
      // Otros tipos o casos sin navegación específica
      console.log('No specific navigation action for this notification type or missing related ID.');
    }
  };

  // Función para eliminar notificación
  const handleDeleteNotification = async (notificationId) => {
    // Añadir confirmación
    Alert.alert(
      "Eliminar Notificación",
      "¿Estás seguro de que quieres eliminar esta notificación?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            // Optimistic UI update: Remove immediately from state
            const originalNotifications = [...notifications]; // Guardar estado original por si falla
            setNotifications((prevNotifications) =>
              prevNotifications.filter((notification) => notification.id !== notificationId)
            );
            
            try {
              const { error } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notificationId);
        
              if (error) {
                console.error("Error deleting notification:", error);
                throw error; // Lanzar para el catch
              }
        
              Toast.show({ type: 'success', text1: 'Notificación eliminada' });
        
            } catch (error) {
               // Revertir UI si falla
               setNotifications(originalNotifications); 
               Toast.show({
                type: 'error',
                text1: 'Error al eliminar',
                text2: error instanceof Error ? error.message : 'No se pudo eliminar la notificación.'
              });
            }
          } 
        }
      ]
    );
  };

  // Renderizado de la acción de deslizamiento (botón Eliminar)
  const renderRightActions = (item) => {
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteNotification(item.id)}
      >
        <Trash2 size={20} color={theme.colors.onError} />
        <Text style={styles.deleteButtonText}>Eliminar</Text>
      </TouchableOpacity>
    );
  };

  // Renderizado de cada item de notificación (ahora clickeable y con formato)
  const renderNotificationItem = ({ item }) => {
    const { title, message, Icon, defaultIconColor } = formatNotification(item, theme);
    const iconColor = !item.is_read ? theme.colors.primary : defaultIconColor;

    return (
      <Swipeable
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
      >
        <TouchableOpacity 
          style={[styles.notificationItem, !item.is_read && styles.unreadItem]} 
          activeOpacity={0.7} // Aumentar un poco la opacidad
          onPress={() => handleNotificationPress(item)} // Llamar a la nueva función
        >
          <View style={styles.notificationContent}>
             <View style={styles.iconContainer}>
                <Icon size={24} color={iconColor} />
             </View>
             <View style={styles.textContainer}>
                <Text style={[styles.notificationTitle, !item.is_read && styles.unreadText]}>{title}</Text>
                <Text style={styles.notificationMessage}>{message}</Text> 
                <Text style={styles.notificationDate}>
                  {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(item.created_at).toLocaleDateString()}
                </Text>
             </View>
             {!item.is_read && <View style={styles.unreadDot} />} 
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  // Renderizado principal
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.header}>
           <Text style={styles.title}>Notificaciones</Text>
        </View>
        {loading && !refreshing ? ( // Mostrar loader grande solo en carga inicial
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : notifications.length === 0 ? (
          <ScrollView 
             contentContainerStyle={styles.noItemsContainer}
             refreshControl={ // Permitir refrescar incluso si está vacío
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[theme.colors.primary]}
                  tintColor={theme.colors.primary}
                />
             }
           >
            <Text style={styles.noItemsText}>No tienes notificaciones nuevas.</Text>
          </ScrollView>
        ) : (
          <FlatList
            data={notifications}
            renderItem={renderNotificationItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.list}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          />
        )}
        <Toast />
      </View>
    </GestureHandlerRootView>
  );
}

// --- Estilos (Ajustes y adiciones) ---
const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 10 : 48, // Ajuste para notch/status bar
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
   noItemsContainer: {
     flexGrow: 1, // Para que ocupe espacio y el RefreshControl funcione
     justifyContent: 'center',
     alignItems: 'center',
     padding: theme.spacing.xl,
   },
  noItemsText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  notificationItem: {
    backgroundColor: theme.colors.surface,
    // paddingVertical: theme.spacing.lg, // Controlado por notificationContent
    // paddingHorizontal: theme.spacing.xl,
  },
  unreadItem: {
    // Ya no se necesita fondo distinto, usamos otros indicadores
  },
  notificationContent: {
      flexDirection: 'row',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      alignItems: 'center', // Centrar verticalmente icono y texto
  },
  iconContainer: {
      marginRight: theme.spacing.lg,
      // backgroundColor: theme.colors.border, // Opcional: fondo para icono
      // padding: theme.spacing.sm,
      // borderRadius: 20,
  },
  textContainer: {
      flex: 1, // Ocupar espacio restante
  },
  notificationTitle: {
    ...theme.typography.bodyStrong, // Un poco más fuerte
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  unreadText: {
     fontWeight: 'bold', // Hacer título no leído más bold
     color: theme.colors.primary, // O un color que destaque
  },
  notificationMessage: {
    ...theme.typography.body,
    color: theme.colors.text.secondary, // Mensaje principal un poco más suave
    marginBottom: theme.spacing.sm,
  },
  notificationDate: {
    ...theme.typography.caption,
    color: theme.colors.text.tertiary, // Fecha más tenue
  },
  unreadDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.primary,
      marginLeft: theme.spacing.md, // Espacio a la derecha
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: theme.spacing.lg + 24 + theme.spacing.lg, // Alinear con inicio del texto (aprox)
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 90, // Ancho del botón de eliminar
    flexDirection: 'column', // Icono arriba, texto abajo
    paddingVertical: theme.spacing.sm, // Espacio vertical
    gap: theme.spacing.xs,
  },
  deleteButtonText: {
    color: theme.colors.onError,
    ...theme.typography.caption, // Texto más pequeño
    fontWeight: 'bold',
  },
  // Otros estilos que puedas tener...
});
