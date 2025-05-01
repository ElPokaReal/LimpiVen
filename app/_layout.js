import React, { useState, useEffect, createContext, useContext } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from './theme';
import { supabase } from '../lib/supabase';
import { usePushNotifications } from '../hooks/usePushNotifications';
import * as SplashScreen from 'expo-splash-screen';

// Prevenir ocultamiento automático de splash screen
SplashScreen.preventAutoHideAsync();

// --- Contexto de Autenticación ---
const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

// --- Proveedor de Autenticación ---
function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true); // Inicia cargando

  // Función para obtener el rol desde la tabla 'users'
  const fetchUserRole = async (userId) => {
    if (!userId) return null;
    console.log('[AuthProvider] Buscando rol para usuario:', userId);
    try {
      const { data, error, status } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single(); // Espera una sola fila

      // Si hay error Y no es porque no se encontró fila (status 406)
      if (error && status !== 406) {
        console.error("[AuthProvider] Error al buscar rol:", error.message);
        return null;
      }
      const fetchedRole = data?.role || null;
      console.log("[AuthProvider] Rol encontrado:", fetchedRole);
      return fetchedRole;
    } catch (e) {
      console.error("[AuthProvider] Error (catch) al buscar rol:", e);
      return null;
    }
  };

  useEffect(() => {
    console.log('[AuthProvider] Iniciando configuración de autenticación...');
    setLoading(true);

    // 1. Obtener sesión inicial y rol
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      console.log('[AuthProvider] Sesión inicial obtenida:', !!initialSession);
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      let initialRole = null;
      if (initialSession?.user) {
        initialRole = await fetchUserRole(initialSession.user.id);
      }
      setRole(initialRole);
      setLoading(false); // Termina la carga inicial aquí
      console.log('[AuthProvider] Configuración inicial completa. Rol:', initialRole);

    }).catch(error => {
       console.error("[AuthProvider] Error al obtener sesión inicial:", error);
       setLoading(false); // Asegurar que la carga termine incluso si hay error
    });


    // 2. Escuchar cambios futuros (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        console.log(`[AuthProvider] Cambio de estado Auth: ${_event}`);
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (_event === 'SIGNED_IN' && newSession?.user) {
          // Al iniciar sesión, buscar rol (puede mostrar loader brevemente)
          setLoading(true);
          const userRole = await fetchUserRole(newSession.user.id);
          setRole(userRole);
          setLoading(false);
        } else if (_event === 'SIGNED_OUT') {
          // Al cerrar sesión, limpiar rol
          setRole(null);
          // setLoading(false); // Ya debería ser false
        }
        // INITIAL_SESSION es manejado arriba, otros eventos pueden necesitar lógica
      }
    );

    // Limpieza al desmontar
    return () => {
      authListener?.subscription.unsubscribe();
      console.log('[AuthProvider] Desuscrito de cambios de autenticación.');
    };
  }, []); // Ejecutar solo una vez al montar

  return (
    <AuthContext.Provider value={{ session, user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- Layout Principal (Control de Rutas) ---
function RootLayoutNav() {
  const { session, loading, role } = useAuth();
  const segments = useSegments(); // Da la ruta actual como array, ej: ['(tabs)', 'home']
  const router = useRouter();
  usePushNotifications(); // Hook de notificaciones

  useEffect(() => {
    // 1. Esperar a que termine la carga del AuthProvider
    if (loading) {
      console.log("[Layout] Esperando estado de autenticación...");
      return;
    }

    // Ocultar splash screen cuando ya no estamos cargando
    SplashScreen.hideAsync();

    const isInAuthGroup = segments[0] === '(auth)';
    // Define tus rutas públicas aquí (pantallas accesibles sin login)
    const publicRoutes = ['principal'];
    const isPublicRoute = publicRoutes.includes(segments[0]);

    console.log(`[Layout] Estado: Cargando=${loading}, Sesión=${!!session}, Rol=${role}, Ruta=${segments.join('/')}`);

    // --- Lógica de Redirección ---

    // 2. Si NO hay sesión activa:
    if (!session) {
      // Si intenta acceder a ruta protegida (no está en auth y no es pública)
      if (!isInAuthGroup && !isPublicRoute) {
        console.log("[Layout] Sin sesión, accediendo a ruta protegida. Redirigiendo a login...");
        router.replace('/(auth)/auth');
      } else {
        // Está en pantalla de login o pública, no hacer nada.
        console.log("[Layout] Sin sesión, en ruta pública o de autenticación. Permitiendo acceso.");
      }
    }
    // 3. Si SÍ hay sesión activa:
    else {
      if (!role) {
          // Esto indica un problema al obtener el rol después del login.
          console.warn("[Layout] ¡Hay sesión pero no se pudo obtener el rol! Verificar fetchUserRole.");
          // Por ahora, no haremos nada para evitar bucles, pero es un estado anómalo.
      }
      // 3.2. Si hay sesión Y rol:
      else {
        const isAtRoot = segments.length === 0;
        // Redirigir si estamos en (auth), principal, O en la ruta raíz (/)
        if (isInAuthGroup || isPublicRoute || isAtRoot) {
            console.log(`[Layout] Sesión y rol (${role}) OK. Necesita redirección desde ${isAtRoot ? '/' : segments.join('/')}. Redirigiendo a grupo de rol...`);
            if (role === 'limpiador') {
                router.replace('/(employee)/');
            } else if (role === 'cliente') {
                router.replace('/(tabs)/');
            } else {
                // Fallback si el rol es desconocido
                console.warn('[Layout] Rol desconocido al redirigir:', role, 'Redirigiendo a principal.');
                router.replace('/principal');
            }
        } else {
            // Si ya estamos fuera de auth/principal/root, permitir navegación normal.
            console.log(`[Layout] Sesión y rol (${role}) OK. Ya estamos en ruta válida (${segments.join('/')}). Permitiendo navegación.`);
        }
      }
    }

  }, [session, loading, role, segments]); // Ejecutar cuando cambien estos valores

  // Mientras carga, mostrar indicador
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Cuando termina la carga, mostrar las rutas
  return (
      <Stack screenOptions={{ headerShown: false }}>
         <Stack.Screen name="principal" />
         {/* <Stack.Screen name="(auth)" /> */}
         {/* <Stack.Screen name="(tabs)" /> */}
         {/* <Stack.Screen name="(employee)" /> */}
         {/* Asegúrate que tus archivos/carpetas coincidan */}
      </Stack>
  );
}

// --- Componente Raíz ---
export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
      {/* <Toast /> // Considera dónde mostrar los Toasts */}
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});