import {
  View,
  Text,
  Image,
  Pressable,
  FlatList,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useState, useEffect } from 'react';
import React from 'react';
import { supabase } from '../../lib/supabase'; // Ensure this path is correct
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '../../lib/useColorScheme';

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
    school_id: string;
    // Add other profile fields you select, like full_name
  } | null; // It's possible a profile might not be found, though unlikely with correct setup
};

type School = {
  id: string;
  name: string;
  short_name: string;
  primary_color: string;
  secondary_color: string;
};

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [activeFilter, setActiveFilter] = useState<'mySchool' | 'otherSchools'>('mySchool');
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  // Add focus effect to refresh posts when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchPosts();
    }, [])
  );

  // Add effect to refetch posts when filter changes
  useEffect(() => {
    fetchPosts();
  }, [activeFilter]);

  const fetchCurrentUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('school_id')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        if (profileData?.school_id) {
          const { data: schoolData, error: schoolError } = await supabase
            .from('schools')
            .select('id, name, short_name, primary_color, secondary_color')
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
    try {
      let query = supabase
        .from('posts')
        .select(
          `
          *,
          profiles:profiles!user_id ( 
            username,
            avatar_url,
            school_id
          )
        `
        )
        .order('created_at', { ascending: false });

      // If filtering for my school, only show posts from users in the same school
      if (activeFilter === 'mySchool' && school) {
        query = query.eq('profiles.school_id', school.id);
      } else if (activeFilter === 'otherSchools' && school) {
        // If filtering for other schools, show posts from users in different schools
        // and ensure the profile and school_id exist
        query = query.not('profiles.school_id', 'is', null).neq('profiles.school_id', school.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error fetching posts:', JSON.stringify(error, null, 2));
        throw error;
      }

      // Additional filter to ensure we only show posts with valid profiles
      const filteredPosts = (data as Post[]).filter((post) => post.profiles !== null);
      setPosts(filteredPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
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
    return (
      <View
        className={`flex-1 items-center justify-center ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
        <ActivityIndicator size="large" color="#F00511" />
      </View>
    );
  }

  const renderPost = ({ item: post }: { item: Post }) => {
    const username = post.profiles?.username || 'Unknown User';
    const avatarUrl = post.profiles?.avatar_url;
    const isOwnPost = post.user_id === currentUserId;

    return (
      <View
        className={`mb-6 overflow-hidden rounded-3xl ${
          colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'
        } shadow-lg`}>
        {/* Post Header */}
        <View className="flex-row items-center justify-between p-4">
          <View className="flex-row items-center space-x-3">
            <View
              className={`h-12 w-12 overflow-hidden rounded-full ${
                colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-[#f9f9f9]'
              }`}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} className="h-full w-full" />
              ) : (
                <View className="h-full w-full items-center justify-center">
                  <Ionicons
                    name="person"
                    size={24}
                    color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                  />
                </View>
              )}
            </View>
            <View>
              <Text
                className={`text-base font-semibold ${
                  colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                }`}>
                {username}
              </Text>
              <Text
                className={`text-xs ${
                  colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'
                }`}>
                {new Date(post.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>

          {isOwnPost && (
            <Pressable
              onPress={() => handleDeletePost(post.id, post.image_url)}
              className="rounded-full p-2">
              <Ionicons name="trash-outline" size={20} color="#F00511" />
            </Pressable>
          )}
        </View>

        {/* Post Image */}
        {post.image_url && (
          <View className="relative">
            <Image
              source={{ uri: post.image_url }}
              className="aspect-square w-full"
              resizeMode="cover"
            />
            <View className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
          </View>
        )}

        {/* Post Actions */}
        <View className="p-4">
          <View className="flex-row items-center space-x-6">
            <Pressable
              onPress={() => handleLike(post.id, post.likes_count)}
              className="flex-row items-center space-x-2">
              <Ionicons
                name="heart-outline"
                size={24}
                color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
              />
              <Text
                className={`text-base ${
                  colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                }`}>
                {post.likes_count}
              </Text>
            </Pressable>
            <Pressable className="flex-row items-center space-x-2">
              <Ionicons
                name="chatbubble-outline"
                size={24}
                color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
              />
              <Text
                className={`text-base ${
                  colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                }`}>
                0
              </Text>
            </Pressable>
          </View>

          {/* Caption */}
          {post.caption && (
            <View className="mt-3">
              <Text
                className={`text-base ${
                  colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                }`}>
                <Text className="font-semibold">{username}</Text> {post.caption}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <SafeAreaView
        className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
        {/* Filter Buttons */}
        {school && (
          <View
            className={`border-b ${
              colorScheme === 'dark' ? 'border-[#282828] bg-[#121113]' : 'border-[#f9f9f9] bg-white'
            }`}>
            <View className="px-6 py-4">
              <View className="flex-row space-x-3">
                <Pressable
                  onPress={() => setActiveFilter('mySchool')}
                  className={`flex-1 rounded-xl py-2.5 ${
                    activeFilter === 'mySchool'
                      ? colorScheme === 'dark'
                        ? 'bg-[#282828]'
                        : 'bg-[#f9f9f9]'
                      : colorScheme === 'dark'
                        ? 'bg-[#1a1a1a]'
                        : 'bg-[#e0e0e0]'
                  }`}>
                  <Text
                    className={`text-center font-semibold ${
                      activeFilter === 'mySchool'
                        ? colorScheme === 'dark'
                          ? 'text-[#E0E0E0]'
                          : 'text-[#07020D]'
                        : colorScheme === 'dark'
                          ? 'text-[#9ca3af]'
                          : 'text-[#877B66]'
                    }`}>
                    {school.short_name}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setActiveFilter('otherSchools')}
                  className={`flex-1 rounded-xl py-2.5 ${
                    activeFilter === 'otherSchools'
                      ? colorScheme === 'dark'
                        ? 'bg-[#282828]'
                        : 'bg-[#f9f9f9]'
                      : colorScheme === 'dark'
                        ? 'bg-[#1a1a1a]'
                        : 'bg-[#e0e0e0]'
                  }`}>
                  <Text
                    className={`text-center font-semibold ${
                      activeFilter === 'otherSchools'
                        ? colorScheme === 'dark'
                          ? 'text-[#E0E0E0]'
                          : 'text-[#07020D]'
                        : colorScheme === 'dark'
                          ? 'text-[#9ca3af]'
                          : 'text-[#877B66]'
                    }`}>
                    Other Schools
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {posts.length === 0 && !loading ? (
          <View className="flex-1 items-center justify-center">
            <View className="items-center space-y-4">
              <View
                className={`rounded-full p-4 ${
                  colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-[#f9f9f9]'
                }`}>
                <Ionicons
                  name={activeFilter === 'mySchool' ? 'camera-outline' : 'school-outline'}
                  size={32}
                  color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                />
              </View>
              <Text
                className={`text-lg ${
                  colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#877B66]'
                }`}>
                {activeFilter === 'mySchool'
                  ? 'No posts from your school yet. Be the first!'
                  : 'No posts from other schools yet.'}
              </Text>
              {activeFilter === 'mySchool' && (
                <Text
                  className={`text-sm ${
                    colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'
                  }`}>
                  Share your first food moment
                </Text>
              )}
            </View>
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
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={Keyboard.dismiss}
          />
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
