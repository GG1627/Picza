import { View, Text, Image, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Ionicons } from '@expo/vector-icons';

type Post = {
  id: string;
  user_id: string;
  caption: string;
  image_url: string;
  created_at: string;
  likes_count: number;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
};

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(
          `
          *,
          profiles (
            username,
            avatar_url
          )
        `
        )
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleLike = async (postId: string, currentLikes: number) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ likes_count: currentLikes + 1 })
        .eq('id', postId);

      if (error) throw error;

      // Update local state
      setPosts(
        posts.map((post) =>
          post.id === postId ? { ...post, likes_count: post.likes_count + 1 } : post
        )
      );
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FFB38A" />
      </View>
    );
  }

  const renderPost = ({ item: post }: { item: Post }) => (
    <View className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm">
      {/* Post Header */}
      <View className="flex-row items-center space-x-3 p-4">
        <View className="h-10 w-10 overflow-hidden rounded-full bg-gray-100">
          {post.profiles.avatar_url ? (
            <Image source={{ uri: post.profiles.avatar_url }} className="h-full w-full" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Ionicons name="person" size={24} color="#6B7280" />
            </View>
          )}
        </View>
        <Text className="text-base font-semibold text-gray-900">{post.profiles.username}</Text>
      </View>

      {/* Post Image */}
      <Image source={{ uri: post.image_url }} className="aspect-square w-full" resizeMode="cover" />

      {/* Post Actions */}
      <View className="p-4">
        <View className="flex-row items-center space-x-4">
          <Pressable
            onPress={() => handleLike(post.id, post.likes_count)}
            className="flex-row items-center space-x-1">
            <Ionicons name="heart-outline" size={24} color="#374151" />
            <Text className="text-base text-gray-700">{post.likes_count}</Text>
          </Pressable>
        </View>

        {/* Caption */}
        {post.caption && (
          <View className="mt-2">
            <Text className="text-base text-gray-900">
              <Text className="font-semibold">{post.profiles.username}</Text> {post.caption}
            </Text>
          </View>
        )}

        {/* Timestamp */}
        <Text className="mt-2 text-sm text-gray-500">
          {new Date(post.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })}
        </Text>
      </View>
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        contentContainerClassName="p-4"
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
