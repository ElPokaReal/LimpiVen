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
  Platform
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Plus, MapPin, Edit, Trash2 } from 'lucide-react-native';
import { supabase } from '../../lib/supabase'; 
import { theme } from '../theme'; 
import Toast from 'react-native-toast-message';

export default function LocationsScreen() {
  const router = useRouter();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);

  // Función para cargar las ubicaciones del usuario
  const fetchLocations = async (currentUserId) => {
    if (!currentUserId) return; // Salir si no hay ID de usuario

    console.log("Fetching locations for user:", currentUserId);
    try {
      const { data, error } = await supabase
        .from('user_locations')
        .select('*')
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false }); // Mostrar las más nuevas primero

      if (error) throw error;
      
      console.log("Locations fetched:", data);
      setLocations(data || []);

    } catch (error) {
      console.error("Error fetching locations:", error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar las ubicaciones.' });
      setLocations([]); // Limpiar en caso de error
    } 
  };

  // Carga inicial y obtención del ID de usuario
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
           await fetchLocations(user.id); // Cargar ubicaciones después de obtener ID
       } catch(e) {
           console.error("Error getting user ID:", e);
            Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo identificar al usuario.' });
       } finally {
           setLoading(false);
       }
    };
    getUserIdAndFetch();
   }, []); // Ejecutar solo una vez al montar

   // Recargar datos cuando la pantalla obtiene el foco (después de añadir/editar)
   useFocusEffect(
     useCallback(() => {
       if (userId) { // Solo recargar si ya tenemos el userId
         console.log("Locations screen focused, fetching locations...");
         setLoading(true); // Mostrar indicador mientras recarga
         fetchLocations(userId).finally(() => setLoading(false));
       }
       // Podrías retornar una función de limpieza si es necesario, aunque aquí no parece vital
     }, [userId]) // Dependencia del userId para asegurar que se ejecute una vez que lo tengamos
   );

  // Función para manejar el pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchLocations(userId);
    setRefreshing(false);
  }, [userId]);

  // Navegar al formulario para añadir
  const handleAddLocation = () => {
    router.push('/location-form'); // Navega al formulario vacío
  };

  // Navegar al formulario para editar, pasando el ID
  const handleEditLocation = (locationId) => {
    router.push({ pathname: '/location-form', params: { locationId: locationId } });
  };

  // Manejar la eliminación de una ubicación
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
            try {
              const { error } = await supabase
                .from('user_locations')
                .delete()
                .eq('id', locationId)
                .eq('user_id', userId); // Seguridad extra

              if (error) throw error;

              Toast.show({ type: 'success', text1: 'Éxito', text2: 'Ubicación eliminada.' });
              // Actualizar la lista localmente para respuesta inmediata
              setLocations(currentLocations => currentLocations.filter(loc => loc.id !== locationId));
              
            } catch (error) {
              console.error("Error deleting location:", error);
               Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo eliminar la ubicación.' });
            }
          } 
        }
      ]
    );
  };

  // Componente para renderizar cada item de la lista
  const renderLocationItem = ({ item }) => (
    <View style={styles.locationCard}>
      <View style={styles.locationInfo}>
        <MapPin size={20} color={theme.colors.primary} style={styles.locationIcon}/>
        <View>
          <Text style={styles.locationNickname}>{item.nickname || `Ubicación #${item.id.substring(0, 4)}`}</Text>
          <Text style={styles.locationAddress}>{`${item.address_line1}${item.address_line2 ? ', ' + item.address_line2 : ''}`}</Text>
        </View>
      </View>
      <View style={styles.locationActions}>
        <TouchableOpacity onPress={() => handleEditLocation(item.id)} style={styles.actionButton}>
          <Edit size={20} color={theme.colors.secondary} />
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

      {loading && !locations.length ? (
        <View style={styles.centered}>
           <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : locations.length === 0 ? (
         <View style={styles.centered}>
             <Text style={styles.emptyText}>No tienes ubicaciones guardadas.</Text>
             <Text style={styles.emptySubText}>Pulsa el botón '+' para añadir una.</Text>
         </View>
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

// --- Estilos ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
   header: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 10 : 48, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Alinear título y botón
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  addButton: {
    padding: theme.spacing.sm,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
     ...theme.typography.h3,
     color: theme.colors.text.secondary,
     textAlign: 'center',
     marginBottom: theme.spacing.sm,
  },
   emptySubText: {
     ...theme.typography.body,
     color: theme.colors.text.light,
     textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: theme.spacing.md,
  },
  locationCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1, // Ocupar espacio disponible
    marginRight: theme.spacing.md, // Espacio antes de los botones
  },
  locationIcon: {
     marginRight: theme.spacing.md,
  },
  locationNickname: {
     ...theme.typography.h4,
     color: theme.colors.text.primary,
     marginBottom: theme.spacing.xs,
  },
  locationAddress: {
     ...theme.typography.caption,
     color: theme.colors.text.secondary,
  },
  locationActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionButton: {
    padding: theme.spacing.xs,
  },
});
