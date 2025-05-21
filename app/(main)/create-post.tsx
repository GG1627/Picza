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
import { useColorScheme } from '../../lib/useColorScheme';

export default function CreatePostScreen() {
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const router = useRouter();
  const { colorScheme } = useColorScheme();

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
      <View
        className={`flex-1 items-center justify-center ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
        <ActivityIndicator size="large" color="#F00511" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View
        className={`flex-1 items-center justify-center ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'} px-6`}>
        <View className="items-center space-y-4">
          <Ionicons
            name="camera-outline"
            size={48}
            color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
          />
          <Text
            className={`text-center text-lg ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
            Camera permission is required to create posts
          </Text>
          <Text
            className={`text-center text-base ${colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'}`}>
            Please enable camera access in your device settings
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View className="mt-16 px-6">
        <Text
          className={`text-3xl font-bold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
          Create Post
        </Text>
        <Text
          className={`mt-2 text-base ${colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'}`}>
          Share your food moments
        </Text>
      </View>

      <View className="mt-8 px-6">
        {/* Camera Preview */}
        <Pressable
          onPress={takePicture}
          className={`aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border-2 ${
            colorScheme === 'dark' ? 'border-[#282828] bg-[#282828]' : 'border-[#f9f9f9] bg-white'
          }`}>
          {image ? (
            <Image source={{ uri: image }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="items-center space-y-3">
              <View
                className={`rounded-full ${colorScheme === 'dark' ? 'bg-[#F00511]/10' : 'bg-[#F00511]/10'} p-4`}>
                <Ionicons name="camera" size={40} color="#F00511" />
              </View>
              <Text
                className={`text-base font-medium ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                Take a Picture
              </Text>
              <Text
                className={`text-sm ${colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'}`}>
                Tap to capture your food
              </Text>
            </View>
          )}
        </Pressable>

        {/* Caption Input */}
        <View className="mt-8">
          <View className="flex-row items-center justify-between">
            <Text
              className={`text-sm font-medium ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
              Caption
            </Text>
            <Text
              className={`text-xs ${colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'}`}>
              {caption.length}/200
            </Text>
          </View>
          <TextInput
            className={`mt-2 rounded-xl border px-4 py-3 text-base ${
              colorScheme === 'dark'
                ? 'border-[#282828] bg-[#282828] text-[#E0E0E0]'
                : 'border-[#f9f9f9] bg-white text-[#07020D]'
            }`}
            placeholder="Write a caption..."
            placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#877B66'}
            value={caption}
            onChangeText={setCaption}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            maxLength={200}
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={Keyboard.dismiss}
            spellCheck={false}
          />
        </View>

        {/* Post Button */}
        <Pressable
          onPress={handleCreatePost}
          disabled={loading || !image}
          className={`mt-8 rounded-xl bg-[#F00511] py-4 ${loading || !image ? 'opacity-50' : ''}`}>
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
          <Text
            className={`text-center text-base font-medium ${colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'}`}>
            Cancel
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
