import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Star, MessageSquare, User } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { theme } from './theme';
import Toast from 'react-native-toast-message'; // Para mostrar errores

// Componente reutilizable para mostrar estrellas
const StarRating = ({ rating, size = 16 }) => {
  const totalStars = 5;
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = totalStars - fullStars - (halfStar ? 1 : 0);

  return (
    <View style={{ flexDirection: 'row' }}>
      {[...Array(fullStars)].map((_, i) => (
        <Star key={`full_${i}`} size={size} color={theme.colors.warning} fill={theme.colors.warning} />
      ))}
      {/* Podríamos añadir lógica para media estrella si quisiéramos */}
      {[...Array(emptyStars)].map((_, i) => (
        <Star key={`empty_${i}`} size={size} color={theme.colors.border} />
      ))}
    </View>
  );
};

export default function CleanerProfileScreen() {
  const router = useRouter();
  const { cleanerId } = useLocalSearchParams();

  const [cleanerInfo, setCleanerInfo] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!cleanerId) {
      setError('ID del limpiador no proporcionado.');
      Toast.show({ type: 'error', text1: 'Error', text2: 'ID del limpiador no encontrado.' });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Obtener información del limpiador (nombre Y AVATAR)
      const { data: cleanerData, error: cleanerError } = await supabase
        .from('users')
        .select('full_name, avatar_url') // <--- Seleccionar también avatar_url
        .eq('id', cleanerId)
        .single();

      if (cleanerError) throw cleanerError;
      if (!cleanerData) throw new Error('Limpiador no encontrado.');
      setCleanerInfo(cleanerData);

      // 2. Obtener reseñas del limpiador
      const { data: reviewsData, error: reviewsError, count } = await supabase
        .from('reviews')
        .select('rating, comment, created_at, client:users!reviews_client_id_fkey ( full_name )', { count: 'exact' })
        .eq('cleaner_id', cleanerId)
        .order('created_at', { ascending: false }); // Más recientes primero

      if (reviewsError) throw reviewsError;
      
      setReviews(reviewsData || []);
      setReviewCount(count || 0);

      // 3. Calcular promedio
      if (reviewsData && reviewsData.length > 0) {
        const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
        setAverageRating(totalRating / reviewsData.length);
      } else {
        setAverageRating(0); // O null si prefieres indicar que no hay reseñas
      }

    } catch (err) {
      console.error("Error fetching cleaner profile data:", err);
      setError(err.message || 'Ocurrió un error al cargar el perfil.');
      Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'No se pudo cargar el perfil.' });
    } finally {
      setLoading(false);
    }
  }, [cleanerId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Formatear fecha de reseña
  const formatReviewDate = (isoString) => {
     if (!isoString) return '';
     try {
       return new Date(isoString).toLocaleDateString();
     } catch (e) {
       return '';
     }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Perfil del Limpiador</Text>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
      ) : error ? (
        <View style={styles.centered}><Text style={styles.errorText}>{error}</Text></View>
      ) : cleanerInfo ? (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Información del Limpiador */} 
          <View style={styles.cleanerInfoSection}>
             {/* Mostrar Avatar */} 
             <View style={styles.avatarContainer}>
                 {cleanerInfo.avatar_url ? (
                     <Image 
                         source={{ uri: cleanerInfo.avatar_url }} 
                         style={styles.avatar} 
                         resizeMode="cover" // O "contain"
                     />
                 ) : (
                     <View style={styles.avatarPlaceholder}>
                        <User size={40} color={theme.colors.text.secondary} />
                     </View>
                 )}
             </View>

             <Text style={styles.cleanerName}>{cleanerInfo.full_name}</Text>
             
             {/* Calificación Promedio */} 
             <View style={styles.ratingSummary}>
                {reviewCount > 0 ? (
                  <>
                    <StarRating rating={averageRating} size={24} />
                    <Text style={styles.ratingText}>{averageRating.toFixed(1)} ({reviewCount} reseña{reviewCount !== 1 ? 's' : ''})</Text>
                  </>
                ) : (
                  <Text style={styles.noReviewsText}>Aún no hay reseñas.</Text>
                )}
             </View>
          </View>

          {/* Lista de Reseñas */} 
          <View style={styles.reviewsSection}>
            <Text style={styles.sectionTitle}>Reseñas Recientes</Text>
            {reviews.length > 0 ? (
              reviews.map((review, index) => (
                <View key={index} style={styles.reviewCard}>
                   <View style={styles.reviewHeader}>
                      <StarRating rating={review.rating} size={16} />
                      <Text style={styles.reviewDate}>{formatReviewDate(review.created_at)}</Text>
                   </View>
                   <View style={styles.commentContainer}>
                      <MessageSquare size={16} color={theme.colors.text.secondary} />
                      <Text style={styles.reviewComment}>{review.comment || 'Sin comentarios'}</Text>
                   </View>
                   {/* Opcional: Mostrar nombre del cliente */} 
                   <Text style={styles.clientName}>De: {review.client?.full_name || 'Cliente Anónimo'}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noReviewsText}>Este limpiador todavía no tiene comentarios.</Text>
            )}
          </View>
        </ScrollView>
      ) : (
         <View style={styles.centered}><Text style={styles.errorText}>No se encontró información del limpiador.</Text></View> // Caso raro pero posible
      )}
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
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 10 : 48, 
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.sm, // Sombra sutil al header
  },
  backButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.md,
  },
  headerTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  errorText: {
    ...theme.typography.body,
    color: theme.colors.error,
    textAlign: 'center',
  },
  content: {
    padding: theme.spacing.lg,
  },
  cleanerInfoSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
  },
  avatarContainer: {
      marginBottom: theme.spacing.lg,
  },
  avatar: {
      width: 100,
      height: 100,
      borderRadius: 50, // Circular
      borderWidth: 2,
      borderColor: theme.colors.primary, // Un borde sutil
  },
  avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: theme.colors.border, // Fondo grisáceo
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.colors.primary, 
  },
  cleanerName: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
    textAlign: 'center', // Centrar nombre bajo el avatar
  },
  ratingSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  ratingText: {
     ...theme.typography.body,
     color: theme.colors.text.secondary,
     marginLeft: theme.spacing.sm,
  },
  noReviewsText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  reviewsSection: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  reviewCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.shadows.xs,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  reviewDate: {
    ...theme.typography.caption,
    color: theme.colors.text.secondary,
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Alinear icono arriba si el texto es largo
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.sm,
  },
  reviewComment: {
    ...theme.typography.body,
    color: theme.colors.text.primary,
    flex: 1, // Para que el texto se ajuste
  },
   clientName: {
     ...theme.typography.caption,
     color: theme.colors.text.tertiary,
     marginTop: theme.spacing.xs,
     textAlign: 'right',
   }
}); 