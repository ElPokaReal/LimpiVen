import { Stack } from 'expo-router';
import { theme } from './theme';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: theme.colors.surface,
        headerTitleStyle: {
          ...theme.typography.h3,
          color: theme.colors.surface,
        },
        headerShadowVisible: false,
        headerBackTitleVisible: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="auth" 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="employee-signup" 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="(tabs)" 
        options={{ headerShown: false }}
      />
    </Stack>
  );
}