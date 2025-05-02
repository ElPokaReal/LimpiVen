// app/location-form.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput, 
  TouchableOpacity, 
  Platform, 
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';
import { supabase } from '../lib/supabase'; 
import { useTheme } from '../constants/ThemeContext';
import Toast from 'react-native-toast-message';

export default function LocationFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const isEditing = params.locationId ? true : false;

  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [nickname, setNickname] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');

  // Cargar datos del usuario y datos de la ubicación si estamos editando
  useEffect(() => {
    const initialize = async () => {
      setLoading(!isEditing || (isEditing && params.locationId));
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'Usuario no autenticado.' });
          router.replace('/(auth)/auth');
          return;
        }
        setUserId(user.id);

        if (isEditing && params.locationId) {
          const { data: locationData, error: locationError } = await supabase
            .from('user_locations')
            .select('*')
            .eq('id', params.locationId)
            .eq('user_id', user.id)
            .single();

          if (locationError) throw locationError;

          if (locationData) {
            setNickname(locationData.nickname || '');
            setAddressLine1(locationData.address_line1 || '');
            setAddressLine2(locationData.address_line2 || '');
          } else {
             Toast.show({ type: 'error', text1: 'Error', text2: 'Ubicación no encontrada.' });
             router.back();
          }
        }
      } catch (error) {
        console.error("Error initializing location form:", error);
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cargar el formulario.' });
        router.back();
      } finally {
        setLoading(false);
      }
    };
    initialize();
  }, [isEditing, params.locationId]);

  // --- Guardar Ubicación (Añadir o Editar) ---
  const handleSaveLocation = async () => {
     // Actualizar validación
     if (!addressLine1) {
       Toast.show({ type: 'error', text1: 'Campo incompleto', text2: 'Por favor, ingresa al menos la línea 1 de la dirección.' });
       return;
     }
     if (!userId) {
         Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo identificar al usuario.' });
         return;
     }

     setLoading(true);
     const locationData = {
        user_id: userId,
        nickname: nickname || null,
        address_line1: addressLine1,
        address_line2: addressLine2 || null,
        // Campos eliminados
     };

     try {
        let error;
        if (isEditing) {
            // --- Actualizar ---
            const { error: updateError } = await supabase
              .from('user_locations')
              .update(locationData)
              .eq('id', params.locationId)
              .eq('user_id', userId);
            error = updateError;
        } else {
            // --- Insertar ---
            const { error: insertError } = await supabase
              .from('user_locations')
              .insert(locationData);
            error = insertError;
        }

        if (error) {
            console.error("Error saving location to Supabase:", error);
            if (error.message.includes('violates row-level security policy')) {
                 Toast.show({ type: 'error', text1: 'Error de Permiso', text2: 'No tienes permiso para guardar esta ubicación.' });
            } else if (error.message.includes('duplicate key value violates unique constraint')) {
                 Toast.show({ type: 'error', text1: 'Error Duplicado', text2: 'Parece que ya existe una ubicación similar.' });
            }
             else {
                throw error; 
            }
        } else {
            Toast.show({ 
                type: 'success', 
                text1: 'Éxito', 
                text2: `Ubicación ${isEditing ? 'actualizada' : 'guardada'} correctamente.` 
            });
            router.back(); 
        }
     } catch (error) {
         console.error("Unexpected error saving location:", error);
         Toast.show({ type: 'error', text1: 'Error Inesperado', text2: 'No se pudo guardar la ubicación.' });
     } finally {
        setLoading(false);
     }
  };


  if (loading && !userId) { // Indicador de carga inicial
     return (
        <View style={styles.loadingContainer}>
           <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
     );
  }

  return (
    <View style={styles.container}>
       <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? 'Editar Ubicación' : 'Añadir Ubicación'}</Text>
        <TouchableOpacity onPress={handleSaveLocation} style={styles.saveButton} disabled={loading}>
          {loading ? <ActivityIndicator color={theme.colors.primary} size="small"/> : <Save size={24} color={theme.colors.primary} />}
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >

        <Text style={styles.label}>Apodo (Opcional, ej: Casa, Oficina)</Text>
        <TextInput
          style={styles.input}
          placeholder="Mi Casa"
          value={nickname}
          onChangeText={setNickname}
          placeholderTextColor={theme.colors.text.light}
        />

        <Text style={styles.label}>Dirección (Calle y Número) *</Text>
        <TextInput
          style={styles.input}
          placeholder="Av. Siempre Viva 123"
          value={addressLine1}
          onChangeText={setAddressLine1}
          placeholderTextColor={theme.colors.text.light}
        />

        <Text style={styles.label}>Detalles Adicionales (Piso, Apto, etc.)</Text>
        <TextInput
          style={styles.input}
          placeholder="Piso 3, Apto B"
          value={addressLine2}
          onChangeText={setAddressLine2}
          placeholderTextColor={theme.colors.text.light}
        />

      </ScrollView>
      <Toast />
    </View>
  );
}

// --- Estilos --- (Basados en request-service.js con adaptaciones)
const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
   loadingContainer: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     backgroundColor: theme.colors.background,
  },
   header: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 10 : 48, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Alinear elementos
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
    // marginRight: theme.spacing.md, // Quitar si usamos space-between
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    textAlign: 'center', // Centrar título
    flex: 1, // Permitir que ocupe espacio y se centre
    marginHorizontal: theme.spacing.sm, // Espacio respecto a botones
  },
  saveButton: {
     padding: theme.spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
     padding: theme.spacing.lg,
     paddingBottom: theme.spacing.xl * 2,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.md,
  },
  input: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.typography.body,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm, // Espacio entre inputs
  },
}); 