import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function CreateProfileScreen() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const router = useRouter();
  const { schoolId, schoolName } = useLocalSearchParams();

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

    if (bio.length > 60) {
      alert('Bio must be 60 characters or less');
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
          bio: bio || null,
          avatar_url: avatarUrl,
          school_id: schoolId,
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <StatusBar barStyle="dark-content" />
      <View className="flex-1 bg-[#ffddc1]">
        {/* Decorative Elements */}
        <View className="absolute right-0 top-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-[#da4314] opacity-10" />
        <View className="absolute bottom-0 left-0 -mb-24 -ml-24 h-48 w-48 rounded-full bg-[#FFB38A] opacity-10" />

        <View className="flex-1 px-8">
          <View className="mt-24">
            <Text className="text-3xl font-bold text-[#da4314]">Create Profile</Text>
            <Text className="mt-3 text-base text-gray-600">Let's get to know you better</Text>
          </View>

          <View className="mt-12 space-y-8">
            {/* Profile Image Upload */}
            <View className="items-center">
              <Pressable
                onPress={pickImage}
                className="h-32 w-32 items-center justify-center rounded-full border-2 border-[#da4314] bg-white/90">
                {image ? (
                  <Image source={{ uri: image }} className="h-32 w-32 rounded-full" />
                ) : (
                  <View className="items-center">
                    <Ionicons name="camera-outline" size={32} color="#da4314" />
                    <Text className="mt-2 text-sm text-gray-500">Add Photo</Text>
                  </View>
                )}
              </Pressable>
            </View>

            {/* School Display */}
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700">School</Text>
              <View
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.9,
                  shadowRadius: 4.65,
                  elevation: 10,
                  borderRadius: 2,
                }}>
                <LinearGradient
                  colors={['rgba(0, 41, 165, 1)', 'rgba(255, 120, 36, 1)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 16,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: 'black',
                  }}>
                  <Text className="text-base font-bold text-white">University of Florida</Text>
                </LinearGradient>
              </View>
            </View>

            {/* Full Name Input */}
            <View>
              <Text className="mb-2 text-sm font-medium text-gray-700">Full Name</Text>
              <View className="relative">
                <TextInput
                  className="w-full rounded-2xl border border-[#da4314] bg-white/90 px-4 py-4 pl-12 text-gray-900 shadow-sm"
                  placeholder="Enter your full name"
                  placeholderTextColor="#9ca3af"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#da4314"
                  className="absolute left-4 top-4"
                />
              </View>
            </View>

            {/* Username Input */}
            <View>
              <View className="flex-row items-center justify-between">
                <Text className="mb-2 text-sm font-medium text-gray-700">Username</Text>
                <Text className="text-xs text-gray-500">{username.length}/20</Text>
              </View>
              <View className="relative">
                <TextInput
                  className="w-full rounded-2xl border border-[#da4314] bg-white/90 px-4 py-4 pl-12 text-gray-900 shadow-sm"
                  placeholder="Choose a username"
                  placeholderTextColor="#9ca3af"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                />
                <Ionicons
                  name="person-outline"
                  size={20}
                  color="#da4314"
                  className="absolute left-4 top-4"
                />
              </View>
            </View>

            {/* Bio Input */}
            <View>
              <View className="flex-row items-center justify-between">
                <Text className="mb-2 text-sm font-medium text-gray-700">Bio (Optional)</Text>
                <Text className="text-xs text-gray-500">{bio.length}/60</Text>
              </View>
              <View className="relative">
                <TextInput
                  className="w-full rounded-2xl border border-[#da4314] bg-white/90 px-4 py-4 pl-12 text-gray-900 shadow-sm"
                  placeholder="Tell us about yourself"
                  placeholderTextColor="#9ca3af"
                  value={bio}
                  onChangeText={setBio}
                  maxLength={60}
                  multiline
                  numberOfLines={3}
                />
                <Ionicons
                  name="chatbubble-outline"
                  size={20}
                  color="#da4314"
                  className="absolute left-4 top-4"
                />
              </View>
            </View>

            {/* Create Profile Button */}
            <Pressable
              onPress={handleCreateProfile}
              disabled={loading}
              className={`mt-8 rounded-2xl bg-[#da4314] py-4 shadow-sm ${loading ? 'opacity-50' : ''}`}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-center text-base font-semibold text-white">
                  Create Profile
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
