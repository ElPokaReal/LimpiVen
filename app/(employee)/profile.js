import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { theme } from '../theme';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LogOut, Star } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

export default function EmployeeProfile() {
  const [loading, setLoading] = useState(false);
  const [ratingData, setRatingData] = useState({ average: null, count: 0 });
  const [ratingLoading, setRatingLoading] = useState(true);

  useEffect(() => {
    const fetchReputation = async () => {
      setRatingLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo obtener tu ID.' });
          setRatingLoading(false);
          return;
        }
        const cleanerId = user.id;

        const { data: reviews, error: reviewsError } = await supabase
          .from('reviews')
          .select('rating')
          .eq('cleaner_id', cleanerId)
          .not('rating', 'is', null);

        if (reviewsError) throw reviewsError;

        if (reviews && reviews.length > 0) {
          const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
          const averageRating = totalRating / reviews.length;
          setRatingData({ average: averageRating.toFixed(1), count: reviews.length });
        } else {
          setRatingData({ average: null, count: 0 });
        }

      } catch (error) {
        console.error("Error fetching reputation:", error);
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo cargar tu reputación.' });
        setRatingData({ average: null, count: 0 });
      } finally {
        setRatingLoading(false);
      }
    };

    fetchReputation();
  }, []);

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
      <Text style={styles.title}>Mi Perfil</Text>

      <View style={styles.reputationContainer}>
        <Star size={24} color={theme.colors.warning} />
        {ratingLoading ? (
          <ActivityIndicator color={theme.colors.primary} size="small" />
        ) : (
          <Text style={styles.reputationText}>
            {ratingData.average ? 
              `${ratingData.average} (${ratingData.count} reseña${ratingData.count !== 1 ? 's' : ''})` : 
              'Aún sin reseñas'
            }
          </Text>
        )}
      </View>

      {/* Aquí se mostrará y editará el perfil del empleado */}
      {/* TODO: Añadir campos editables (nombre, etc.) */}

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
    marginBottom: theme.spacing.lg,
  },
  reputationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  reputationText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    fontWeight: '500',
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