import React, { useEffect, useState, useContext, createContext } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet, SafeAreaView } from 'react-native';
import { supabase } from '../lib/supabase';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '../constants/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';

// --- INICIO: Lógica de Autenticación Integrada ---

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  // Devolver el contexto incluso si es null inicialmente
  // Esto es importante porque el valor inicial es null
  return context; 
}


function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Función para obtener detalles (rol y nombre) desde la tabla 'users'
  const fetchUserDetails = async (userId) => {
    if (!userId) return null;
    console.log('[AuthProvider] Fetching details FOR:', userId);
    try {
      const query = supabase
        .from('users')
        .select('role, full_name') // Asegúrate que estas columnas existen en tu tabla 'users'
        .eq('id', userId)
        .single();

      const { data, error, status } = await query;

      console.log('[AuthProvider] fetchUserDetails RAW Result:', { data, error, status });

      if (error && status !== 406) { // 406 ('Not Acceptable') es el código esperado si .single() no encuentra filas
        console.error("[AuthProvider] DB Query Error:", error.message);
        return null;
      }
      // Si no se encontró la fila (status 406) o data es explícitamente null/undefined
      if (status === 406 || !data) {
          console.warn(`[AuthProvider] No user row found or data is null for ID: ${userId} (Status: ${status})`);
          return null;
      }

      console.log("[AuthProvider] Details found & returned:", data);
      return data;

    } catch (e) {
      console.error("[AuthProvider] CATCH Error fetching details:", e);
      return null;
    }
  };

  useEffect(() => {
    console.log('[AuthProvider] Setting up auth listeners...');
    setLoading(true);

    // 1. Obtener sesión inicial al cargar
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log('[AuthProvider] Initial session obtained:', !!initialSession);
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      let details = null;
      if (initialSession?.user) {
        details = await fetchUserDetails(initialSession.user.id);
      }
      setUserDetails(details);
      setLoading(false);
      console.log('[AuthProvider] Initial setup complete. Details:', details);

    }).catch(error => {
       console.error("[AuthProvider] Error getting initial session:", error);
       setLoading(false);
    });

    // 2. Escuchar cambios futuros (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log(`[AuthProvider] Auth state changed: ${_event}`);
        setSession(newSession);
        setUser(newSession?.user ?? null);

        // Si el usuario inicia sesión, intenta buscar sus detalles (con el retraso)
        if (_event === 'SIGNED_IN' && newSession?.user) {
          setLoading(true);
          // Mantenemos el retraso por si acaso sigue siendo necesario
          await new Promise(resolve => setTimeout(resolve, 1000));
          console.log('[AuthProvider] Delay complete, fetching details after SIGNED_IN');
          const details = await fetchUserDetails(newSession.user.id);
          setUserDetails(details);
          setLoading(false);
        // Si el usuario cierra sesión, limpia los detalles
        } else if (_event === 'SIGNED_OUT') {
          setUserDetails(null);
          // Podrías añadir limpieza de AsyncStorage aquí si es relevante
        }
        // Podrías añadir manejo para USER_UPDATED si necesitas refrescar detalles
      }
    );

    // Limpieza al desmontar el provider
    return () => {
      if (authListener?.subscription) {
         authListener.subscription.unsubscribe();
         console.log('[AuthProvider] Unsubscribed from auth state changes.');
      }
    };
  }, []); // Ejecutar solo una vez al montar el AuthProvider

  // El valor proveído por el contexto
  // Inicialmente puede ser null, lo cual está bien, el consumidor (useAuth) debe manejarlo.
  const value = loading ? { loading: true, session: null, user: null, userDetails: null } : { 
    session,
    user,
    userDetails,
    loading, 
  };


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// --- FIN: Lógica de Autenticación Integrada ---


// Prevenir ocultamiento automático de splash screen
SplashScreen.preventAutoHideAsync();

