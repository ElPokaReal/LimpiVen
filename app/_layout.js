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
  const auth = useAuth();
  const { theme } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  // Manejar el caso donde auth es null o loading es true
  if (!auth || auth.loading) {
      const styles = StyleSheet.create({
          loadingContainer: {
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: theme?.colors?.background || '#FFFFFF', // Usar el theme obtenido arriba
          },
      });
      return (
          <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme?.colors?.primary || '#0000FF'} />
          </View>
      );
  }

  // Ahora sabemos que auth no es null y loading es false
  const { session, userDetails } = auth;

  useEffect(() => {
    // Ocultar splash screen sólo cuando ya no estamos cargando
    SplashScreen.hideAsync();

    const isInAuthGroup = segments[0] === '(auth)';
    const publicRoutes = ['principal'];
    const isPublicRoute = publicRoutes.includes(segments[0]);
    const role = userDetails?.role;

    console.log(`[Layout] Estado: Sesión=${!!session}, Rol=${role}, Detalles=${!!userDetails}, Ruta=${segments.join('/')}`);

    if (!session) {
      if (!isInAuthGroup && !isPublicRoute) {
        console.log("[Layout] Sin sesión, redirigiendo a /principal...");
        router.replace('/principal');
      }
    } else {
      // La verificación de userDetails null durante sesión activa ya se maneja
      // dentro del AuthProvider (aunque podrías mantener una doble verificación si prefieres)
      if (userDetails) {
        const isAtRoot = segments.length === 0 || segments[0] === '';
        if (isInAuthGroup || isPublicRoute || isAtRoot) {
            console.log(`[Layout] Sesión y detalles OK. Rol=${role}. Redirigiendo...`);
            if (role === 'limpiador') {
                router.replace('/(employee)/');
            } else if (role === 'cliente') {
                router.replace('/(tabs)/');
            } else {
                console.warn('[Layout] Rol desconocido o inválido al redirigir:', role, 'Redirigiendo a principal.');
                router.replace('/principal');
            }
        }
      } else {
         // Si hay sesión pero no userDetails (y no estamos cargando),
         // podría ser el estado intermedio post-login antes de que fetchUserDetails termine.
         // El AuthProvider debería manejar esto internamente.
         // Podríamos mostrar un indicador de carga específico aquí o simplemente esperar.
         console.log("[Layout] Sesión activa, esperando detalles del usuario...");
      }
    }

  }, [session, userDetails, segments, router]); // Quitar loading de las dependencias aquí si lo manejamos arriba

  // El return de carga ya se hizo al inicio de RootLayoutNav
  // if (loading) { ... } // Ya no es necesario aquí

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack screenOptions={{ headerShown: false }}>
         <Stack.Screen name="principal" options={{ title: 'Inicio' }}/>
         <Stack.Screen name="(auth)" options={{ title: 'Autenticación' }}/>
         <Stack.Screen name="(tabs)" options={{ title: 'Cliente' }}/>
         <Stack.Screen name="(employee)" options={{ title: 'Empleado' }}/>
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