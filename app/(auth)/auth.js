import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Lock } from 'lucide-react-native';
import { theme } from '../theme';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Auth() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Función auxiliar para mostrar errores con Toast
  const showErrorToast = (message, title = 'Error') => {
    Toast.show({ type: 'error', text1: title, text2: message });
  };

  // Función auxiliar para guardar datos del usuario en AsyncStorage
  const saveUserDataLocally = async (user, userDataFromDB) => {
    try {
      await AsyncStorage.setItem('id', user.id);
      await AsyncStorage.setItem('email', user.email);
      // Asegurarse que userDataFromDB.full_name no sea null o undefined
      const fullName = userDataFromDB?.full_name || '';
      await AsyncStorage.setItem('full_name', fullName);
      console.log("User data saved to AsyncStorage:", { id: user.id, email: user.email, name: fullName });
      return true; // Indica éxito
    } catch (storageError) {
      console.error("Error saving user data to AsyncStorage:", storageError);
      showErrorToast('No se pudo guardar la información localmente.', 'Error de almacenamiento');
      return false; // Indica fallo
    }
  };

  // Función auxiliar para obtener datos adicionales del usuario desde la DB
  const fetchUserDataFromDB = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .select('role, full_name') // Solo pedimos lo que necesitamos aquí
        .eq('id', userId)
        .single();

    if (error) {
        console.error("Error fetching user data from DB:", error);
        showErrorToast('No se pudo obtener la información completa del usuario.');
        return null;
    }
    if (!data) {
        showErrorToast('Perfil de usuario no encontrado en la base de datos.');
        return null;
    }
    return data; // Devuelve { role, full_name }
  };

  // Lógica principal de inicio de sesión refactorizada
  const handleLogin = async () => {
    setLoading(true);

    // 1. Validación básica de campos
    if (!email || !password) {
      showErrorToast('Por favor ingresa tu email y contraseña');
      setLoading(false);
      return;
    }

    try {
      // 2. Autenticar con Supabase Auth
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) {
        if (signInError.message.includes('Invalid login credentials')) {
          showErrorToast('Credenciales incorrectas');
        } else {
          console.error("Supabase sign in error:", signInError);
          showErrorToast(signInError.message, 'Error de inicio de sesión');
        }
        setLoading(false);
        return;
      }
      
      if (!authData?.user) {
           showErrorToast('No se pudo obtener la información del usuario tras el login.');
           setLoading(false);
           return;
      }
      
      const user = authData.user;

      // 3. Obtener datos adicionales (rol, nombre) de la tabla 'users'
      const userDataFromDB = await fetchUserDataFromDB(user.id);
      if (!userDataFromDB) {
          // fetchUserDataFromDB ya muestra el Toast en caso de error
          setLoading(false);
          return;
      }

      // 4. Guardar datos esenciales en AsyncStorage
      const saved = await saveUserDataLocally(user, userDataFromDB);
      if (!saved) {
          // saveUserDataLocally ya muestra el Toast en caso de error
          setLoading(false);
          return;
      }

      // 5. Redirección basada en rol
      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: 'Sesión iniciada correctamente'
      });

      const userRole = userDataFromDB.role;
      if (userRole === 'limpiador') {
        router.replace('/(employee)/'); 
      } else if (userRole === 'cliente') {
        router.replace('/(tabs)/');
      } else {
        console.warn('Rol de usuario desconocido o no manejado:', userRole);
        // Idealmente, no deberíamos llegar aquí si la DB está bien, pero por si acaso:
        showErrorToast(`Rol '${userRole}' no reconocido. Contacte soporte.`); 
        // O podrías redirigir a '/' pero mostrando error primero
         router.replace('/'); 
      }
      
    } catch (error) {
      // Captura errores generales inesperados durante el proceso
      console.error("Unexpected login error:", error);
      showErrorToast(error instanceof Error ? error.message : 'Ocurrió un error desconocido', 'Error inesperado');
    } finally {
      // Asegurarse de que loading se desactive siempre
      setLoading(false); 
    }
  };

  const handleSignUp = () => {
    router.push('/client-signup');
  };

  const handleForgotPassword = () => {
    // TODO: Implementar navegación a pantalla de olvido de contraseña
    Toast.show({ type: 'info', text1: 'Próximamente', text2: 'Función de recuperar contraseña aún no implementada.'})
    // router.push('/forgot-password'); 
  };

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Si no se puede volver, ir a la pantalla inicial pública
      router.replace('/'); // Asumiendo que '/' será la pantalla pública principal
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
        <Text style={styles.headerTitle}>Iniciar Sesión</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color={theme.colors.text.light} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
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
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholderTextColor={theme.colors.text.light}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.forgotPassword}
            activeOpacity={0.8}
            onPress={handleForgotPassword} 
          >
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.registerButton]}
            onPress={handleSignUp}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, styles.registerButtonText]}>Crear Cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingTop: 48,
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
  content: {
    flex: 1,
    padding: theme.spacing.xl,
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
    marginLeft: theme.spacing.md,
  },
  input: {
    flex: 1,
    padding: theme.spacing.lg,
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    ...theme.typography.caption,
    fontWeight: '500',
  },
  buttonContainer: {
    gap: theme.spacing.md,
    marginTop: 'auto',
    paddingBottom: theme.spacing.md,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    ...theme.shadows.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...theme.typography.button,
    color: theme.colors.surface,
  },
  registerButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  registerButtonText: {
    color: theme.colors.primary,
  },
});