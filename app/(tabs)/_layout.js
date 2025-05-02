import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, BackHandler, ToastAndroid } from 'react-native';
import { Tabs, useFocusEffect, useRouter } from 'expo-router';
import { useTheme } from '../../constants/ThemeContext';
import { Home, Calendar, MapPin, Bell, User } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';

// Variable para rastrear el último tiempo de presionar atrás
let backPressedTime = 0;

// Componente para el punto rojo (badge)
const NotificationBadge = () => (
  <View style={styles.badgeContainer}>
    <View style={styles.badge} />
  </View>
);

export default function TabLayout() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [userId, setUserId] = useState(null);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const router = useRouter();

  // 1. Obtener ID del usuario
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
    // Podrías añadir un listener de auth para actualizar si el usuario cambia
  }, []);

  // 2. Verificar notificaciones no leídas (y usar suscripción para tiempo real)
  useEffect(() => {
    if (!userId) return; // Salir si no hay usuario

    const checkUnread = async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('', { count: 'exact', head: true }) // Solo contar, no traer datos
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('checkUnread Error:', error.message);
        setHasUnreadNotifications(false);
      } else {
        console.log('checkUnread Count:', count); // Log del conteo
        setHasUnreadNotifications(count > 0);
      }
    };

    checkUnread(); // Verificar al inicio

    // Suscribirse a cambios en la tabla de notificaciones
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          console.log('>>> Realtime Payload Received:', payload); // Log del payload completo
          // Volver a verificar el conteo cuando algo cambie
          checkUnread(); 
        }
      )
      .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.log('Realtime SUBSCRIBED to notifications');
          } 
          if (status === 'CHANNEL_ERROR') {
            console.error('Realtime CHANNEL_ERROR:', err);
          }
           if (status === 'TIMED_OUT') {
            console.warn('Realtime TIMED_OUT');
          }
           if (status === 'CLOSED') {
            console.log('Realtime CLOSED');
          }
      });

    // Limpiar la suscripción al desmontar el componente
    return () => {
      console.log('Realtime UNSUBSCRIBING from notifications'); // Log al desmontar
      supabase.removeChannel(channel);
    };

  }, [userId]); // Volver a ejecutar si cambia el userId

  // Manejo del Botón Atrás en Android
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Solo aplicar lógica si estamos en el layout principal (tabs)
        // Y no en una pantalla anidada dentro de una tab
        // (Podríamos necesitar lógica más compleja si hay Stacks dentro de Tabs)
        // Por ahora, asumimos que si estamos aquí, estamos en nivel superior de tabs.

        const currentTime = Date.now();
        const timeDiff = currentTime - backPressedTime;

        if (timeDiff < 2000) { // Si se presionó hace menos de 2 segundos
          BackHandler.exitApp(); // Salir de la app
          return true; // Evento manejado
        } else {
          backPressedTime = currentTime;
          ToastAndroid.show('Presiona de nuevo para salir', ToastAndroid.SHORT);
          return true; // Evento manejado (evita que se cierre la app)
        }
      };

      // Añadir listener cuando la pantalla gana foco
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      // Eliminar listener cuando la pantalla pierde foco
      return () => subscription.remove();
    }, []) // Sin dependencias, ya que no usa estado externo aquí
  );

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 8,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          ...theme.typography.caption,
          fontWeight: '500',
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text.secondary,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          listeners: {
            tabPress: (e) => {
              // Prevenir acción por defecto si ya estamos en esta tab
              // Esto a veces ayuda con el historial de navegación
            },
          },
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Reservas',
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="locations"
        options={{
          title: 'Ubicaciones',
          tabBarIcon: ({ color, size }) => <MapPin color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notificaciones',
          tabBarIcon: ({ color, size }) => (
            <View> 
              <Bell color={color} size={size} />
              {hasUnreadNotifications && <NotificationBadge />} 
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

// Estilos para el badge - Convertido a función que recibe theme
const getStyles = (theme) => StyleSheet.create({
  badgeContainer: {
    position: 'absolute',
    right: -6, // Ajusta posición horizontal
    top: -3, // Ajusta posición vertical
    backgroundColor: theme.colors.error, // Color rojo para el badge
    borderRadius: 6, // Hacerlo circular
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
     // Puedes quitar esta View interna si no necesitas texto dentro del badge
     // Por ahora, solo es el contenedor con color
  },
});