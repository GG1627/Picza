import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '../lib/useColorScheme';
import { useRouter } from 'expo-router';
import { getCompetitionTag } from '../lib/competitionTags';
import GradientText from './GradientText';
import { Animated } from 'react-native';
import { useSavedPosts } from '../lib/hooks/useSavedPosts';
import { useAuth } from '../lib/auth';

interface PostProps {
  post: {
    id: string;
    user_id: string;
    image_url: string;
    caption: string | null;
    created_at: string;
    likes_count: number;
    dish_name: string | null;
    ingredients: string | null;
    comments_count: number;
    profiles: {
      id: string;
      username: string;
      avatar_url: string | null;
      competitions_won: number | null;
      custom_tag: string | null;
      custom_tag_color: string | null;
      schools: {
        name: string;
      } | null;
    } | null;
  };
  isGridView: boolean;
  isDeleting: boolean;
  likedPosts: Set<string>;
  postLikes: { [key: string]: number };
  heartAnimation: Animated.Value;
  onLike: (postId: string) => void;
  onShowComments: (post: PostProps['post']) => void;
  onShowIngredients: (ingredients: string) => void;
  onShowOptions: (post: PostProps['post']) => void;
  isOwnPost: boolean;
  currentUserId: string | undefined;
  onReturningFromProfile: () => void;
}

