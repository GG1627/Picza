import { useState, useRef, useCallback, useEffect } from 'react';
import { Animated, Alert } from 'react-native';
import { supabase } from '../supabase';

// Animation constants
const ANIMATION_CONFIG = {
  HEART: {
    DURATION: 150,
    SCALE: 1.3,
  },
};

export const usePostLikes = (userId: string | undefined) => {
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [postLikes, setPostLikes] = useState<{ [key: string]: number }>({});
  const heartAnimations = useRef<{ [key: string]: Animated.Value }>({});

  const animateHeart = useCallback((postId: string) => {
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
  }, []);

  const fetchLikedPosts = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', userId);

      if (error) throw error;

      const likedPostIds = new Set(data.map((like) => like.post_id));
      setLikedPosts(likedPostIds);
    } catch (error) {
      console.error('Error fetching liked posts:', error);
    }
  }, [userId]);

  const handleLike = useCallback(
    async (postId: string) => {
      if (!userId) return;

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
            .eq('user_id', userId)
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
            .insert([{ user_id: userId, post_id: postId }]);

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
    },
    [userId, likedPosts, postLikes, animateHeart]
  );

  const initializeLikes = useCallback((posts: any[]) => {
    const initialLikes = posts.reduce(
      (acc, post) => {
        acc[post.id] = post.likes_count;
        return acc;
      },
      {} as { [key: string]: number }
    );
    setPostLikes(initialLikes);
  }, []);

  useEffect(() => {
    fetchLikedPosts();
  }, [fetchLikedPosts]);

  return {
    likedPosts,
    postLikes,
    heartAnimations,
    handleLike,
    initializeLikes,
  };
};
