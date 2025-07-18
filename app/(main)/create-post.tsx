import React, { useState, useRef, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../../lib/useColorScheme';
import { useCreatePost } from '../../lib/hooks/useQueries';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { validateFoodImage, getRemainingAttempts } from '../../lib/azureVision';
import ImageOptimizer, { useImageOptimization } from '../../lib/imageOptimization';

export default function CreatePostScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [dishName, setDishName] = useState('');
  const [caption, setCaption] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isValidatingFood, setIsValidatingFood] = useState(false);
  const [foodValidationResult, setFoodValidationResult] = useState<{
    isValid: boolean;
    message: string;
    remaining?: number;
  } | null>(null);
  const [optimizedImage, setOptimizedImage] = useState<string | null>(null);
  const [originalImageSize, setOriginalImageSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [compressionRatio, setCompressionRatio] = useState<number | null>(null);
  const [remainingAttempts, setRemainingAttempts] = useState<number>(5);
  const createPost = useCreatePost();
  const { optimizeImage, isOptimizing, optimizationProgress } = useImageOptimization();
  const { colorScheme } = useColorScheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const queryClient = useQueryClient();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [inputPositions, setInputPositions] = useState({
    dishName: 0,
    caption: 0,
    ingredients: 0,
  });

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const keyboardWillHide = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  // Fetch initial remaining attempts when component mounts
  useEffect(() => {
    const fetchRemainingAttempts = async () => {
      try {
        const remaining = await getRemainingAttempts();
        setRemainingAttempts(remaining);
      } catch (error) {
        console.error('Error fetching remaining attempts:', error);
      }
    };

    fetchRemainingAttempts();
  }, []);

  const measureInputPosition = (ref: any, setter: (position: number) => void) => {
    if (ref.current && scrollViewRef.current) {
      ref.current.measureLayout(
        scrollViewRef.current,
        (x: number, y: number) => {
          setter(y);
        },
        (error: any) => {
          console.warn('measureLayout failed:', error);
        }
      );
    }
  };

  const dishNameRef = useRef(null);
  const captionRef = useRef(null);
  const ingredientsRef = useRef(null);

  const hasContent = image || dishName.trim().length > 0 || ingredients.trim().length > 0;

  const resetForm = () => {
    setImage(null);
    setOptimizedImage(null);
    setOriginalImageSize(null);
    setCompressionRatio(null);
    setDishName('');
    setCaption('');
    setIngredients('');
    setIsSuccess(false);
    setFoodValidationResult(null);
    scrollViewRef.current?.scrollTo({ y: 0 });
    Keyboard.dismiss();
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1, // Get full quality initially, we'll optimize it ourselves
    });

    if (!result.canceled) {
      const selectedImage = result.assets[0].uri;
      setImage(selectedImage);

      // Reset previous states
      setFoodValidationResult(null);
      setOptimizedImage(null);
      setCompressionRatio(null);

      try {
        // Step 1: Get original image info
        const originalInfo = await ImageOptimizer.getImageInfo(selectedImage);
        setOriginalImageSize(originalInfo);

        // Step 2: Optimize image for post upload (high quality)
        const optimizedForPost = await optimizeImage(
          selectedImage,
          ImageOptimizer.PRESETS.POST_UPLOAD
        );
        setOptimizedImage(optimizedForPost.uri);

        // Calculate and show compression ratio
        const ratio = ImageOptimizer.estimateCompressionRatio(
          originalInfo.width,
          originalInfo.height,
          ImageOptimizer.PRESETS.POST_UPLOAD
        );
        setCompressionRatio(ratio);

        // Step 3: Optimize smaller version for Azure Vision API (faster validation)
        setIsValidatingFood(true);
        const optimizedForVision = await ImageOptimizer.optimizeForAzureVision(selectedImage);

        // Validate using the smaller, optimized image
        const validation = await validateFoodImage(optimizedForVision.uri);
        setFoodValidationResult(validation);

        // Update remaining attempts from validation result
        if (validation.remaining !== undefined) {
          setRemainingAttempts(validation.remaining);
        }

        if (!validation.isValid) {
          // Check if it's a rate limit error or food detection error
          const isRateLimit = validation.message.includes('Daily limit');
          const title = isRateLimit ? 'Daily Limit Reached' : 'No Food Detected';
          const message = validation.message;

          Alert.alert(title, message, [
            {
              text: 'OK',
              style: 'default',
              onPress: () => {
                setImage(null);
                setOptimizedImage(null);
                setOriginalImageSize(null);
                setCompressionRatio(null);
              },
            },
          ]);
        }
      } catch (error) {
        console.error('Error processing image:', error);
        setFoodValidationResult({
          isValid: false,
          message: 'Unable to process image. Please try again with a different image.',
        });
        Alert.alert(
          'Processing Error',
          'Unable to process your image. Please try again with a different food image.',
          [
            {
              text: 'OK',
              style: 'default',
              onPress: () => {
                setImage(null);
                setOptimizedImage(null);
                setOriginalImageSize(null);
                setCompressionRatio(null);
              },
            },
          ]
        );
      } finally {
        setIsValidatingFood(false);
      }
    }
  };

  const handleCreatePost = async () => {
    // Use optimized image if available, fall back to original
    const imageToUpload = optimizedImage || image;
    if (!imageToUpload) return;

    // Only allow posting if food is detected
    if (!foodValidationResult || !foodValidationResult.isValid) {
      Alert.alert('No Food Detected', 'Please select an image that contains food before posting.', [
        { text: 'OK', style: 'default' },
      ]);
      return;
    }

    try {
      const formattedIngredients = formatIngredients(ingredients);

      await createPost.mutateAsync({
        image: imageToUpload, // Use optimized image for faster upload
        dish_name: dishName,
        caption,
        ingredients: formattedIngredients,
      });
      setIsSuccess(true);

      // Force refetch posts before navigating back
      await queryClient.invalidateQueries({ queryKey: ['posts'] });
      await queryClient.refetchQueries({ queryKey: ['posts'] });

      // Wait for the refetch to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      resetForm();
      router.back();
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const formatIngredients = (ingredients: string): string => {
    // Handle empty or invalid input
    if (!ingredients || typeof ingredients !== 'string') {
      return '';
    }

    // Split by multiple possible delimiters (comma, semicolon, or newline)
    const ingredientsArray = ingredients
      .split(/[,;\n' ']/)
      // Remove empty strings and trim whitespace
      .map((ingredient) => ingredient.trim())
      .filter((ingredient) => ingredient.length > 0)
      // Remove duplicates (case insensitive)
      .filter(
        (ingredient, index, self) =>
          index === self.findIndex((i) => i.toLowerCase() === ingredient.toLowerCase())
      )
      // Capitalize first letter of each ingredient
      .map((ingredient) => {
        // Handle special cases like "2 cups of flour" or "1/2 teaspoon salt"
        const words = ingredient.split(' ');
        return words
          .map((word, index) => {
            // Don't capitalize numbers or units
            if (index === 0 && /^[0-9/]/.test(word)) {
              return word;
            }
            if (['of', 'and', 'or', 'with', 'in', 'to'].includes(word.toLowerCase())) {
              return word.toLowerCase();
            }
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
          })
          .join(' ');
      })
      // Sort alphabetically
      .sort((a, b) => a.localeCompare(b));

    // If no valid ingredients, return empty string
    if (ingredientsArray.length === 0) {
      return '';
    }

    // Format with bullet points and newlines
    return ingredientsArray.map((ingredient) => `• ${ingredient}`).join('\n');
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
          disabled={
            !image ||
            createPost.isPending ||
            isOptimizing ||
            isValidatingFood ||
            !foodValidationResult?.isValid
          }
          className={`rounded-2xl px-6 py-2 ${
            !image ||
            createPost.isPending ||
            isOptimizing ||
            isValidatingFood ||
            !foodValidationResult?.isValid
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
                !image ||
                createPost.isPending ||
                isOptimizing ||
                isValidatingFood ||
                !foodValidationResult?.isValid
                  ? colorScheme === 'dark'
                    ? 'text-[#9ca3af]'
                    : 'text-[#877B66]'
                  : colorScheme === 'dark'
                    ? 'text-[#259365]'
                    : 'text-[#259365]'
              }`}>
              {isOptimizing || isValidatingFood ? 'Processing...' : 'Post'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}>
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 50 }}
          keyboardDismissMode="on-drag">
          <View className="flex-1 p-4">
            {image ? (
              <View className="mb-4 aspect-square w-full overflow-hidden rounded-2xl">
                <Image source={{ uri: image }} className="h-full w-full" resizeMode="cover" />

                {/* Food validation status */}
                {isValidatingFood && !isOptimizing && (
                  <View className="absolute inset-0 items-center justify-center bg-black/50">
                    <View className="rounded-lg bg-white/90 p-4">
                      <ActivityIndicator size="large" color="#0f9900" />
                      <Text className="mt-2 text-center font-medium text-gray-800">
                        Validating food content...
                      </Text>
                    </View>
                  </View>
                )}

                {/* Food validation result */}
                {!isOptimizing && !isValidatingFood && foodValidationResult && (
                  <View className="absolute bottom-2 left-2 right-2">
                    <View
                      className={`rounded-lg p-2 ${
                        foodValidationResult.isValid ? 'bg-green-500/90' : 'bg-red-500/90'
                      }`}>
                      <Text className="text-center text-sm font-medium text-white">
                        {foodValidationResult.isValid ? '✅ Food detected!' : '❌ No food detected'}
                      </Text>
                      <Text className="mt-1 text-center text-xs text-white/80">
                        {remainingAttempts} validation{remainingAttempts !== 1 ? 's' : ''} remaining
                        today
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            ) : (
              <TouchableOpacity
                onPress={pickImage}
                className={`mb-4 aspect-square w-full items-center justify-center rounded-2xl ${
                  colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-[#f9f9f9]'
                }`}>
                <View
                  className={`rounded-full p-4 ${
                    colorScheme === 'dark' ? 'bg-[#f77f5e]/10' : 'bg-[#f77f5e]/10'
                  }`}>
                  <Ionicons name="camera" size={40} color="#f77f5e" />
                </View>
                <Text
                  className={`mt-2 text-base font-medium ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  Select a food image
                  <Text className="text-red-500">*</Text>
                </Text>
                <Text
                  className={`mt-1 text-sm ${
                    colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'
                  }`}>
                  Tap to choose from your gallery
                </Text>
                <Text
                  className={`mt-2 text-xs ${
                    remainingAttempts <= 1
                      ? 'text-red-500'
                      : remainingAttempts <= 2
                        ? 'text-yellow-500'
                        : colorScheme === 'dark'
                          ? 'text-[#9ca3af]'
                          : 'text-[#877B66]'
                  }`}>
                  {remainingAttempts} food validation{remainingAttempts !== 1 ? 's' : ''} remaining
                  today
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
                  Dish Name
                </Text>
                <TextInput
                  ref={dishNameRef}
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
                    measureInputPosition(dishNameRef, (position) => {
                      scrollViewRef.current?.scrollTo({ y: position - 100, animated: true });
                    });
                  }}
                />
              </View>

              {/* Caption Input */}
              <View className="">
                <Text
                  className={`mb-0 mt-2 text-sm font-medium ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  Caption
                </Text>
                <TextInput
                  ref={captionRef}
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
                    measureInputPosition(captionRef, (position) => {
                      scrollViewRef.current?.scrollTo({ y: position - 100, animated: true });
                    });
                  }}
                />
              </View>

              {/* Ingredients Input */}
              <View>
                <Text
                  className={`mb-0 mt-2 text-sm font-medium ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  Ingredients List
                </Text>
                <TextInput
                  ref={ingredientsRef}
                  value={ingredients}
                  onChangeText={setIngredients}
                  placeholder="Enter your ingredients... (e.g. eggs, flour, milk, etc.)"
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
                    measureInputPosition(ingredientsRef, (position) => {
                      scrollViewRef.current?.scrollTo({ y: position - 100, animated: true });
                    });
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
