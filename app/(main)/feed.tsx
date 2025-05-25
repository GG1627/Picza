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
import { MotiView } from 'moti';
import { Easing } from 'react-native-reanimated';
import { deleteFromCloudinary } from '../../lib/cloudinary';

// Add Post type at the top of the file
type Post = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  dish_name: string | null;
  ingredients: string | null;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    schools: {
      name: string;
    } | null;
  } | null;
};

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'mySchool' | 'otherSchools' | 'friends'>(
    'all'
  );
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [postLikes, setPostLikes] = useState<{ [key: string]: number }>({});
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
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const transitionAnim = useRef(new Animated.Value(0)).current;
  const { width: screenWidth } = Dimensions.get('window');
  const gridItemWidth = (screenWidth - 48) / 2; // 2 columns with proper spacing (16px padding on each side + 16px gap between items)
  const lastTouchPoints = useRef({ x: 0, y: 0 });
  const initialDistance = useRef(0);
  const currentProgress = useRef(0);
  const createButtonAnimation = useRef(new Animated.Value(0)).current;
  const filterAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const pageSize = 10;
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const { data: schoolData } = useSchool(user?.id || '');
  const {
    data: posts,
    isLoading,
    refetch,
  } = usePosts(schoolData?.id, activeFilter, page, pageSize);
  const likePost = useLikePost();

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      // First get the post to get the image URL
      const { data: post, error: fetchError } = await supabase
        .from('posts')
        .select('image_url')
        .eq('id', postId)
        .single();

      if (fetchError) throw fetchError;

      // Delete the image from Cloudinary
      if (post?.image_url) {
        await deleteFromCloudinary(post.image_url);
      }

      // Then delete the post from the database
      const { error } = await supabase.from('posts').delete().eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post. Please try again.', [{ text: 'OK' }]);
    },
  });

  // Update posts when new data arrives
  useEffect(() => {
    if (posts) {
      if (page === 1) {
        setAllPosts(posts as Post[]);
      } else {
        setAllPosts((prev) => [...prev, ...(posts as Post[])]);
      }
      setHasMore((posts as Post[]).length === pageSize);
    }
  }, [posts]);

  const loadMore = async () => {
    if (!hasMore || isLoading) return;
    setPage((prev) => prev + 1);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
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
    animateModal(false);
    animateIngredientsModal(showIngredients);
  }, [showIngredients]);

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
          onPress: async () => {
            setDeletingPostId(postId);
            try {
              await deletePostMutation.mutateAsync(postId);
            } finally {
              setDeletingPostId(null);
            }
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

  const OptionsModal = () => {
    if (!selectedPost) return null;
    const isOwnPost = selectedPost.user_id === user?.id;

    return (
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/50"
          onPress={() => setShowOptionsModal(false)}>
          <Pressable
            className={`w-80 overflow-hidden rounded-3xl ${
              colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'
            }`}
            onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View
              className={`border-b p-4 ${
                colorScheme === 'dark' ? 'border-gray-800' : 'border-gray-100'
              }`}>
              <Text
                className={`text-center text-lg font-semibold ${
                  colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                }`}>
                Post Options
              </Text>
            </View>

            {/* Options */}
            <View className="p-2">
              {isOwnPost ? (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setShowOptionsModal(false);
                      // Pin functionality will be added later
                      Alert.alert('Coming Soon', 'Pin functionality will be available soon!');
                    }}
                    className={`flex-row items-center space-x-3 rounded-xl p-3 ${
                      colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                    }`}>
                    <Ionicons name="pin" size={24} color="#5070fd" />
                    <Text
                      className={`text-base ${
                        colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                      }`}>
                      Pin Post
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setShowOptionsModal(false);
                      handleDeletePost(selectedPost.id);
                    }}
                    className="mt-2 flex-row items-center space-x-3 rounded-xl bg-red-50 p-3">
                    <Ionicons name="trash" size={24} color="#F00511" />
                    <Text className="text-base text-[#F00511]">Delete Post</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setShowOptionsModal(false);
                      // Save functionality will be added later
                      Alert.alert('Coming Soon', 'Save functionality will be available soon!');
                    }}
                    className={`flex-row items-center space-x-3 rounded-xl p-3 ${
                      colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                    }`}>
                    <Ionicons name="bookmark-outline" size={24} color="#5070fd" />
                    <Text
                      className={`text-base ${
                        colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                      }`}>
                      Save Post
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setShowOptionsModal(false);
                      // Report functionality will be added later
                      Alert.alert('Coming Soon', 'Report functionality will be available soon!');
                    }}
                    className="mt-2 flex-row items-center space-x-3 rounded-xl bg-red-50 p-3">
                    <Ionicons name="flag-outline" size={24} color="#F00511" />
                    <Text className="text-base text-[#F00511]">Report Post</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              onPress={() => setShowOptionsModal(false)}
              className={`border-t p-4 ${
                colorScheme === 'dark' ? 'border-gray-800' : 'border-gray-100'
              }`}>
              <Text
                className={`text-center text-base font-medium ${
                  colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                }`}>
                Cancel
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  const renderPost = (post: any, index: number) => {
    const optimizedImageUrl = post.image_url;
    const isOwnPost = post.user_id === user?.id;
    const isDeleting = deletingPostId === post.id;

    if (isGridView) {
      return (
        <View
          key={post.id}
          style={{
            width: gridItemWidth,
            marginLeft: index % 2 === 0 ? 16 : 8,
            marginRight: index % 2 === 0 ? 8 : 16,
          }}>
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500, delay: index * 100 }}
            className="mb-4">
            <View className="aspect-square overflow-hidden rounded-2xl">
              <Image
                source={{ uri: optimizedImageUrl }}
                className="h-full w-full"
                resizeMode="cover"
              />
              {isDeleting && (
                <View className="absolute inset-0 items-center justify-center bg-black/50">
                  <ActivityIndicator size="large" color="white" />
                  <Text className="mt-2 text-white">Deleting...</Text>
                </View>
              )}
              <View className="absolute inset-0">
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
                  locations={[0, 0.5, 1]}
                  style={{ flex: 1 }}
                />
              </View>
              <View className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between p-3">
                <View className="flex-row items-center space-x-2">
                  <View className="h-8 w-8 overflow-hidden rounded-full border-2 border-white">
                    <Image
                      source={
                        post.profiles?.avatar_url
                          ? { uri: post.profiles.avatar_url }
                          : require('../../assets/splash.png')
                      }
                      className="h-full w-full"
                    />
                  </View>
                  <Text className="text-sm font-semibold text-white">
                    {post.profiles?.username || 'Unknown User'}
                  </Text>
                </View>
                <View className="flex-row items-center space-x-3">
                  <View className="flex-row items-center space-x-1">
                    <Ionicons name="heart" size={16} color="white" />
                    <Text className="text-xs text-white">{post.likes_count}</Text>
                  </View>
                  <View className="flex-row items-center space-x-1">
                    <Ionicons name="chatbubble" size={16} color="white" />
                    <Text className="text-xs text-white">0</Text>
                  </View>
                </View>
              </View>
            </View>
          </MotiView>
        </View>
      );
    }

    return (
      <View key={post.id} className="mb-6">
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: index * 100 }}
          className={`overflow-hidden rounded-3xl ${
            colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
          } shadow-lg`}>
          {/* Post Header */}
          <View className="mb-[-0.25rem] mt-[-0.25rem] flex-row items-center justify-between p-3">
            <View className="flex-row items-center">
              <View
                className={`h-12 w-12 overflow-hidden rounded-full border-2 ${
                  colorScheme === 'dark'
                    ? 'border-[#282828] bg-[#282828]'
                    : 'border-gray-100 bg-gray-50'
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
                  className={`text-base font-bold ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  {post.profiles?.username || 'Unknown User'}
                </Text>
                <View className="flex-row items-center">
                  <Text className="text-xs text-gray-500">{getTimeElapsed(post.created_at)}</Text>
                  <Text className="mx-1 text-xs text-gray-500">•</Text>
                  <View className="flex-row items-center">
                    <Ionicons name="school" size={12} color="#5070fd" />
                    <GradientText
                      colors={['#5070fd', '#2f4ccc']}
                      className="ml-1 text-xs font-medium">
                      {post.profiles?.schools?.name || 'Unknown School'}
                    </GradientText>
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => {
                setSelectedPost(post);
                setShowOptionsModal(true);
              }}
              className="p-2">
              <Ionicons
                name="ellipsis-horizontal"
                size={24}
                color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
              />
            </TouchableOpacity>
          </View>

          {/* Post Image */}
          <View className="relative">
            <Image
              source={{ uri: optimizedImageUrl }}
              className="aspect-square w-full"
              resizeMode="cover"
            />
            {isDeleting && (
              <View className="absolute inset-0 items-center justify-center bg-black/50">
                <ActivityIndicator size="large" color="white" />
                <Text className="mt-2 text-white">Deleting...</Text>
              </View>
            )}
            <View className="absolute inset-0">
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
                locations={[0, 0.5, 1]}
                style={{ flex: 1 }}
              />
            </View>
            {post.dish_name && (
              <View className="absolute bottom-0 left-0 right-0 p-4">
                <Text className="text-2xl font-bold text-white" numberOfLines={2}>
                  {post.dish_name}
                </Text>
              </View>
            )}
          </View>

          {/* Post Actions */}
          <View className="mt-[-0.25rem] p-3">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-4">
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => handleLike(post.id)}
                    className="flex-row items-center">
                    <Animated.View
                      style={{
                        transform: [{ scale: heartAnimations.current[post.id] || 1 }],
                      }}>
                      <Ionicons
                        name={likedPosts.has(post.id) ? 'heart' : 'heart-outline'}
                        size={28}
                        color={
                          likedPosts.has(post.id)
                            ? '#F00511'
                            : colorScheme === 'dark'
                              ? '#E0E0E0'
                              : '#07020D'
                        }
                      />
                    </Animated.View>
                  </TouchableOpacity>
                  <View className="w-8">
                    <Text
                      className={`text-base font-semibold ${
                        colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                      }`}>
                      {postLikes[post.id] || 0}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center">
                  <TouchableOpacity>
                    <Ionicons
                      name="chatbubble-outline"
                      size={28}
                      color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                    />
                  </TouchableOpacity>
                  <View className="w-8">
                    <Text
                      className={`text-base font-semibold ${
                        colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                      }`}>
                      0
                    </Text>
                  </View>
                </View>
                <TouchableOpacity>
                  <Ionicons
                    name="paper-plane-outline"
                    size={28}
                    color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                  />
                </TouchableOpacity>
              </View>
              <View className="flex-row items-center space-x-2">
                {post.ingredients && (
                  <TouchableOpacity
                    onPress={() =>
                      handleShowIngredients(post.ingredients || 'No ingredients listed')
                    }
                    className={`rounded-full border-2 border-[#2DFE54] px-3 py-1.5 ${
                      colorScheme === 'dark' ? 'bg-[#46584a]' : 'bg-none'
                    }`}>
                    <Text
                      className={`text-sm font-semibold ${
                        colorScheme === 'dark' ? 'text-[#2DFE54]' : 'text-[#2DFE54]'
                      }`}>
                      Ingredients
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity>
                  <Ionicons
                    name="bookmark-outline"
                    size={28}
                    color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Post Caption */}
            <View className="mt-1">
              {post.caption && (
                <Text
                  className={`text-base leading-5 ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  <Text className="font-bold">{post.profiles?.username || 'Unknown User'} </Text>
                  {post.caption}
                </Text>
              )}
            </View>
          </View>
        </MotiView>
      </View>
    );
  };

  useEffect(() => {
    // Initial spring animation
    Animated.spring(createButtonAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();

    // Continuous pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    ).start();

    Animated.spring(filterAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 7,
    }).start();
  }, []);

  const handleViewSwitch = () => {
    if (isViewTransitioning) return;

    setIsViewTransitioning(true);
    setIsGridView(!isGridView);

    // Reset the transition state after animation completes
    setTimeout(() => {
      setIsViewTransitioning(false);
    }, 500); // Match this with your animation duration
  };

  // Add this function to handle filter changes
  const handleFilterChange = (filter: 'all' | 'mySchool' | 'otherSchools' | 'friends') => {
    if (isViewTransitioning) return;

    setIsViewTransitioning(true);
    setActiveFilter(filter);

    // If we're in grid view, switch to list view first
    if (isGridView) {
      setIsGridView(false);
    }

    // Reset the transition state after animation completes
    setTimeout(() => {
      setIsViewTransitioning(false);
    }, 500);
  };

  if (isLoading) {
    return (
      <SafeAreaView
        className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#5070fd" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
      {/* Animated Header */}
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'timing', duration: 500 }}
        className="mt-2 px-4">
        <Text
          className={`font-pattaya text-[2.5rem] ${
            colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
          }`}>
          Picza
        </Text>
        <Text
          className={`mt-[-0.60rem] text-base ${
            colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
          Discover amazing food from your community
        </Text>
      </MotiView>

      {/* Filter Buttons */}
      <Animated.View
        style={{
          transform: [
            {
              translateY: filterAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
          opacity: filterAnimation,
        }}
        className="mb-[-0.75rem] mt-[-0.75rem] flex-row justify-center gap-2 space-x-4 p-4">
        <TouchableOpacity
          onPress={() => handleFilterChange('all')}
          disabled={isViewTransitioning}
          className={`rounded-2xl px-5 py-2 ${isViewTransitioning ? 'opacity-50' : ''}`}>
          {activeFilter === 'all' ? (
            <GradientText
              colors={['#5070fd', '#2f4ccc']}
              className="text-center text-xl font-extrabold"
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
                colorScheme === 'dark' ? 'text-[#515151]' : 'text-gray-600'
              }`}>
              All
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleFilterChange('mySchool')}
          disabled={isViewTransitioning}
          className={`rounded-2xl px-5 py-2 ${isViewTransitioning ? 'opacity-50' : ''}`}>
          {activeFilter === 'mySchool' ? (
            <GradientText
              colors={[
                schoolData?.primary_color || '#F00511',
                schoolData?.secondary_color || '#F00511',
              ]}
              className="text-center text-xl font-extrabold"
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
                colorScheme === 'dark' ? 'text-[#515151]' : 'text-gray-600'
              }`}>
              {schoolData?.short_name}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleFilterChange('otherSchools')}
          disabled={isViewTransitioning}
          className={`rounded-2xl px-5 py-2 ${isViewTransitioning ? 'opacity-50' : ''}`}>
          {activeFilter === 'otherSchools' ? (
            <GradientText
              colors={['#5070fd', '#2f4ccc']}
              className="text-center text-xl font-extrabold"
              style={{
                textShadowColor: 'rgba(0, 0, 0, 0.2)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 3,
                letterSpacing: 0.5,
              }}>
              Other
            </GradientText>
          ) : (
            <Text
              className={`text-center text-base font-medium ${
                colorScheme === 'dark' ? 'text-[#515151]' : 'text-gray-600'
              }`}>
              Other
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => handleFilterChange('friends')}
          disabled={isViewTransitioning}
          className={`rounded-2xl px-5 py-2 ${isViewTransitioning ? 'opacity-50' : ''}`}>
          {activeFilter === 'friends' ? (
            <GradientText
              colors={['#ff4d6d', '#ff8fa3']}
              className="text-center text-xl font-extrabold"
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
                colorScheme === 'dark' ? 'text-[#515151]' : 'text-gray-600'
              }`}>
              Friends
            </Text>
          )}
        </TouchableOpacity>

        {/* View Toggle Button */}
        <TouchableOpacity
          onPress={handleViewSwitch}
          disabled={isViewTransitioning}
          className={`rounded-2xl px-5 py-2 ${isViewTransitioning ? 'opacity-50' : ''}`}>
          <Ionicons
            name={isGridView ? 'grid' : 'list'}
            size={24}
            color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
          />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom =
            layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

          if (isCloseToBottom) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
        showsVerticalScrollIndicator={false}>
        {allPosts?.length === 0 ? (
          <MotiView
            from={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'timing', duration: 500 }}
            className="flex-1 items-center justify-center p-8">
            <View className="mb-6 h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[#5070fd] to-[#2f4ccc]">
              <Ionicons
                name={
                  activeFilter === 'mySchool'
                    ? 'school'
                    : activeFilter === 'friends'
                      ? 'people'
                      : 'globe'
                }
                size={48}
                color="white"
              />
            </View>
            <Text
              className={`mb-2 text-center text-2xl font-bold ${
                colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
              }`}>
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
          </MotiView>
        ) : (
          <View className={`${isGridView ? 'flex-row flex-wrap' : ''} pb-16`}>
            {allPosts?.map((post, index) => (
              <MotiView
                key={post.id}
                from={{ opacity: 0, translateY: 20 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                  type: 'timing',
                  duration: 500,
                  delay: index * 100,
                }}>
                {renderPost(post, index)}
              </MotiView>
            ))}
            {isLoading && page > 1 && (
              <View className="w-full items-center py-4">
                <ActivityIndicator size="small" color="#5070fd" />
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Create Post Button */}
      <Animated.View
        style={{
          transform: [
            {
              scale: createButtonAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 1],
              }),
            },
          ],
          opacity: createButtonAnimation,
        }}
        className="absolute bottom-24 right-3">
        <Animated.View
          style={{
            transform: [
              {
                scale: pulseAnimation,
              },
            ],
          }}>
          <TouchableOpacity
            onPress={() => router.push('/create-post')}
            className="h-16 w-16 items-center justify-center rounded-full">
            <LinearGradient
              colors={['#5070fd', '#2f4ccc']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="absolute inset-0 rounded-full"
            />
            <View className="absolute inset-0 rounded-full bg-white opacity-10" />
            <View className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
            <Ionicons name="add" size={32} color="white" />
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Modals */}
      <IngredientsModal />
      <OptionsModal />
    </SafeAreaView>
  );
}
