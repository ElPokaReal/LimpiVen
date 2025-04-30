import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../theme';
import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { LogOut } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

export default function EmployeeProfile() {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true); 
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cerrar sesión.' });
      } else {
        console.log("Employee signed out successfully.");
        // No se necesita redirección aquí
      }
    } catch (e) {
        console.error("Unexpected error during sign out:", e);
        Toast.show({ type: 'error', text1: 'Error', text2: 'Ocurrió un error inesperado.' });
    } finally {
      setLoading(false); 
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mi Perfil (Empleado)</Text>
      {/* Aquí se mostrará y editará el perfil del empleado */}

      <TouchableOpacity 
        style={[styles.logoutButton, loading && styles.buttonDisabled]} 
        onPress={handleLogout}
        disabled={loading}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <LogOut size={20} color="#FFF" />
            <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
          </>
        )}
      </TouchableOpacity>
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xl,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.xl, 
    gap: theme.spacing.sm,
    ...theme.shadows.md,
    width: '80%',
    maxWidth: 300,
  },
  logoutButtonText: {
    ...theme.typography.button,
    color: theme.colors.onError,
    fontWeight: '600',
  },
   buttonDisabled: {
     backgroundColor: theme.colors.disabled,
     opacity: 0.7,
   },
}); 