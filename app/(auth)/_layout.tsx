import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="login" options={LOGIN_OPTIONS} />
      <Stack.Screen name="signup" options={SIGNUP_OPTIONS} />
      {/* Add more screens here if needed */}
    </Stack>
  );
}

const SCREEN_OPTIONS = {
  animation: 'ios_from_right', // for android
} as const;

const LOGIN_OPTIONS = {
  headerShown: false,
  title: 'Sign In',
} as const;

const SIGNUP_OPTIONS = {
  headerShown: false,
  title: 'Sing Up',
} as const;
