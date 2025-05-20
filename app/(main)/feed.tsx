import { View, Text, Image, Pressable, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import React from 'react';
import { supabase } from '../../lib/supabase'; // Ensure this path is correct
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Post = {
  id: string;
  user_id: string;
  caption: string | null; // Captions can be null
  image_url: string; // Assuming image_url is always present for a post for now
  created_at: string;
  likes_count: number;
  profiles: {
    // This will hold the embedded profile data
    username: string;
    avatar_url: string | null;
    // Add other profile fields you select, like full_name
  } | null; // It's possible a profile might not be found, though unlikely with correct setup
};

type School = {
  name: string;
  primary_color: string;
  secondary_color: string;
};

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [school, setSchool] = useState<School | null>(null);

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Add focus effect to refresh posts when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchPosts();
    }, [])
  );

  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      if (user) {
        // Fetch user's school information
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        if (profileData?.school_id) {
          const { data: schoolData, error: schoolError } = await supabase
            .from('schools')
            .select('name, primary_color, secondary_color')
            .eq('id', profileData.school_id)
            .single();

          if (schoolError) throw schoolError;
          setSchool(schoolData);
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchPosts = async () => {
    // setLoading(true); // Already set initially, and set by handleRefresh
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(
          `
          *,
          profiles:profiles!user_id ( 
            username,
            avatar_url
          )
        `
          // The '!user_id' tells Supabase:
          // "For each post, take its 'user_id' column.
          //  Then, go to the 'profiles' table and find the row
          //  where 'profiles.id' matches this 'user_id'.
          //  From that matched profile row, get 'username' and 'avatar_url'."
        )
        .order('created_at', { ascending: false });

      if (error) {
        // Log the specific error for more details if it persists
        console.error('Supabase error fetching posts:', JSON.stringify(error, null, 2));
        throw error; // Re-throw to be caught by the catch block
      }

      console.log('Fetched data:', data); // Good for debugging what you receive
      setPosts((data as Post[]) || []); // Cast to Post[] and provide fallback
    } catch (error) {
      // This console.error was already here, good.
      console.error('Error fetching posts:', error);
      // Optionally, set an error state here to show a message in the UI
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts(); // setLoading(true) will be handled inside if needed or by initial state
  };

  const handleLike = async (postId: string, currentLikes: number) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ likes_count: currentLikes + 1 })
        .eq('id', postId);

      if (error) throw error;

      setPosts(
        posts.map((post) =>
          post.id === postId ? { ...post, likes_count: post.likes_count + 1 } : post
        )
      );
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleDeletePost = async (postId: string, imageUrl: string) => {
    Alert.alert('Delete Post', 'Are you sure you want to delete this post?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // Delete the image from storage
            const imagePath = imageUrl.split('/').pop();
            if (imagePath) {
              const { error: storageError } = await supabase.storage
                .from('post_images')
                .remove([imagePath]);

              if (storageError) throw storageError;
            }

            // Delete the post from the database
            const { error: deleteError } = await supabase.from('posts').delete().eq('id', postId);

            if (deleteError) throw deleteError;

            // Update the posts state
            setPosts(posts.filter((post) => post.id !== postId));
          } catch (error) {
            console.error('Error deleting post:', error);
            Alert.alert('Error', 'Failed to delete post. Please try again.');
          }
        },
      },
    ]);
  };

  if (loading && posts.length === 0) {
    // Show loading only if posts array is empty
    return (
      <View className="flex-1 items-center justify-center bg-[#F1E9DB]">
        <ActivityIndicator size="large" color="#5DB7DE" />
      </View>
    );
  }

  const renderPost = ({ item: post }: { item: Post }) => {
    // Defensive check for post.profiles, as it could theoretically be null
    // if the join fails or if a post somehow has a user_id that doesn't exist in profiles
    const username = post.profiles?.username || 'Unknown User';
    const avatarUrl = post.profiles?.avatar_url;
    const isOwnPost = post.user_id === currentUserId;

    return (
      <View className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        {/* Post Header */}
        <View className="flex-row items-center justify-between p-4">
          <View className="flex-row items-center space-x-3">
            <View className="h-10 w-10 overflow-hidden rounded-full bg-[#F1E9DB]">
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="h-full w-full" />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Ionicons name="person" size={24} color="#07020D" />
                </View>
              )}
            </View>
            <Text className="text-base font-semibold text-[#07020D]">{username}</Text>
          </View>

          {isOwnPost && (
            <Pressable
              onPress={() => handleDeletePost(post.id, post.image_url)}
              className="rounded-full p-2">
              <Ionicons name="trash-outline" size={20} color="#BA3B46" />
            </Pressable>
          )}
        </View>

        {/* Post Image */}
        {post.image_url && ( // Check if image_url exists
          <Image
            source={{ uri: post.image_url }}
            className="aspect-square w-full"
            resizeMode="cover"
          />
        )}

        {/* Post Actions */}
        <View className="p-4">
          <View className="flex-row items-center space-x-4">
            <Pressable
              onPress={() => handleLike(post.id, post.likes_count)}
              className="flex-row items-center space-x-1">
              <Ionicons name="heart-outline" size={24} color="#374151" />
              <Text className="text-base text-gray-700">{post.likes_count}</Text>
            </Pressable>
            {/* Add comment icon/button here if needed */}
          </View>

          {/* Caption */}
          {post.caption && (
            <View className="mt-2">
              <Text className="text-base text-gray-900">
                <Text className="font-semibold">{username}</Text> {post.caption}
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
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F1E9DB]">
      {/* School Header */}
      {school && (
        <View className="border-b border-[#07020D]/10 bg-white">
          <View className="px-6 pb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center space-x-3">
                <View className="h-12 w-12 items-center justify-center rounded-full bg-[#F1E9DB]">
                  <Ionicons name="school" size={24} color="#07020D" />
                </View>
                <View>
                  <Text className="text-lg font-bold text-[#07020D]">{school.name}</Text>
                  <Text className="text-sm text-[#877B66]">Student Feed</Text>
                </View>
              </View>
              <Pressable className="rounded-full bg-[#F1E9DB] p-2">
                <Ionicons name="notifications-outline" size={24} color="#07020D" />
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {posts.length === 0 && !loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-lg text-[#877B66]">No posts yet. Be the first!</Text>
          {/* Optionally, add a button to create a post */}
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4"
          refreshing={refreshing}
          onRefresh={handleRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
