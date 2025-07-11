import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StatusBar,
  Image,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../../lib/useColorScheme';
import MaskedView from '@react-native-masked-view/masked-view';
import MeshGradient from '../../components/MeshGradient';

export default function LogIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { colorScheme, colors } = useColorScheme();

  async function signInWithEmail() {
    if (loading) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          Alert.alert(
            'Email Not Verified',
            'Please check your email and click the verification link before logging in.'
          );
        } else {
          Alert.alert('Error', error.message);
        }
        return;
      }

      if (data?.user) {
        // Check if user has a profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            // No profile found, redirect to profile creation
            router.replace({
              pathname: '/(auth)/create-profile',
              params: {
                schoolId: data.user.user_metadata.school_id,
                schoolName: data.user.user_metadata.school_name,
                email: email,
                password: password,
              },
            });
            return;
          }
          throw profileError;
        }

        if (!profile) {
          // No profile found, redirect to profile creation
          router.replace({
            pathname: '/(auth)/create-profile',
            params: {
              schoolId: data.user.user_metadata.school_id,
              schoolName: data.user.user_metadata.school_name,
              email: email,
              password: password,
            },
          });
          return;
        }

        // User has a profile, allow access to the app
        router.replace('/(main)/feed');
      }
    } catch (error) {
      console.error('Error signing in:', error);
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
                  Welcome Back
                </Text>
                <Text
                  className={`text-base ${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Let's get you logged in
                </Text>
              </View>
            </View>

            {/* Form Section */}
            <View className="space-y-5">
              <View className="mt-3 space-y-2">
                <Text
                  className={`ml-1 text-sm font-medium ${colorScheme === 'dark' ? 'text-gray-300' : 'text-[#07020D]'}`}>
                  Email
                </Text>
                <View className="relative">
                  <TextInput
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    className={`w-full rounded-2xl border px-4 py-4 pl-12 shadow-sm ${colorScheme === 'dark' ? 'border-[#ff9f6b]/20 bg-[#1a1a1a] text-white' : 'border-[#07020D] bg-[#f9f9f9] text-[#07020D]'}`}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#9ca3af'}
                    spellCheck={false}
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

              <View className="mt-3 space-y-2">
                <Text
                  className={`ml-1 text-sm font-medium ${colorScheme === 'dark' ? 'text-gray-300' : 'text-[#07020D]'}`}>
                  Password
                </Text>
                <View className="relative">
                  <TextInput
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    className={`w-full rounded-2xl border px-4 py-4 pl-12 shadow-sm ${colorScheme === 'dark' ? 'border-[#ff9f6b]/20 bg-[#1a1a1a] text-white' : 'border-[#07020D] bg-[#f9f9f9] text-[#07020D]'}`}
                    secureTextEntry={!showPassword}
                    placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#9ca3af'}
                    spellCheck={false}
                    style={{ textAlignVertical: 'center' }}
                  />
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colorScheme === 'dark' ? '#ff9f6b' : '#07020D'}
                    className="absolute left-4 top-4"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4">
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colorScheme === 'dark' ? '#ff9f6b' : '#07020D'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="items-end">
                <TouchableOpacity
                  onPress={() => {
                    if (!loading) router.replace('/(auth)/reset-password');
                  }}>
                  <Text
                    className={`font-medium ${colorScheme === 'dark' ? 'text-[#ff9f6b]' : 'text-[#f77f5e]'}`}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Button Section */}
            <View className="space-y-4 pt-4">
              <Pressable
                className={`w-full rounded-2xl ${colorScheme === 'dark' ? 'bg-[#ff9f6b]' : 'bg-[#f77f5e]'} py-4 shadow-sm`}
                onPress={signInWithEmail}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    className={`text-center text-base font-semibold ${colorScheme === 'dark' ? 'text-white' : 'text-white'}`}>
                    Log In
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
                    className={`text-sm ${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    Don't have an account?
                  </Text>
                  <Pressable
                    onPress={() => {
                      if (!loading) router.replace('/(auth)/signup');
                    }}>
                    <Text
                      className={`ml-1 text-sm font-semibold ${colorScheme === 'dark' ? 'text-[#ff9f6b]' : 'text-[#f77f5e]'}`}>
                      Create one
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
