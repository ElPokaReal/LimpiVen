import React from 'react';
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
import { ChevronLeft, Moon, Sun } from 'lucide-react-native';
import { useTheme } from '../constants/ThemeContext';

export default function AppearanceSettingsScreen() {
  const router = useRouter();
  const { theme, themeMode, setThemeMode } = useTheme();

  const toggleDarkMode = () => {
    const newMode = themeMode === 'dark' ? 'light' : 'dark';
    setThemeMode(newMode);
  };

  const styles = getStyles(theme);

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Apariencia</Text>
        <View style={styles.headerPlaceholder} />
      </View>


      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionContainer}>
          <View style={styles.itemContainer}>
            <View style={styles.itemContent}>
              {themeMode === 'dark' ? (
                <Moon size={22} color={theme.colors.primary} />
              ) : (
                <Sun size={22} color={theme.colors.primary} />
              )}
              <Text style={styles.itemText}>Modo Oscuro</Text>
            </View>
            <Switch
              trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
              thumbColor={theme.colors.surface}
              ios_backgroundColor={theme.colors.border}
              onValueChange={toggleDarkMode}
              value={themeMode === 'dark'}
            />
          </View>

        </View>

         <Text style={styles.infoText}>
            Nota: La implementación completa del modo oscuro requiere gestionar el tema globalmente.
          </Text>
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
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
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
    paddingVertical: theme.spacing.md + 2,
    paddingHorizontal: theme.spacing.md,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  itemText: {
    ...theme.typography.body1,
    color: theme.colors.text.primary,
    fontSize: 16,
  },
  infoText: {
      ...theme.typography.caption,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginTop: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
  },
}); 