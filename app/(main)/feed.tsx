import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
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
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
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
import { Easing } from 'react-native';
import { deleteFromCloudinary } from '../../lib/cloudinary';
import { useFocusEffect } from '@react-navigation/native';

// Animation constants
const ANIMATION_CONFIG = {
  MODAL: {
    DURATION: 300,
    SPRING: {
      DAMPING: 20,
      MASS: 0.5,
      STIFFNESS: 200,
    },
  },
  HEART: {
    DURATION: 150,
    SCALE: 1.3,
  },
  PULSE: {
    DURATION: 1000,
    SCALE: 1.1,
  },
};

// Move Post type to a separate types file
type Post = {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  dish_name: string | null;
  ingredients: string | null;
  comments: string[] | null;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    schools: {
      name: string;
    } | null;
  } | null;
};

// Move CommentsModal outside of the main component
const CommentsModal = memo(
  ({
    visible,
    onClose,
    post,
    onAddComment,
    colorScheme,
  }: {
    visible: boolean;
    onClose: () => void;
    post: Post | null;
    onAddComment: (comment: string) => void;
    colorScheme: 'dark' | 'light';
  }) => {
    const [newComment, setNewComment] = useState('');
    const commentsBackdropAnimation = useRef(new Animated.Value(0)).current;
    const { height: screenHeight } = Dimensions.get('window');
    const modalHeight = screenHeight * 0.7; // 70% of screen height
    const translateY = useRef(new Animated.Value(modalHeight)).current;
    const lastGestureDy = useRef(0);

    const panResponder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gestureState) => {
          return Math.abs(gestureState.dy) > 5;
        },
        onPanResponderGrant: () => {
          translateY.setOffset(lastGestureDy.current);
        },
        onPanResponderMove: (_, gestureState) => {
          const newDy = Math.max(0, Math.min(modalHeight, gestureState.dy));
          translateY.setValue(newDy);
        },
        onPanResponderRelease: (_, gestureState) => {
          translateY.flattenOffset();
          lastGestureDy.current = gestureState.dy;

          if (gestureState.dy > modalHeight * 0.3 || gestureState.vy > 0.5) {
            // Close modal
            Animated.parallel([
              Animated.timing(translateY, {
                toValue: modalHeight,
                duration: ANIMATION_CONFIG.MODAL.DURATION,
                useNativeDriver: true,
                easing: Easing.bezier(0.4, 0.0, 0.2, 1),
              }),
              Animated.timing(commentsBackdropAnimation, {
                toValue: 0,
                duration: ANIMATION_CONFIG.MODAL.DURATION,
                useNativeDriver: true,
              }),
            ]).start(() => {
              onClose();
            });
          } else {
            // Return to open position
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              damping: ANIMATION_CONFIG.MODAL.SPRING.DAMPING,
              mass: ANIMATION_CONFIG.MODAL.SPRING.MASS,
              stiffness: ANIMATION_CONFIG.MODAL.SPRING.STIFFNESS,
            }).start();
          }
        },
      })
    ).current;

    useEffect(() => {
      if (visible) {
        translateY.setValue(modalHeight);
        lastGestureDy.current = 0;
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: ANIMATION_CONFIG.MODAL.SPRING.DAMPING,
            mass: ANIMATION_CONFIG.MODAL.SPRING.MASS,
            stiffness: ANIMATION_CONFIG.MODAL.SPRING.STIFFNESS,
          }),
          Animated.timing(commentsBackdropAnimation, {
            toValue: 1,
            duration: ANIMATION_CONFIG.MODAL.DURATION,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: modalHeight,
            duration: ANIMATION_CONFIG.MODAL.DURATION,
            useNativeDriver: true,
            easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          }),
          Animated.timing(commentsBackdropAnimation, {
            toValue: 0,
            duration: ANIMATION_CONFIG.MODAL.DURATION,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [visible, modalHeight]);

    const handleAddComment = useCallback(() => {
      if (!newComment.trim()) return;
      onAddComment(newComment);
      setNewComment('');
    }, [newComment, onAddComment]);

    if (!post) return null;

    return (
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1">
          <Animated.View
            className="flex-1"
            style={{
              backgroundColor: commentsBackdropAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: ['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.5)'],
              }),
            }}>
            <Pressable
              className="h-full w-full"
              onPress={() => {
                Keyboard.dismiss();
                onClose();
              }}>
              <Animated.View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: modalHeight,
                  transform: [
                    {
                      translateY: translateY,
                    },
                  ],
                }}
                className="overflow-hidden">
                <Pressable
                  className={`h-full w-full rounded-t-3xl ${
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'
                  }`}
                  onPress={(e) => e.stopPropagation()}>
                  {/* Handle Bar */}
                  <View {...panResponder.panHandlers} className="items-center py-2">
                    <View
                      className={`h-1 w-12 rounded-full ${
                        colorScheme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'
                      }`}
                    />
                  </View>

                  {/* Header */}
                  <View
                    className={`border-b px-4 py-3 ${
                      colorScheme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                    }`}>
                    <Text
                      className={`text-center text-xl font-bold ${
                        colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                      }`}>
                      Comments
                    </Text>
                  </View>

                  {/* Comments List */}
                  <ScrollView
                    className="flex-1 px-4"
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}>
                    <View className="py-4">
                      {post.comments && post.comments.length > 0 ? (
                        post.comments.map((comment, index) => (
                          <View key={index} className="mb-4">
                            <Text
                              className={`text-base leading-5 ${
                                colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                              }`}>
                              {comment}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text
                          className={`text-center text-base ${
                            colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                          No comments yet. Be the first to comment!
                        </Text>
                      )}
                    </View>
                  </ScrollView>

                  {/* Add Comment Input */}
                  <View
                    className={`mb-6 border-t px-4 py-3 ${
                      colorScheme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                    }`}>
                    <View className="flex-row items-center space-x-2">
                      <TextInput
                        value={newComment}
                        onChangeText={setNewComment}
                        placeholder="Add a comment..."
                        placeholderTextColor={colorScheme === 'dark' ? '#666' : '#999'}
                        className={`flex-1 rounded-full px-4 py-3 ${
                          colorScheme === 'dark'
                            ? 'bg-[#1a1a1a] text-white'
                            : 'bg-gray-100 text-black'
                        }`}
                        multiline={false}
                        autoCapitalize="none"
                        autoCorrect={false}
                        spellCheck={false}
                        keyboardType="default"
                        returnKeyType="send"
                        onSubmitEditing={handleAddComment}
                        blurOnSubmit={false}
                      />
                      <TouchableOpacity
                        onPress={handleAddComment}
                        disabled={!newComment.trim()}
                        className={`rounded-full p-2 ${
                          !newComment.trim()
                            ? 'bg-gray-300'
                            : colorScheme === 'dark'
                              ? 'bg-[#5070fd]'
                              : 'bg-[#5070fd]'
                        }`}>
                        <Ionicons
                          name="send"
                          size={20}
                          color={!newComment.trim() ? '#666' : 'white'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Pressable>
              </Animated.View>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }
);

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'all' | 'mySchool' | 'friends'>('all');
  const [sortBy, setSortBy] = useState<'trending' | 'recent'>('trending');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
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
  const [isGridView, setIsGridView] = useState(false);
  const [isViewTransitioning, setIsViewTransitioning] = useState(false);
  const { width: screenWidth } = Dimensions.get('window');
  const horizontalPadding = 16;
  const columnGap = 8;
  const gridItemWidth = (screenWidth - horizontalPadding * 2 - columnGap) / 2;
  const createButtonAnimation = useRef(new Animated.Value(0)).current;
  const filterAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const pageSize = 10;
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [isReturningFromProfile, setIsReturningFromProfile] = useState(false);
  const [hasInitialData, setHasInitialData] = useState(false);

  const { data: schoolData } = useSchool(user?.id || '');
  const {
    data: posts,
    isLoading,
    refetch,
  } = usePosts(schoolData?.id, activeFilter, page, pageSize, sortBy);
  const likePost = useLikePost();

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      try {
        // First get the post to get the image URL
        const { data: post, error: fetchError } = await supabase
          .from('posts')
          .select('image_url')
          .eq('id', postId)
          .single();

        if (fetchError) throw new Error(`Failed to fetch post: ${fetchError.message}`);

        // Delete the image from Cloudinary
        if (post?.image_url) {
          try {
            await deleteFromCloudinary(post.image_url);
          } catch (cloudinaryError) {
            console.error('Error deleting from Cloudinary:', cloudinaryError);
            // Continue with post deletion even if Cloudinary deletion fails
          }
        }

        // Then delete the post from the database
        const { error: deleteError } = await supabase.from('posts').delete().eq('id', postId);

        if (deleteError) throw new Error(`Failed to delete post: ${deleteError.message}`);
      } catch (error) {
        console.error('Error in deletePostMutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error: Error) => {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post. Please try again.', [{ text: 'OK' }]);
    },
  });

  // Modify the useEffect that updates posts
  useEffect(() => {
    if (posts) {
      if (page === 1) {
        setAllPosts(posts as Post[]);
        setHasInitialData(true);
      } else {
        // Filter out any duplicate posts by ID before appending
        const newPosts = (posts as Post[]).filter(
          (newPost) => !allPosts.some((existingPost) => existingPost.id === newPost.id)
        );
        setAllPosts((prev) => [...prev, ...newPosts]);
      }
      setHasMore((posts as Post[]).length === pageSize);
      setIsLoadingMore(false);
    }
  }, [posts, page]);

  const loadMore = async () => {
    if (!hasMore || isLoading || isLoadingMore) return;
    setIsLoadingMore(true);
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
        toValue: ANIMATION_CONFIG.HEART.SCALE,
        duration: ANIMATION_CONFIG.HEART.DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(heartAnimations.current[postId], {
        toValue: 1,
        duration: ANIMATION_CONFIG.HEART.DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const fetchLikedPosts = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const likedPostIds = new Set(data.map((like) => like.post_id));
      setLikedPosts(likedPostIds);
    } catch (error) {
      console.error('Error fetching liked posts:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchLikedPosts();
    // Initialize postLikes with the actual likes count from posts
    if (allPosts) {
      const initialLikes = allPosts.reduce(
        (acc, post) => {
          acc[post.id] = post.likes_count;
          return acc;
        },
        {} as { [key: string]: number }
      );
      setPostLikes(initialLikes);
    }
  }, [fetchLikedPosts, allPosts]);

  const handleLike = async (postId: string) => {
    if (!user?.id) return;

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

      // Update database
      if (isLiked) {
        // Unlike post
        const { error: unlikeError } = await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);

        if (unlikeError) throw unlikeError;

        // Update post likes count
        const { error: updateError } = await supabase
          .from('posts')
          .update({ likes_count: currentLikes - 1 })
          .eq('id', postId);

        if (updateError) throw updateError;
      } else {
        // Like post
        const { error: likeError } = await supabase
          .from('post_likes')
          .insert([{ user_id: user.id, post_id: postId }]);

        if (likeError) throw likeError;

        // Update post likes count
        const { error: updateError } = await supabase
          .from('posts')
          .update({ likes_count: currentLikes + 1 })
          .eq('id', postId);

        if (updateError) throw updateError;
      }
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
      Alert.alert('Error', 'Failed to update like. Please try again.');
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
          className="absolute inset-0 flex-1 items-center justify-center bg-black/50"
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

  const handleShowComments = useCallback((post: Post) => {
    setSelectedPostForComments(post);
    setShowCommentsModal(true);
  }, []);

  const handleCloseComments = useCallback(() => {
    setShowCommentsModal(false);
    setTimeout(() => setSelectedPostForComments(null), 200);
  }, []);

  const handleAddComment = useCallback(
    async (comment: string) => {
      if (!selectedPostForComments) return;

      try {
        const updatedComments = [...(selectedPostForComments.comments || []), comment];

        const { error } = await supabase
          .from('posts')
          .update({ comments: updatedComments })
          .eq('id', selectedPostForComments.id);

        if (error) throw error;

        // Update local state
        setAllPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === selectedPostForComments.id ? { ...post, comments: updatedComments } : post
          )
        );
      } catch (error) {
        console.error('Error adding comment:', error);
        Alert.alert('Error', 'Failed to add comment. Please try again.');
      }
    },
    [selectedPostForComments]
  );

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
          toValue: ANIMATION_CONFIG.PULSE.SCALE,
          duration: ANIMATION_CONFIG.PULSE.DURATION,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: ANIMATION_CONFIG.PULSE.DURATION,
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
  const handleFilterChange = (filter: 'all' | 'mySchool' | 'friends') => {
    if (isViewTransitioning) return;

    setIsViewTransitioning(true);
    setActiveFilter(filter);
    setPage(1); // Reset page when filter changes
    setAllPosts([]); // Clear existing posts
    setHasMore(true); // Reset hasMore flag

    // If we're in grid view, switch to list view first
    if (isGridView) {
      setIsGridView(false);
    }

    // Reset the transition state after animation completes
    setTimeout(() => {
      setIsViewTransitioning(false);
    }, 500);
  };

  // Add this function to handle sort changes
  const handleSortChange = (sort: 'trending' | 'recent') => {
    setSortBy(sort);
    setShowSortDropdown(false);
    // Reset page and posts when sort changes
    setPage(1);
    setAllPosts([]);
    setHasMore(true);
    refetch(); // Add this to trigger a refetch with the new sort
  };

  const renderItem = ({ item: post, index }: { item: Post; index: number }) => {
    const optimizedImageUrl = post.image_url;
    const isOwnPost = post.user_id === user?.id;
    const isDeleting = deletingPostId === post.id;

    if (isGridView) {
      return (
        <View
          key={`${post.id}-${index}`}
          style={{
            width: gridItemWidth,
            marginLeft: index % 2 === 0 ? horizontalPadding : columnGap / 2,
            marginRight: index % 2 === 0 ? columnGap / 2 : horizontalPadding,
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
                <Pressable
                  onPress={() => {
                    setIsReturningFromProfile(true);
                    router.push(`/user-profile?userId=${post.user_id}`);
                  }}
                  className="h-8 w-8 overflow-hidden rounded-full border-2 border-white">
                  <Image
                    source={
                      post.profiles?.avatar_url
                        ? { uri: post.profiles.avatar_url }
                        : require('../../assets/splash.png')
                    }
                    className="h-full w-full"
                  />
                </Pressable>
                <View className="flex-row items-center space-x-3">
                  <View className="flex-row items-center space-x-1">
                    <Ionicons name="heart" size={20} color="white" />
                    <Text className="text-xs text-white">{post.likes_count}</Text>
                  </View>
                  <View className="flex-row items-center space-x-1">
                    <TouchableOpacity onPress={() => handleShowComments(post)}>
                      <Ionicons name="chatbubble-outline" size={20} color="white" />
                    </TouchableOpacity>
                    <Text className="text-xs text-white">{post.comments?.length || 0}</Text>
                  </View>
                </View>
              </View>
            </View>
          </MotiView>
        </View>
      );
    }

    return (
      <View className="mb-6">
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500, delay: index * 100 }}
          className={`overflow-hidden rounded-3xl ${
            colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
          } shadow-lg`}>
          {/* Post Header */}
          <View className="mb-[-0.25rem] mt-[-0.25rem] flex-row items-center justify-between p-3">
            <Pressable
              onPress={() => {
                setIsReturningFromProfile(true);
                router.push(`/user-profile?userId=${post.user_id}`);
              }}
              className="flex-row items-center">
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
                    <Ionicons name="school" size={12} color="#f77f5e" />
                    <GradientText
                      colors={
                        colorScheme === 'dark'
                          ? ['#f77f5e', '#f77f5e', '#f77f5e', '#f77f5e', '#f77f5e']
                          : ['#d66c4f', '#d66c4f', '#d66c4f', '#d66c4f', '#d66c4f']
                      }
                      locations={[0, 0.3, 0.6, 0.8, 1]}
                      className="ml-1 text-xs font-medium">
                      {post.profiles?.schools?.name || 'Unknown School'}
                    </GradientText>
                  </View>
                </View>
              </View>
            </Pressable>
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
                  <TouchableOpacity onPress={() => handleShowComments(post)}>
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
                      {post.comments?.length || 0}
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
                      colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-[#dffff2]'
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

  const ListEmptyComponent = () => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" color="#f77f5e" />
        </View>
      );
    }

    return (
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 500 }}
        className="flex-1 items-center justify-center p-8">
        <View className="mb-6 h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[#000000] to-[#2f4ccc]">
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
            : activeFilter === 'friends'
              ? 'No posts from friends yet'
              : 'No posts yet'}
        </Text>
        {activeFilter === 'mySchool' && (
          <Text
            className={`text-center text-base ${
              colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'
            }`}>
            Be the first to share something!
          </Text>
        )}
      </MotiView>
    );
  };

  const ListFooterComponent = () => {
    if (!isLoadingMore) return null;
    return (
      <View className="w-full items-center py-4">
        <ActivityIndicator size="small" color="#f77f5e" />
      </View>
    );
  };

  const getItemLayout = (data: ArrayLike<Post> | null | undefined, index: number) => {
    const itemHeight = isGridView ? gridItemWidth : 400; // Approximate height for list items
    return {
      length: itemHeight,
      offset: itemHeight * index,
      index,
    };
  };

  // Modify the useFocusEffect
  useFocusEffect(
    useCallback(() => {
      // Only refetch if we don't have initial data
      if (!hasInitialData) {
        setPage(1);
        setAllPosts([]);
        refetch();
      }
    }, [refetch, hasInitialData])
  );

  if (isLoading) {
    return (
      <SafeAreaView
        className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#f77f5e" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
      {/* Animated Header */}
      <MotiView
        // from={{ opacity: 0, translateY: -20 }}
        // animate={{ opacity: 1, translateY: 0 }}
        // transition={{ type: 'timing', duration: 500 }}
        className="mt-[-0.5rem] px-4">
        <Text
          className={`font-pattaya text-[2.5rem] ${
            colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
          }`}>
          Picza
        </Text>
        {/* <Text
          className={`mt-[-0.60rem] text-base ${
            colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
          }`}>
          Discover amazing food from your community
        </Text> */}
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
        className="mb-[-0.75rem] mt-[-1.5rem] flex-row justify-center gap-x-[0.3rem] gap-y-2 p-4">
        <TouchableOpacity
          onPress={() => handleFilterChange('all')}
          disabled={isViewTransitioning}
          className={`rounded-2xl px-5 py-2 ${isViewTransitioning ? 'opacity-50' : ''}`}>
          {activeFilter === 'all' ? (
            <GradientText
              colors={
                colorScheme === 'dark'
                  ? ['#f77f5e', '#f77f5e', '#f77f5e', '#f7bdad', '#f7bdad']
                  : ['#f77f5e', '#cc694e', '#e0775a', '#f77f5e', '#f77f5e']
              }
              locations={[0, 0.3, 0.6, 0.8, 1]}
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
          onPress={() => handleFilterChange('friends')}
          disabled={isViewTransitioning}
          className={`rounded-2xl px-5 py-2 ${isViewTransitioning ? 'opacity-50' : ''}`}>
          {activeFilter === 'friends' ? (
            <GradientText
              colors={
                colorScheme === 'dark'
                  ? ['#e65c8e', '#e65c8e', '#f08db1', '#f2a2bf', '#f2a2bf']
                  : ['#c44b76', '#c44b76', '#cf517e', '#e65c8e', '#f08db1']
              }
              locations={[0, 0.2, 0.6, 0.8, 1]}
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

        {/* Sort Button */}
        <View className="relative">
          <TouchableOpacity
            onPress={() => handleSortChange(sortBy === 'trending' ? 'recent' : 'trending')}
            className={`w-[5.9rem] rounded-2xl px-2 py-2 ${
              colorScheme === 'dark' ? 'bg-none' : 'bg-none'
            }`}>
            <View className="flex-row items-center justify-between">
              <View className="w-[5.5rem] flex-row items-center justify-center">
                <View className="mr-0.5">
                  {sortBy === 'trending' ? (
                    <GradientText
                      colors={
                        colorScheme === 'dark' ? ['#E0E0E0', '#E0E0E0'] : ['#07020D', '#07020D']
                      }
                      className="text-base font-bold"
                      style={{
                        textShadowColor: 'rgba(0, 0, 0, 0.2)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 3,
                        letterSpacing: 0.5,
                      }}>
                      Recent
                    </GradientText>
                  ) : (
                    <GradientText
                      colors={
                        colorScheme === 'dark' ? ['#E0E0E0', '#E0E0E0'] : ['#07020D', '#07020D']
                      }
                      className="text-base font-bold"
                      style={{
                        textShadowColor: 'rgba(0, 0, 0, 0.2)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 3,
                        letterSpacing: 0.5,
                      }}>
                      Trending
                    </GradientText>
                  )}
                </View>
                <Ionicons
                  name="swap-horizontal"
                  size={16}
                  color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                />
              </View>
            </View>
          </TouchableOpacity>
        </View>

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

      {/* Main Content */}
      <View className="flex-1">
        <FlatList
          key={isGridView ? 'grid' : 'list'}
          ref={flatListRef}
          data={allPosts}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={ListEmptyComponent}
          ListFooterComponent={ListFooterComponent}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
          contentContainerStyle={{
            paddingHorizontal: isGridView ? 0 : 16,
            paddingBottom: 16,
          }}
          columnWrapperStyle={
            isGridView
              ? {
                  paddingHorizontal: 0,
                  justifyContent: 'flex-start',
                }
              : undefined
          }
          numColumns={isGridView ? 2 : 1}
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
          initialNumToRender={10}
        />
      </View>

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
      <CommentsModal
        visible={showCommentsModal}
        onClose={handleCloseComments}
        post={selectedPostForComments}
        onAddComment={handleAddComment}
        colorScheme={colorScheme}
      />
    </SafeAreaView>
  );
}
