import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase'; // Para guardar el token
import { useAuth } from '../app/_layout'; // Para obtener el userId

// Configura cómo se manejan las notificaciones mientras la app está en primer plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Mostrar alerta
    shouldPlaySound: true, // Reproducir sonido
    shouldSetBadge: true, // Actualizar el badge (contador en el icono)
  }),
});

// Función auxiliar para manejar errores de registro
function handleRegistrationError(errorMessage) {
  // Podrías usar un sistema de logging más robusto aquí
  console.error("Push Notification Error:", errorMessage);
  // alert(errorMessage); // Considera si quieres mostrar alerts al usuario por errores internos
  // throw new Error(errorMessage); // Evita lanzar errores que puedan crashear la app si no es crítico
}

// Función principal para registrar el dispositivo y obtener el token
async function registerForPushNotificationsAsync(userId) {
  // 1. Verificar si es un dispositivo físico
  if (!Device.isDevice) {
    handleRegistrationError('Must use physical device for push notifications');
    return null; // No continuar si no es un dispositivo físico
  }

  // 2. Configurar canal de notificación para Android (Opcional pero recomendado)
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX, // Importancia alta para que aparezcan
        vibrationPattern: [0, 250, 250, 250], // Patrón de vibración
        lightColor: '#FF231F7C', // Color de la luz LED (si el dispositivo la tiene)
      });
    } catch (e) {
      handleRegistrationError(`Failed to set notification channel: ${e}`);
      // Continuar aunque falle el canal, puede que funcione igual
    }
  }

  // 3. Solicitar permisos de notificación
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    console.log('Requesting push notification permissions...');
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    } catch (e) {
        handleRegistrationError(`Failed to request permissions: ${e}`);
        return null; // No continuar si falla la solicitud de permisos
    }
  }

  // 4. Salir si no se concedieron los permisos
  if (finalStatus !== 'granted') {
    handleRegistrationError('Permission not granted for push notifications!');
    return null;
  }

  // 5. Obtener el Project ID de Expo
  // Asegúrate de que tu projectId esté configurado en app.json o app.config.js bajo extra.eas.projectId
  // https://docs.expo.dev/build-reference/variables/#built-in-environment-variables
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    handleRegistrationError(
      'Project ID not found. Make sure `extra.eas.projectId` is set in your app config.'
    );
    return null;
  }
  console.log('Project ID for Push Notifications:', projectId);


  // 6. Obtener el ExpoPushToken
  let pushTokenString = null;
  try {
    console.log('Getting ExpoPushToken...');
    const pushToken = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    pushTokenString = pushToken.data;
    console.log('ExpoPushToken received:', pushTokenString);
  } catch (e) {
    handleRegistrationError(`Failed to get Expo push token: ${e}`);
    return null; // No continuar si no se puede obtener el token
  }

  // 7. Guardar el token en la base de datos
  if (pushTokenString && userId) {
      console.log(`Attempting to save token ${pushTokenString} for user ${userId}`);
      try {
        const { error } = await supabase
          .from('users') // Asegúrate que 'users' es tu tabla correcta
          .update({ expo_push_token: pushTokenString }) // Asegúrate que 'expo_push_token' es tu columna correcta
          .eq('id', userId);

        if (error) {
          handleRegistrationError(`Failed to save push token to DB: ${error.message}`);
        } else {
          console.log(`Push token ${pushTokenString} saved successfully for user ${userId}`);
        }
      } catch (e) {
         handleRegistrationError(`Error saving push token to DB: ${e}`);
      }
  } else if (!userId) {
      handleRegistrationError('Cannot save push token without a userId.');
  }


  return pushTokenString; // Devolver el token por si es útil
}

// Hook personalizado
export function usePushNotifications() {
  const { user } = useAuth(); // Obtener el usuario autenticado
  const [expoPushToken, setExpoPushToken] = useState(null);
  const [notification, setNotification] = useState(null);

  const notificationListener = useRef(null);
  const responseListener = useRef(null);

  useEffect(() => {
    let isMounted = true; // Flag para evitar actualizaciones en componente desmontado

    // Solo intentar registrar si tenemos un usuario logueado
    if (user?.id) {
        console.log(`User ${user.id} logged in. Attempting to register for push notifications...`);
        registerForPushNotificationsAsync(user.id).then(token => {
            if (isMounted && token) {
                setExpoPushToken(token);
            }
        }).catch(error => {
             // El error ya se maneja dentro de registerForPushNotificationsAsync
             console.error("Error during push notification registration process:", error);
        });
    } else {
        console.log("No user logged in, skipping push notification registration.");
        // Quizás quieras limpiar el token si el usuario cierra sesión?
        // Podríamos añadir lógica aquí o en el AuthProvider para limpiar el token de la DB al hacer logout.
    }


    // Listener para cuando se recibe una notificación mientras la app está abierta
    notificationListener.current = Notifications.addNotificationReceivedListener(newNotification => {
        if (isMounted) {
            console.log('Notification received:', newNotification);
            setNotification(newNotification);
            // Aquí puedes actualizar el estado de tu app basado en la notificación
        }
    });

    // Listener para cuando el usuario interactúa (toca) la notificación
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response received:', response);
        const notificationData = response.notification.request.content.data;
        console.log('Data associated with the notification:', notificationData);
        // Aquí puedes realizar acciones basadas en la respuesta, como navegar a una pantalla específica
        // Ejemplo: if (notificationData?.screen) { router.push(notificationData.screen); }
    });

    // Función de limpieza al desmontar el componente o cambiar las dependencias
    return () => {
        isMounted = false;
        if (notificationListener.current) {
            Notifications.removeNotificationSubscription(notificationListener.current);
            notificationListener.current = null;
        }
        if (responseListener.current) {
            Notifications.removeNotificationSubscription(responseListener.current);
            responseListener.current = null;
        }
        console.log("Push notification listeners removed.");
    };
  }, [user]); // El efecto se re-ejecuta si el objeto 'user' cambia (login/logout)

  return {
    expoPushToken,
    notification,
    // Podrías exponer aquí funciones para interactuar con notificaciones si fuera necesario
  };
} 