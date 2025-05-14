import { View, Text, TextInput, Pressable } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function CreateProfileScreen() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateProfile = async () => {
    if (!username || !fullName) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('No user found');

      const { error } = await supabase.from('profiles').insert([
        {
          id: user.id,
          username: username,
          full_name: fullName,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;

      // Navigate to feed after successful profile creation
      router.replace('/(main)/feed');
    } catch (error) {
      console.error('Error creating profile:', error);
      alert('Error creating profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6">
      <View className="mt-16">
        <Text className="text-3xl font-bold text-gray-900">Create Profile</Text>
        <Text className="mt-2 text-base text-gray-600">Let's get to know you better</Text>
      </View>

      <View className="mt-8 space-y-6">
        {/* Username Input */}
        <View>
          <Text className="mb-2 text-sm font-medium text-gray-700">Username</Text>
          <TextInput
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
            placeholder="Choose a username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Full Name Input */}
        <View>
          <Text className="mb-2 text-sm font-medium text-gray-700">Full Name</Text>
          <TextInput
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
            placeholder="Enter your full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
          />
        </View>

        {/* Create Profile Button */}
        <Pressable
          onPress={handleCreateProfile}
          disabled={loading}
          className={`mt-8 rounded-xl bg-[#FFB38A] py-4 ${loading ? 'opacity-50' : ''}`}>
          <Text className="text-center text-base font-semibold text-white">
            {loading ? 'Creating Profile...' : 'Create Profile'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
