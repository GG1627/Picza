import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Animated,
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
import { usePostLikes } from '../../lib/hooks/usePostLikes';
import Post from '../../components/Post';
import { SafeAreaView } from 'react-native-safe-area-context';

type Post = {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
  user_id: string;
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
    custom_tag_bg_color: string | null;
    custom_tag_border_color: string | null;
    schools: {
      name: string;
    } | null;
  } | null;
};

export default function PostDetailScreen() {
  const { postId, userId } = useLocalSearchParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [initialIndex, setInitialIndex] = useState(0);

  const { likedPosts, postLikes, heartAnimations, handleLike, initializeLikes } = usePostLikes(
    userId as string
  );

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
        .select(
          `
          *,
          profiles:user_id (
            id,
            username,
            avatar_url,
            competitions_won,
            custom_tag,
            custom_tag_color,
            custom_tag_bg_color,
            custom_tag_border_color,
            schools:school_id (name)
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);
      initializeLikes(postsData || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowComments = (post: Post) => {
    // TODO: Implement comments modal
  };

  const handleShowIngredients = (ingredients: string) => {
    // TODO: Implement ingredients modal
  };

  const handleShowOptions = (post: Post) => {
    // TODO: Implement options modal
  };

  const renderPost = ({ item: post }: { item: Post }) => {
    return (
      <Post
        post={post}
        isGridView={false}
        isDeleting={false}
        likedPosts={likedPosts}
        postLikes={postLikes}
        heartAnimation={heartAnimations.current[post.id] || new Animated.Value(1)}
        onLike={handleLike}
        onShowComments={handleShowComments}
        onShowIngredients={handleShowIngredients}
        onShowOptions={handleShowOptions}
        isOwnPost={post.user_id === userId}
        currentUserId={userId as string}
        onReturningFromProfile={() => {}}
      />
    );
  };

  if (loading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#ffcf99]'
        }`}>
        <ActivityIndicator size="large" color="#f77f5e" />
      </View>
    );
  }

  return (
    <View className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#ffcf99]'}`}>
      <Stack.Screen
        options={{
          headerShown: false,
          animation: 'none',
        }}
      />
      <SafeAreaView edges={['top']} className="flex-1">
        <Animated.View
          style={{
            flex: 1,
            opacity: fadeAnim,
          }}>
          {/* Header */}
          <View className=" mt-[-0.5rem] px-4">
            <Pressable onPress={() => router.back()} className="mb-2">
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
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
            onScrollToIndexFailed={(info) => {
              const wait = new Promise((resolve) => setTimeout(resolve, 500));
              wait.then(() => {
                flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
              });
            }}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
