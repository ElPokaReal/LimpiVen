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
import { ArrowLeft, Calendar, Clock, MapPin, FileText } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase'; // Asegúrate que la ruta sea correcta
import { theme } from './theme'; // Asegúrate que la ruta sea correcta
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker'; 

export default function RequestServiceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [frequency, setFrequency] = useState('una_vez');
  const [date, setDate] = useState(new Date());
  const [instructions, setInstructions] = useState('');
  const [locations, setLocations] = useState([]);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Usuario no autenticado.' });
          router.replace('/(auth)/auth'); 
          return;
        }
        setUserId(user.id);
        console.log('Usuario autenticado en RequestService:', user.id);

        const { data: servicesData, error: servicesError } = await supabase
          .from('services')
          .select('id, name, base_price, duration_minutes')
          .eq('is_active', true);
        if (servicesError) throw servicesError;
        setServices(servicesData || []);

        const { data: locationsData, error: locationsError } = await supabase
           .from('user_locations')
           .select('id, nickname, address_line1, address_line2')
           .eq('user_id', user.id)
           .order('created_at', { ascending: false });
         if (locationsError) throw locationsError;
         setLocations(locationsData || []);
         
         if (locationsData && locationsData.length > 0) {
           setSelectedLocationId(locationsData[0].id);
         }

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
  
  const onChangeDate = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const onChangeTime = (event, selectedTime) => {
    const currentTime = selectedTime || date;
    setShowTimePicker(Platform.OS === 'ios');
    const newDate = new Date(date);
    newDate.setHours(currentTime.getHours());
    newDate.setMinutes(currentTime.getMinutes());
    setDate(newDate);
  };
  
  const handleSubmit = async () => {
    if (!selectedServiceId || !selectedLocationId || !userId || !frequency) { 
      Toast.show({ type: 'error', text1: 'Campos requeridos', text2: 'Selecciona servicio, ubicación y frecuencia.' });
      return;
    }
    const now = new Date();
    now.setSeconds(0, 0); 
    const selectedDateTime = new Date(date);
    selectedDateTime.setSeconds(0, 0);
    
    if (selectedDateTime <= now) {
       Toast.show({ type: 'error', text1: 'Fecha inválida', text2: 'Selecciona una fecha y hora futuras.' });
      return;
    }

    setSubmitting(true);
    console.log('Enviando booking con:', { userId, selectedServiceId, selectedLocationId, frequency }); 
    try {
      console.log('[RequestService] Intentando insertar reserva con location_id:', selectedLocationId); 
      const { error } = await supabase
        .from('bookings')
        .insert([
          { 
            client_id: userId, 
            service_id: selectedServiceId, 
            location_id: selectedLocationId,
            scheduled_date: date.toISOString(), 
            special_instructions: instructions || null,
            status: 'pendiente',
            frequency: frequency, 
          }
        ]);

      if (error) {
         console.error("[RequestService] Error en inserción de booking:", error); // Log general del error
         if (error.message.includes('row-level security policy')) {
             console.error("[RequestService] Error específico: RLS");
             Toast.show({ type: 'error', text1: 'Error de Permiso', text2: 'No se pudo guardar la reserva.' });
         } else if (error.message.includes('violates foreign key constraint')) {
             console.error("[RequestService] Error específico: Foreign Key");
             Toast.show({ type: 'error', text1: 'Error de Datos', text2: 'El servicio o la ubicación seleccionada no son válidos.' });
         }
         else {
            console.error("[RequestService] Error específico: Otro -", error.message);
            throw error;
         }
      } else {
        console.log("[RequestService] Inserción exitosa, mostrando Toast...");
        Toast.show({ type: 'success', text1: 'Éxito', text2: 'Servicio solicitado correctamente.' });
        // Retrasar la navegación ligeramente
        setTimeout(() => {
           console.log("[RequestService] Navegando a /tabs/...");
           router.push('/(tabs)/');
        }, 100); // Retraso de 100ms
      }

    } catch (error) {
       console.error("[RequestService] Error general en handleSubmit:", error);
       Toast.show({
        type: 'error',
        text1: 'Error al solicitar',
        text2: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formatTime = (d) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true });

  if (loading) {
     return (
        <View style={styles.loadingContainer}>
           <ActivityIndicator size="large" color={theme.colors.primary} />
           <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
     );
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
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Selecciona un Paquete</Text>
            <View style={styles.pickerWrapper}> 
               <Picker
                  selectedValue={selectedServiceId}
                  onValueChange={(itemValue) => setSelectedServiceId(itemValue)}
                  style={styles.picker}
                  mode="dropdown"
                  enabled={!submitting}
                >
                  <Picker.Item label="-- Selecciona un paquete --" value={null} />
                  {services.map(service => (
                    <Picker.Item 
                      key={service.id} 
                      label={`${service.name} ($${service.base_price})`}
                      value={service.id} 
                    />
                  ))}
                </Picker>
            </View>
          </View>

          <View style={styles.section}>
             <View style={styles.sectionHeader}>
               <Text style={styles.sectionTitle}>Dirección de Limpieza</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/locations')}>
                    <Text style={styles.manageLocationsText}>Gestionar</Text>
                </TouchableOpacity>
             </View>
             {locations.length === 0 ? (
                <View style={styles.noLocations}>
                    <Text style={styles.noLocationsText}>No tienes ubicaciones guardadas.</Text>
                    <TouchableOpacity onPress={() => router.push('/location-form')}>
                        <Text style={styles.addLocationLink}>Añadir Ubicación</Text>
                    </TouchableOpacity>
                </View>
             ) : (
               <View style={styles.pickerWrapper}> 
                 <Picker
                    selectedValue={selectedLocationId}
                    onValueChange={(itemValue) => setSelectedLocationId(itemValue)}
                    style={styles.picker}
                    mode="dropdown"
                    enabled={!submitting} 
                  >
                     <Picker.Item label="-- Selecciona una ubicación --" value={null} />
                    {locations.map(loc => (
                      <Picker.Item 
                        key={loc.id} 
                        label={loc.nickname ? `${loc.nickname} (${loc.address_line1})` : `${loc.address_line1}${loc.address_line2 ? ', '+loc.address_line2 : ''}`} 
                        value={loc.id} 
                      />
                    ))}
                  </Picker>
               </View>
             )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frecuencia</Text>
            <View style={styles.pickerWrapper}>
               <Picker
                  selectedValue={frequency}
                  onValueChange={(itemValue) => setFrequency(itemValue)}
                  style={styles.picker}
                  mode="dropdown"
                  enabled={!submitting} 
                >
                  <Picker.Item label="Una Vez" value="una_vez" />
                  <Picker.Item label="Semanal" value="semanal" />
                  <Picker.Item label="Quincenal" value="quincenal" />
                  <Picker.Item label="Mensual" value="mensual" />
                </Picker>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Fecha y Hora</Text>
            <View style={styles.dateTimeRow}>
               <TouchableOpacity style={[styles.dateButton, submitting && styles.disabledLook]} onPress={() => !submitting && setShowDatePicker(true)} disabled={submitting}>
                  <Calendar size={20} color={theme.colors.primary} />
                  <Text style={styles.dateButtonText}>{formatDate(date)}</Text>
               </TouchableOpacity>
               <TouchableOpacity style={[styles.dateButton, submitting && styles.disabledLook]} onPress={() => !submitting && setShowTimePicker(true)} disabled={submitting}>
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
                minimumDate={new Date()} 
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
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instrucciones Especiales (Opcional)</Text>
            <View style={styles.inputWrapper}>
              <FileText size={20} color={theme.colors.text.light} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.textArea, submitting && styles.disabledLook]}
                placeholder="Ej: Enfocarse en la cocina, tengo un perro..."
                value={instructions}
                onChangeText={setInstructions}
                placeholderTextColor={theme.colors.text.light}
                multiline
                numberOfLines={4}
                editable={!submitting}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={submitting || locations.length === 0}
          >
            {submitting ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              <Text style={styles.submitButtonText}>Solicitar Servicio</Text>
            )}
          </TouchableOpacity>
        </>
      </ScrollView>
      <Toast />
    </View>
  );
}

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
  sectionHeader: {
       flexDirection: 'row',
       justifyContent: 'space-between',
       alignItems: 'center',
       marginBottom: theme.spacing.md,
   },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
  },
  manageLocationsText: {
       ...theme.typography.link,
       color: theme.colors.primary,
       fontWeight: '500',
   },
   noLocations: {
       alignItems: 'center',
       paddingVertical: theme.spacing.lg,
       backgroundColor: theme.colors.surface,
       borderRadius: theme.borderRadius.md,
       borderWidth: 1,
       borderColor: theme.colors.border,
   },
   noLocationsText: {
       ...theme.typography.body,
       color: theme.colors.text.secondary,
       marginBottom: theme.spacing.sm,
   },
   addLocationLink: {
       ...theme.typography.link,
       color: theme.colors.primary,
       fontWeight: '600',
   },
  pickerWrapper: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  picker: {
    height: 50, 
    width: '100%',
    color: theme.colors.text.primary, 
  },
  dateTimeRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
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
      flex: 1, 
  },
  dateButtonText: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  inputIcon: {
    marginHorizontal: theme.spacing.md,
     marginTop: theme.spacing.lg,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    paddingRight: theme.spacing.lg, 
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  textArea: {
      height: 100, 
      textAlignVertical: 'top', 
      paddingTop: theme.spacing.lg, 
  },
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
  loadingContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     backgroundColor: theme.colors.background,
  },
   loadingText: {
       marginTop: theme.spacing.md,
       ...theme.typography.body,
       color: theme.colors.text.secondary,
   },
   disabledLook: {
       opacity: 0.6,
       backgroundColor: theme.colors.border,
   },
}); 