import { useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { Link, useRouter } from 'expo-router';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signUpWithEmail() {
    if (loading) return;

    // Ensure it's a UFL email
    if (!email.toLowerCase().endsWith('@ufl.edu')) {
      Alert.alert('Invalid Email', 'Please use your @ufl.edu school email.');
      return;
    }
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (session) {
      router.replace('/(main)/home');
    }

    if (error) Alert.alert(error.message);
    if (!session) Alert.alert('Please check your inbox for email verification!');
    setLoading(false);
  }

  return (
    <View className="flex-1 items-center justify-center bg-white px-4">
      <View className="w-[16rem] items-center gap-3">
        <Text className="text-xl font-bold">Register for Lokd</Text>

        <TextInput
          placeholder="School Email"
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
          onPress={signUpWithEmail}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-center font-bold text-white">Register</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => {
            if (!loading) router.replace('/(auth)/signin');
          }}>
          <Text className="mt-2 text-sm text-blue-700 underline">
            Already have an account? Log In
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
