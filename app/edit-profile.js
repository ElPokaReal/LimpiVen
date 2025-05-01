import { View, Text, StyleSheet, TextInput, TouchableOpacity, Image, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Save, Camera } from 'lucide-react-native';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { theme } from './theme';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-js';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function EditProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    avatar_url: null,
  });
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const id = await AsyncStorage.getItem('id');
        const name = await AsyncStorage.getItem('full_name');
        const email = await AsyncStorage.getItem('email');
        const avatar_url = await AsyncStorage.getItem('avatar_url');
        
        if (!id) {
          Toast.show({type:'error', text1:'Error', text2:'ID de usuario no encontrado.'});
          router.back();
          return;
        }
        setUserId(id);

        const { data: userDB, error: dbError } = await supabase
          .from('users')
          .select('phone_number, avatar_url')
          .eq('id', id)
          .single();
          
        if (dbError) {
          console.warn("Error fetching initial phone/avatar from DB:", dbError.message);
        }

        setFormData({
          name: name || '',
          email: email || '',
          phone: userDB?.phone_number || '',
          avatar_url: userDB?.avatar_url || avatar_url || null,
        });
      } catch (error) {
        console.error("Error loading initial profile data:", error);
        Toast.show({type:'error', text1:'Error', text2:'No se pudieron cargar los datos.'});
      } finally {
        setLoading(false);
      }
    };
    loadInitialData();
  }, [router]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Toast.show({type: 'info', text1: 'Permiso Necesario', text2: 'Se necesita acceso a la galería para cambiar el avatar.'});
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });
    
      if (!result.canceled && result.assets && result.assets.length > 0) {
        console.log("Image selected:", result.assets[0].uri);
        setSelectedImageUri(result.assets[0].uri);
        setFormData(prev => ({ ...prev, avatar_base64: result.assets[0].base64 })); 
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Toast.show({type: 'error', text1: 'Error', text2: 'No se pudo seleccionar la imagen.'});
    } 
  };

  const handleSave = async () => {
    if (!userId) {
      Toast.show({ type: 'error', text1: 'Error', text2: 'ID de usuario no válido.' });
      return;
    }

    setLoading(true);
    setUploading(false);
    let newAvatarUrl = formData.avatar_url;

    try {
      if (selectedImageUri && formData.avatar_base64) {
        setUploading(true);
        console.log("Uploading new avatar...");
        const base64 = formData.avatar_base64;
        const filePath = `${userId}/${uuidv4()}.jpeg`;
        const contentType = 'image/jpeg';

        const arrayBuffer = decode(base64);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, arrayBuffer, {
            contentType,
            upsert: true,
          });

        if (uploadError) {
          console.error("Error uploading avatar:", uploadError);
          throw new Error('Error al subir la imagen: ' + uploadError.message);
        }

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        if (!urlData || !urlData.publicUrl) {
          console.error("Could not get public URL for:", filePath);
          throw new Error('No se pudo obtener la URL pública de la imagen.');
        }
        
        newAvatarUrl = urlData.publicUrl;
        console.log("Avatar uploaded successfully. New URL:", newAvatarUrl);
        setUploading(false);
      }

      console.log("Updating user profile with data:", {
        full_name: formData.name,
        email: formData.email,
        phone_number: formData.phone,
        avatar_url: newAvatarUrl,
      });

      const { error: updateError } = await supabase
        .from('users')
        .update({
          full_name: formData.name,
          phone_number: formData.phone,
          avatar_url: newAvatarUrl,
        })
        .eq('id', userId);

      if (updateError) {
        console.error("Error updating profile:", updateError);
        throw new Error('Error al actualizar el perfil: ' + updateError.message);
      }

      await AsyncStorage.setItem('full_name', formData.name || '');
      await AsyncStorage.setItem('avatar_url', newAvatarUrl || '');

      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: 'Perfil actualizado correctamente'
      });
      router.back();

    } catch (error) {
      console.error("Save profile error:", error);
      Toast.show({
        type: 'error',
        text1: 'Error al Guardar',
        text2: error.message || 'Ocurrió un error inesperado.'
      });
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  const avatarSource = selectedImageUri 
    ? { uri: selectedImageUri } 
    : formData.avatar_url 
      ? { uri: formData.avatar_url } 
      : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer} disabled={loading}>
          {avatarSource ? (
            <Image source={avatarSource} style={styles.avatar} resizeMode="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <User size={60} color={theme.colors.primary} />
            </View>
          )}
          <View style={styles.cameraIconContainer}>
            <Camera size={20} color={theme.colors.white} />
          </View>
          {uploading && (
            <ActivityIndicator size="large" color={theme.colors.primary} style={styles.uploadIndicator} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nombre Completo</Text>
        <TextInput
          style={styles.input}
          placeholder="Tu nombre"
          value={formData.name}
          onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
          editable={!loading}
        />
        <Text style={styles.label}>Correo Electrónico</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          placeholder="tu@email.com"
          value={formData.email}
          keyboardType="email-address"
          editable={false}
          selectTextOnFocus={false}
        />
        <Text style={styles.label}>Teléfono</Text>
        <TextInput
          style={styles.input}
          placeholder="Tu número de teléfono"
          value={formData.phone}
          onChangeText={(value) => setFormData(prev => ({ ...prev, phone: value }))}
          keyboardType="phone-pad"
          editable={!loading}
        />
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, (loading || uploading) && styles.buttonDisabled]} 
        onPress={handleSave}
        disabled={loading || uploading}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.white} style={{marginRight: 10}}/>
        ) : (
          <Save size={20} color={theme.colors.white} />
        )}
        <Text style={styles.saveButtonText}>
          {uploading ? 'Subiendo imagen...' : loading ? 'Guardando...' : 'Guardar Cambios'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.border,
    ...theme.shadows.md,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: theme.colors.primary,
    borderRadius: 15,
    padding: 6,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  uploadIndicator: {
    position: 'absolute',
  },
  form: {
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.xs,
    marginLeft: theme.spacing.sm,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    fontSize: 16,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.xs,
  },
  disabledInput: {
    backgroundColor: theme.colors.disabledBackground,
    color: theme.colors.disabledText,
    borderColor: theme.colors.disabledBorder,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    marginTop: theme.spacing.xl,
    ...theme.shadows.md,
  },
  saveButtonText: {
    color: theme.colors.white,
    ...theme.typography.button,
    fontSize: 16,
    marginLeft: theme.spacing.sm,
    fontWeight: 'bold',
  },
  buttonDisabled: {
    backgroundColor: theme.colors.disabledBackground,
    borderColor: theme.colors.disabledBorder,
    ...theme.shadows.none,
  },
}); 