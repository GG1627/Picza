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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth';
import { usePosts, useSchool, useLikePost } from '../../lib/hooks/useQueries';
import { useColorScheme } from '../../lib/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export default function FeedScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeFilter, setActiveFilter] = useState<'mySchool' | 'otherSchools'>('mySchool');
  const [refreshing, setRefreshing] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [postLikes, setPostLikes] = useState<{ [key: string]: number }>({});
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const { colorScheme } = useColorScheme();
  const heartAnimations = useRef<{ [key: string]: Animated.Value }>({});
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const backdropAnimation = useRef(new Animated.Value(0)).current;
  const queryClient = useQueryClient();

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

  useEffect(() => {
    animateModal(showOptions);
  }, [showOptions]);

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

  const OptionsModal = () => (
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
      <View className="flex-row justify-center space-x-4 p-4">
        <TouchableOpacity
          onPress={() => setActiveFilter('mySchool')}
          className={`rounded-2xl px-6 py-3 ${
            activeFilter === 'mySchool'
              ? 'bg-[#F00511]'
              : colorScheme === 'dark'
                ? 'bg-[#282828]'
                : 'bg-[#f9f9f9]'
          }`}>
          <Text
            className={`font-medium ${
              activeFilter === 'mySchool'
                ? 'text-white'
                : colorScheme === 'dark'
                  ? 'text-[#E0E0E0]'
                  : 'text-[#07020D]'
            }`}>
            My School
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveFilter('otherSchools')}
          className={`rounded-2xl px-6 py-3 ${
            activeFilter === 'otherSchools'
              ? 'bg-[#F00511]'
              : colorScheme === 'dark'
                ? 'bg-[#282828]'
                : 'bg-[#f9f9f9]'
          }`}>
          <Text
            className={`font-medium ${
              activeFilter === 'otherSchools'
                ? 'text-white'
                : colorScheme === 'dark'
                  ? 'text-[#E0E0E0]'
                  : 'text-[#07020D]'
            }`}>
            Other Schools
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {posts?.length === 0 ? (
          <View className="flex-1 items-center justify-center p-8">
            <Ionicons
              name={activeFilter === 'mySchool' ? 'school' : 'people'}
              size={64}
              color="#F00511"
              className="mb-4"
            />
            <Text
              className={`mb-2 text-center text-xl font-bold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
              {activeFilter === 'mySchool'
                ? 'No posts from your school yet'
                : 'No posts from other schools yet'}
            </Text>
            {activeFilter === 'mySchool' && (
              <Text
                className={`text-center text-base ${colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'}`}>
                Be the first to share something!
              </Text>
            )}
          </View>
        ) : (
          posts?.map((post) => (
            <View
              key={post.id}
              className={`mx-4 mb-6 overflow-hidden rounded-3xl ${
                colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'
              } shadow-lg`}>
              {/* Post Header */}
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center">
                  <View
                    className={`h-10 w-10 overflow-hidden rounded-full border-2 ${
                      colorScheme === 'dark'
                        ? 'border-[#F00511] bg-[#1a1a1a]'
                        : 'border-[#F00511] bg-[#f9f9f9]'
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
                      className={`font-semibold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                      {post.profiles?.username || 'Unknown User'}
                    </Text>
                    <Text className="text-xs text-gray-500">Just now</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleOptionsPress(post.id)} className="p-2">
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={20}
                    color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                  />
                </TouchableOpacity>
              </View>

              {/* Post Image */}
              <Image
                source={{ uri: post.image_url }}
                className="aspect-square w-full"
                resizeMode="cover"
              />

              {/* Post Actions */}
              <View className="p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center space-x-6">
                    <TouchableOpacity
                      onPress={() => handleLike(post.id)}
                      className="flex-row items-center space-x-2">
                      <Animated.View
                        style={{
                          transform: [{ scale: heartAnimations.current[post.id] || 1 }],
                        }}>
                        <Ionicons
                          name={likedPosts.has(post.id) ? 'heart' : 'heart-outline'}
                          size={26}
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
                        className={`text-base font-medium ${
                          colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                        }`}>
                        {postLikes[post.id] || 0}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-row items-center space-x-2">
                      <Ionicons
                        name="chatbubble-outline"
                        size={24}
                        color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                      />
                      <Text
                        className={`text-base font-medium ${
                          colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                        }`}>
                        Comment
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity>
                    <Ionicons
                      name="bookmark-outline"
                      size={24}
                      color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                    />
                  </TouchableOpacity>
                </View>

                {/* Post Caption */}
                {post.caption && (
                  <View className="mt-3">
                    <Text
                      className={`text-base leading-5 ${
                        colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                      }`}>
                      <Text className="font-semibold">
                        {post.profiles?.username || 'Unknown User'}
                      </Text>{' '}
                      {post.caption}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Post Button */}
      <TouchableOpacity
        onPress={() => router.push('/create-post')}
        className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-[#F00511] shadow-lg">
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>

      {/* Options Modal */}
      <OptionsModal />
    </SafeAreaView>
  );
}
