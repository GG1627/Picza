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
  Animated,
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
  const [dishName, setDishName] = useState('');
  const [caption, setCaption] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const createPost = useCreatePost();
  const { colorScheme } = useColorScheme();
  const scrollViewRef = useRef<ScrollView>(null);

  const hasContent = image || dishName.trim().length > 0 || ingredients.trim().length > 0;

  const resetForm = () => {
    setImage(null);
    setDishName('');
    setCaption('');
    setIngredients('');
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
      await createPost.mutateAsync({
        image,
        dish_name: dishName,
        caption,
        ingredients,
      });
      setIsSuccess(true);

      setTimeout(() => {
        resetForm();
        router.back();
      }, 1000);
    } catch (error) {
      console.error('Error creating post:', error);
    }
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
              : colorScheme === 'dark'
                ? 'border-2 border-[#259365] bg-[#26342e]'
                : 'border-2 border-[#259365] bg-[#c7e5d9]'
          }`}>
          {createPost.isPending ? (
            <ActivityIndicator color={colorScheme === 'dark' ? 'white' : '#259365'} />
          ) : isSuccess ? (
            <Ionicons
              name="checkmark"
              size={20}
              color={colorScheme === 'dark' ? 'white' : '#259365'}
            />
          ) : (
            <Text
              className={`font-medium ${
                !image || createPost.isPending
                  ? colorScheme === 'dark'
                    ? 'text-[#9ca3af]'
                    : 'text-[#877B66]'
                  : colorScheme === 'dark'
                    ? 'text-[#259365]'
                    : 'text-[#259365]'
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
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardDismissMode="on-drag">
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
                    colorScheme === 'dark' ? 'bg-[#5070fd]/10' : 'bg-[#5070fd]/10'
                  }`}>
                  <Ionicons name="camera" size={40} color="#5070fd" />
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

            <View className="mt-2 space-y-4">
              {/* Dish Name Input */}
              <View className="">
                <Text
                  className={`mb-0 text-sm font-medium ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  Dish Name (optional)
                </Text>
                <TextInput
                  textAlignVertical="center"
                  value={dishName}
                  onChangeText={setDishName}
                  placeholder="What's the name of your dish?"
                  placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#877B66'}
                  className={`w-full rounded-2xl border px-4 py-3 ${
                    colorScheme === 'dark'
                      ? 'border-[#282828] bg-[#282828] text-[#E0E0E0]'
                      : 'border-[#f9f9f9] bg-white text-[#07020D]'
                  }`}
                  style={{ textAlignVertical: 'center' }}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                    }, 100);
                  }}
                />
              </View>

              {/* Caption Input */}
              <View className="">
                <Text
                  className={`mb-0 mt-2 text-sm font-medium ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  Caption (optional)
                </Text>
                <TextInput
                  value={caption}
                  onChangeText={setCaption}
                  textAlignVertical="center"
                  placeholder="Add a caption to your post..."
                  placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#877B66'}
                  className={`w-full rounded-2xl border px-4 py-3 ${
                    colorScheme === 'dark'
                      ? 'border-[#282828] bg-[#282828] text-[#E0E0E0]'
                      : 'border-[#f9f9f9] bg-white text-[#07020D]'
                  }`}
                  style={{ textAlignVertical: 'center' }}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 200, animated: true });
                    }, 100);
                  }}
                />
              </View>

              {/* Ingredients Input */}
              <View>
                <Text
                  className={`mb-0 mt-2 text-sm font-medium ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  Ingredients List (optional)
                </Text>
                <TextInput
                  value={ingredients}
                  onChangeText={setIngredients}
                  placeholder="Enter your ingredients..."
                  placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#877B66'}
                  multiline
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={() => Keyboard.dismiss()}
                  className={`rounded-2xl border px-4 py-3 ${
                    colorScheme === 'dark'
                      ? 'border-[#282828] bg-[#282828] text-[#E0E0E0]'
                      : 'border-[#f9f9f9] bg-white text-[#07020D]'
                  }`}
                  style={{
                    height: 80,
                    textAlignVertical: 'center',
                    textAlign: 'left',
                  }}
                  onFocus={() => {
                    setTimeout(() => {
                      scrollViewRef.current?.scrollTo({ y: 400, animated: true });
                    }, 100);
                  }}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
