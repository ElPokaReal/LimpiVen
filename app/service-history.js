import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../constants/ThemeContext'; // Import useTheme
import { supabase } from '../lib/supabase'; // Asegúrate que la ruta sea correcta
import { Filter, CheckCircle, Clock, XCircle, ChevronLeft } from 'lucide-react-native'; // Iconos para filtros y ChevronLeft
import Toast from 'react-native-toast-message'; // Para mostrar errores
import { useRouter } from 'expo-router'; // Añadir useRouter

// Estados: 'all', 'completado', 'en_progreso', 'cancelado' - coinciden con DB
const STATUS_COMPLETED = 'completado';
const STATUS_IN_PROGRESS = 'en_progreso';
const STATUS_CANCELED = 'cancelado';

export default function ServiceHistoryScreen() {
  const router = useRouter(); // Obtener router
  const { theme } = useTheme(); // Use theme hook
  const styles = getStyles(theme); // Get styles from theme
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'inProgress', 'canceled'
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchServiceHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado.');

      // Consulta la tabla bookings y une con services para obtener el nombre
      // Filtra por client_id (cambiar a cleaner_id si es para empleados)
      const { data, error: dbError } = await supabase
        .from('bookings') 
        .select(`
          id,
          scheduled_date,
          status,
          services ( name ) 
        `)
        .eq('client_id', user.id) // Filtra por el cliente actual
        .order('scheduled_date', { ascending: false }); // Ordena por fecha programada

      if (dbError) throw dbError;

      // Mapea los datos
      const formattedServices = data.map(booking => ({
          id: booking.id,
          // Accede al nombre del servicio desde la tabla unida
          name: booking.services?.name || 'Servicio Desconocido', 
          // Usa scheduled_date y formatea
          date: new Date(booking.scheduled_date).toLocaleDateString(), 
          // El status viene directo de bookings
          status: booking.status 
      }));

      setServices(formattedServices);

    } catch (err) {
      console.error("Error fetching booking history:", err);
      setError(err.message || 'Error al cargar el historial.');
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'No se pudo cargar el historial.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServiceHistory();
    // TODO: Considerar añadir un listener de Supabase para actualizaciones en tiempo real si es necesario
  }, [fetchServiceHistory]);

  const filteredServices = services.filter(service => {
    if (filter === 'all') return true;
    // Compara con los status de la DB
    return service.status === filter; 
  });

  // Función para obtener el texto legible del status
  const getStatusText = (status) => {
      switch (status) {
          case STATUS_COMPLETED: return 'Completado';
          case STATUS_IN_PROGRESS: return 'En Progreso';
          case STATUS_CANCELED: return 'Cancelado';
          case 'pendiente': return 'Pendiente';
          case 'confirmado': return 'Confirmado';
          default: return status;
      }
  };

  const renderServiceItem = ({ item }) => (
    <View style={styles.serviceItem}>
      <View style={styles.serviceInfo}>
        <Text style={styles.serviceName}>{item.name}</Text>
        <Text style={styles.serviceDate}>{item.date}</Text>
      </View>
      <View style={styles.serviceStatus}>
        {item.status === STATUS_COMPLETED && <CheckCircle size={20} style={styles.iconCompleted} />}
        {item.status === STATUS_IN_PROGRESS && <Clock size={20} style={styles.iconInProgress} />}
        {item.status === STATUS_CANCELED && <XCircle size={20} style={styles.iconCanceled} />}
        <Text style={[
          styles.statusText,
          item.status === STATUS_COMPLETED && styles.completedText,
          item.status === STATUS_IN_PROGRESS && styles.inProgressText,
          item.status === STATUS_CANCELED && styles.canceledText,
        ]}>
          {getStatusText(item.status)}
        </Text>
      </View>
    </View>
  );

  if (loading) {
      return (
          <View style={[styles.container, styles.centerContent]}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Cargando historial...</Text>
          </View>
      )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ChevronLeft size={28} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Historial de Servicios</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.filterContainer}
        >
          <TouchableOpacity
            style={[styles.filterButton, filter === 'all' && styles.activeFilter]}
            onPress={() => setFilter('all')}
          >
            <Filter size={16} color={filter === 'all' ? theme.colors.primary : theme.colors.text.secondary} />
            <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === STATUS_COMPLETED && styles.activeFilter]}
            onPress={() => setFilter(STATUS_COMPLETED)}
          >
            <CheckCircle size={16} color={filter === STATUS_COMPLETED ? theme.colors.primary : theme.colors.text.secondary} />
            <Text style={[styles.filterText, filter === STATUS_COMPLETED && styles.activeFilterText]}>Completados</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === STATUS_IN_PROGRESS && styles.activeFilter]}
            onPress={() => setFilter(STATUS_IN_PROGRESS)}
          >
             <Clock size={16} color={filter === STATUS_IN_PROGRESS ? theme.colors.primary : theme.colors.text.secondary} />
            <Text style={[styles.filterText, filter === STATUS_IN_PROGRESS && styles.activeFilterText]}>En Progreso</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filter === STATUS_CANCELED && styles.activeFilter]}
            onPress={() => setFilter(STATUS_CANCELED)}
          >
            <XCircle size={16} color={filter === STATUS_CANCELED ? theme.colors.primary : theme.colors.text.secondary} />
            <Text style={[styles.filterText, filter === STATUS_CANCELED && styles.activeFilterText]}>Cancelados</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <FlatList
        data={filteredServices}
        renderItem={renderServiceItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.centerContent}> 
            <Text style={styles.emptyText}>
                {services.length === 0 ? 'No tienes servicios en tu historial.' : 'No hay servicios para mostrar con este filtro.'}
            </Text>
         </View>
        }
      />
       <Toast />
    </View>
  );
}

