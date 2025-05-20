import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  StatusBar,
  Keyboard,
} from 'react-native';
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
        .from('post-images')
        .upload(filePath, decode(base64Image), {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('post-images').getPublicUrl(filePath);

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
      <View className="flex-1 items-center justify-center bg-[#F1E9DB]">
        <ActivityIndicator size="large" color="#5DB7DE" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F1E9DB] px-6">
        <View className="items-center space-y-4">
          <Ionicons name="camera-outline" size={48} color="#07020D" />
          <Text className="text-center text-lg text-[#07020D]">
            Camera permission is required to create posts
          </Text>
          <Text className="text-center text-base text-[#877B66]">
            Please enable camera access in your device settings
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#F1E9DB]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="mt-16 px-6">
        <Text className="text-3xl font-bold text-[#07020D]">Create Post</Text>
        <Text className="mt-2 text-base text-[#877B66]">Share your food moments</Text>
      </View>

      <View className="mt-8 px-6">
        {/* Camera Preview */}
        <Pressable
          onPress={takePicture}
          className="aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border-4 border-[#07020D] bg-white">
          {image ? (
            <Image source={{ uri: image }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="items-center space-y-3">
              <View className="rounded-full bg-[#5DB7DE]/10 p-4">
                <Ionicons name="camera" size={40} color="#5DB7DE" />
              </View>
              <Text className="text-base font-medium text-[#07020D]">Take a Picture</Text>
              <Text className="text-sm text-[#877B66]">Tap to capture your food</Text>
            </View>
          )}
        </Pressable>

        {/* Caption Input */}
        <View className="mt-8">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-medium text-[#07020D]">Caption</Text>
            <Text className="text-xs text-[#877B66]">{caption.length}/200</Text>
          </View>
          <TextInput
            className="mt-2 rounded-xl border border-[#5DB7DE] bg-white px-4 py-3 text-base text-[#07020D]"
            placeholder="Write a caption..."
            placeholderTextColor="#877B66"
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={200}
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        {/* Post Button */}
        <Pressable
          onPress={handleCreatePost}
          disabled={loading || !image}
          className={`mt-8 rounded-xl bg-[#5DB7DE] py-4 ${loading || !image ? 'opacity-50' : ''}`}>
          {loading ? (
            <View className="flex-row items-center justify-center space-x-2">
              <ActivityIndicator color="white" />
              <Text className="text-base font-semibold text-white">Creating Post...</Text>
            </View>
          ) : (
            <Text className="text-center text-base font-semibold text-white">Post to Feed</Text>
          )}
        </Pressable>

        {/* Cancel Button */}
        <Pressable onPress={() => router.back()} className="mt-4">
          <Text className="text-center text-base font-medium text-[#877B66]">Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}
