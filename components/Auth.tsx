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
    <View className="flex-1 gap-4 bg-white p-4">
      <Text className="text-xl font-bold">Login to Lokd 🔒</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        className="rounded border border-gray-400 px-3 py-2"
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        className="rounded border border-gray-400 px-3 py-2"
        secureTextEntry
      />

      <Pressable className="mt-2 rounded bg-black py-3" onPress={handleSignIn} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-center font-bold text-white">Sign In</Text>
        )}
      </Pressable>
    </View>
  );
}
