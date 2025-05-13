import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '../constants/ThemeContext';
import { ArrowLeft, CheckCircle, ShoppingCart } from 'lucide-react-native'; // Importa iconos necesarios

// Datos de ejemplo (reemplazar con datos reales o llamada a API)
const packageDetailsData = {
  basic: {
    id: 'basic',
    title: 'Paquete Básico',
    price: 35,
    description: 'Ideal para un mantenimiento regular y mantener tu espacio siempre limpio.',
    features: [
      'Cocina: Limpieza del fregadero y grifos.',
      'Cocina: Barrido y trapeado del piso.',
      'Baños: Limpieza del inodoro, lavabo y grifos.',
      'Baños: Barrido y trapeado del piso.',
      'Habitaciones: Barrido y trapeado del piso.',
      'Habitaciones: Limpieza de superficies visibles (mesas, estantes).',
      'Sala: Barrido y trapeado del piso.',
      'Sala: Limpieza de superficies visibles.',
      'Frecuencia: Semanal.',
      'Alcance: Hasta 3 habitaciones, 1 sala, 1 cocina, 1 baño.'
    ],
    imageUri: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?q=80&w=1740' // Imagen genérica
  },
  medium: {
    id: 'medium',
    title: 'Paquete Mediano',
    price: 50,
    description: 'Un servicio más completo que incluye limpieza profunda básica y de ventanas.',
    features: [
      'Cocina: Desinfección completa de mesones y superficies.',
      'Cocina: Limpieza exhaustiva de fregadero, grifos y exterior de electrodomésticos.',
      'Cocina: Barrido y trapeado del piso.',
      'Baños: Limpieza profunda de inodoro, lavabo y ducha/bañera.',
      'Baños: Limpieza de espejos y superficies.',
      'Baños: Barrido y trapeado del piso.',
      'Habitaciones: Barrido y trapeado del piso.',
      'Habitaciones: Limpieza de polvo en muebles visibles.',
      'Sala: Barrido y trapeado del piso.',
      'Sala: Limpieza de superficies visibles.',
      'Frecuencia: Cada dos semanas.',
      'Alcance: Hasta 3 habitaciones, 1 sala, 1 cocina, hasta 2 baños.'
    ],
    imageUri: 'https://plus.unsplash.com/premium_photo-1676890412948-6c266ed0309e?q=80&w=1742' // Imagen genérica
  },
  premium: {
    id: 'premium',
    title: 'Paquete Premium Minucioso',
    price: 90,
    description: 'La limpieza más profunda y detallada para dejar tu hogar impecable y desinfectado.',
    features: [
      'Cocina: Desinfección de grifos/mesones (atención a contacto frecuente).',
      'Cocina: Limpieza profunda de azulejos.',
      'Cocina: Limpieza a fondo de horno (interior/exterior), microondas, nevera (interior/exterior).',
      'Baños: Desinfección completa del inodoro (interior/exterior/base).',
      'Baños: Limpieza minuciosa de lavabo, grifos, encimeras.',
      'Baños: Limpieza profunda de ducha/bañera (moho, juntas).',
      'Baños: Limpieza de espejos sin rayas y desinfección de accesorios.',
      'Habitaciones: Limpieza general de polvo en todas las superficies.',
      'Habitaciones: Arreglo de camas (opcional cambio de sábanas).',
      'Habitaciones: Organización de closets.',
      'Habitaciones: Limpieza y organización de peinadoras.',
      'Alfombras: Aspirado profundo y tratamiento de manchas.',
      'Tapicerías: Limpieza a fondo según tipo de tela.',
      'Ventanas: Limpieza interior.',
      'Ventanas: Limpieza exterior (marcos/persianas).',
      'Superficies delicadas: Limpieza con productos específicos.',
      'Desinfección general: Manijas, interruptores, etc.',
      'Frecuencia: Personalizable.',
      'Alcance: Hasta 6 habitaciones, 1 sala, 1 cocina, hasta 4 baños.'
    ],
    imageUri: 'https://images.unsplash.com/photo-1586992953162-89611b6d3857?q=80&w=1665' // Imagen genérica
  }
};

export default function ServiceDetailsScreen() {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { serviceType } = useLocalSearchParams(); // Obtiene el ID del paquete de los parámetros de ruta

  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simular carga de datos o buscar en los datos de ejemplo
    setLoading(true);
    const data = packageDetailsData[serviceType];
    if (data) {
      setDetails(data);
    } else {
      // Manejar caso donde el serviceType no es válido
      console.error("Tipo de servicio no encontrado:", serviceType);
      // Podrías redirigir o mostrar un mensaje de error
    }
    setLoading(false); 
  }, [serviceType]);

  const handleBooking = () => {
    // Navegar a la pantalla de solicitud de servicio, pasando el ID del paquete
    router.push({ pathname: '/request-service', params: { packageId: details?.id } });
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  if (!details) {
    return (
      <View style={styles.container}>
         <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Detalles del servicio no disponibles.</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.colors.primary} /> 
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detalles del Servicio</Text>
          <View style={{ width: 40 }} /> {/* Espaciador para centrar título */}
      </View>

      {details.imageUri && (
          <Image source={{ uri: details.imageUri }} style={styles.serviceImage} />
      )}

      <View style={styles.contentContainer}>
        <Text style={styles.title}>{details.title}</Text>
        <Text style={styles.price}>${details.price}</Text>
        <Text style={styles.description}>{details.description}</Text>

        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>¿Qué incluye?</Text>
          {details.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <CheckCircle size={18} color={theme.colors.success} style={styles.featureIcon} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>
       
      <TouchableOpacity style={styles.bookButton} onPress={handleBooking} activeOpacity={0.8}>
         <ShoppingCart size={20} color={theme.colors.surface} style={styles.buttonIcon} />
         <Text style={styles.bookButtonText}>Reservar este paquete</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.surface, // O background si prefieres
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingTop: 40, // Ajustar según sea necesario para evitar la barra de estado
  },
  backButton: {
    padding: theme.spacing.xs, // Área táctil más grande
  },
  headerTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  serviceImage: {
      width: '100%',
      height: 200, // Altura de la imagen
      marginBottom: theme.spacing.lg,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg, // Espacio antes del botón
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.sm,
    fontSize: 28,
  },
  price: {
    ...theme.typography.h2,
    color: theme.colors.primary,
    fontWeight: '700',
    marginBottom: theme.spacing.md,
    fontSize: 24,
  },
  description: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  featuresSection: {
    marginBottom: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.lg,
  },
  featuresTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  featureIcon: {
    marginRight: theme.spacing.sm,
  },
  featureText: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    flex: 1, // Para que el texto se ajuste si es largo
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    ...theme.shadows.sm,
    marginBottom: theme.spacing.xl, // Margen inferior
  },
  buttonIcon: {
    marginRight: theme.spacing.sm,
  },
  bookButtonText: {
    ...theme.typography.button,
    color: theme.colors.surface, // Texto blanco sobre el botón primario
  },
}); 