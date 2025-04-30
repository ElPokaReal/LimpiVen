import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Star, X } from 'lucide-react-native';
import { theme } from '../theme'; // Ajusta la ruta si es necesario

const RatingModal = ({ isVisible, onClose, onSubmit, bookingServiceName }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isVisible) {
      setRating(0);
      setComment('');
      setIsSubmitting(false);
    }
  }, [isVisible]);

  const handleRating = (rate) => {
    setRating(rate);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Por favor, selecciona una calificación (1-5 estrellas).'); // Simple alert
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment); // Llama a la función pasada por props
      // El cierre del modal y el toast de éxito/error se manejan en el componente padre (BookingDetail)
    } catch (error) {
      // El error ya se maneja en el componente padre
      console.log("Error caught in modal, but handled by parent", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose} // Para botón de retroceso en Android
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={theme.colors.text.secondary} />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Califica {bookingServiceName}</Text>

            {/* Selector de Estrellas */}
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => handleRating(star)} activeOpacity={0.7}>
                  <Star 
                    size={40} 
                    color={star <= rating ? theme.colors.warning : theme.colors.border} 
                    fill={star <= rating ? theme.colors.warning : 'none'} 
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* Comentario */}
            <Text style={styles.commentLabel}>Añadir un comentario (opcional):</Text>
            <TextInput
              style={styles.commentInput}
              multiline
              numberOfLines={4}
              placeholder="Describe tu experiencia..."
              placeholderTextColor={theme.colors.text.hint}
              value={comment}
              onChangeText={setComment}
            />

            {/* Botón de Envío */}
            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                  <ActivityIndicator color={theme.colors.white} />
              ) : (
                 <Text style={styles.submitButtonText}>Enviar Calificación</Text>
              )}
             
            </TouchableOpacity>

          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    width: '90%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.lg,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  commentLabel: {
    ...theme.typography.label,
    color: theme.colors.text.secondary,
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  commentInput: {
    width: '100%',
    height: 100,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md, // Para que el texto empiece arriba en multiline
    marginBottom: theme.spacing.xl,
    textAlignVertical: 'top', // Para Android
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    alignItems: 'center',
    ...theme.shadows.md,
  },
   submitButtonDisabled: {
       backgroundColor: theme.colors.disabled, // Color más apagado
   },
  submitButtonText: {
    ...theme.typography.button,
    color: theme.colors.white,
    fontWeight: 'bold',
  },
});

export default RatingModal; 