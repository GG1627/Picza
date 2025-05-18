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
      <View className="flex-1 bg-[#ffddc1]">
        {/* Decorative Elements */}
        <View className="absolute right-0 top-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-[#FF6B35] opacity-10" />
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
                <Text className="mb-1 text-2xl font-medium text-gray-700">Welcome Back</Text>
                <Text className="text-base text-gray-600">Let's get you signed in</Text>
              </View>
            </View>

            {/* Form Section */}
            <View className="space-y-5">
              <View className="space-y-2">
                <Text className="ml-1 text-sm font-medium text-gray-700">Email</Text>
                <View className="relative">
                  <TextInput
                    placeholder="Enter your email"
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

              <View className="space-y-2">
                <Text className="ml-1 text-sm font-medium text-gray-700">Password</Text>
                <View className="relative">
                  <TextInput
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    className="w-full rounded-2xl border border-[##da4314] bg-white/90 px-4 py-4 pl-12 text-gray-900 shadow-sm"
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#9ca3af"
                  />
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#da4314"
                    className="absolute left-4 top-4"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4">
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#FF6B35"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                className="items-end"
                onPress={() => {
                  if (!loading) router.replace('/(auth)/reset-password');
                }}>
                <Text className="font-medium text-[#da4314]">Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Button Section */}
            <View className="space-y-4 pt-4">
              <Pressable
                className="w-full rounded-2xl bg-[#da4314] py-4 shadow-sm"
                onPress={signInWithEmail}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-center text-base font-semibold text-white">Sign In</Text>
                )}
              </Pressable>

              <View className="mt-2 flex-row items-center justify-center space-x-2">
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
                  <Text className="font-semibold text-[#da4314]">Create one</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
