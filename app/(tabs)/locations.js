import { View, Text, StyleSheet } from 'react-native';

export default function Locations() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ubicaciones</Text>
      <Text>Aquí puedes ver tus ubicaciones guardadas.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});
