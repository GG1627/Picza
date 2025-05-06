import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { View, Text, TextInput, Pressable, Alert, ActivityIndicator } from 'react-native';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Login failed', error.message);
    } else {
      Alert.alert('Success', 'You are signed in!');
    }
  }

  return (
    <View className="flex-1 items-center justify-center bg-[#fea390]">
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
          placeholderTextColor="#6b7280"
          secureTextEntry
        />

        <Pressable
          className="w-full rounded bg-black py-3"
          onPress={handleSignIn}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-center font-bold text-white">Sign In</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
