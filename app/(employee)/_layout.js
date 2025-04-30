import { Tabs, useRouter, useFocusEffect } from 'expo-router';
import { Home, Briefcase, User } from 'lucide-react-native';
import { theme } from '../theme'; // Asegúrate que la ruta a theme es correcta
import { BackHandler, ToastAndroid } from 'react-native'; // Añadir BackHandler, ToastAndroid
import { useCallback } from 'react'; // Añadir useCallback

// Variable para rastrear el último tiempo de presionar atrás
let backPressedTimeEmployee = 0; // Usar variable diferente para evitar conflictos si ambos layouts están montados

export default function EmployeeTabLayout() {
  const router = useRouter(); // Obtener router

  // Manejo del Botón Atrás en Android para Empleado
  useFocusEffect(
    useCallback(() => {
      const onBackPressEmployee = () => {
        const currentTime = Date.now();
        const timeDiff = currentTime - backPressedTimeEmployee;

        if (timeDiff < 2000) { 
          BackHandler.exitApp();
          return true; 
        } else {
          backPressedTimeEmployee = currentTime;
          ToastAndroid.show('Presiona de nuevo para salir', ToastAndroid.SHORT);
          return true; 
        }
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPressEmployee);

      return () => subscription.remove();
    }, []) 
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text.light,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 5, 
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false, // Opcional: Ocultar header por defecto si cada pantalla tiene el suyo
      }}>
      <Tabs.Screen
        name="index" // o 'dashboard' si prefieres ese nombre de archivo
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          listeners: {
            tabPress: (e) => {
              // Prevenir acción por defecto si ya estamos en esta tab
            },
          },
        }}
      />
      <Tabs.Screen
        name="services"
        options={{
          title: 'Servicios',
          tabBarIcon: ({ color, size }) => <Briefcase size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
} 