export default function Post({
  post,
  isGridView,
  isDeleting,
  likedPosts,
  postLikes,
  heartAnimation,
  onLike,
  onShowComments,
  onShowIngredients,
  onShowOptions,
  isOwnPost,
  currentUserId,
  onReturningFromProfile,
}: PostProps) {
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const { user } = useAuth();
  const {
    savePostWithOptimisticUpdate,
    unsavePostWithOptimisticUpdate,
    isSaving,
    isUnsaving,
    isPostSaved,
  } = useSavedPosts(user?.id || '');

  // Use the cached saved status directly
  const isSaved = isPostSaved(post.id);

  const handleSaveToggle = () => {
    if (!user?.id) return;

    // Use optimistic updates for instant UI feedback
    if (isSaved) {
      unsavePostWithOptimisticUpdate(post.id);
    } else {
      savePostWithOptimisticUpdate(post.id);
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
    const diffInYears = Math.floor(diffInDays / 365);
    return `${diffInYears}y ago`;
  };

  const handleSendMessage = () => {
    Alert.alert(
      'Coming Soon!',
      'The send feature is currently being implemented. Stay tuned for updates!',
      [{ text: 'OK', style: 'default' }]
    );
  };

  const tag = post.profiles
    ? getCompetitionTag(
        post.profiles.competitions_won,
        post.profiles.username,
        {
          tag: post.profiles.custom_tag,
          color: post.profiles.custom_tag_color,
        },
        colorScheme
      )
    : null;

  // For posts, we always use black background regardless of theme
  const tagBgColor = '#000000';
  const tagBorderColor = tag?.borderColor;

  if (isGridView) {
    return (
      <View className="mb-4">
        <View className="aspect-square overflow-hidden rounded-2xl">
          <Image source={{ uri: post.image_url }} className="h-full w-full" resizeMode="cover" />
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
                onReturningFromProfile();
                router.push(`/user-profile?userId=${post.user_id}`);
              }}
              className="h-8 w-8 overflow-hidden rounded-full border-2 border-white">
              <Image
                source={
                  post.profiles?.avatar_url
                    ? { uri: post.profiles.avatar_url }
                    : require('../assets/default-avatar.png')
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
                <TouchableOpacity onPress={() => onShowComments(post)}>
                  <Ionicons name="chatbubble-outline" size={20} color="white" />
                </TouchableOpacity>
                <Text className="text-xs text-white">{post.comments_count || 0}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="mb-6">
      <View
        className={`overflow-hidden rounded-3xl ${
          colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'
        } shadow-lg`}>
        {/* Post Image with Header Overlay */}
        <View className="relative">
          <Image
            source={{ uri: post.image_url }}
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
              colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']}
              locations={[0, 0.3, 1]}
              style={{ flex: 1 }}
            />
          </View>

          {/* Header Overlay */}
          <View className="absolute left-0 right-0 top-0 flex-row items-center justify-between p-4">
            <Pressable
              onPress={() => {
                onReturningFromProfile();
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
                      : require('../assets/default-avatar.png')
                  }
                  className="h-full w-full"
                />
              </View>
              <View className="ml-3">
                <View className="flex-row items-center space-x-2">
                  <Text className="text-base font-bold text-white">
                    {post.profiles?.username || 'Unknown User'}
                  </Text>
                  {post.profiles && tag && (
                    <View
                      style={{
                        backgroundColor: '#000000',
                        borderColor: tagBorderColor,
                      }}
                      className="ml-2 rounded-xl border px-2 py-0.5">
                      <Text
                        style={{
                          color: tag.color,
                        }}
                        className="text-center text-xs font-semibold">
                        {tag.tag}
                      </Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-center">
                  <Text className="text-xs text-gray-200">{getTimeElapsed(post.created_at)}</Text>
                  <Text className="mx-1 text-xs text-gray-200">•</Text>
                  <View className="flex-row items-center">
                    <Ionicons name="school" size={12} color="#ff9f6b" />
                    <Text className="ml-1 text-xs font-medium text-white">
                      {post.profiles?.schools?.name || 'Unknown School'}
                    </Text>
                  </View>
                </View>
              </View>
            </Pressable>
            <TouchableOpacity onPress={() => onShowOptions(post)} className="p-2">
              <Ionicons name="ellipsis-horizontal" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Dish Name Overlay */}
          {post.dish_name && (
            <View className="absolute bottom-0 left-0 right-0 p-4">
              <Text className="text-2xl font-bold text-white" numberOfLines={2}>
                {post.dish_name}
              </Text>
            </View>
          )}
        </View>

        {/* Post Actions */}
        <View className="bg-[#0a0a0a] px-4 py-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center space-x-4">
              <View className="flex-row items-center">
                <TouchableOpacity onPress={() => onLike(post.id)} className="flex-row items-center">
                  <Animated.View
                    style={{
                      transform: [{ scale: heartAnimation }],
                    }}>
                    <Ionicons
                      name={likedPosts.has(post.id) ? 'heart' : 'heart-outline'}
                      size={28}
                      color={likedPosts.has(post.id) ? '#F00511' : 'white'}
                    />
                  </Animated.View>
                </TouchableOpacity>
                <View className="w-8">
                  <Text className="text-base font-semibold text-white">
                    {postLikes[post.id] || 0}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <TouchableOpacity onPress={() => onShowComments(post)}>
                  <Ionicons name="chatbubble-outline" size={28} color="white" />
                </TouchableOpacity>
                <View className="w-8">
                  <Text className="text-base font-semibold text-white">
                    {post.comments_count || 0}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleSendMessage}>
                <Ionicons name="paper-plane-outline" size={28} color="white" />
              </TouchableOpacity>
            </View>
            <View className="flex-row items-center space-x-2">
              {post.ingredients && (
                <TouchableOpacity
                  onPress={() => onShowIngredients(post.ingredients || 'No ingredients listed')}
                  className="rounded-full border-2 border-[#2DFE54] bg-black px-3 py-1.5">
                  <Text className="text-sm font-semibold text-[#2DFE54]">Ingredients</Text>
                </TouchableOpacity>
              )}
              <View className="mr-[-0.2rem] flex-row items-center">
                <TouchableOpacity
                  onPress={handleSaveToggle}
                  disabled={isSaving || isUnsaving}
                  className="ml-2">
                  <Ionicons
                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={28}
                    color={isSaved ? '#3B82F6' : 'white'}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Post Caption */}
          {post.caption && (
            <View className="mt-2">
              <Text className="text-base leading-5 text-white">
                <Text className="font-bold">{post.profiles?.username || 'Unknown User'} </Text>
                {post.caption}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
