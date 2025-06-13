import {
  View,
  Text,
  Pressable,
  Image,
  ScrollView,
  Animated,
  Dimensions,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useColorScheme } from '../../lib/useColorScheme';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import GradientText from '../../components/GradientText';
import { MotiView } from 'moti';

type Post = {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  user_id: string;
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

type Profile = {
  username: string;
  full_name: string;
  avatar_url: string | null;
};

export default function PostDetailScreen() {
  const { postId, userId } = useLocalSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const flatListRef = useRef<FlatList>(null);
  const [initialIndex, setInitialIndex] = useState(0);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [postLikes, setPostLikes] = useState<{ [key: string]: number }>({});
  const heartAnimations = useRef<{ [key: string]: Animated.Value }>({});

  useEffect(() => {
    fetchPosts();
  }, [userId]);

  useEffect(() => {
    if (!loading && posts.length > 0) {
      const index = posts.findIndex((post) => post.id === postId);
      if (index !== -1) {
        setInitialIndex(index);
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index, animated: false });
        }, 100);
      }
    }
  }, [loading, posts, postId]);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading]);

  const fetchPosts = async () => {
    try {
      if (!userId) throw new Error('No user ID provided');

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*, profiles:user_id(id, username, avatar_url, schools:school_id(name))')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeElapsed = (createdAt: string) => {
    const now = new Date();
    const postDate = new Date(createdAt);
    const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) return `${diffInMonths}mo ago`;
    return `${Math.floor(diffInDays / 365)}y ago`;
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

      setPostLikes((prev) => ({
        ...prev,
        [postId]: isLiked ? currentLikes - 1 : currentLikes + 1,
      }));

      animateHeart(postId);

      setLikedPosts((prev) => {
        const newSet = new Set(prev);
        if (isLiked) {
          newSet.delete(postId);
        } else {
          newSet.add(postId);
        }
        return newSet;
      });

      // Update likes in database
      const { error } = await supabase
        .from('posts')
        .update({ likes_count: isLiked ? currentLikes - 1 : currentLikes + 1 })
        .eq('id', postId);

      if (error) throw error;
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const renderPost = ({ item: post }: { item: Post }) => {
    return (
      <View className="mb-6">
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 500 }}
          className={`overflow-hidden rounded-3xl ${
            colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
          } shadow-lg`}>
          {/* Post Header */}
          <View className="mb-[-0.25rem] mt-[-0.25rem] flex-row items-center justify-between p-3">
            <Pressable
              onPress={() => router.push(`/user-profile?userId=${post.user_id}`)}
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
                      : require('../../assets/default-avatar.png')
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
            </Pressable>
          </View>

          {/* Post Image */}
          <View className="relative">
            <Image
              source={{ uri: post.image_url }}
              className="aspect-square w-full"
              resizeMode="cover"
            />
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
                      {postLikes[post.id] || post.likes_count || 0}
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

  if (loading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'
        }`}>
        <ActivityIndicator size="large" color="#5070fd" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
        }}
        className={`${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
        {/* Header */}
        <View className="mt-16 flex-row items-center justify-between px-6">
          <Pressable
            onPress={() => router.back()}
            className={`rounded-full ${
              colorScheme === 'dark' ? 'bg-none' : 'bg-none'
            } p-2 shadow-sm`}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
            />
          </Pressable>
        </View>

        <FlatList
          ref={flatListRef}
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          initialScrollIndex={initialIndex}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          onScrollToIndexFailed={(info) => {
            const wait = new Promise((resolve) => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
            });
          }}
        />
      </Animated.View>
    </View>
  );
}
