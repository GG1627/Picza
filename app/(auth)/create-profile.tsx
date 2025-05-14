import { View, Text, TextInput, Pressable, Image, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Ionicons } from '@expo/vector-icons';

export default function CreateProfileScreen() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const router = useRouter();

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Error selecting image. Please try again.');
    }
  };

  const uploadImage = async (base64Image: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const filePath = `${user.id}/${new Date().getTime()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64Image), {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

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

      let avatarUrl = null;
      if (image) {
        const response = await fetch(image);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Image = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        avatarUrl = await uploadImage(base64Image.split(',')[1]);
      }

      const { error } = await supabase.from('profiles').insert([
        {
          id: user.id,
          username: username,
          full_name: fullName,
          avatar_url: avatarUrl,
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
        {/* Profile Image Upload */}
        <View className="items-center">
          <Pressable
            onPress={pickImage}
            className="h-32 w-32 items-center justify-center rounded-full bg-gray-100">
            {image ? (
              <Image source={{ uri: image }} className="h-32 w-32 rounded-full" />
            ) : (
              <View className="items-center">
                <Ionicons name="camera-outline" size={32} color="#6B7280" />
                <Text className="mt-2 text-sm text-gray-500">Add Photo</Text>
              </View>
            )}
          </Pressable>
        </View>

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
