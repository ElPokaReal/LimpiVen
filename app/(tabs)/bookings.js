import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Clock, MapPin } from 'lucide-react-native';

export default function BookingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Reservas</Text>
      </View>

      <View style={styles.bookingsList}>
        <TouchableOpacity style={styles.bookingCard}>
          <View style={styles.bookingHeader}>
            <Text style={styles.bookingType}>Limpieza Regular</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Programado</Text>
            </View>
          </View>
          
          <View style={styles.bookingDetails}>
            <View style={styles.detailRow}>
              <Clock size={16} color="#666" />
              <Text style={styles.detailText}>Mañana, 10:00 AM</Text>
            </View>
            <View style={styles.detailRow}>
              <MapPin size={16} color="#666" />
              <Text style={styles.detailText}>Calle Principal #123</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.bookingCard}>
          <View style={styles.bookingHeader}>
            <Text style={styles.bookingType}>Limpieza Profunda</Text>
            <View style={[styles.statusBadge, styles.completedBadge]}>
              <Text style={[styles.statusText, styles.completedText]}>Completado</Text>
            </View>
          </View>
          
          <View style={styles.bookingDetails}>
            <View style={styles.detailRow}>
              <Clock size={16} color="#666" />
              <Text style={styles.detailText}>15 Mar, 2:00 PM</Text>
            </View>
            <View style={styles.detailRow}>
              <MapPin size={16} color="#666" />
              <Text style={styles.detailText}>Av. Central #456</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  bookingsList: {
    padding: 16,
    gap: 16,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bookingType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusBadge: {
    backgroundColor: '#EBF5FF',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  completedBadge: {
    backgroundColor: '#E8F5E9',
  },
  completedText: {
    color: '#4CAF50',
  },
  bookingDetails: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
});