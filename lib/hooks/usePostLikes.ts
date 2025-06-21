import { useState, useRef, useCallback, useEffect } from 'react';
import { Animated, Alert } from 'react-native';
import { supabase } from '../supabase';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const pendingLikes = useRef<Set<string>>(new Set());
  const operationPromises = useRef<{ [key: string]: Promise<void> }>({});
  const cooldownTimers = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});

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

  const handleLike = useCallback(
    async (postId: string) => {
      if (!userId) return;

      // Check if post is in cooldown period
      if (postId in cooldownTimers.current) {
        return;
      }

      // If there's already a pending operation for this post, wait for it to complete
      if (postId in operationPromises.current) {
        await operationPromises.current[postId];
        return;
      }

      // Prevent duplicate operations
      if (pendingLikes.current.has(postId)) return;
      pendingLikes.current.add(postId);

      // Create a promise for this operation
      const operationPromise = (async () => {
        try {
          const isLiked = likedPosts.has(postId);
          const currentLikes = postLikes[postId] || 0;

          // Immediate optimistic update for instant feedback
          animateHeart(postId);

          // Optimistically update both states immediately
          setLikedPosts((prev) => {
            const newSet = new Set(prev);
            if (isLiked) {
              newSet.delete(postId);
            } else {
              newSet.add(postId);
            }
            return newSet;
          });

          setPostLikes((prev) => ({
            ...prev,
            [postId]: isLiked ? currentLikes - 1 : currentLikes + 1,
          }));

          // Update database
          if (isLiked) {
            const [unlikeResult, updateResult] = await Promise.all([
              supabase.from('post_likes').delete().eq('user_id', userId).eq('post_id', postId),
              supabase
                .from('posts')
                .update({ likes_count: currentLikes - 1 })
                .eq('id', postId),
            ]);

            if (unlikeResult.error) throw unlikeResult.error;
            if (updateResult.error) throw updateResult.error;
          } else {
            const [likeResult, updateResult] = await Promise.all([
              supabase.from('post_likes').insert([{ user_id: userId, post_id: postId }]),
              supabase
                .from('posts')
                .update({ likes_count: currentLikes + 1 })
                .eq('id', postId),
            ]);

            if (likeResult.error) throw likeResult.error;
            if (updateResult.error) throw updateResult.error;
          }

          // Invalidate cache after successful update
          queryClient.invalidateQueries({ queryKey: ['posts'] });

          // Set cooldown period (500ms) to prevent rapid toggling
          cooldownTimers.current[postId] = setTimeout(() => {
            delete cooldownTimers.current[postId];
          }, 500);
        } catch (error) {
          // Revert optimistic updates on error
          setLikedPosts((prev) => {
            const newSet = new Set(prev);
            if (likedPosts.has(postId)) {
              newSet.delete(postId);
            } else {
              newSet.add(postId);
            }
            return newSet;
          });

          setPostLikes((prev) => ({
            ...prev,
            [postId]: likedPosts.has(postId)
              ? (postLikes[postId] || 0) + 1
              : (postLikes[postId] || 0) - 1,
          }));

          console.error('Error liking post:', error);
          Alert.alert('Error', 'Failed to update like. Please try again.');
        } finally {
          // Remove from pending operations
          pendingLikes.current.delete(postId);
          // Clear the operation promise
          delete operationPromises.current[postId];
        }
      })();

      // Store the promise so other clicks wait for this operation
      operationPromises.current[postId] = operationPromise;

      // Wait for the operation to complete
      await operationPromise;
    },
    [userId, likedPosts, postLikes, animateHeart, queryClient]
  );

  // Fetch liked posts on mount
  useEffect(() => {
    fetchLikedPosts();
  }, [fetchLikedPosts]);

  // Refresh liked posts when posts are invalidated (debounced)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.queryKey[0] === 'posts') {
        // Debounce the refresh to avoid too many calls
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fetchLikedPosts();
        }, 100);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [queryClient, fetchLikedPosts]);

  return {
    likedPosts,
    postLikes,
    heartAnimations,
    handleLike,
    initializeLikes,
  };
};
