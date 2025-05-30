import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={SCREEN_OPTIONS}>
      <Stack.Screen name="login" options={LOGIN_OPTIONS} />
      <Stack.Screen name="signup" options={SIGNUP_OPTIONS} />
      <Stack.Screen name="reset-password" options={RESET_PASSWORD_OPTIONS} />
      <Stack.Screen name="create-profile" options={CREATE_PROFILE_OPTIONS} />
      {/* Add more screens here if needed */}
    </Stack>
  );
}

const SCREEN_OPTIONS = {
  animation: 'slide_from_right', // for android
} as const;

const LOGIN_OPTIONS = {
  headerShown: false,
  title: 'Sign In',
  animation: 'slide_from_right',
} as const;

const SIGNUP_OPTIONS = {
  headerShown: false,
  title: 'Sign Up',
  animation: 'slide_from_right',
} as const;

const CREATE_PROFILE_OPTIONS = {
  headerShown: false,
  title: 'Create Profile',
  animation: 'slide_from_right',
} as const;

const RESET_PASSWORD_OPTIONS = {
  headerShown: false,
  title: 'Reset Password',
  animation: 'slide_from_right',
} as const;
