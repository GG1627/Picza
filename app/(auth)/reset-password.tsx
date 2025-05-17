import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ResetPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleResetPassword() {
    if (loading) return;

    // Validate email
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Ensure it's a UFL email
    if (!email.toLowerCase().endsWith('@ufl.edu')) {
      Alert.alert('Invalid Email', 'Please use your @ufl.edu school email.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'picza://reset-password',
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert(
          'Reset Link Sent',
          "Please check your email for a password reset link. If you don't see it, check your spam folder.",
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 bg-[#ffddc1]">
        {/* Decorative Elements */}
        <View className="absolute right-0 top-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-[#da4314] opacity-10" />
        <View className="absolute bottom-0 left-0 -mb-24 -ml-24 h-48 w-48 rounded-full bg-[#FFB38A] opacity-10" />

        <View className="flex-1 items-center justify-center px-8">
          <View className="w-full max-w-sm space-y-8">
            {/* Header Section */}
            <View className="items-center space-y-4">
              <Image
                source={require('../../images/logo.png')}
                className="mb-2 h-28 w-28"
                resizeMode="contain"
              />
              <View className="items-center">
                <Text className="mb-2 text-5xl font-bold text-[#da4314]">Picza</Text>
                <Text className="mb-1 text-2xl font-medium text-gray-700">Reset Password</Text>
                <Text className="text-center text-base text-gray-600">
                  Enter your email address and we'll send you a link to reset your password
                </Text>
              </View>
            </View>

            {/* Form Section */}
            <View className="space-y-5">
              <View className="space-y-2">
                <Text className="ml-1 text-sm font-medium text-gray-700">School Email</Text>
                <View className="relative">
                  <TextInput
                    placeholder="Enter your @ufl.edu email"
                    value={email}
                    onChangeText={setEmail}
                    className="w-full rounded-2xl border border-[#da4314] bg-white/90 px-4 py-4 pl-12 text-gray-900 shadow-sm"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#9ca3af"
                  />
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#da4314"
                    className="absolute left-4 top-4"
                  />
                </View>
              </View>
            </View>

            {/* Button Section */}
            <View className="space-y-4 pt-4">
              <Pressable
                className="w-full rounded-2xl bg-[#da4314] py-4 shadow-sm"
                onPress={handleResetPassword}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-center text-base font-semibold text-white">
                    Send Reset Link
                  </Text>
                )}
              </Pressable>

              <View className="mt-2 flex-row items-center justify-center space-x-2">
                <View className="h-[1px] flex-1 bg-gray-400" />
                <Text className="text-gray-500">or</Text>
                <View className="h-[1px] flex-1 bg-gray-400" />
              </View>

              <Pressable
                onPress={() => {
                  if (!loading) router.replace('/(auth)/login');
                }}
                className="mt-2">
                <Text className="text-center text-sm text-gray-600">
                  Remember your password?{' '}
                  <Text className="font-semibold text-[#da4314]">Sign in</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
