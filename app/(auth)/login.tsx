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
// import { Image } from 'expo-image';

export default function LogIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function signInWithEmail() {
    if (loading) return;

    setLoading(true);
    const {
      error,
      data: { session },
    } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (session) {
      router.replace('/(main)/feed');
    }

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 bg-[#F1E9DB]">
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-full max-w-sm space-y-8">
            {/* Header Section */}
            <View className="items-center space-y-4">
              <View className="items-center">
                <Text className="mb-2 text-6xl font-bold text-[#07020D]">Picza</Text>
                <Text className="mb-1 text-2xl font-medium text-gray-700">Welcome Back</Text>
                <Text className="text-base text-gray-600">Let's get you logged in</Text>
              </View>
            </View>

            {/* Form Section */}
            <View className="space-y-5">
              <View className="mt-3 space-y-2">
                <Text className="ml-1 text-sm font-medium text-gray-700">Email</Text>
                <View className="relative">
                  <TextInput
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    className="w-full rounded-2xl border border-[#07020D] bg-white/90 px-4 py-4 pl-12 text-gray-900 shadow-sm"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#9ca3af"
                  />
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#07020D"
                    className="absolute left-4 top-4"
                  />
                </View>
              </View>

              <View className="mt-3 space-y-2">
                <Text className="ml-1 text-sm font-medium text-gray-700">Password</Text>
                <View className="relative">
                  <TextInput
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    className="w-full rounded-2xl border border-[#07020D] bg-white/90 px-4 py-4 pl-12 text-gray-900 shadow-sm"
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#9ca3af"
                  />
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#07020D"
                    className="absolute left-4 top-4"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4">
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#07020D"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                className="items-end"
                onPress={() => {
                  if (!loading) router.replace('/(auth)/reset-password');
                }}>
                <Text className="font-medium text-[#5DB7DE]">Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Button Section */}
            <View className="space-y-4 pt-4">
              <Pressable
                className="w-full rounded-2xl bg-[#5DB7DE] py-4 shadow-sm"
                onPress={signInWithEmail}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-center text-base font-semibold text-white">Log In</Text>
                )}
              </Pressable>

              <View className="mt-4 flex-row items-center justify-center space-x-2">
                <View className="h-[1px] flex-1 bg-gray-400" />
                <Text className="text-gray-500">or</Text>
                <View className="h-[1px] flex-1 bg-gray-400" />
              </View>

              <Pressable
                onPress={() => {
                  if (!loading) router.replace('/(auth)/signup');
                }}
                className="mt-2">
                <Text className="text-center text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Text className="font-semibold text-[#5DB7DE]">Create one</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