// Function to generate styles based on the theme
const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row', // Alinear botón y título
    alignItems: 'center', // Centrar verticalmente
    justifyContent: 'space-between', // Espacio entre elementos
    padding: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg, // Ajustar padding horizontal
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 10 : 48,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
     // padding: theme.spacing.sm, // Añadir padding si se necesita más área táctil
     marginRight: theme.spacing.md, // Espacio entre botón y título
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
    textAlign: 'center', // Centrar texto
    flex: 1, // Permitir que el título ocupe espacio y se centre
  },
  headerPlaceholder: {
      width: 28 + theme.spacing.md, // Mismo ancho que el botón + margen para centrar bien
  },
  filterWrapper: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm, // Ajustado para mejor espaciado
    borderRadius: theme.borderRadius.lg, // Más redondeado
    gap: theme.spacing.xs,
  },
   activeFilter: {
    backgroundColor: theme.colors.primary + '20', // Fondo ligero del color primario
   },
  filterText: {
    ...theme.typography.caption, // Un poco más pequeño
    color: theme.colors.text.secondary,
    fontSize: 13, // Tamaño explícito
  },
  activeFilterText: {
     color: theme.colors.primary,
     fontWeight: 'bold',
  },
  listContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    flexGrow: 1, // Para que ListEmptyComponent pueda centrarse
  },
  serviceItem: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceInfo: {
    flex: 1, // Ocupa espacio disponible
    marginRight: theme.spacing.md, // Espacio antes del estado
  },
  serviceName: {
    ...theme.typography.body1,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  serviceDate: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginTop: theme.spacing.xs,
  },
  serviceStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    minWidth: 100, // Ancho mínimo para alinear
    justifyContent: 'flex-end', // Alinear a la derecha dentro de su contenedor
  },
  statusText: {
     ...theme.typography.caption,
     fontWeight: 'bold',
  },
   completedText: {
     color: theme.colors.success,
   },
   inProgressText: {
     color: theme.colors.warning,
   },
   canceledText: {
     color: theme.colors.error,
   },
  centerContent: { // Estilo para centrar contenido (loading, empty)
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.lg,
  },
  loadingText: { 
      marginTop: theme.spacing.md,
      ...theme.typography.body,
      color: theme.colors.text.secondary,
  },
  emptyText: {
    textAlign: 'center',
    ...theme.typography.body1,
    color: theme.colors.text.secondary,
  },
  iconCompleted: {
    color: theme.colors.success,
  },
  iconInProgress: {
    color: theme.colors.warning,
  },
  iconCanceled: {
    color: theme.colors.error,
  },
}); 