// --- Layout Principal (Control de Rutas) ---
function RootLayoutNav() {
  // 1. Llamar a TODOS los hooks incondicionalmente
  const auth = useAuth();
  const { theme } = useTheme();
  const segments = useSegments();
  const router = useRouter();
  // Asegurarse que usePushNotifications (si lo volvemos a añadir) o cualquier otro hook esté aquí
  // usePushNotifications(); // Actualmente eliminado, pero si se usa, va aquí.

  // 2. Definir useEffect incondicionalmente
  useEffect(() => {
    if (!auth || auth.loading) {
      console.log("[Layout] useEffect - Aún cargando, saltando lógica.");
      return;
    }
    console.log("[Layout] useEffect - Ocultando splash screen");
    SplashScreen.hideAsync();

    const { session, userDetails } = auth;
    const isInAuthGroup = segments[0] === '(auth)';
    const publicRoutes = ['principal'];
    const isPublicRoute = publicRoutes.includes(segments[0]);
    // Obtener el segmento actual (p.ej., '(tabs)', '(employee)', 'principal', o '' para la raíz)
    const currentSegment = segments[0] || ''; 

    console.log(`[Layout] useEffect - Estado: Sesión=${!!session}, Rol=${userDetails?.role}, Detalles=${!!userDetails}, Segmento=${currentSegment}`);

    if (!session) {
      // Usuario no autenticado: Redirigir si no está en ruta pública/auth
      if (!isInAuthGroup && !isPublicRoute) {
        console.log("[Layout] useEffect - Sin sesión, redirigiendo a /principal...");
        router.replace('/principal');
      }
    } else {
      // Usuario autenticado
      if (userDetails) {
        const role = userDetails.role;
        let expectedSegment = ''; // Segmento esperado para el rol
        let redirectTarget = ''; // Ruta completa a la que redirigir

        // Determinar el segmento/ruta esperado basado en el rol
        if (role === 'cliente') {
          expectedSegment = '(tabs)';
          redirectTarget = '/(tabs)/';
        } else if (role === 'limpiador') {
          expectedSegment = '(employee)';
          redirectTarget = '/(employee)/';
        } else {
          // Rol desconocido o inválido, redirigir a principal
          console.warn('[Layout] useEffect - Rol desconocido:', role, 'Redirigiendo a principal.');
          router.replace('/principal');
          return; // Salir del efecto después de redirigir
        }

        // Lista de rutas de nivel superior permitidas para usuarios autenticados
        // (Añade aquí otras rutas si es necesario, como 'edit-profile', 'settings', etc.)
        const allowedRootLevelRoutes = [
          'booking-detail',
          'edit-profile',
          'settings',
          'location-form',
          'cleaner-profile',
          'accepted-services',
          'service-history',
          'request-service',
          'appearance'
          // Agrega más rutas aquí si las tienes directamente bajo /app y no dentro de (tabs) o (employee)
        ];


        // Comprobar si el usuario necesita ser redirigido
        const isOnAuthRoute = isInAuthGroup;
        const isOnPublicRoute = isPublicRoute;
        const isOnRoot = currentSegment === ''; // Está en la ruta raíz '/'
        const isInCorrectSegment = currentSegment === expectedSegment;
        const isInAllowedRootRoute = allowedRootLevelRoutes.includes(currentSegment); // Nueva comprobación


        // Redirigir SOLAMENTE si:
        // 1. El usuario está en una ruta de auth/pública/raíz Y NO está ya donde debería estar
        // 2. O si NO está en su segmento correcto Y TAMPOCO está en una ruta de nivel raíz permitida.
        if ( (isOnAuthRoute || isOnPublicRoute || isOnRoot) || (!isInCorrectSegment && !isInAllowedRootRoute) ) {
          // Solo redirigir si realmente estamos en el lugar equivocado (auth/public/root) O fuera de las rutas válidas (ni segmento esperado ni ruta raíz permitida)
          // Evitar redirigir si ya estamos en el segmento correcto o en una ruta permitida (incluso si no es el segmento principal)
          if ( (isOnAuthRoute || isOnPublicRoute || isOnRoot) || (!isInCorrectSegment && !isInAllowedRootRoute) ) {
            // Añadimos una comprobación extra: no redirigir si ya estamos en el destino correcto (aunque alguna condición anterior lo sugiera)
            // Redirigir SIEMPRE si estamos en auth/public/root
            if (isOnAuthRoute || isOnPublicRoute || isOnRoot) {
                 console.log(`[Layout] useEffect - En ruta de entrada/auth/public. Rol=${role}. Redirigiendo a ${redirectTarget}`);
                 router.replace(redirectTarget);
            // Redirigir si no estamos en el segmento correcto NI en una ruta permitida
            } else if (!isInCorrectSegment && !isInAllowedRootRoute) {
                console.log(`[Layout] useEffect - Redirección necesaria. Rol=${role}, Segmento Actual=${currentSegment}, Esperado=${expectedSegment} o ruta permitida. Redirigiendo a ${redirectTarget}`);
                router.replace(redirectTarget);
            } else {
                 // Estamos en el segmento correcto o en una ruta permitida, y NO estamos en auth/public/root
                 console.log(`[Layout] useEffect - Ya en segmento ${currentSegment} (correcto o permitido). No se redirige.`);
            }
          } else {
             console.log(`[Layout] useEffect - Condición de redirección no cumplida (ya en destino o permitido). No se redirige.`);
          }
        } else {
           console.log(`[Layout] useEffect - En segmento correcto (${currentSegment}) o ruta permitida (${currentSegment}) y no en ruta de entrada. No se redirige.`);
        }

      } else {
          // Sesión activa pero userDetails es null (y no cargando).
          // Esto podría ocurrir si fetchUserDetails falla.
          console.warn("[Layout] useEffect - Sesión activa pero userDetails es null (y no cargando).");
      }
    }
  }, [auth, segments, router]); // Dependencias correctas

  // 3. Retorno condicional DESPUÉS de todos los hooks
  if (!auth || auth.loading) {
    console.log("[Layout] Render - Estado de carga, mostrando ActivityIndicator...");
    const styles = StyleSheet.create({
        loadingContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme?.colors?.background || '#FFFFFF', 
        },
    });
    // Envolver en SafeAreaView para consistencia visual con el estado cargado
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme?.colors?.background || '#FFFFFF' }}>
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme?.colors?.primary || '#0000FF'} />
        </View>
      </SafeAreaView>
    );
  }

  // 4. Retorno principal si NO está cargando
  console.log("[Layout] Render - Estado cargado, mostrando Stack...");
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack screenOptions={{ headerShown: false }}>
         <Stack.Screen name="principal" />
         <Stack.Screen name="(auth)" />
         <Stack.Screen name="(tabs)" />
         <Stack.Screen name="(employee)" />
      </Stack>
    </SafeAreaView>
  );
}

function ThemedStatusBar() {
  const { isDarkMode } = useTheme();
  return <StatusBar style={isDarkMode ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedStatusBar />
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
      <Toast />
    </ThemeProvider>
  );
}