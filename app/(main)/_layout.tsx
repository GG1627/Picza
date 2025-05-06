import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="home" options={HOME_OPTIONS} />
      {/* Add more screens here if needed */}
    </Stack>
  );
}

const SCREEN_OPTIONS = {
  animation: 'ios_from_right', // for android
} as const;

const HOME_OPTIONS = {
  headerShown: false,
  title: 'Home Screen',
} as const;
