import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Platform, 
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Calendar, Clock, MapPin, FileText, ChevronDown } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase'; // Asegúrate que la ruta sea correcta
import { theme } from './theme'; // Asegúrate que la ruta sea correcta
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker'; 

export default function RequestServiceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [userId, setUserId] = useState(null); // <- Volvemos a usar userId para guardar el ID del estado
  const [frequency, setFrequency] = useState('una_vez'); // Nuevo estado para frecuencia, valor inicial 'una_vez'

  // Obtener servicios disponibles y ID de usuario al cargar
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Obtener usuario de Supabase Auth
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'No autenticado. Inicia sesión.' });
          router.replace('/login'); 
          return;
        }
        setUserId(user.id); // Guardar el ID en el estado
        console.log('Usuario autenticado en RequestService:', user.id); // Log

        // 2. Obtener servicios activos (sin cambios)
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('id, name, base_price, duration_minutes, recommended_frequency, space_limitations') // Añadir nuevas columnas si las necesitas mostrar
          .eq('is_active', true);

        if (servicesError) throw servicesError;
        setServices(servicesData || []);

      } catch (error) {
        console.error("Error fetching data in RequestService:", error);
        Toast.show({
          type: 'error',
          text1: 'Error cargando datos',
          text2: error instanceof Error ? error.message : 'Ocurrió un error',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  // --- Manejadores para Date/Time Picker ---
  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios'); // En iOS se cierra manualmente
    setDate(currentDate);
    // Abrir TimePicker automáticamente después de seleccionar fecha (opcional)
    if (Platform.OS !== 'ios') { 
        // setShowTimePicker(true); // Descomentar si quieres auto-abrir timepicker
    }
  };

  const onChangeTime = (event, selectedTime) => {
    const currentTime = selectedTime || date;
    setShowTimePicker(Platform.OS === 'ios');
    // Combinar fecha seleccionada con hora seleccionada
    const newDate = new Date(date);
    newDate.setHours(currentTime.getHours());
    newDate.setMinutes(currentTime.getMinutes());
    setDate(newDate);
  };
  
  // --- Manejador de envío ---
  const handleSubmit = async () => {
    // Usar userId del estado y añadir validación de frequency si es necesario
    if (!selectedServiceId || !address || !userId || !frequency) { 
      Toast.show({ type: 'error', text1: 'Campos requeridos', text2: 'Selecciona servicio, frecuencia y proporciona dirección.' });
      return;
    }
    if (date <= new Date()) {
       Toast.show({ type: 'error', text1: 'Fecha inválida', text2: 'Selecciona una fecha y hora futuras.' });
      return;
    }

    setLoading(true);
    console.log('Enviando booking con client_id:', userId, 'frequency:', frequency); // Log antes de insertar
    try {
      const { error } = await supabase
        .from('bookings')
        .insert([
          { 
            client_id: userId, 
            service_id: selectedServiceId, 
            scheduled_date: date.toISOString(), 
            address: address, 
            special_instructions: instructions,
            status: 'pendiente',
            frequency: frequency, // <-- Añadir frecuencia aquí
          }
        ]);

      if (error) {
         // Manejar posible error RLS aquí también si la política no está aplicada
         if (error.message.includes('row-level security policy')) {
             Toast.show({ type: 'error', text1: 'Error de Permiso', text2: 'No se pudo guardar la reserva. Verifica los permisos.' });
         } else {
            throw error; // Re-lanzar otros errores
         }
      } else {
        Toast.show({ type: 'success', text1: 'Éxito', text2: 'Servicio solicitado correctamente.' });
        router.push('/(tabs)/bookings'); 
      }

    } catch (error) {
       console.error("Error submitting booking:", error);
       Toast.show({
        type: 'error',
        text1: 'Error al solicitar',
        text2: error instanceof Error ? error.message : 'Ocurrió un error',
      });
    } finally {
      setLoading(false);
    }
  };

  // --- Formatear fecha y hora para mostrar ---
  const formatDate = (d) => {
    return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric'});
  }
   const formatTime = (d) => {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  return (
    <View style={styles.container}>
       <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solicitar Servicio</Text>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {(loading && (!services.length || !userId)) ? ( 
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50}} />
        ) : (
          <>
            {/* Sección: Selección de Servicio con Picker */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Selecciona un Paquete</Text>
              <View style={styles.pickerWrapper}> 
                 <Picker
                    selectedValue={selectedServiceId}
                    onValueChange={(itemValue) => setSelectedServiceId(itemValue)}
                    style={styles.picker} // Asegúrate de tener estilos definidos
                    mode="dropdown" // Opcional para Android
                  >
                    {/* Opción por defecto */}
                    <Picker.Item label="-- Selecciona un paquete --" value={null} />
                    {/* Mapear servicios obtenidos de Supabase */}
                    {services.map(service => (
                      <Picker.Item 
                        key={service.id} 
                        label={`${service.name} ($${service.base_price}) - ${service.duration_minutes} min`} 
                        value={service.id} 
                      />
                    ))}
                  </Picker>
              </View>
            </View>

            {/* Sección: Selección de Frecuencia */}            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Frecuencia</Text>
              <View style={styles.pickerWrapper}>
                 <Picker
                    selectedValue={frequency}
                    onValueChange={(itemValue) => setFrequency(itemValue)}
                    style={styles.picker}
                    mode="dropdown"
                  >
                    <Picker.Item label="Una Vez" value="una_vez" />
                    <Picker.Item label="Semanal" value="semanal" />
                    <Picker.Item label="Quincenal" value="quincenal" />
                    <Picker.Item label="Mensual" value="mensual" />
                  </Picker>
              </View>
            </View>

            {/* Sección: Selección de Fecha y Hora */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fecha y Hora</Text>
              <View style={styles.dateTimeRow}>
                 <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                    <Calendar size={20} color={theme.colors.primary} />
                    <Text style={styles.dateButtonText}>{formatDate(date)}</Text>
                 </TouchableOpacity>
                 <TouchableOpacity style={styles.dateButton} onPress={() => setShowTimePicker(true)}>
                    <Clock size={20} color={theme.colors.primary} />
                    <Text style={styles.dateButtonText}>{formatTime(date)}</Text>
                 </TouchableOpacity>
              </View>
             
              {/* Renderizar DatePicker si showDatePicker es true */} 
              {showDatePicker && (
                <DateTimePicker
                  testID="datePicker"
                  value={date}
                  mode="date"
                  is24Hour={false}
                  display="default"
                  onChange={onChangeDate}
                  minimumDate={new Date()} 
                />
              )}
              {/* Renderizar TimePicker si showTimePicker es true */} 
              {showTimePicker && (
                <DateTimePicker
                  testID="timePicker"
                  value={date}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={onChangeTime}
                />
              )}
            </View>

            {/* Sección: Dirección */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Dirección de Limpieza</Text>
              <View style={styles.inputWrapper}>
                <MapPin size={20} color={theme.colors.text.light} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ingresa la dirección completa"
                  value={address}
                  onChangeText={setAddress}
                  placeholderTextColor={theme.colors.text.light}
                  multiline
                />
              </View>
            </View>

            {/* Sección: Instrucciones Especiales */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Instrucciones Especiales (Opcional)</Text>
              <View style={styles.inputWrapper}>
                <FileText size={20} color={theme.colors.text.light} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Ej: Enfocarse en la cocina, tengo un perro..."
                  value={instructions}
                  onChangeText={setInstructions}
                  placeholderTextColor={theme.colors.text.light}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Botón de Solicitar */}
            <TouchableOpacity 
              style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                <Text style={styles.submitButtonText}>Solicitar Servicio</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
     padding: theme.spacing.lg,
     paddingBottom: theme.spacing.xl * 2,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  // Estilos para botones de servicio
  serviceButton: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  serviceButtonSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  serviceButtonText: {
     ...theme.typography.body,
     color: theme.colors.text.primary,
     fontWeight: '500',
  },
   serviceButtonPrice: {
     ...theme.typography.caption,
     color: theme.colors.text.secondary,
  },
  serviceButtonTextSelected: {
      color: theme.colors.primary, // O theme.colors.surface si el fondo es oscuro
      fontWeight: '600',
  },
   // Estilos para Picker (si se usa)
  pickerWrapper: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
  },
  picker: {
    height: 50, // Ajustar altura según sea necesario
    width: '100%',
    color: theme.colors.text.primary, // Estilo básico
  },
  // Estilos para Fecha y Hora
  dateTimeRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
  },
   dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
      flex: 1, // Para que ocupen espacio equitativo
  },
  dateButtonText: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  // Estilos para Inputs
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center', // Centrar icono verticalmente
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm, // Espacio si hay múltiples inputs
  },
  inputIcon: {
    marginHorizontal: theme.spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    paddingRight: theme.spacing.lg, // Espacio a la derecha
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  textArea: {
      height: 100, // Altura para el área de texto
      textAlignVertical: 'top', // Alinear texto arriba en Android
      paddingTop: theme.spacing.lg, // Padding superior para multilínea
  },
  // Estilos para botón de envío
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
    ...theme.shadows.md,
  },
  submitButtonDisabled: {
    opacity: 0.7,
    backgroundColor: theme.colors.primaryLight,
  },
  submitButtonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  },
}); 