import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Mail, Lock, Phone } from 'lucide-react-native';
import { theme } from '../theme';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';
// Quitar AsyncStorage si no se usa más para sesión de Supabase Auth
// import AsyncStorage from '@react-native-async-storage/async-storage'; 

// Eliminar la función simpleHash ya que usaremos supabase.auth.signUp
/* 
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
};
*/

export default function EmployeeSignup() {
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

      // Ya no necesitamos hashear manualmente la contraseña
      // const passwordHash = simpleHash(formData.password);

      // 1. Registrar al usuario en Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          // Podemos intentar pasar datos adicionales aquí, aunque los insertaremos después
          data: { 
            full_name: formData.fullName,
            // No establecemos el 'role' aquí directamente en la tabla auth.users
            // Lo haremos en nuestra tabla 'users'
          }
        }
      });

      if (signUpError) {
        // Manejar errores específicos de signUp, como correo ya registrado
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
        setLoading(false); // Asegurarse de parar el loading
        return; // Salir si hay error en signUp
      }
      
      // Verificar si authData o authData.user es null (importante)
       if (!authData || !authData.user) {
          Toast.show({
            type: 'error',
            text1: 'Error',
            text2: 'No se pudo obtener la información del usuario tras el registro.'
          });
          setLoading(false);
          // Podríamos considerar aquí llamar a una función para eliminar el usuario de auth si se creó
          return;
       }


      // 2. Insertar perfil en la tabla 'users' usando el ID de Supabase Auth
      const { error: profileError } = await supabase
        .from('users')
        .insert([
          { 
            id: authData.user.id, // Usar el ID del usuario autenticado
            email: formData.email, 
            full_name: formData.fullName,
            phone_number: formData.phone,
            role: 'employee' // Asegurar que sea 'employee'
          }
        ]);

      if (profileError) {
         // Si falla la creación del perfil, informar al usuario.
         // Idealmente, se podría intentar borrar el usuario de auth.users para consistencia,
         // pero por ahora solo mostraremos el error.
        Toast.show({
            type: 'error',
            text1: 'Error al crear perfil',
            // Podríamos querer mostrar un mensaje más genérico al usuario final
            text2: profileError.message 
          });
        // No necesariamente retornamos aquí, el usuario está registrado pero sin perfil completo.
        // Depende de la lógica de negocio qué hacer. Por ahora, dejaremos que continúe
        // pero el login podría fallar si depende de la tabla 'users'.
         console.error("Error creating user profile:", profileError);
         // Considerar return aquí si el perfil es absolutamente necesario para continuar
         // return; 
      }

      // Éxito
      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: 'Cuenta de empleado creada correctamente. Revisa tu email para confirmar.' // Ajustar si la confirmación está habilitada
      });
      
      // Limpiar AsyncStorage si ya no es necesario
      // await AsyncStorage.removeItem('userRole');
      // await AsyncStorage.removeItem('userId');
      // await AsyncStorage.removeItem('userFullName');


      // No es necesario iniciar sesión aquí, el usuario ya está "logueado" tras signUp
      // Pero sí redirigimos
      // router.replace('/(employee)/'); // Ajustar la ruta si es necesario

    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error inesperado',
        text2: error instanceof Error ? error.message : 'Ocurrió un error desconocido'
      });
    } finally {
      setLoading(false); // Asegurar que loading se desactive siempre
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
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.8}
        >
          <ArrowLeft size={24} color={theme.colors.surface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Registro de Empleado</Text>
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
    </KeyboardAvoidingView>
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
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 10 : 48,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
    ...theme.shadows.lg,
  },
  backButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xl * 2,
  },
  form: {
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
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
    marginHorizontal: theme.spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    paddingRight: theme.spacing.lg,
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.md,
    marginTop: theme.spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  },
});