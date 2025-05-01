import { View, Text, StyleSheet, TouchableOpacity, Animated, RefreshControl, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Settings, Clock, LogOut } from 'lucide-react-native';
import { useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { theme } from '../theme';
import Toast from 'react-native-toast-message';

export default function Profile() {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [userData, setUserData] = useState({
    name: '' || "Usuario",
    email: '' || "email@example.com",
    avatar_url: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);

  const loadInitialData = useCallback(async () => {
    try {
      const name = await AsyncStorage.getItem('full_name');
      const email = await AsyncStorage.getItem('email');
      const avatar_url = await AsyncStorage.getItem('avatar_url');
      setUserData(prev => ({ 
          ...prev,
          name: name || prev.name, 
          email: email || prev.email,
          avatar_url: avatar_url || prev.avatar_url 
      }));
      Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
      }).start();
    } catch (error) {
        console.error("Error loading initial data from AsyncStorage:", error);
    } finally {
        // Podríamos iniciar un refresh aquí si queremos datos frescos siempre
        // await fetchData();
    }
  }, [fadeAnim]);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoadingLogout(false);
    else setRefreshing(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
          console.warn('No authenticated user found during fetch.');
          // Podríamos intentar limpiar AsyncStorage aquí o redirigir
          // await AsyncStorage.clear();
          // router.replace('/(auth)/login');
          return;
      }

      const { data: userDataDB, error } = await supabase
        .from('users')
        .select('full_name, email, avatar_url')
        .eq('id', authUser.id)
        .single();

      if (error) throw error;

      if (userDataDB) {
        console.log("Fetched user data from DB:", userDataDB);
        setUserData({
          name: userDataDB.full_name,
          email: userDataDB.email,
          avatar_url: userDataDB.avatar_url,
        });
        await AsyncStorage.setItem('full_name', userDataDB.full_name || '');
        await AsyncStorage.setItem('email', userDataDB.email || '');
        await AsyncStorage.setItem('avatar_url', userDataDB.avatar_url || '');
      } else {
          console.warn('User data not found in DB for authenticated user:', authUser.id);
          // Quizás crear perfil si no existe?
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      Toast.show({type: 'error', text1: 'Error', text2: 'No se pudieron obtener los datos del perfil.'});
    } finally {
      if (isRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
    fetchData();

    const handleUserUpdate = async (payload) => {
        console.log('Realtime user update received:', payload);
        const { data: { session } } = await supabase.auth.getSession();
        if (payload.new.id === session?.user?.id) {
            console.log('Updating local state for current user');
            setUserData({
                name: payload.new.full_name,
                email: payload.new.email,
                avatar_url: payload.new.avatar_url,
            });
            await AsyncStorage.setItem('full_name', payload.new.full_name || '');
            await AsyncStorage.setItem('email', payload.new.email || '');
            await AsyncStorage.setItem('avatar_url', payload.new.avatar_url || '');
        }
    };

    const subscription = supabase
      .channel('public:users')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'users' 
        }, 
        handleUserUpdate
      )
      .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
              console.log('Realtime channel subscribed for users table');
          } else {
              console.error('Realtime subscription failed:', status, err);
          }
      });

    return () => {
        console.log('Unsubscribing from Realtime channel');
        supabase.removeChannel(subscription);
    };
  }, [loadInitialData, fetchData]);

  const onRefresh = useCallback(() => {
      fetchData(true);
  }, [fetchData]);

  const handleLogout = async () => {
    setLoadingLogout(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cerrar sesión.' });
      } else {
        console.log("User signed out successfully.");
        await AsyncStorage.removeItem('full_name');
        await AsyncStorage.removeItem('email');
        await AsyncStorage.removeItem('avatar_url');
      }
    } catch (e) {
        console.error("Unexpected error during sign out:", e);
        Toast.show({ type: 'error', text1: 'Error', text2: 'Ocurrió un error inesperado.' });
    } finally {
      setLoadingLogout(false);
    }
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {userData.avatar_url ? (
              <Image source={{ uri: userData.avatar_url }} style={styles.avatar} resizeMode="cover" />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={60} color={theme.colors.surface} />
              </View>
            )}
          </View>
          <Text style={styles.profileName}>{userData.name}</Text>
          <Text style={styles.profileEmail}>{userData.email}</Text>
        </View>

        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-profile')}>
            <User size={20} color={theme.colors.primary} />
            <Text style={styles.menuText}>Editar Perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(tabs)/history')}>
            <Clock size={20} color={theme.colors.primary} />
            <Text style={styles.menuText}>Historial de Servicios</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings')}>
            <Settings size={20} color={theme.colors.primary} />
            <Text style={styles.menuText}>Ajustes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <View style={styles.logoutContainer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} disabled={loadingLogout}>
             <LogOut size={20} color={theme.colors.error} />
             <Text style={styles.logoutText}>Cerrar Sesión</Text>
             {loadingLogout && <ActivityIndicator color={theme.colors.error} style={{marginLeft: 10}}/>} 
          </TouchableOpacity>
        </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl * 1.5,
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.md,
  },
  avatarContainer: {
      marginBottom: theme.spacing.lg,
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: theme.colors.primaryVariant,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: theme.colors.surface,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
  },
  avatar: {
      width: '100%',
      height: '100%',
      borderRadius: 60,
  },
  avatarPlaceholder: {
      width: '100%',
      height: '100%',
      borderRadius: 60,
      backgroundColor: theme.colors.primaryVariant,
      justifyContent: 'center',
      alignItems: 'center',
  },
  profileName: {
    ...theme.typography.h1,
    color: theme.colors.onPrimary,
    marginBottom: theme.spacing.xs,
  },
  profileEmail: {
    ...theme.typography.body,
    color: theme.colors.onPrimaryMuted,
  },
  menu: {
    marginTop: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.xs,
  },
  menuText: {
    marginLeft: theme.spacing.lg,
    ...theme.typography.button,
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  logoutContainer: {
    padding: theme.spacing.lg,
    marginTop: 'auto',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.error,
    ...theme.shadows.sm,
  },
  logoutText: {
    marginLeft: theme.spacing.sm,
    ...theme.typography.button,
    color: theme.colors.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
