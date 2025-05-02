import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Mail, Lock, Phone } from 'lucide-react-native';
import { useTheme } from '../../constants/ThemeContext';
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
  const { theme } = useTheme();
  const styles = getStyles(theme);

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
    let createdUserId = null;
    try {
      setLoading(true);

      if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword || !formData.phone) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Todos los campos son requeridos' });
        setLoading(false);
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'Las contraseñas no coinciden' });
        setLoading(false);
        return;
      }

      if (formData.password.length < 6) {
        Toast.show({ type: 'error', text1: 'Error', text2: 'La contraseña debe tener al menos 6 caracteres' });
        setLoading(false);
        return;
      }

      // 1. Sign up user in Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { full_name: formData.fullName }
        }
      });

      if (signUpError) {
        if (signUpError.message.includes('User already registered')) {
           Toast.show({ type: 'error', text1: 'Error', text2: 'El correo electrónico ya está registrado' });
         } else {
           Toast.show({ type: 'error', text1: 'Error al registrar usuario', text2: signUpError.message });
         }
        setLoading(false);
        return;
      }

      if (!authData || !authData.user) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo obtener la información del usuario tras el registro.' });
          setLoading(false);
          return;
       }
       createdUserId = authData.user.id;

      // 2. Insert into 'users' table with role 'limpiador'
      const { error: userInsertError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email: formData.email, 
            full_name: formData.fullName,
            phone_number: formData.phone,
            role: 'limpiador'
          }
        ]);

      if (userInsertError) {
          console.error("Error inserting into users table (employee):", userInsertError);
          Toast.show({ type: 'error', text1: 'Error', text2: 'Error al guardar datos de empleado.' });
          // Consider cleanup logic here
          setLoading(false);
          return;
      }

      // 3. Create employee profile (if you have an 'employee_profiles' table)
      // If not, this step can be skipped or adapted.
      /*
      const { error: profileError } = await supabase
        .from('employee_profiles') // Assuming this table exists
        .insert([
          {
            user_id: authData.user.id,
            // Add default employee profile fields like skills, availability, etc.
            skills: [], 
            availability: 'available',
          }
        ]);

      if (profileError) {
         console.error("Error inserting into employee_profiles:", profileError);
         Toast.show({ type: 'error', text1: 'Error', text2: 'Error al crear el perfil de empleado.' });
         // Consider cleanup logic here
         setLoading(false);
         return;
      }
      */

      Toast.show({
        type: 'success',
        text1: '¡Registro Exitoso!',
        text2: 'Revisa tu email para confirmar y luego inicia sesión.'
      });

      // Redirigir a la pantalla de inicio de sesión
      router.push('/(auth)/auth');

    } catch (error) {
      console.error("Unexpected employee signup error:", error);
      Toast.show({
        type: 'error',
        text1: 'Error inesperado',
        text2: error instanceof Error ? error.message : 'Ocurrió un error desconocido'
      });
       // Consider cleanup logic for createdUserId if needed
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
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
        <View style={styles.headerPlaceholder} />
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
              <User size={20} color={theme.colors.text.placeholder} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Tu nombre completo"
                value={formData.fullName}
                onChangeText={(value) => handleChange('fullName', value)}
                autoCapitalize="words"
                placeholderTextColor={theme.colors.text.placeholder}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color={theme.colors.text.placeholder} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                value={formData.email}
                onChangeText={(value) => handleChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={theme.colors.text.placeholder}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Teléfono</Text>
            <View style={styles.inputWrapper}>
              <Phone size={20} color={theme.colors.text.placeholder} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ej: 04121234567"
                value={formData.phone}
                onChangeText={(value) => handleChange('phone', value)}
                keyboardType="phone-pad"
                placeholderTextColor={theme.colors.text.placeholder}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color={theme.colors.text.placeholder} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChangeText={(value) => handleChange('password', value)}
                secureTextEntry
                placeholderTextColor={theme.colors.text.placeholder}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirmar contraseña</Text>
            <View style={styles.inputWrapper}>
              <Lock size={20} color={theme.colors.text.placeholder} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Repite tu contraseña"
                value={formData.confirmPassword}
                onChangeText={(value) => handleChange('confirmPassword', value)}
                secureTextEntry
                placeholderTextColor={theme.colors.text.placeholder}
                editable={!loading}
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
           style={[styles.button, loading && styles.buttonDisabled]} 
           onPress={handleSubmit}
           disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.surface} />
          ) : (
            <Text style={styles.buttonText}>Crear Cuenta de Empleado</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
      <Toast />
    </KeyboardAvoidingView>
  );
}

const getStyles = (theme) => StyleSheet.create({
   container: {
    flex: 1,
    backgroundColor: theme.colors.background, 
  },
  header: {
    backgroundColor: theme.colors.primary, 
    paddingHorizontal: theme.spacing.lg,
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 10 : 50,
    paddingBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.surface, 
    textAlign: 'center',
    flex: 1,
  },
  headerPlaceholder: {
    width: 24 + theme.spacing.xs * 2, 
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  form: {
    marginBottom: theme.spacing.xl, 
  },
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.text.secondary, 
    marginBottom: theme.spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceVariant, 
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border, 
    paddingHorizontal: theme.spacing.md,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    color: theme.colors.text.primary, 
    ...theme.typography.body1,
  },
  button: {
    backgroundColor: theme.colors.primary, 
    paddingVertical: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  buttonDisabled: {
     backgroundColor: theme.colors.primary + '80',
  },
  buttonText: {
    ...theme.typography.button,
    color: theme.colors.surface, 
  },
});