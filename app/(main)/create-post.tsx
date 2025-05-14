import { View, Text, TextInput, Pressable, Image, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Ionicons } from '@expo/vector-icons';

export default function CreatePostScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      alert('Error taking picture. Please try again.');
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
        .from('post_images')
        .upload(filePath, decode(base64Image), {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('post_images').getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleCreatePost = async () => {
    if (!image) {
      alert('Please take a picture first');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Upload image
      const response = await fetch(image);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64Image = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      const imageUrl = await uploadImage(base64Image.split(',')[1]);

      // Create post
      const { error } = await supabase.from('posts').insert([
        {
          user_id: user.id,
          caption: caption,
          image_url: imageUrl,
          likes_count: 0,
        },
      ]);

      if (error) throw error;

      // Navigate to feed
      router.replace('/(main)/feed');
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Error creating post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FFB38A" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-lg text-gray-900">
          Camera permission is required to create posts
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white px-6">
      <View className="mt-16">
        <Text className="text-3xl font-bold text-gray-900">Create Post</Text>
        <Text className="mt-2 text-base text-gray-600">Share your food moments</Text>
      </View>

      <View className="mt-8 space-y-6">
        {/* Camera Preview */}
        <Pressable
          onPress={takePicture}
          className="aspect-[4/3] w-full items-center justify-center rounded-2xl bg-gray-100">
          {image ? (
            <Image
              source={{ uri: image }}
              className="h-full w-full rounded-2xl"
              resizeMode="cover"
            />
          ) : (
            <View className="items-center">
              <Ionicons name="camera" size={48} color="#6B7280" />
              <Text className="mt-2 text-base text-gray-500">Take a Picture</Text>
            </View>
          )}
        </Pressable>

        {/* Caption Input */}
        <View>
          <Text className="mb-2 text-sm font-medium text-gray-700">Caption</Text>
          <TextInput
            className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-900"
            placeholder="Write a caption..."
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Post Button */}
        <Pressable
          onPress={handleCreatePost}
          disabled={loading || !image}
          className={`mt-8 rounded-xl bg-[#FFB38A] py-4 ${loading || !image ? 'opacity-50' : ''}`}>
          <Text className="text-center text-base font-semibold text-white">
            {loading ? 'Creating Post...' : 'Post to Feed'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
