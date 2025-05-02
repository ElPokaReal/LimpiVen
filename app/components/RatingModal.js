import React, { useState, useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Star, X } from 'lucide-react-native';
// import { theme } from '../theme'; // Remove direct import
import { useTheme } from '../../constants/ThemeContext'; // Import useTheme (adjust path if needed)

const RatingModal = ({ visible, onClose, onSubmit, bookingServiceName }) => { // Renamed isVisible to visible for clarity
  const { theme } = useTheme(); // Use theme hook
  const styles = getStyles(theme); // Get styles from theme

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when modal becomes visible
  useEffect(() => {
    if (visible) {
      setRating(0);
      setComment('');
      setIsSubmitting(false);
    }
  }, [visible]);

  const handleRating = (rate) => {
    setRating(rate);
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Por favor, selecciona una calificación (1-5 estrellas).');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(rating, comment);
      // Parent component handles closing and success/error toasts
    } catch (error) {
      console.log("Error submitting rating (handled by parent):", error);
    } finally {
      setIsSubmitting(false); // Ensure loading state is reset
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
             <TouchableOpacity style={styles.modalContainer} activeOpacity={1} onPress={(e) => e.stopPropagation()}>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <X size={24} color={theme.colors.text.secondary} />
                </TouchableOpacity>
                
                <Text style={styles.modalTitle}>Califica "{bookingServiceName || 'el servicio'}"</Text>

                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => handleRating(star)} activeOpacity={0.7}>
                      <Star 
                        size={40} 
                        color={star <= rating ? theme.colors.warning : theme.colors.border} 
                        fill={star <= rating ? theme.colors.warning : 'none'} // Use theme colors
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.commentLabel}>Añadir un comentario (opcional):</Text>
                <TextInput
                  style={styles.commentInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Describe tu experiencia..."
                  placeholderTextColor={theme.colors.text.placeholder} // Use theme placeholder color
                  value={comment}
                  onChangeText={setComment}
                  editable={!isSubmitting}
                />

                <TouchableOpacity 
                  style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={isSubmitting || rating === 0} // Disable if no rating selected
                >
                  {isSubmitting ? (
                      <ActivityIndicator color={theme.colors.surface} /> // Use surface color for loader
                  ) : (
                     <Text style={styles.submitButtonText}>Enviar Calificación</Text>
                  )}
                 
                </TouchableOpacity>
            </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Function to generate styles based on the theme
const getStyles = (theme) => StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Semi-transparent background
    padding: theme.spacing.md, // Add padding to avoid edges
  },
  modalContainer: {
    width: '100%', // Take full width within padding
    maxWidth: 400, // Max width for larger screens
    backgroundColor: theme.colors.surface, // Use theme surface color
    borderRadius: theme.borderRadius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    ...theme.shadows.lg, // Use theme shadow
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    padding: theme.spacing.xs, // Add padding for easier tap
    zIndex: 1, // Ensure it's above other elements
  },
  modalTitle: {
    ...theme.typography.h2,
    color: theme.colors.text.primary, // Use theme text color
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg, // Ensure title doesn't overlap close button
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  commentLabel: {
    ...theme.typography.label,
    color: theme.colors.text.secondary, // Use theme text color
    alignSelf: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  commentInput: {
    width: '100%',
    minHeight: 100, // Use minHeight
    backgroundColor: theme.colors.surfaceVariant, // Use theme color
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border, // Use theme border color
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    textAlignVertical: 'top',
    ...theme.typography.body1,
    color: theme.colors.text.primary, // Use theme text color
  },
  submitButton: {
    backgroundColor: theme.colors.primary, // Use theme primary color
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.lg,
    width: '100%',
    alignItems: 'center',
    ...theme.shadows.md,
  },
   submitButtonDisabled: {
       backgroundColor: theme.colors.primary + '80', // Use theme disabled style (alpha)
       opacity: 0.7,
   },
  submitButtonText: {
    ...theme.typography.button,
    color: theme.colors.surface, // Use theme surface color (text on primary)
  },
});

export default RatingModal; 