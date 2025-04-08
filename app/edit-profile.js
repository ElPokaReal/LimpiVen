import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { User, Save } from 'lucide-react-native';
import { useState } from 'react';

export default function EditProfile() {
  const router = useRouter();
  const [name, setName] = useState('John Doe');
  const [email, setEmail] = useState('john.doe@example.com');

  const handleSave = () => {
    // Lógica para guardar los cambios
    router.back();
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
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Correo Electrónico"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Save size={24} color="#fff" />
        <Text style={styles.saveButtonText}>Guardar Cambios</Text>
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
}); 