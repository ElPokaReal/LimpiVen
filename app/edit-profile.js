import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Save, Camera } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
import { useTheme } from '../constants/ThemeContext'; // Import useTheme

export default function EditProfile() {
  const router = useRouter();
  const { theme } = useTheme(); // Use theme hook
  const styles = getStyles(theme); // Get styles from theme

  const [loading, setLoading] = useState(false);
  const [userDataLoading, setUserDataLoading] = useState(true); // Estado para carga inicial
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [errors, setErrors] = useState({}); // Estado para errores de validación

  useEffect(() => {
    const loadUserData = async () => {
      setUserDataLoading(true);
      try {
        const userId = await AsyncStorage.getItem('id');
        // const emailFromStorage = await AsyncStorage.getItem('email'); // No es necesario si lo obtenemos de Supabase

        if (userId) {
          const { data: user, error } = await supabase
            .from('users')
            .select('full_name, email, phone_number') // Seleccionar solo campos necesarios
            .eq('id', userId)
            .single();

          if (error) {
            console.error("Error fetching user data:", error);
            Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'No se pudieron cargar los datos del perfil.'
            });
          } else if (user) {
            setFormData({
              name: user.full_name || '',
              email: user.email || '',
              phone: user.phone_number || ''
            });
          }
        } else {
          // Si no hay userId, quizá redirigir o mostrar error
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'No se pudo identificar al usuario.'
          });
        }
      } catch (e) {
        console.error("Error loading user data from storage/supabase:", e);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Ocurrió un error al cargar el perfil.'
        });
      } finally {
        setUserDataLoading(false);
      }
    };
    loadUserData();
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es obligatorio.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'El correo electrónico es obligatorio.';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'El formato del correo electrónico no es válido.';
    }
    // Añadir validación de teléfono si es necesario
    // if (!formData.phone.trim()) {
    //   newErrors.phone = 'El teléfono es obligatorio.';
    // } else if (!/^\d{10}$/.test(formData.phone)) { // Ejemplo: 10 dígitos
    //   newErrors.phone = 'El formato del teléfono no es válido.';
    // }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Retorna true si no hay errores
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return; // Detener si hay errores de validación
    }

    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('id');

      if (!userId) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Usuario no encontrado'
        });
        setLoading(false); // Asegurarse de quitar el loading
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.name.trim(),
          email: formData.email.trim(),
          phone_number: formData.phone.trim() // Usar trim para limpiar espacios
        })
        .eq('id', userId);

      if (error) {
        console.error("Error updating profile:", error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.message || 'Error al actualizar el perfil'
        });
        setLoading(false); // Quitar loading en caso de error
        return;
      }

      // Ya no actualizamos AsyncStorage manualmente aquí.
      // await AsyncStorage.setItem('full_name', formData.name);
      // await AsyncStorage.setItem('email', formData.email);

      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: 'Perfil actualizado correctamente'
      });
      router.back(); // Volver a la pantalla anterior

    } catch (error) {
      console.error("Catch Error saving profile:", error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Ocurrió un error inesperado.'
      });
    } finally {
      // El setLoading(false) se maneja dentro de los bloques try/catch/if
      // para asegurar que se quite solo cuando la operación termina o falla.
      // Si la navegación ocurre antes del finally, el estado podría no actualizarse.
      // Si router.back() es síncrono, podemos poner setLoading(false) aquí.
      // Si es asíncrono, es mejor manejarlo antes de navegar.
      setLoading(false);
    }
  };

  const handleProfilePicPress = () => {
    Toast.show({
      type: 'info',
      text1: 'Próximamente',
      text2: 'La edición de foto de perfil estará disponible pronto.',
    });
  };

  // Mostrar indicador de carga mientras se obtienen los datos iniciales
  if (userDataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardAvoidingContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>

        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={handleProfilePicPress} activeOpacity={0.7}>
            <View style={styles.profilePicContainer}>

              <User size={60} color={theme.colors.primary} />
              <View style={styles.cameraIconOverlay}>
                 <Camera size={20} color={theme.colors.surface} />
              </View>
            </View>
          </TouchableOpacity>
           <Text style={styles.comingSoonText}>(Próximamente)</Text>
           <Text style={styles.title}>Editar Perfil</Text>
        </View>

        <View style={styles.form}>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nombre Completo</Text>
            <TextInput
              style={[styles.input, errors.name ? styles.inputError : null]}
              placeholder="Introduce tu nombre"
              value={formData.name}
              onChangeText={(value) => {
                setFormData(prev => ({ ...prev, name: value }));
                if (errors.name) { // Limpiar error al escribir
                  setErrors(prev => ({ ...prev, name: null }));
                }
              }}
              placeholderTextColor={theme.colors.text.placeholder}
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>


          <View style={styles.inputGroup}>
            <Text style={styles.label}>Correo Electrónico</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="tu@correo.com"
              value={formData.email}
              onChangeText={(value) => {
                setFormData(prev => ({ ...prev, email: value }));
                 if (errors.email) { // Limpiar error al escribir
                  setErrors(prev => ({ ...prev, email: null }));
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor={theme.colors.text.placeholder}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>


          <View style={styles.inputGroup}>
            <Text style={styles.label}>Teléfono</Text>
            <TextInput
              style={styles.input} // Añadir estilo de error si se valida
              placeholder="Ej: 04121234567"
              value={formData.phone}
              onChangeText={(value) => setFormData(prev => ({ ...prev, phone: value }))}
              keyboardType="phone-pad"
              placeholderTextColor={theme.colors.text.placeholder}
            />

          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.surface} />
          ) : (
            <Save size={20} color={theme.colors.surface} />
          )}
          <Text style={styles.saveButtonText}>
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

       <Toast />
    </KeyboardAvoidingView>
  );
}

