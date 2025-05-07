import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Link } from 'expo-router';

export default function SignIn() {
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
    <View className="flex-1 items-center justify-center bg-white px-4">
      <View className="w-[16rem] items-center gap-3">
        <Text className="text-xl font-bold">Login to Lokd</Text>

        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          className="w-full rounded border border-black px-3 py-2"
          autoCapitalize="none"
          keyboardType="email-address"
          placeholderTextColor="#6b7280"
        />

        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          className="w-full rounded border border-black px-3 py-2"
          secureTextEntry
          placeholderTextColor="#6b7280"
        />

        <Pressable
          className="w-full rounded bg-black py-3"
          onPress={signInWithEmail}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-center font-bold text-white">Log In</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => {
            if (!loading) router.replace('/(auth)/signup');
          }}>
          <Text className="mt-2 text-sm text-blue-700 underline">
            Don’t have an account? Register
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
