import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl,
  Alert,
  Platform,
  ScrollView
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, MapPin, Edit, Trash2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase'; 
import { useTheme } from '../../constants/ThemeContext';
import Toast from 'react-native-toast-message';

export default function LocationsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);

  const fetchLocations = async (currentUserId) => {
    if (!currentUserId) return;
    console.log("Fetching locations for user:", currentUserId);
    try {
      const { data, error } = await supabase
        .from('user_locations')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log("Locations fetched:", data);
      setLocations(data || []);

    } catch (error) {
      console.error("Error fetching locations:", error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar las ubicaciones.' });
      setLocations([]);
    } 
  };

  useEffect(() => {
    const getUserIdAndFetch = async () => {
       setLoading(true);
       try {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
           if (userError || !user) {
             Toast.show({ type: 'error', text1: 'Error', text2: 'Usuario no autenticado.' });
             router.replace('/(auth)/auth'); 
             return;
           }
           setUserId(user.id);
           await fetchLocations(user.id);
       } catch(e) {
           console.error("Error getting user ID:", e);
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo identificar al usuario.' });
       } finally {
           setLoading(false);
       }
    };
    getUserIdAndFetch();
   }, [router]);

   useFocusEffect(
     useCallback(() => {
       if (userId) {
         console.log("Locations screen focused, fetching locations...");
         fetchLocations(userId);
       }
     }, [userId])
   );

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await fetchLocations(userId);
    setRefreshing(false);
  }, [userId]);

  const handleAddLocation = () => {
    router.push('/location-form');
  };

  const handleEditLocation = (locationId) => {
    router.push({ pathname: '/location-form', params: { locationId: locationId } });
  };

  const handleDeleteLocation = (locationId, nickname) => {
    Alert.alert(
      "Confirmar Eliminación",
      `¿Estás seguro de que quieres eliminar la ubicación "${nickname || 'esta ubicación'}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar", 
          style: "destructive", 
          onPress: async () => {
            const originalLocations = [...locations];
            setLocations(currentLocations => currentLocations.filter(loc => loc.id !== locationId));
            try {
              const { error } = await supabase
                .from('user_locations')
                .delete()
                .eq('id', locationId)
                .eq('user_id', userId);

              if (error) throw error;
              Toast.show({ type: 'success', text1: 'Éxito', text2: 'Ubicación eliminada.' });
            } catch (error) {
              console.error("Error deleting location:", error);
               setLocations(originalLocations);
               Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo eliminar la ubicación.' });
            }
          } 
        }
      ]
    );
  };

  const renderLocationItem = ({ item }) => (
    <View style={styles.locationCard}>
      <View style={styles.locationInfo}>
        <MapPin size={20} color={theme.colors.primary} style={styles.locationIcon}/>
        <View style={styles.locationTextContainer}>
          <Text style={styles.locationNickname}>{item.nickname || `Ubicación #${item.id.substring(0, 4)}`}</Text>
          <Text style={styles.locationAddress} numberOfLines={1} ellipsizeMode="tail">{`${item.address_line1}${item.address_line2 ? ', ' + item.address_line2 : ''}`}</Text>
        </View>
      </View>
      <View style={styles.locationActions}>
        <TouchableOpacity onPress={() => handleEditLocation(item.id)} style={styles.actionButton}>
          <Edit size={20} color={theme.colors.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDeleteLocation(item.id, item.nickname)} style={styles.actionButton}>
          <Trash2 size={20} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
       <View style={styles.header}>
          <Text style={styles.headerTitle}>Mis Ubicaciones</Text>
           <TouchableOpacity onPress={handleAddLocation} style={styles.addButton}>
            <Plus size={24} color={theme.colors.primary} />
          </TouchableOpacity>
       </View>

      {loading && locations.length === 0 ? (
        <View style={styles.centered}>
           <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : !loading && locations.length === 0 ? (
         <ScrollView 
              contentContainerStyle={styles.centered}
              refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} tintColor={theme.colors.primary}/>
              }
         >
             <Text style={styles.emptyText}>No tienes ubicaciones guardadas.</Text>
             <Text style={styles.emptySubText}>Pulsa el botón '+' para añadir una.</Text>
         </ScrollView>
      ) : (
        <FlatList
          data={locations}
          renderItem={renderLocationItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
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
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
   header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 10 : 48, 
    paddingBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    fontSize: 22,
  },
  addButton: {
    padding: theme.spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  emptyText: {
     ...theme.typography.h3,
     color: theme.colors.text.secondary,
     textAlign: 'center',
     marginBottom: theme.spacing.sm,
  },
   emptySubText: {
     ...theme.typography.body,
     color: theme.colors.text.secondary,
     textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: theme.spacing.md,
     flexGrow: 1,
  },
  locationCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.shadows.xs,
     borderWidth: 1,
     borderColor: theme.colors.border,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.md,
  },
  locationIcon: {
    marginRight: theme.spacing.md,
  },
  locationTextContainer: {
      flex: 1,
  },
  locationNickname: {
    ...theme.typography.h4,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xxs,
  },
  locationAddress: {
    ...theme.typography.body2,
    color: theme.colors.text.secondary,
  },
  locationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  actionButton: {
    padding: theme.spacing.xs,
  },
});