// Function to generate styles based on the theme
const getStyles = (theme) => StyleSheet.create({
  keyboardAvoidingContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1, // Permite que el ScrollView crezca si el contenido es pequeño
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl, // Más espacio al final
    justifyContent: 'center', // Centrar si el contenido es menor que la pantalla
  },
   loadingContainer: { // Estilo para el contenedor de carga inicial
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  profilePicContainer: {
    width: 120,
    height: 120,
    borderRadius: 60, // Hacerlo circular
    backgroundColor: theme.colors.surface, // Fondo claro
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs, // Pequeño espacio antes del texto "Próximamente"
    borderWidth: 3,
    borderColor: theme.colors.primary,
    position: 'relative', // Para posicionar el ícono de cámara
    ...theme.shadows.sm, // Sombra suave
  },
  cameraIconOverlay: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.full,
  },
   comingSoonText: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.md, // Espacio antes del título
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    // marginTop quitado porque el espacio ahora lo da comingSoonText
  },
  form: {
    width: '100%', // Asegurar que el form ocupe el ancho
    marginBottom: theme.spacing.xl,
  },
  inputGroup: {
    marginBottom: theme.spacing.lg, // Espacio entre grupos de input
  },
  label: {
    ...theme.typography.caption, // Estilo de tema para label
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
    fontWeight: '500', // Un poco más de peso
  },
  input: {
    ...theme.typography.body,
    backgroundColor: theme.colors.surface,
    height: 50, // Altura fija o basada en tema
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius.md, // Borde de tema
    paddingHorizontal: theme.spacing.md,
    color: theme.colors.text.primary,
  },
  inputError: {
    borderColor: theme.colors.error, // Borde rojo para error
  },
  errorText: {
    ...theme.typography.caption,
    color: theme.colors.error,
    marginTop: theme.spacing.xs,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md, // Padding vertical consistente
    paddingHorizontal: theme.spacing.lg, // Padding horizontal
    borderRadius: theme.borderRadius.lg, // Borde de tema
    ...theme.shadows.sm, // Sombra de tema
    gap: theme.spacing.sm, // Espacio entre ícono y texto
  },
  saveButtonText: {
    ...theme.typography.button, // Estilo de tema para texto de botón
    color: theme.colors.surface,
    fontSize: 16, // Ajustar si es necesario
  },
  buttonDisabled: {
    backgroundColor: theme.colors.text.light, // Color grisáceo para deshabilitado
    ...theme.shadows.sm, // Mantener sombra o quitarla
  },
}); 