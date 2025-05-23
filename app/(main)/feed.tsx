import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Modal,
  Alert,
  Pressable,
  Dimensions,
  GestureResponderEvent,
  PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { usePosts, useSchool, useLikePost } from '../../lib/hooks/useQueries';
import { useColorScheme } from '../../lib/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import GradientText from '../../components/GradientText';

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'mySchool' | 'otherSchools' | 'friends'>(
    'all'
  );
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [postLikes, setPostLikes] = useState<{ [key: string]: number }>({});
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showIngredients, setShowIngredients] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string>('');
  const { colorScheme } = useColorScheme();
  const heartAnimations = useRef<{ [key: string]: Animated.Value }>({});
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const backdropAnimation = useRef(new Animated.Value(0)).current;
  const ingredientsModalAnimation = useRef(new Animated.Value(0)).current;
  const ingredientsBackdropAnimation = useRef(new Animated.Value(0)).current;
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'card' | 'grid'>('card');
  const [pinchDistance, setPinchDistance] = useState(0);
  const lastPinchDistance = useRef(0);
  const viewModeAnimation = useRef(new Animated.Value(0)).current;
  const [isGridView, setIsGridView] = useState(false);
  const transitionAnim = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = Dimensions.get('window');
  const gridItemWidth = (screenWidth - 48) / 2; // 2 columns with proper spacing (16px padding on each side + 16px gap between items)
  const lastTouchPoints = useRef({ x: 0, y: 0 });
  const initialDistance = useRef(0);
  const currentProgress = useRef(0);

  const { data: schoolData } = useSchool(user?.id || '');
  const { data: posts, isLoading, refetch } = usePosts(schoolData?.id, activeFilter);
  const likePost = useLikePost();

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('posts').delete().eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      setShowOptions(false);
      setSelectedPost(null);
    },
    onError: (error) => {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post. Please try again.', [{ text: 'OK' }]);
    },
  });

  // Initialize post likes when posts data changes
  useEffect(() => {
    if (posts) {
      const initialLikes = posts.reduce(
        (acc, post) => {
          acc[post.id] = post.likes_count;
          return acc;
        },
        {} as { [key: string]: number }
      );
      setPostLikes(initialLikes);
    }
  }, [posts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const animateHeart = (postId: string) => {
    if (!heartAnimations.current[postId]) {
      heartAnimations.current[postId] = new Animated.Value(1);
    }

    Animated.sequence([
      Animated.timing(heartAnimations.current[postId], {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(heartAnimations.current[postId], {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleLike = async (postId: string) => {
    try {
      const isLiked = likedPosts.has(postId);
      const currentLikes = postLikes[postId] || 0;

      // Update local state immediately for better UX
      setPostLikes((prev) => ({
        ...prev,
        [postId]: isLiked ? currentLikes - 1 : currentLikes + 1,
      }));

      // Animate the heart
      animateHeart(postId);

      // Update liked state
      setLikedPosts((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });

      // Make API call
      await likePost.mutateAsync({
        postId,
        currentLikes: isLiked ? currentLikes - 1 : currentLikes + 1,
      });
    } catch (error) {
      // Revert changes if API call fails
      const currentLikes = postLikes[postId] || 0;

      setPostLikes((prev) => ({
        ...prev,
        [postId]: likedPosts.has(postId) ? currentLikes + 1 : currentLikes - 1,
      }));

      setLikedPosts((prev) => {
        const newSet = new Set(prev);
        if (likedPosts.has(postId)) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });

      console.error('Error liking post:', error);
    }
  };

  const animateModal = (show: boolean) => {
    Animated.parallel([
      Animated.timing(modalAnimation, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnimation, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateIngredientsModal = (show: boolean) => {
    Animated.parallel([
      Animated.timing(ingredientsModalAnimation, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(ingredientsBackdropAnimation, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  useEffect(() => {
    animateModal(showOptions);
    animateIngredientsModal(showIngredients);
  }, [showOptions, showIngredients]);

  const handleOptionsPress = (postId: string) => {
    setSelectedPost(postId);
    setShowOptions(true);
  };

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deletePostMutation.mutate(postId);
          },
        },
      ]
    );
  };

  const handleShowIngredients = (ingredients: string) => {
    setSelectedIngredients(ingredients);
    setShowIngredients(true);
  };

  const getTimeElapsed = (createdAt: string) => {
    const now = new Date();
    const postDate = new Date(createdAt);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays}d ago`;
    }

    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks}w ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths}mo ago`;
    }

    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears}y ago`;
  };

  const OptionsModal = () => {
    const selectedPostData = posts?.find((post) => post.id === selectedPost);
    const isOwnPost = selectedPostData?.user_id === user?.id;

    return (
      <Modal
        visible={showOptions}
        transparent
        animationType="none"
        onRequestClose={() => setShowOptions(false)}>
        <Animated.View
          className="flex-1 items-center justify-center"
          style={{
            backgroundColor: backdropAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.85)'],
            }),
          }}>
          <Pressable className="h-full w-full flex-1" onPress={() => setShowOptions(false)}>
            <Animated.View
              style={{
                transform: [
                  {
                    scale: modalAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.95, 1],
                    }),
                  },
                ],
                opacity: modalAnimation,
              }}
              className="flex-1 items-center justify-center">
              <Pressable
                className={`w-72 overflow-hidden rounded-3xl shadow-2xl ${
                  colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'
                }`}
                onPress={(e) => e.stopPropagation()}>
                {/* Header */}
                <View
                  className={`border-b p-5 ${
                    colorScheme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                  }`}>
                  <Text
                    className={`text-center text-xl font-bold ${
                      colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                    }`}>
                    Post Options
                  </Text>
                </View>

                {/* Options */}
                <View className="p-2">
                  {isOwnPost && (
                    <TouchableOpacity
                      onPress={() => handleDeletePost(selectedPost!)}
                      className={`flex-row items-center rounded-2xl p-4 ${
                        colorScheme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-gray-50'
                      }`}>
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-red-50">
                        <Ionicons name="trash-outline" size={22} color="#F00511" />
                      </View>
                      <View className="ml-3 flex-1">
                        <Text className="text-base font-semibold text-[#F00511]">Delete Post</Text>
                        <Text
                          className={`mt-0.5 text-sm ${
                            colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                          Remove this post permanently
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={() => setShowOptions(false)}
                    className={`mt-2 rounded-2xl p-4 ${
                      colorScheme === 'dark' ? 'hover:bg-[#333333]' : 'hover:bg-gray-50'
                    }`}>
                    <Text
                      className={`text-center text-base font-medium ${
                        colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                      }`}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Modal>
    );
  };

  const IngredientsModal = () => (
    <Modal
      visible={showIngredients}
      transparent
      animationType="none"
      onRequestClose={() => setShowIngredients(false)}>
      <Animated.View
        className="flex-1 items-center justify-center"
        style={{
          backgroundColor: ingredientsBackdropAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.85)'],
          }),
        }}>
        <Pressable className="h-full w-full flex-1" onPress={() => setShowIngredients(false)}>
          <Animated.View
            style={{
              transform: [
                {
                  scale: ingredientsModalAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
              opacity: ingredientsModalAnimation,
            }}
            className="flex-1 items-center justify-center">
            <Pressable
              className={`w-80 overflow-hidden rounded-3xl shadow-2xl ${
                colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'
              }`}
              onPress={(e) => e.stopPropagation()}>
              {/* Header */}
              <View
                className={`border-b p-5 ${
                  colorScheme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                }`}>
                <Text
                  className={`text-center text-xl font-bold ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  Ingredients
                </Text>
              </View>

              {/* Ingredients List */}
              <View className="p-5">
                <Text
                  className={`text-base leading-6 ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  {selectedIngredients}
                </Text>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setShowIngredients(false)}
                className={`border-t p-4 ${
                  colorScheme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                }`}>
                <Text
                  className={`text-center text-base font-medium ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  Close
                </Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );

  const renderPost = (post: any, index: number) => {
    if (isGridView) {
      return (
        <View
          key={post.id}
          style={{
            width: gridItemWidth,
            marginLeft: index % 2 === 0 ? 16 : 8,
            marginRight: index % 2 === 0 ? 8 : 16,
          }}>
          <View className="mb-4">
            <View className="aspect-square overflow-hidden rounded-2xl">
              <Image
                source={{ uri: post.image_url }}
                className="h-full w-full"
                resizeMode="cover"
              />
              <View className="absolute inset-0 bg-black/20" />
              <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-2">
                <View className="flex-row items-center space-x-1">
                  <Ionicons name="heart" size={14} color="white" />
                  <Text className="text-xs text-white">{post.likes_count}</Text>
                </View>
                <View className="flex-row items-center space-x-1">
                  <Ionicons name="chatbubble" size={14} color="white" />
                  <Text className="text-xs text-white">0</Text>
                </View>
              </View>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View key={post.id} className="mx-4 mb-4">
        <View
          className={`overflow-hidden rounded-3xl ${
            colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'
          } shadow-lg`}>
          {/* Post Header with Gradient Background */}
          <View
            className={`flex-row items-center justify-between p-3 ${
              colorScheme === 'dark'
                ? 'bg-gradient-to-r from-[#1a1a1a] to-[#282828]'
                : 'bg-gradient-to-r from-[#f8f8f8] to-white'
            }`}>
            <View className="flex-row items-center">
              <View
                className={`h-12 w-12 overflow-hidden rounded-full border-2 ${
                  colorScheme === 'dark'
                    ? 'border-[#5070fd] bg-[#1a1a1a]'
                    : 'border-[#5070fd] bg-[#f9f9f9]'
                }`}>
                <Image
                  source={
                    post.profiles?.avatar_url
                      ? { uri: post.profiles.avatar_url }
                      : require('../../assets/splash.png')
                  }
                  className="h-full w-full"
                />
              </View>
              <View className="ml-3">
                <Text
                  className={`text-lg font-bold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  {post.profiles?.username || 'Unknown User'}
                </Text>
                <View className="flex-row items-center">
                  <View
                    className={`h-1.5 w-1.5 rounded-full ${colorScheme === 'dark' ? 'bg-[#5070fd]' : 'bg-[#5070fd]'}`}
                  />
                  <Text className="ml-2 text-xs text-gray-500">
                    {getTimeElapsed(post.created_at)}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => handleOptionsPress(post.id)}
              className={`rounded-full p-2 ${
                colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-[#f8f8f8]'
              }`}>
              <Ionicons
                name="ellipsis-horizontal"
                size={20}
                color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
              />
            </TouchableOpacity>
          </View>

          {/* Post Image with Overlay */}
          <View className="relative">
            <Image
              source={{ uri: post.image_url }}
              className="aspect-square w-full"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </View>

          {/* Post Actions with Redesigned Layout */}
          <View className="p-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-6">
                <View className="w-[4rem]">
                  <TouchableOpacity
                    onPress={() => handleLike(post.id)}
                    className="flex-row items-center">
                    <Animated.View
                      style={{
                        transform: [{ scale: heartAnimations.current[post.id] || 1 }],
                      }}
                      className={`rounded-full p-1 ${
                        colorScheme === 'dark' ? 'bg-none' : 'bg-none'
                      }`}>
                      <Ionicons
                        name={likedPosts.has(post.id) ? 'heart' : 'heart-outline'}
                        size={24}
                        color={
                          likedPosts.has(post.id)
                            ? '#F00511'
                            : colorScheme === 'dark'
                              ? '#E0E0E0'
                              : '#07020D'
                        }
                      />
                    </Animated.View>
                    <Text
                      className={`ml-0 text-base font-semibold ${
                        colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                      }`}>
                      {postLikes[post.id] || 0}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  className={`flex-row items-center space-x-2 rounded-full p-1 ${
                    colorScheme === 'dark' ? 'bg-none' : 'bg-none'
                  }`}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={22}
                    color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                  />
                  <Text
                    className={`ml-1 text-base  font-semibold ${
                      colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                    }`}>
                    Comment
                  </Text>
                </TouchableOpacity>
                {post.ingredients && (
                  <TouchableOpacity
                    onPress={() =>
                      handleShowIngredients(post.ingredients || 'No ingredients listed')
                    }
                    className={`ml-4 flex-row items-center space-x-2 rounded-full border-2 border-[#2DFE54] p-1 ${
                      colorScheme === 'dark' ? 'bg-[#46584a]' : 'bg-none'
                    }`}>
                    <Text
                      className={`text-base font-semibold ${
                        colorScheme === 'dark' ? 'text-[#2DFE54]' : 'text-[#2DFE54]'
                      }`}>
                      Ingredients
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                className={`rounded-full p-1 ${colorScheme === 'dark' ? 'bg-none' : 'bg-none'}`}>
                <Ionicons
                  name="bookmark-outline"
                  size={22}
                  color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                />
              </TouchableOpacity>
            </View>

            {/* Post Caption with Enhanced Typography */}
            <View className="mt-1 bg-gradient-to-r from-transparent to-transparent">
              {post.dish_name && (
                <Text
                  className={`text-xl font-bold leading-6 ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  {post.dish_name}
                </Text>
              )}
              {post.caption && (
                <Text
                  className={`mt-1 text-base leading-6 ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  {post.caption}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView
        className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#F00511" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
      {/* Filter Buttons */}
      <View className="flex-row justify-center gap-2 space-x-4 p-4">
        <TouchableOpacity
          onPress={() => setActiveFilter('all')}
          className={`rounded-2xl px-5 ${activeFilter === 'all' ? 'py-1.5' : 'py-2'} ${
            activeFilter === 'all'
              ? colorScheme === 'dark'
                ? 'bg-[#282828]'
                : 'bg-[#f9f9f9]'
              : colorScheme === 'dark'
                ? 'bg-[#282828]'
                : 'bg-[#f9f9f9]'
          }`}>
          {activeFilter === 'all' && (
            <View className="absolute inset-0 overflow-hidden rounded-2xl">
              <LinearGradient
                colors={['#5070fd', '#2f4ccc']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  borderRadius: 16,
                }}
              />
              <View
                className="absolute inset-[1.5px] rounded-2xl"
                style={{
                  backgroundColor: colorScheme === 'dark' ? '#121113' : '#e0e0e0',
                }}
              />
            </View>
          )}
          {activeFilter === 'all' ? (
            <GradientText
              colors={['#5070fd', '#2f4ccc']}
              className="text-center text-xl font-extrabold text-white"
              style={{
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
                letterSpacing: 0.5,
              }}>
              All
            </GradientText>
          ) : (
            <Text
              className={`text-center text-base font-medium ${
                colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
              }`}>
              All
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveFilter('mySchool')}
          className={`relative rounded-2xl px-5 ${
            activeFilter === 'mySchool' ? 'py-1.5' : 'py-2'
          } ${
            activeFilter === 'mySchool'
              ? colorScheme === 'dark'
                ? 'bg-[#282828]'
                : 'bg-[#f9f9f9]'
              : colorScheme === 'dark'
                ? 'bg-[#282828]'
                : 'bg-[#f9f9f9]'
          }`}>
          {activeFilter === 'mySchool' && (
            <View className="absolute inset-0 overflow-hidden rounded-2xl">
              <LinearGradient
                colors={[
                  schoolData?.primary_color || '#F00511',
                  schoolData?.secondary_color || '#F00511',
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  borderRadius: 16,
                }}
              />
              <View
                className="absolute inset-[1.5px] rounded-2xl"
                style={{
                  backgroundColor: colorScheme === 'dark' ? '#121113' : '#e0e0e0',
                }}
              />
            </View>
          )}
          {activeFilter === 'mySchool' ? (
            <GradientText
              colors={[
                schoolData?.primary_color || '#F00511',
                schoolData?.secondary_color || '#F00511',
              ]}
              className="text-center text-xl font-extrabold text-white"
              style={{
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
                letterSpacing: 0.5,
              }}>
              {schoolData?.short_name}
            </GradientText>
          ) : (
            <Text
              className={`text-center text-base font-medium ${
                colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
              }`}>
              {schoolData?.short_name}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveFilter('otherSchools')}
          className={`relative rounded-2xl px-5 ${
            activeFilter === 'otherSchools' ? 'py-1.5' : 'py-2'
          } ${
            activeFilter === 'otherSchools'
              ? colorScheme === 'dark'
                ? 'bg-[#282828]'
                : 'bg-[#f9f9f9]'
              : colorScheme === 'dark'
                ? 'bg-[#282828]'
                : 'bg-[#f9f9f9]'
          }`}>
          {activeFilter === 'otherSchools' && (
            <View className="absolute inset-0 overflow-hidden rounded-2xl">
              <LinearGradient
                colors={['#5070fd', '#2f4ccc']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  borderRadius: 16,
                }}
              />
              <View
                className="absolute inset-[1.5px] rounded-2xl"
                style={{
                  backgroundColor: colorScheme === 'dark' ? '#121113' : '#e0e0e0',
                }}
              />
            </View>
          )}
          {activeFilter === 'otherSchools' ? (
            <GradientText
              colors={['#5070fd', '#2f4ccc']}
              className="text-center text-xl font-extrabold text-white"
              style={{
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
                letterSpacing: 0.5,
              }}>
              Other Schools
            </GradientText>
          ) : (
            <Text
              className={`text-center text-base font-medium ${
                colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
              }`}>
              Other Schools
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setActiveFilter('friends')}
          className={`relative rounded-2xl px-5 ${activeFilter === 'friends' ? 'py-1.5' : 'py-2'} ${
            activeFilter === 'friends'
              ? colorScheme === 'dark'
                ? 'bg-[#282828]'
                : 'bg-[#f9f9f9]'
              : colorScheme === 'dark'
                ? 'bg-[#282828]'
                : 'bg-[#f9f9f9]'
          }`}>
          {activeFilter === 'friends' && (
            <View className="absolute inset-0 overflow-hidden rounded-2xl">
              <LinearGradient
                colors={['#5070fd', '#2f4ccc']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  borderRadius: 16,
                }}
              />
              <View
                className="absolute inset-[1.5px] rounded-2xl"
                style={{
                  backgroundColor: colorScheme === 'dark' ? '#121113' : '#e0e0e0',
                }}
              />
            </View>
          )}
          {activeFilter === 'friends' ? (
            <GradientText
              colors={['#5070fd', '#2f4ccc']}
              className="text-center text-xl font-extrabold text-white"
              style={{
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
                letterSpacing: 0.5,
              }}>
              Friends
            </GradientText>
          ) : (
            <Text
              className={`text-center text-base font-medium ${
                colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
              }`}>
              Friends
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* View Toggle Button */}
      <TouchableOpacity
        onPress={() => setIsGridView(!isGridView)}
        className="absolute right-4 top-4 z-10 rounded-full bg-[#F00511] p-2"
        style={{ marginTop: 16 }}>
        <Ionicons name={isGridView ? 'grid' : 'list'} size={24} color="white" />
      </TouchableOpacity>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {posts?.length === 0 ? (
          <View className="flex-1 items-center justify-center p-8">
            <Ionicons
              name={
                activeFilter === 'mySchool'
                  ? 'school'
                  : activeFilter === 'friends'
                    ? 'people'
                    : 'globe'
              }
              size={64}
              color="#F00511"
              className="mb-4"
            />
            <Text
              className={`mb-2 text-center text-xl font-bold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
              {activeFilter === 'mySchool'
                ? 'No posts from your school yet'
                : activeFilter === 'otherSchools'
                  ? 'No posts from other schools yet'
                  : activeFilter === 'friends'
                    ? 'No posts from friends yet'
                    : 'No posts yet'}
            </Text>
            {activeFilter === 'mySchool' && (
              <Text
                className={`text-center text-base ${colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'}`}>
                Be the first to share something!
              </Text>
            )}
          </View>
        ) : (
          <View className={`${isGridView ? 'flex-row flex-wrap' : ''} pb-16`}>
            {posts?.map((post, index) => renderPost(post, index))}
          </View>
        )}
      </ScrollView>

      {/* Create Post Button
      <TouchableOpacity
        onPress={() => router.push('/create-post')}
        className="absolute bottom-6 right-6 h-16 w-16 items-center justify-center rounded-2xl bg-[#F00511] shadow-lg">
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity> */}

      {/* Modals */}
      <OptionsModal />
      <IngredientsModal />
    </SafeAreaView>
  );
}
