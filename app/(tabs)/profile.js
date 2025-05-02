import { View, Text, StyleSheet, TouchableOpacity, Animated, RefreshControl, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Settings, Clock, LogOut, ChevronRight } from 'lucide-react-native';
import { useEffect, useRef, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../constants/ThemeContext';
import Toast from 'react-native-toast-message';

export default function Profile() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [userData, setUserData] = useState({
    name: 'Usuario',
    email: 'cargando...',
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
    }
  }, [fadeAnim]);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoadingLogout(false);
    else setRefreshing(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
          console.warn('No authenticated user found during fetch.');
          Toast.show({ type: 'error', text1: 'Error', text2: 'No se encontró usuario autenticado.' });
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
        const newUserData = {
          name: userDataDB.full_name || 'Nombre no encontrado',
          email: userDataDB.email || 'Email no encontrado',
          avatar_url: userDataDB.avatar_url,
        };
        setUserData(newUserData);
        await AsyncStorage.setItem('full_name', newUserData.name);
        await AsyncStorage.setItem('email', newUserData.email);
        await AsyncStorage.setItem('avatar_url', newUserData.avatar_url || '');
      } else {
          console.warn('User data not found in DB for authenticated user:', authUser.id);
          Toast.show({ type: 'warning', text1: 'Advertencia', text2: 'No se encontró el perfil completo en la base de datos.' });
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
  }, [loadInitialData, fetchData]);

  useEffect(() => {
    const handleUserUpdate = async (payload) => {
      console.log('Realtime user update received:', payload);
      const { data: { session } } = await supabase.auth.getSession();
      if (payload.new.id === session?.user?.id) {
        console.log('Updating local state for current user');
        const updatedData = {
          name: payload.new.full_name || 'Usuario',
          email: payload.new.email || 'email@example.com',
          avatar_url: payload.new.avatar_url,
        };
        setUserData(updatedData);
        await AsyncStorage.setItem('full_name', updatedData.name);
        await AsyncStorage.setItem('email', updatedData.email);
        await AsyncStorage.setItem('avatar_url', updatedData.avatar_url || '');
      }
    };

    const usersSubscription = supabase
      .channel('public:users')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users' },
        handleUserUpdate
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('Realtime channel subscribed for users table (Profile Screen)');
        } else {
          console.error('Realtime subscription failed (Profile Screen):', status, err);
        }
      });

    return () => {
      console.log('Unsubscribing from Realtime users channel (Profile Screen due to unmount)');
      supabase.removeChannel(usersSubscription);
    };
  }, []);

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
        contentContainerStyle={styles.scrollContent}
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
           <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-profile')} activeOpacity={0.7}>
             <View style={styles.menuItemContent}>
                <User size={20} color={theme.colors.primary} />
                <Text style={styles.menuText}>Editar Perfil</Text>
             </View>
             <ChevronRight size={20} color={theme.colors.text.secondary} />
           </TouchableOpacity>

           <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/service-history')} activeOpacity={0.7}>
             <View style={styles.menuItemContent}>
                 <Clock size={20} color={theme.colors.primary} />
                 <Text style={styles.menuText}>Historial de Servicios</Text>
             </View>
             <ChevronRight size={20} color={theme.colors.text.secondary} />
           </TouchableOpacity>

           <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/settings')} activeOpacity={0.7}>
             <View style={styles.menuItemContent}>
                 <Settings size={20} color={theme.colors.primary} />
                 <Text style={styles.menuText}>Ajustes</Text>
             </View>
             <ChevronRight size={20} color={theme.colors.text.secondary} />
           </TouchableOpacity>
        </View>

      </ScrollView>
       <View style={styles.logoutContainer}>
          <TouchableOpacity 
             style={[styles.logoutButton, loadingLogout && styles.buttonDisabled]} 
             onPress={handleLogout} 
             disabled={loadingLogout}
             activeOpacity={0.7}
          >
             <LogOut size={20} color={theme.colors.error} />
             <Text style={styles.logoutText}>Cerrar Sesión</Text>
             {loadingLogout && <ActivityIndicator color={theme.colors.error} style={styles.logoutLoader}/>} 
          </TouchableOpacity>
        </View>
         <Toast />
    </Animated.View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
     flexGrow: 1,
     paddingBottom: theme.spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    paddingBottom: theme.spacing.xl * 1.5,
    backgroundColor: theme.colors.primary,
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.md,
  },
  avatarContainer: {
      marginBottom: theme.spacing.md,
      width: 120,
      height: 120,
      borderRadius: 60,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: theme.colors.surface,
      backgroundColor: theme.colors.primaryVariant,
      ...theme.shadows.sm,
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
    color: theme.colors.surface,
    marginTop: theme.spacing.sm,
  },
  profileEmail: {
    ...theme.typography.body1,
    color: theme.colors.surface + 'B3',
  },
  menu: {
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
  },
  menuText: {
    ...theme.typography.body1,
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  logoutContainer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  logoutText: {
    ...theme.typography.button,
    color: theme.colors.error,
    fontSize: 16,
  },
  logoutLoader: {
      marginLeft: theme.spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  }
});
