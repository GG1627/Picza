import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signUpWithEmail() {
    if (loading) return;

    // Validate passwords match
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Please make sure your passwords match.');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
      return;
    }

    // Ensure it's a UFL email
    if (!email.toLowerCase().endsWith('@ufl.edu')) {
      Alert.alert('Invalid Email', 'Please use your @ufl.edu school email.');
      return;
    }

    setLoading(true);
    try {
      // First check if the user already exists
      const { data: existingUser, error: checkError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (existingUser?.user) {
        setLoading(false);
        Alert.alert(
          'Account Exists',
          'An account with this email already exists. Would you like to sign in instead?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Sign In',
              onPress: () => {
                router.replace('/(auth)/login');
              },
            },
          ]
        );
        return;
      }

      // If no existing user, proceed with signup
      const {
        data: { session },
        error,
      } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        if (error.message.includes('already registered')) {
          Alert.alert(
            'Account Exists',
            'An account with this email already exists. Would you like to sign in instead?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Sign In',
                onPress: () => {
                  router.replace('/(auth)/login');
                },
              },
            ]
          );
        } else {
          Alert.alert('Error', error.message);
        }
        setLoading(false);
        return;
      }

      if (session) {
        console.log('Successfully signed up as:', session.user.email);
        router.replace('/(auth)/create-profile');
      } else {
        Alert.alert(
          'Verification Required',
          'Please check your email for a verification link to complete your registration.'
        );
      }
    } catch (error) {
      console.error('Unexpected error during signup:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white">
      {/* Background Pattern */}
      <View className="absolute inset-0 bg-[#FFE4D6] opacity-30" />

      <View className="flex-1 items-center justify-center px-8">
        <View className="w-full max-w-sm space-y-8">
          {/* Header Section */}
          <View className="items-center space-y-3">
            <Text className="text-3xl font-bold text-gray-900">Create Account</Text>
            <Text className="text-base text-gray-600">Join our food community</Text>
          </View>

          {/* Form Section */}
          <View className="space-y-4">
            <View className="space-y-2">
              <Text className="text-sm font-medium text-gray-700">School Email</Text>
              <TextInput
                placeholder="Enter your @ufl.edu email"
                value={email}
                onChangeText={setEmail}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-gray-900 shadow-sm"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View className="space-y-2">
              <Text className="text-sm font-medium text-gray-700">Password</Text>
              <TextInput
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-gray-900 shadow-sm"
                secureTextEntry
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View className="space-y-2">
              <Text className="text-sm font-medium text-gray-700">Confirm Password</Text>
              <TextInput
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-gray-900 shadow-sm"
                secureTextEntry
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          {/* Button Section */}
          <View className="space-y-4 pt-4">
            <Pressable
              className="w-full rounded-xl bg-[#FFB38A] py-3.5 shadow-sm"
              onPress={signUpWithEmail}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center text-base font-semibold text-white">
                  Create Account
                </Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => {
                if (!loading) router.replace('/(auth)/login');
              }}
              className="mt-4">
              <Text className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Text className="font-semibold text-[#FFB38A]">Sign in</Text>
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
