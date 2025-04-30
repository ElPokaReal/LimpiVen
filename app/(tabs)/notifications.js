import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, ScrollView, Platform } from 'react-native';
import { supabase } from '../../lib/supabase'; // Asegúrate que la ruta sea correcta
import { theme } from '../theme'; // Asegúrate que la ruta sea correcta
import Toast from 'react-native-toast-message';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Trash2 } from 'lucide-react-native'; // Icono para eliminar
import { useRouter } from 'expo-router'; // Importar useRouter

export default function Notifications() {
  const router = useRouter(); // Inicializar router
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
    setLoading(!refreshing);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, related_entity_id') // Asegurarse de seleccionar la nueva columna
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
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
        console.error("Error marking notification as read OR no rows updated:", error, "Count:", count);
        // Revertir el cambio local si falla la actualización en la DB
        setNotifications(prev => prev.map(n => 
            n.id === notificationId ? { ...n, is_read: false } : n
        ));
        // Mostrar mensaje más específico si es posible
        const errorMessage = error ? error.message : 'No se pudo actualizar la notificación (posiblemente ya leída o RLS).'
        Toast.show({ type: 'error', text1: 'Error', text2: errorMessage });
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
    if (item.type === 'booking_confirmed' && item.related_entity_id) {
      router.push({
        pathname: '/booking-detail', // Asegúrate que esta ruta exista y reciba bookingId
        params: { bookingId: item.related_entity_id },
      });
    } else {
      // Podrías manejar otros tipos de notificaciones aquí
      // o simplemente no hacer nada si no hay acción asociada
      console.log('No specific navigation action for this notification type.');
    }
  };

  // Función para eliminar notificación
  const handleDeleteNotification = async (notificationId) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error("Error deleting notification:", error);
        throw error;
      }

      // Optimistic UI update: Remove immediately
      setNotifications((prevNotifications) =>
        prevNotifications.filter((notification) => notification.id !== notificationId)
      );
      Toast.show({ type: 'success', text1: 'Notificación eliminada' });

    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error al eliminar',
        text2: error instanceof Error ? error.message : 'No se pudo eliminar la notificación.'
      });
      // Podrías revertir la UI si la eliminación falla, pero es más complejo
    }
  };

  // Renderizado de la acción de deslizamiento (botón Eliminar)
  const renderRightActions = (progress, dragX, item) => {
    const trans = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [0, 80], // Ajusta cuánto se revela el botón
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteNotification(item.id)}
      >
        <Trash2 size={24} color={theme.colors.onError} />
        <Text style={styles.deleteButtonText}>Eliminar</Text>
      </TouchableOpacity>
    );
  };

  // Renderizado de cada item de notificación (ahora clickeable)
  const renderNotificationItem = ({ item }) => (
    <Swipeable
      renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
      overshootRight={false}
    >
      <TouchableOpacity 
        style={[styles.notificationItem, !item.is_read && styles.unreadItem]} 
        activeOpacity={0.6} // Feedback visual al tocar
        onPress={() => handleNotificationPress(item)} // Llamar a la nueva función
      >
        <Text style={styles.notificationType}>{item.type.replace('_', ' ').toUpperCase()}</Text>
        <Text style={styles.notificationMessage}>{item.message}</Text>
        <Text style={styles.notificationDate}>
          {new Date(item.created_at).toLocaleDateString()} {new Date(item.created_at).toLocaleTimeString()}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );

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

// --- Estilos (Adaptados de otros componentes y mejorados) ---
const styles = StyleSheet.create({
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
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
  },
  unreadItem: {
    backgroundColor: '#f0f8ff', // Un color de fondo ligeramente diferente para no leídas
  },
  notificationType: {
    ...theme.typography.caption,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginBottom: theme.spacing.xs,
  },
  notificationMessage: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
  },
  notificationDate: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.border,
    // marginLeft: theme.spacing.xl, // Opcional: indentar el separador
  },
  deleteButton: {
    backgroundColor: theme.colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    width: 100, // Ancho del botón de eliminar
    flexDirection: 'row', // Para poner icono y texto juntos
    gap: theme.spacing.xs,
  },
  deleteButtonText: {
    color: theme.colors.onError,
    ...theme.typography.button,
    fontWeight: 'bold',
  },
});
