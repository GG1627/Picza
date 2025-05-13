import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator, Image } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';

export default function LogIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

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
      router.replace('/(main)/home');
    }

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-full max-w-sm space-y-6">
          <View className="items-center space-y-2">
            <Text className="text-3xl font-bold text-gray-900">Welcome Back</Text>
            <Text className="text-base text-gray-600">Sign in to continue</Text>
          </View>

          <View className="space-y-4">
            <View className="space-y-2">
              <Text className="text-sm font-medium text-gray-700">Email</Text>
              <TextInput
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900"
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View className="space-y-2">
              <Text className="text-sm font-medium text-gray-700">Password</Text>
              <TextInput
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900"
                secureTextEntry
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <Pressable
            className="w-full rounded-lg bg-blue-600 py-3.5"
            onPress={signInWithEmail}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-center text-base font-semibold text-white">Sign In</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              if (!loading) router.replace('/(auth)/signup');
            }}
            className="mt-4">
            <Text className="text-center text-sm text-gray-600">
              Don't have an account? <Text className="font-semibold text-blue-600">Create one</Text>
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
