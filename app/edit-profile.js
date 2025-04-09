import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Save } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import Toast from 'react-native-toast-message';

export default function EditProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  useEffect(() => {
    const loadUserData = async () => {
      const name = await AsyncStorage.getItem('full_name');
      const email = await AsyncStorage.getItem('email');
      const userId = await AsyncStorage.getItem('id');
      
      if (userId) {
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();

        if (user) {
          setFormData({
            name: user.full_name,
            email: user.email,
            phone: user.phone_number
          });
        }
      }
    };
    loadUserData();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem('id');

      if (!userId) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Usuario no encontrado'
        });
        return;
      }

      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.name,
          email: formData.email,
          phone_number: formData.phone
        })
        .eq('id', userId);

      if (error) {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Error al actualizar el perfil'
        });
        return;
      }

      // Actualizar AsyncStorage
      await AsyncStorage.setItem('full_name', formData.name);
      await AsyncStorage.setItem('email', formData.email);

      Toast.show({
        type: 'success',
        text1: 'Éxito',
        text2: 'Perfil actualizado correctamente'
      });
      router.back();
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

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <Text style={styles.profileName}>Editar Perfil</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Nombre"
          value={formData.name}
          onChangeText={(value) => setFormData(prev => ({ ...prev, name: value }))}
        />
        <TextInput
          style={styles.input}
          placeholder="Correo Electrónico"
          value={formData.email}
          onChangeText={(value) => setFormData(prev => ({ ...prev, email: value }))}
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Teléfono"
          value={formData.phone}
          onChangeText={(value) => setFormData(prev => ({ ...prev, phone: value }))}
          keyboardType="phone-pad"
        />
      </View>

      <TouchableOpacity 
        style={[styles.saveButton, loading && styles.buttonDisabled]} 
        onPress={handleSave}
        disabled={loading}
      >
        <Save size={24} color="#fff" />
        <Text style={styles.saveButtonText}>
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'center', // Centra el contenido verticalmente
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6200EE',
  },
  form: {
    marginTop: 16,
  },
  input: {
    height: 50,
    borderColor: '#E0E0E0',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6200EE',
    padding: 16,
    borderRadius: 8,
    marginTop: 32,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    marginLeft: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
}); 