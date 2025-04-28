import { View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Mail, Lock } from 'lucide-react-native';
import { theme } from './theme';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Función simple de hash para desarrollo
const simpleHash = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

export default function Auth() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      
      if (!email || !password) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Por favor ingresa tu email y contraseña'
        });
        return;
      }

      // Hashear la contraseña para comparar
      const passwordHash = simpleHash(password);

      // Buscar usuario en la tabla users
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password_hash', passwordHash)
        .single();

      if (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Error al buscar usuario'
        });
        return;
      }

      if (!user) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Credenciales incorrectas'
        });
        return;
      }

      // Guardar información de sesión
      await AsyncStorage.setItem('id', user.id);
      await AsyncStorage.setItem('email', user.email);
      await AsyncStorage.setItem('role', user.role);
      await AsyncStorage.setItem('full_name', user.full_name);
      await AsyncStorage.setItem('phone_number', user.phone_number);

      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: 'Sesión iniciada correctamente'
      });
      
      // Redirección basada en rol
      if (user.role === 'limpiador') {
        router.replace('/(employee)/'); // Redirigir al grupo de empleado
      } else if (user.role === 'cliente') {
        router.replace('/(tabs)/'); // Redirigir al grupo de cliente
      } else {
        // Manejar otros roles (ej. admin) o rol inesperado
        console.warn('Rol de usuario desconocido:', user.role);
        router.replace('/(tabs)/'); // Redirigir a cliente por defecto o a una pantalla de error
      }
      
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push('/client-signup');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
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