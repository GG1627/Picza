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
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-full max-w-sm space-y-8">
            {/* Header Section */}
            <View className="items-center space-y-4">
              <View className="items-center">
                <Text
                  className={`mb-2 font-['LuckiestGuy'] text-[5rem] ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  Picza
                </Text>
                <Text
                  className={`mb-1 text-2xl font-medium ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  Welcome Back
                </Text>
                <Text
                  className={`text-base text-gray-600 ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  Let's get you logged in
                </Text>
              </View>
            </View>

            {/* Form Section */}
            <View className="space-y-5">
              <View className="mt-3 space-y-2">
                <Text
                  className={`ml-1 text-sm font-medium ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  Email
                </Text>
                <View className="relative">
                  <TextInput
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    className={`w-full rounded-2xl border px-4 py-4 pl-12 shadow-sm ${colorScheme === 'dark' ? 'border-[#9ca3af] bg-[#282828] text-[#9ca3af]' : 'border-[#07020D] bg-[#f9f9f9] text-[#07020D]'}`}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#9ca3af"
                    spellCheck={false}
                    style={{ textAlignVertical: 'center' }}
                  />
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={colorScheme === 'dark' ? '#9ca3af' : '#07020D'}
                    className="absolute left-4 top-4"
                  />
                </View>
              </View>

              <View className="mt-3 space-y-2">
                <Text
                  className={`ml-1 text-sm font-medium ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  Password
                </Text>
                <View className="relative">
                  <TextInput
                    placeholder="Enter your password"
                    value={password}
                    onChangeText={setPassword}
                    className={`w-full rounded-2xl border px-4 py-4 pl-12 shadow-sm ${colorScheme === 'dark' ? 'border-[#9ca3af] bg-[#282828] text-[#9ca3af]' : 'border-[#07020D] bg-[#f9f9f9] text-[#07020D]'}`}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#9ca3af"
                    spellCheck={false}
                    style={{ textAlignVertical: 'center' }}
                  />
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colorScheme === 'dark' ? '#9ca3af' : '#07020D'}
                    className="absolute left-4 top-4"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4">
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colorScheme === 'dark' ? '#9ca3af' : '#07020D'}
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
                    className={`font-medium ${colorScheme === 'dark' ? 'text-[#5070fd]' : 'text-[#5070fd]'}`}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Button Section */}
            <View className="space-y-4 pt-4">
              <Pressable
                className={`w-full rounded-2xl ${colorScheme === 'dark' ? 'bg-[#5070fd]' : 'bg-[#5070fd]'} py-4 shadow-sm`}
                onPress={signInWithEmail}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    className={`text-center text-base font-semibold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#E0E0E0]'}`}>
                    Log In
                  </Text>
                )}
              </Pressable>

              <View className="mt-4 flex-row items-center justify-center space-x-2">
                <View
                  className={`h-[1px] flex-1 ${colorScheme === 'dark' ? 'bg-gray-500' : 'bg-gray-400'}`}
                />
                <Text
                  className={`text-gray-500 ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  or
                </Text>
                <View
                  className={`h-[1px] flex-1 ${colorScheme === 'dark' ? 'bg-gray-500' : 'bg-gray-400'}`}
                />
              </View>

              <View className="mt-2">
                <View className="flex-row items-center justify-center">
                  <Text
                    className={`text-sm ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-gray-500'}`}>
                    Don't have an account?
                  </Text>
                  <Pressable
                    onPress={() => {
                      if (!loading) router.replace('/(auth)/signup');
                    }}>
                    <Text
                      className={`ml-1 text-sm font-semibold ${colorScheme === 'dark' ? 'text-[#5070fd]' : 'text-[#5070fd]'}`}>
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
