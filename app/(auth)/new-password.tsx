import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../../lib/useColorScheme';
import MeshGradient from '../../components/MeshGradient';
import * as Linking from 'expo-linking';

export default function NewPassword() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  // Get the access token from URL params (set by Supabase)
  const params = useLocalSearchParams();

  // Debug: Log all parameters we receive
  useEffect(() => {
    console.log('=== NEW PASSWORD SCREEN DEBUG ===');
    console.log('All URL params:', params);

    // Try to get tokens from params first
    let tokenFromParams = params.access_token as string;
    let refreshFromParams = params.refresh_token as string;

    console.log('Tokens from params:', {
      accessToken: !!tokenFromParams,
      refreshToken: !!refreshFromParams,
    });

    // If not in params, try to get from current URL
    if (!tokenFromParams || !refreshFromParams) {
      Linking.getInitialURL().then((url) => {
        if (url) {
          console.log('Current URL:', url);

          // Extract from hash fragment
          if (url.includes('#')) {
            const hashFragment = url.split('#')[1] || '';
            const hashParams = new URLSearchParams(hashFragment);
            const hashAccessToken = hashParams.get('access_token');
            const hashRefreshToken = hashParams.get('refresh_token');

            console.log('Tokens from hash:', {
              accessToken: !!hashAccessToken,
              refreshToken: !!hashRefreshToken,
            });

            if (hashAccessToken && hashRefreshToken) {
              setAccessToken(hashAccessToken);
              setRefreshToken(hashRefreshToken);
            }
          }
        }
      });
    } else {
      setAccessToken(tokenFromParams);
      setRefreshToken(refreshFromParams);
    }
  }, [params]);

  useEffect(() => {
    const setupSession = async () => {
      console.log('Setting up session with tokens:', {
        accessToken: !!accessToken,
        refreshToken: !!refreshToken,
      });

      // If we have tokens, set the session
      if (accessToken && refreshToken) {
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error('Error setting session:', error);
            Alert.alert('Error', 'Failed to set up session. Please try the reset link again.');
            router.replace('/(auth)/reset-password');
            return;
          }

          if (data.session) {
            console.log('Session set successfully');
            setSessionReady(true);
          } else {
            console.error('No session data returned');
            Alert.alert('Error', 'Invalid reset link. Please request a new one.');
            router.replace('/(auth)/reset-password');
          }
        } catch (error) {
          console.error('Error setting up session:', error);
          Alert.alert('Error', 'Failed to set up session. Please try again.');
          router.replace('/(auth)/reset-password');
        }
      } else {
        console.log('No tokens found in URL params, checking for existing session');
        // Check if we already have a session (set by root layout)
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session) {
          console.log('Using existing session from root layout');
          setSessionReady(true);
        } else {
          console.error('No session available');
          Alert.alert('Error', 'No valid session found. Please request a new reset link.');
          router.replace('/(auth)/reset-password');
        }
      }
    };

    // Always try to set up session, even if we don't have tokens
    // (the session might have been set by the root layout)
    setupSession();
  }, [accessToken, refreshToken, router]);

  async function handlePasswordReset() {
    if (loading) return;

    // Check if session is ready
    if (!sessionReady) {
      Alert.alert('Error', 'Session not ready. Please wait or try again.');
      return;
    }

    // Validate password
    if (!password) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      console.log('Updating password...');
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error('Error updating password:', error);
        Alert.alert('Error', error.message);
      } else {
        console.log('Password updated successfully');
        Alert.alert(
          'Password Updated',
          'Your password has been successfully updated. You can now log in with your new password.',
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

  // Show loading while setting up session
  if (!sessionReady) {
    return (
      <View className="flex-1 items-center justify-center">
        <MeshGradient intensity={40} />
        <View className="items-center space-y-4">
          <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#ff9f6b' : '#f77f5e'} />
          <Text className={`text-lg ${colorScheme === 'dark' ? 'text-white' : 'text-[#07020D]'}`}>
            Setting up password reset...
          </Text>
        </View>
      </View>
    );
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
                  Set New Password
                </Text>
                <Text
                  className={`text-center text-base ${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Enter your new password below
                </Text>
              </View>
            </View>

            {/* Form Section */}
            <View className="space-y-5">
              {/* New Password Input */}
              <View className="space-y-2">
                <Text
                  className={`ml-1 text-sm font-medium ${colorScheme === 'dark' ? 'text-gray-300' : 'text-[#07020D]'}`}>
                  New Password
                </Text>
                <View className="relative">
                  <TextInput
                    placeholder="Enter new password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    className={`w-full rounded-2xl border px-4 py-4 pl-12 pr-12 shadow-sm ${colorScheme === 'dark' ? 'border-[#ff9f6b]/20 bg-[#1a1a1a] text-white' : 'border-[#07020D] bg-[#f9f9f9] text-[#07020D]'}`}
                    placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#9ca3af'}
                    style={{ textAlignVertical: 'center' }}
                  />
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colorScheme === 'dark' ? '#ff9f6b' : '#07020D'}
                    className="absolute left-4 top-4"
                  />
                  <Pressable
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4">
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colorScheme === 'dark' ? '#ff9f6b' : '#07020D'}
                    />
                  </Pressable>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View className="space-y-2">
                <Text
                  className={`ml-1 text-sm font-medium ${colorScheme === 'dark' ? 'text-gray-300' : 'text-[#07020D]'}`}>
                  Confirm Password
                </Text>
                <View className="relative">
                  <TextInput
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    className={`w-full rounded-2xl border px-4 py-4 pl-12 pr-12 shadow-sm ${colorScheme === 'dark' ? 'border-[#ff9f6b]/20 bg-[#1a1a1a] text-white' : 'border-[#07020D] bg-[#f9f9f9] text-[#07020D]'}`}
                    placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#9ca3af'}
                    style={{ textAlignVertical: 'center' }}
                  />
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colorScheme === 'dark' ? '#ff9f6b' : '#07020D'}
                    className="absolute left-4 top-4"
                  />
                  <Pressable
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-4">
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colorScheme === 'dark' ? '#ff9f6b' : '#07020D'}
                    />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Button Section */}
            <View className="space-y-4 pt-4">
              <Pressable
                className={`w-full rounded-2xl ${colorScheme === 'dark' ? 'bg-[#ff9f6b]' : 'bg-[#f77f5e]'} py-4 shadow-sm`}
                onPress={handlePasswordReset}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    className={`text-center text-base font-semibold ${colorScheme === 'dark' ? 'text-white' : 'text-white'}`}>
                    Update Password
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
