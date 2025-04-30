import React, { useState, useEffect, createContext, useContext } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { theme } from './theme';
import { Toast } from 'react-native-toast-message/lib/src/Toast';
import { supabase } from '../lib/supabase'; // Asegúrate que la ruta es correcta
import { usePushNotifications } from '../hooks/usePushNotifications';

// 1. Crear el Contexto de Autenticación
const AuthContext = createContext(null);

// Hook para usar el contexto fácilmente
export function useAuth() {
  return useContext(AuthContext);
}

// 2. Crear el Proveedor de Autenticación
function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); 
  const [loading, setLoading] = useState(true);

  // Función para obtener el rol desde la tabla 'users'
  const fetchUserRole = async (userId) => {
    if (!userId) return null;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching user role from DB:", error);
        return null;
      }
      console.log("Role fetched from DB:", data?.role);
      return data?.role || null;
    } catch (e) {
      console.error("Catch Error fetching user role from DB:", e);
      return null;
    }
  };

  useEffect(() => {
    setLoading(true);
    // 1. Obtener la sesión inicial
    const fetchInitialSession = async () => {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error("Error getting initial session:", sessionError);
            setSession(null);
            setUser(null);
            setRole(null);
            setLoading(false);
            return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // 2. Si hay sesión, obtener el rol de la DB
        if (currentSession?.user) {
            const userRole = await fetchUserRole(currentSession.user.id);
            setRole(userRole);
        } else {
            setRole(null); // No hay sesión, no hay rol
        }
        setLoading(false);
    };

    fetchInitialSession();

    // 3. Escuchar cambios de autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log("Auth state changed event:", _event);
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // 4. Si el estado cambia (login/logout), obtener/limpiar rol
        if (_event === 'SIGNED_IN' && newSession?.user) {
          setLoading(true); // Mostrar carga mientras se obtiene el rol post-login
          const userRole = await fetchUserRole(newSession.user.id);
          setRole(userRole);
          setLoading(false);
        } else if (_event === 'SIGNED_OUT') {
          setRole(null); // Limpiar rol al cerrar sesión
        }
        // Nota: Podríamos necesitar manejar otros eventos como USER_UPDATED si el rol cambia mientras está logueado
      }
    );

    // Limpieza
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// 3. Layout principal que usa el contexto para redirigir
function Layout() {
  const { session, loading, role } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  usePushNotifications();

  useEffect(() => {
    // 1. Esperar a que la carga inicial del AuthProvider termine.
    //    'loading' cubre tanto la obtención de la sesión como la del rol inicial.
    if (loading) {
      console.log("Layout Effect: Still loading auth state...");
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    console.log(`Layout Effect: loading=${loading}, session=${!!session}, role=${role}, inAuthGroup=${inAuthGroup}, segments=${segments.join('/')}`);

    // 2. Si NO hay sesión:
    if (!session) {
      // Si no estamos en el grupo auth ni en la pantalla pública principal, redirigir a principal.
      if (!inAuthGroup && segments[0] !== 'principal') {
        console.log("Layout Effect: No session, redirecting to /principal");
        router.replace('/principal');
      } else {
        // Estamos en auth o en principal sin sesión, lo cual está bien.
        console.log("Layout Effect: No session, staying in auth group or on principal screen.");
      }
      return; // No hay más que hacer sin sesión
    }

    // 3. Si HAY sesión:
    //    Aquí, loading es false y session existe. Necesitamos el rol para decidir.
    if (session) {
      // 3.1. Si AÚN no tenemos rol (está cargando o hubo un error al obtenerlo)
      if (!role) {
        // AuthProvider está trabajando en obtener el rol (o falló).
        // No redirigir aún. El loader global (si 'loading' fuera true) o la pantalla actual
        // se mostrará hasta que 'role' se actualice y este efecto se re-ejecute.
        // Si esto persiste, indica un problema en fetchUserRole.
        console.log("Layout Effect: Session exists, but role is still pending/null. Waiting...");
        // Considera mostrar un indicador específico si el loader global ya no está activo.
        return;
      }

      // 3.2. Si tenemos sesión Y rol:
      if (role) {
        // Si estamos DENTRO del grupo Auth -> Redirigir afuera según el rol.
        if (inAuthGroup) {
          console.log(`Layout Effect: Session & role (${role}) exist, inside auth group. Redirecting out...`);
          if (role === 'limpiador') {
            router.replace('/(employee)/'); // Asumiendo ruta base para limpiador
          } else if (role === 'cliente') {
            router.replace('/(tabs)/'); // Asumiendo ruta base para cliente
          } else {
            console.warn('Layout Effect: Unknown user role, redirecting to root:', role);
            router.replace('/'); // Fallback a una ruta segura/pública si el rol es desconocido
          }
        }
        // Si estamos FUERA del grupo Auth -> Ya estamos en la sección correcta (o deberíamos estar).
        // Aquí podrías añadir lógica para forzar estar en el grupo correcto si es necesario.
        // Ejemplo: if (role === 'limpiador' && segments[0] !== '(employee)') router.replace('/(employee)/');
        else {
           console.log(`Layout Effect: Session & role (${role}) exist, outside auth group. Staying.`);
           // Opcional: Verificar si estamos en el grupo correcto para el rol
           if (role === 'limpiador' && segments[0] !== '(employee)') {
              console.warn(`Layout Effect: Role (${role}) mismatch with group (${segments[0]}). Redirecting to / (employee)/`);
              router.replace('/(employee)/');
           } else if (role === 'cliente' && segments[0] !== '(tabs)') {
               // Podríamos ser más específicos, quizás permitir 'index' o rutas específicas como 'request-service', etc.
               // Esta condición podría ser demasiado estricta si hay rutas fuera de (tabs) que un cliente puede visitar.
               // Por ahora, la comentamos para evitar redirecciones inesperadas.
               // console.warn(`Layout Effect: Role (${role}) mismatch with group (${segments[0]}). Redirecting to / (tabs)/`);
               // router.replace('/(tabs)/');
           }
        }
      }
    }

  }, [session, loading, role, segments, router]); // Mismas dependencias

  // Mostrar indicador de carga global
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Renderizar Stack principal
  return (
      <Stack
        screenOptions={{
          headerShown: false, // Ocultar headers por defecto aquí, manejar en layouts internos si es necesario
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
          animation: 'slide_from_right',
        }}
      >
        {/* Declaración de las pantallas y grupos */}
         <Stack.Screen name="principal" options={{ headerShown: false }} /> {/* Pantalla pública */}
         <Stack.Screen name="(auth)" options={{ headerShown: false }} />
         <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
         <Stack.Screen name="(employee)" options={{ headerShown: false }} />
         <Stack.Screen name="index" options={{ headerShown: false }} /> {/* Punto de entrada, será redirigido */}
         {/* Añade otras pantallas de nivel superior si las tienes (ej. modal, etc) */}
      </Stack>
  );
}


// 4. Componente RootLayout que envuelve todo con el Provider
export default function RootLayout() {
  return (
    <AuthProvider>
      <Layout />
      {/* <Toast /> */}
    </AuthProvider>
  );
}