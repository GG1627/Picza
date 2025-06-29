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
import { useColorScheme } from '../../lib/useColorScheme';
import MeshGradient from '../../components/MeshGradient';

export default function ResetPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { colorScheme, colors } = useColorScheme();

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
        redirectTo: 'picza://new-password',
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
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View className="flex-1">
        <MeshGradient intensity={40} />
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-full max-w-sm space-y-8">
            {/* Header Section */}
            <View className="items-center space-y-4">
              <View className="items-center">
                <Text
                  className={`mb-2 font-pattaya text-[5rem] ${colorScheme === 'dark' ? 'text-[#ff9f6b]' : 'text-[#07020D]'}`}>
                  Picza
                </Text>
                <Text
                  className={`mb-1 text-2xl font-medium ${colorScheme === 'dark' ? 'text-white' : 'text-[#07020D]'}`}>
                  Reset Password
                </Text>
                <Text
                  className={`text-center text-base ${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Enter your email address and we'll send you a link to reset your password
                </Text>
              </View>
            </View>

            {/* Form Section */}
            <View className="space-y-5">
              <View className="mt-4 space-y-2">
                <Text
                  className={`ml-1 text-sm font-medium ${colorScheme === 'dark' ? 'text-gray-300' : 'text-[#07020D]'}`}>
                  School Email
                </Text>
                <View className="relative">
                  <TextInput
                    placeholder="Enter your @.edu email"
                    value={email}
                    onChangeText={setEmail}
                    className={`w-full rounded-2xl border px-4 py-4 pl-12 shadow-sm ${colorScheme === 'dark' ? 'border-[#ff9f6b]/20 bg-[#1a1a1a] text-white' : 'border-[#07020D] bg-[#f9f9f9] text-[#07020D]'}`}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#9ca3af'}
                    style={{ textAlignVertical: 'center' }}
                  />
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={colorScheme === 'dark' ? '#ff9f6b' : '#07020D'}
                    className="absolute left-4 top-4"
                  />
                </View>
              </View>
            </View>

            {/* Button Section */}
            <View className="space-y-4 pt-4">
              <Pressable
                className={`w-full rounded-2xl ${colorScheme === 'dark' ? 'bg-[#ff9f6b]' : 'bg-[#f77f5e]'} py-4 shadow-sm`}
                onPress={handleResetPassword}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    className={`text-center text-base font-semibold ${colorScheme === 'dark' ? 'text-white' : 'text-white'}`}>
                    Send Reset Link
                  </Text>
                )}
              </Pressable>

              <View className="mt-4 flex-row items-center justify-center space-x-2">
                <View
                  className={`h-[1px] flex-1 ${colorScheme === 'dark' ? 'bg-gray-500' : 'bg-gray-600'}`}
                />
                <Text
                  className={`text-gray-500 ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#0a0a0a]'}`}>
                  or
                </Text>
                <View
                  className={`h-[1px] flex-1 ${colorScheme === 'dark' ? 'bg-gray-500' : 'bg-gray-600'}`}
                />
              </View>

              <View className="mt-2">
                <View className="flex-row items-center justify-center">
                  <Text
                    className={`text-sm ${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-800'}`}>
                    Remember your password?{' '}
                  </Text>
                  <Pressable
                    onPress={() => {
                      if (!loading) router.replace('/(auth)/login');
                    }}>
                    <Text
                      className={`font-semibold ${colorScheme === 'dark' ? 'text-[#ff9f6b]' : 'text-[#f77f5e]'}`}>
                      Log in
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
