import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Mail, Lock, Phone } from 'lucide-react-native';
import { theme } from '../theme';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';

export default function ClientSignup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    let createdUserId = null; // Para guardar el ID del usuario creado en auth
    try {
      setLoading(true);

      // Validaciones
      if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword || !formData.phone) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Todos los campos son requeridos'
        });
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Las contraseñas no coinciden'
        });
        setLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'La contraseña debe tener al menos 6 caracteres'
        });
        setLoading(false);
        return;
      }

      // 1. Registrar usuario en Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            // El rol se manejará en nuestra tabla 'users'
          }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
           Toast.show({
              type: 'error',
              text1: 'Error',
              text2: 'El correo electrónico ya está registrado'
          });
         } else {
           Toast.show({
              type: 'error',
              text1: 'Error al registrar usuario',
              text2: signUpError.message
          });
         }
        setLoading(false);
        return;
      }

      if (!authData || !authData.user) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'No se pudo obtener la información del usuario tras el registro.'
          });
          setLoading(false);
          return;
       }

      createdUserId = authData.user.id; // Guardamos el ID por si necesitamos borrarlo

      // 2. Insertar en la tabla 'users'
      const { error: userInsertError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id, // Usar el ID de Supabase Auth
            email: formData.email,
            // password_hash ya no es necesario aquí
            full_name: formData.fullName,
            phone_number: formData.phone,
            role: 'client' // Asegurar que sea 'client'
          }
        ]);
        // No necesitamos .select().single() aquí a menos que necesitemos los datos de vuelta

      if (userInsertError) {
          console.error("Error inserting into users table:", userInsertError);
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'Error al guardar datos de usuario.' // Mensaje genérico para el usuario
          });
          // IMPORTANTE: Si falla la inserción en 'users', DEBERÍAMOS borrar el usuario de Supabase Auth
          // para evitar inconsistencias. Esto requiere una función separada o manejo aquí.
          // Por ahora, solo mostramos error y paramos. Considerar implementar limpieza.
          setLoading(false);
          return;
      }

      // 3. Crear perfil de cliente en 'client_profiles'
      const { error: profileError } = await supabase
        .from('client_profiles')
        .insert([
          {
            user_id: authData.user.id, // Usar el mismo ID
            // Valores iniciales/por defecto para el perfil de cliente
            address: '', 
            preferences: {}, 
            subscription_type: 'Paquete Bajo' // O el valor por defecto que corresponda
          }
        ]);

      if (profileError) {
         console.error("Error inserting into client_profiles:", profileError);
        // Si hay error al crear el perfil, podríamos eliminar el usuario de 'users' Y de 'auth.users'
        // Esto se vuelve complejo. Por ahora, solo mostramos error.
        // Idealmente, esto debería ser una transacción o tener una lógica de compensación robusta.
        /*
        await supabase
          .from('users')
          .delete()
          .eq('id', authData.user.id);
        // También necesitarías borrar de auth.users llamando a una función de admin o similar
        */
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Error al crear el perfil de cliente.' // Mensaje genérico
        });
        setLoading(false);
        return;
      }

      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: 'Cuenta creada correctamente. Revisa tu email para confirmar.' // Ajustar si aplica
      });

    } catch (error) {
       // Captura de errores inesperados generales
      console.error("Unexpected signup error:", error);
      Toast.show({
        type: 'error',
        text1: 'Error inesperado',
        text2: error instanceof Error ? error.message : 'Ocurrió un error desconocido'
      });
      // Si tuvimos un error después de crear el usuario en Auth, podríamos intentar borrarlo
      if (createdUserId) {
           console.warn("Attempting to clean up auth user due to error:", createdUserId);
           // Aquí iría la lógica para borrar el usuario de auth.users si es necesario/posible
      }
    } finally {
      setLoading(false);
    }
  };

  // Nueva función para manejar el botón atrás
  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Si no se puede volver, ir a la pantalla inicial
      router.replace('/'); 
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress} // Usar la nueva función
          activeOpacity={0.8}
        >
          <ArrowLeft size={24} color={theme.colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registro de Cliente</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Nombre completo</Text>
            <View style={styles.inputWrapper}>
              <User size={20} color={theme.colors.text.light} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Tu nombre completo"
                value={formData.fullName}
                onChangeText={(value) => handleChange('fullName', value)}
                autoCapitalize="words"
                placeholderTextColor={theme.colors.text.light}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color={theme.colors.text.light} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                value={formData.email}
                onChangeText={(value) => handleChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={theme.colors.text.light}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Teléfono</Text>
            <View style={styles.inputWrapper}>
              <Phone size={20} color={theme.colors.text.light} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Tu número de teléfono"
                value={formData.phone}
                onChangeText={(value) => handleChange('phone', value)}
                keyboardType="phone-pad"
                placeholderTextColor={theme.colors.text.light}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color={theme.colors.text.light} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Tu contraseña"
                value={formData.password}
                onChangeText={(value) => handleChange('password', value)}
                secureTextEntry
                placeholderTextColor={theme.colors.text.light}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar contraseña</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color={theme.colors.text.light} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirma tu contraseña"
                value={formData.confirmPassword}
                onChangeText={(value) => handleChange('confirmPassword', value)}
                secureTextEntry
                placeholderTextColor={theme.colors.text.light}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Registrando...' : 'Registrarse'}
          </Text>
        </TouchableOpacity>
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
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
    ...theme.shadows.lg,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.surface,
    marginLeft: theme.spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  form: {
    gap: theme.spacing.lg,
  },
  inputContainer: {
    gap: theme.spacing.sm,
  },
  label: {
    ...theme.typography.caption,
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  inputIcon: {
    marginLeft: theme.spacing.md,
  },
  input: {
    flex: 1,
    padding: theme.spacing.lg,
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    ...theme.shadows.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  },
}); 