import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Lock } from 'lucide-react-native';
import { useTheme } from '../../constants/ThemeContext';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Auth() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const showErrorToast = (message, title = 'Error') => {
    Toast.show({ type: 'error', text1: title, text2: message });
  };

  const saveUserDataLocally = async (user, userDataFromDB) => {
    try {
      await AsyncStorage.setItem('id', user.id);
      await AsyncStorage.setItem('email', user.email);
      const fullName = userDataFromDB?.full_name || '';
      await AsyncStorage.setItem('full_name', fullName);
      console.log("User data saved to AsyncStorage:", { id: user.id, email: user.email, name: fullName });
      return true;
    } catch (storageError) {
      console.error("Error saving user data to AsyncStorage:", storageError);
      showErrorToast('No se pudo guardar la información localmente.', 'Error de almacenamiento');
      return false;
    }
  };

  const fetchUserDataFromDB = async (userId) => {
    const { data, error } = await supabase
        .from('users')
        .select('role, full_name')
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
    return data;
  };

  const handleLogin = async () => {
    setLoading(true);
    if (!email || !password) {
      showErrorToast('Por favor ingresa tu email y contraseña');
      setLoading(false);
      return;
    }

    try {
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
      const userDataFromDB = await fetchUserDataFromDB(user.id);
      if (!userDataFromDB) {
          setLoading(false);
          return;
      }

      const saved = await saveUserDataLocally(user, userDataFromDB);
      if (!saved) {
          setLoading(false);
          return;
      }

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
        showErrorToast(`Rol '${userRole}' no reconocido. Contacte soporte.`); 
         router.replace('/'); 
      }
      
    } catch (error) {
      console.error("Unexpected login error:", error);
      showErrorToast(error instanceof Error ? error.message : 'Ocurrió un error desconocido', 'Error inesperado');
    } finally {
      setLoading(false); 
    }
  };

  const handleSignUp = () => {
    router.push('client-signup');
  };

  const handleForgotPassword = () => {
    Toast.show({ type: 'info', text1: 'Próximamente', text2: 'Función de recuperar contraseña aún no implementada.'})
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
        <Text style={styles.headerTitle}>Iniciar Sesión</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Correo electrónico</Text>
            <View style={styles.inputWrapper}>
              <Mail size={20} color={theme.colors.text.placeholder} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
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
                placeholder="Tu contraseña"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholderTextColor={theme.colors.text.placeholder}
                editable={!loading}
              />
            </View>
          </View>

          <TouchableOpacity 
            style={styles.forgotPassword}
            activeOpacity={0.8}
            onPress={handleForgotPassword} 
            disabled={loading}
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
            {loading ? (
                <ActivityIndicator color={theme.colors.surface} />
            ) : (
                <Text style={styles.buttonText}>Iniciar Sesión</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.registerButton, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={[styles.buttonText, styles.registerButtonText]}>Crear Cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>
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