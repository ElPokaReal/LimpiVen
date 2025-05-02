import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Bell,
  Palette,
  User,
  ChevronRight,
  HelpCircle,
  Info,
} from 'lucide-react-native';
import { useTheme } from '../constants/ThemeContext';

export default function SettingsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const toggleNotifications = () =>
    setNotificationsEnabled((previousState) => !previousState);

  const styles = getStyles(theme);

  const renderSettingsItem = (icon, text, onPress, hasSwitch = false, switchValue, onSwitchChange) => (
    <TouchableOpacity style={styles.itemContainer} onPress={onPress} disabled={hasSwitch} activeOpacity={hasSwitch ? 1 : 0.7}>
      <View style={styles.itemContent}>
        {React.cloneElement(icon, { color: theme.colors.primary })}
        <Text style={styles.itemText}>{text}</Text>
      </View>
      {hasSwitch ? (
        <Switch
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor={theme.colors.surface}
          ios_backgroundColor={theme.colors.border}
          onValueChange={onSwitchChange}
          value={switchValue}
        />
      ) : (
        <ChevronRight size={20} color={theme.colors.text.secondary} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Ajustes</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>General</Text>
        <View style={styles.sectionContainer}>
          {renderSettingsItem(
            <Bell size={22} />,
            'Notificaciones',
            null,
            true,
            notificationsEnabled,
            toggleNotifications
          )}
          {renderSettingsItem(
            <Palette size={22} />,
            'Apariencia',
            () => router.push('appearance'),
            false
          )}
        </View>

        <Text style={styles.sectionTitle}>Cuenta</Text>
        <View style={styles.sectionContainer}>
          {renderSettingsItem(
            <User size={22} />,
            'Gestionar Cuenta',
            () => console.log('Navegar a Gestionar Cuenta')
          )}
        </View>

        <Text style={styles.sectionTitle}>Soporte </Text>
        <View style={styles.sectionContainer}>
          {renderSettingsItem(
            <HelpCircle size={22} />,
            'Centro de Ayuda',
            () => console.log('Navegar a Centro de Ayuda')
          )}
          {renderSettingsItem(
            <Info size={22} />,
            'Acerca de',
            () => console.log('Navegar a Acerca de')
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: Platform.OS === 'android' ? theme.spacing.xl + 10 : 50,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    ...theme.typography.h2,
    color: theme.colors.text.primary,
    textAlign: 'center',
    flex: 1,
  },
  headerPlaceholder: {
    width: 28 + theme.spacing.xs * 2,
  },
  scrollContent: {
    paddingBottom: theme.spacing.lg,
  },
  sectionTitle: {
    ...theme.typography.h3,
    color: theme.colors.text.secondary,
    paddingHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  sectionContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    marginHorizontal: theme.spacing.lg,
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  itemText: {
    ...theme.typography.body1,
    color: theme.colors.text.primary,
  },
}); 