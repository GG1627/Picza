import {
  View,
  Text,
  Pressable,
  Image,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useColorScheme } from '../../lib/useColorScheme';
import React from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import GradientText from '../../components/GradientText';
import { MotiView } from 'moti';
import { usePostLikes } from '../../lib/hooks/usePostLikes';
import { usePostDeletion } from '../../lib/hooks/usePostDeletion';
import Post from '../../components/Post';
import { SafeAreaView } from 'react-native-safe-area-context';
import CommentsModal from '../../components/CommentsModal';
import IngredientsModal from '../../components/IngredientsModal';
import OptionsModal from '../../components/OptionsModal';
import { useAuth } from '../../lib/auth';

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
  const { user } = useAuth();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [initialIndex, setInitialIndex] = useState(0);

  // Modal states
  const [showIngredients, setShowIngredients] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<string>('');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null);
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>({});

  const { likedPosts, postLikes, heartAnimations, handleLike, initializeLikes } = usePostLikes(
    user?.id || ''
  );

  const { deletingPostId, handleDeletePost } = usePostDeletion();

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
            schools:school_id (name)
          ),
          comments:comments(count)
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Transform the data to include the comment count
      const transformedData = (postsData || []).map((post) => ({
        ...post,
        comments_count: post.comments?.[0]?.count || 0,
      }));

      setPosts(transformedData);
      initializeLikes(transformedData);

      // Initialize comment counts
      const initialCounts = transformedData.reduce(
        (acc, post) => {
          acc[post.id] = post.comments_count || 0;
          return acc;
        },
        {} as { [key: string]: number }
      );
      setCommentCounts(initialCounts);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize comment counts from posts
  const initializeCommentCounts = useCallback((posts: Post[]) => {
    const initialCounts = posts.reduce(
      (acc, post) => {
        acc[post.id] = post.comments_count || 0;
        return acc;
      },
      {} as { [key: string]: number }
    );
    setCommentCounts(initialCounts);
  }, []);

  const handleShowComments = useCallback((post: Post) => {
    setSelectedPostForComments(post);
    setShowCommentsModal(true);
  }, []);

  const handleCloseComments = useCallback(() => {
    setShowCommentsModal(false);
    setSelectedPostForComments(null);
  }, []);

  const handleAddComment = useCallback(
    async (comment: string) => {
      if (!selectedPostForComments) return;

      try {
        const { error } = await supabase.from('comments').insert([
          {
            post_id: selectedPostForComments.id,
            user_id: user?.id,
            content: comment,
          },
        ]);

        if (error) throw error;

        // Update local comment counts
        setCommentCounts((prev) => ({
          ...prev,
          [selectedPostForComments.id]: (prev[selectedPostForComments.id] || 0) + 1,
        }));

        // Also update posts state for consistency
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === selectedPostForComments.id
              ? { ...post, comments_count: (post.comments_count || 0) + 1 }
              : post
          )
        );
      } catch (error) {
        console.error('Error adding comment:', error);
        Alert.alert('Error', 'Failed to add comment. Please try again.');
      }
    },
    [selectedPostForComments, user?.id]
  );

  const handleShowIngredients = useCallback((ingredients: string) => {
    setSelectedIngredients(ingredients);
    setShowIngredients(true);
  }, []);

  const handleShowOptions = useCallback((post: Post) => {
    setSelectedPost(post);
    setShowOptionsModal(true);
  }, []);

  const renderPost = ({ item: post }: { item: Post }) => {
    const isOwnPost = post.user_id === user?.id;
    const isDeleting = deletingPostId === post.id;
    const currentCommentCount = commentCounts[post.id] || post.comments_count || 0;

    return (
      <Post
        post={{ ...post, comments_count: currentCommentCount }}
        isGridView={false}
        isDeleting={isDeleting}
        likedPosts={likedPosts}
        postLikes={postLikes}
        heartAnimation={heartAnimations.current[post.id] || new Animated.Value(1)}
        onLike={handleLike}
        onShowComments={handleShowComments}
        onShowIngredients={handleShowIngredients}
        onShowOptions={handleShowOptions}
        isOwnPost={isOwnPost}
        currentUserId={user?.id}
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

          {/* Modals */}
          <IngredientsModal
            visible={showIngredients}
            onClose={() => setShowIngredients(false)}
            ingredients={selectedIngredients}
          />
          <OptionsModal
            visible={showOptionsModal}
            onClose={() => setShowOptionsModal(false)}
            post={selectedPost}
            onDeletePost={handleDeletePost}
            isOwnPost={selectedPost?.user_id === user?.id}
          />
          <CommentsModal
            visible={showCommentsModal}
            onClose={handleCloseComments}
            post={selectedPostForComments}
            onAddComment={handleAddComment}
            colorScheme={colorScheme}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
