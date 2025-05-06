import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="login" options={LOGIN_OPTIONS} />
      {/* Add more screens here if needed */}
    </Stack>
  );
}

const SCREEN_OPTIONS = {
  animation: 'ios_from_right', // for android
} as const;

const LOGIN_OPTIONS = {
  headerShown: false,
  title: 'Home Screen',
} as const;
