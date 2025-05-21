import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../../lib/useColorScheme';
import { useCreatePost } from '../../lib/hooks/useQueries';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CreatePostScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const createPost = useCreatePost();
  const { colorScheme } = useColorScheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const hasContent = image || caption.trim().length > 0;

  const resetForm = () => {
    setImage(null);
    setCaption('');
    setIsSuccess(false);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleCreatePost = async () => {
    if (!image) return;

    try {
      await createPost.mutateAsync({ image, caption });
      setIsSuccess(true);

      setTimeout(() => {
        resetForm();
        router.back();
      }, 1000);
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleCaptionFocus = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <SafeAreaView className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
      {/* Header */}
      <View
        className={`flex-row items-center justify-between border-b p-4 ${
          colorScheme === 'dark' ? 'border-[#282828]' : 'border-[#f9f9f9]'
        }`}>
        {hasContent ? (
          <TouchableOpacity onPress={resetForm} className="flex-row items-center">
            <Ionicons
              name="close-circle-outline"
              size={24}
              color={colorScheme === 'dark' ? '#F00511' : '#F00511'}
            />
            <Text
              className={`ml-1 font-medium ${colorScheme === 'dark' ? 'text-[#F00511]' : 'text-[#F00511]'}`}>
              Clear
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 60 }} />
        )}
        <Text
          className={`text-lg font-semibold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
          New Post
        </Text>
        <TouchableOpacity
          onPress={handleCreatePost}
          disabled={!image || createPost.isPending}
          className={`rounded-2xl px-6 py-2 ${
            !image || createPost.isPending
              ? colorScheme === 'dark'
                ? 'bg-[#282828]'
                : 'bg-[#f9f9f9]'
              : 'bg-[#F00511]'
          }`}>
          {createPost.isPending ? (
            <ActivityIndicator color="white" />
          ) : isSuccess ? (
            <Ionicons name="checkmark" size={20} color="white" />
          ) : (
            <Text
              className={`font-medium ${
                !image || createPost.isPending
                  ? colorScheme === 'dark'
                    ? 'text-[#9ca3af]'
                    : 'text-[#877B66]'
                  : 'text-white'
              }`}>
              Post
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 p-4">
            {image ? (
              <View className="mb-4 aspect-square w-full overflow-hidden rounded-2xl">
                <Image source={{ uri: image }} className="h-full w-full" resizeMode="cover" />
              </View>
            ) : (
              <TouchableOpacity
                onPress={pickImage}
                className={`mb-4 aspect-square w-full items-center justify-center rounded-2xl ${
                  colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-[#f9f9f9]'
                }`}>
                <View
                  className={`rounded-full p-4 ${
                    colorScheme === 'dark' ? 'bg-[#F00511]/10' : 'bg-[#F00511]/10'
                  }`}>
                  <Ionicons name="camera" size={40} color="#F00511" />
                </View>
                <Text
                  className={`mt-2 text-base font-medium ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  Select an image
                </Text>
                <Text
                  className={`mt-1 text-sm ${
                    colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'
                  }`}>
                  Tap to choose from your gallery
                </Text>
              </TouchableOpacity>
            )}

            <View className="mt-4">
              <Text
                className={`mb-2 text-sm font-medium ${
                  colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                }`}>
                Caption
              </Text>
              <TextInput
                value={caption}
                onChangeText={setCaption}
                placeholder="Write a caption..."
                placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#877B66'}
                multiline
                returnKeyType="done"
                blurOnSubmit={true}
                onFocus={handleCaptionFocus}
                onSubmitEditing={Keyboard.dismiss}
                className={`rounded-2xl border px-4 py-3 text-base ${
                  colorScheme === 'dark'
                    ? 'border-[#282828] bg-[#282828] text-[#E0E0E0]'
                    : 'border-[#f9f9f9] bg-white text-[#07020D]'
                }`}
                style={{ height: 100 }}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
