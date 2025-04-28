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
// Considerar un componente Picker personalizado o una librería si se necesita más estilo
// import { Picker } from '@react-native-picker/picker'; 

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
  const [userId, setUserId] = useState(null); // Para almacenar el ID del usuario

  // Obtener servicios disponibles y ID de usuario al cargar
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Obtener usuario actual
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo obtener el usuario.' });
          router.replace('/login'); // Redirigir si no hay usuario
          return;
        }
        setUserId(user.id);

        // Obtener servicios activos
        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('id, name, base_price, duration_minutes')
          .eq('is_active', true);

        if (servicesError) throw servicesError;
        setServices(servicesData || []);

      } catch (error) {
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
    if (!selectedServiceId || !address || !userId) {
      Toast.show({ type: 'error', text1: 'Campos requeridos', text2: 'Selecciona un servicio y proporciona una dirección.' });
      return;
    }
    // Validación de fecha/hora (ej: no en el pasado)
    if (date <= new Date()) {
       Toast.show({ type: 'error', text1: 'Fecha inválida', text2: 'Selecciona una fecha y hora futuras.' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('bookings')
        .insert([
          { 
            client_id: userId, 
            service_id: selectedServiceId, 
            scheduled_date: date.toISOString(), // Guardar en formato ISO
            address: address, 
            special_instructions: instructions,
            status: 'pendiente', // Estado inicial
            // frequency: 'una_vez' // Asumir 'una_vez' por ahora
          }
        ]);

      if (error) throw error;

      Toast.show({ type: 'success', text1: 'Éxito', text2: 'Servicio solicitado correctamente.' });
      // Navegar a la pantalla de reservas o dashboard después de éxito
      router.push('/(tabs)/bookings'); 

    } catch (error) {
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
        {loading && !services.length ? ( // Indicador de carga inicial
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 50}} />
        ) : (
          <>
            {/* Selección de Servicio (Usando botones por simplicidad) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Selecciona un Paquete</Text>
              {services.map((service) => (
                <TouchableOpacity 
                  key={service.id} 
                  style={[
                    styles.serviceButton, 
                    selectedServiceId === service.id && styles.serviceButtonSelected
                  ]}
                  onPress={() => setSelectedServiceId(service.id)}
                >
                  <Text style={[
                    styles.serviceButtonText,
                    selectedServiceId === service.id && styles.serviceButtonTextSelected
                  ]}>{service.name}</Text>
                   <Text style={[
                    styles.serviceButtonPrice,
                    selectedServiceId === service.id && styles.serviceButtonTextSelected
                  ]}>${service.base_price} - {service.duration_minutes} min</Text>
                </TouchableOpacity>
              ))}
              {/* Alternativa con Picker:
              <View style={styles.pickerWrapper}>
                 <Picker
                    selectedValue={selectedServiceId}
                    onValueChange={(itemValue) => setSelectedServiceId(itemValue)}
                    style={styles.picker}
                  >
                    <Picker.Item label="-- Selecciona un servicio --" value={null} />
                    {services.map(service => (
                      <Picker.Item key={service.id} label={`${service.name} ($${service.base_price})`} value={service.id} />
                    ))}
                  </Picker>
               </View> 
              */}
            </View>

            {/* Selección de Fecha y Hora */}
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
             
              {showDatePicker && (
                <DateTimePicker
                  testID="datePicker"
                  value={date}
                  mode="date"
                  is24Hour={false}
                  display="default"
                  onChange={onChangeDate}
                  minimumDate={new Date()} // No permitir fechas pasadas
                />
              )}
               {showTimePicker && (
                <DateTimePicker
                  testID="timePicker"
                  value={date}
                  mode="time"
                  is24Hour={false}
                  display="default"
                  onChange={onChangeTime}
                  // Podrías añadir restricciones de minutos si es necesario (minuteInterval)
                />
              )}
            </View>

            {/* Dirección */}
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
                  multiline // Permitir múltiples líneas si es necesario
                />
              </View>
            </View>

            {/* Instrucciones Especiales */}
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