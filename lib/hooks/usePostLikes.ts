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

  const initializeLikes = useCallback(
    (posts: any[]) => {
      const initialLikes = posts.reduce(
        (acc, post) => {
          // Only initialize if the post isn't currently being liked (no pending operation)
          // This preserves optimistic updates
          if (!pendingLikes.current.has(post.id)) {
            // If user has liked this post, make sure count is at least 1 higher than DB
            // to account for potential database propagation delays
            if (likedPosts.has(post.id)) {
              const dbCount = Math.max(0, post.likes_count || 0);
              // Ensure the count reflects the like (at minimum)
              acc[post.id] = Math.max(dbCount, 1);
            } else {
              const count = Math.max(0, post.likes_count || 0);
              // User hasn't liked this post, use database value
              acc[post.id] = count;
            }
          }
          return acc;
        },
        {} as { [key: string]: number }
      );

      // Merge with existing state instead of replacing it
      setPostLikes((prev) => ({
        ...prev,
        ...initialLikes,
      }));
    },
    [likedPosts]
  ); // REMOVED postLikes from dependencies to break circular dependency

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
          const newLikeCount = Math.max(0, isLiked ? currentLikes - 1 : currentLikes + 1);

          // Immediate optimistic update for instant feedback
          animateHeart(postId);

          // Update local state immediately for better UX
          setPostLikes((prev) => ({
            ...prev,
            [postId]: newLikeCount,
          }));

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

          // Update database - fetch current count and update atomically
          if (isLiked) {
            // Unlike post
            const [unlikeResult] = await Promise.all([
              supabase.from('post_likes').delete().eq('user_id', userId).eq('post_id', postId),
            ]);

            if (unlikeResult.error) throw unlikeResult.error;

            // Update likes count atomically using database-level decrement
            const { error: updateError } = await supabase.rpc('decrement_likes_count', {
              post_id: postId,
            });

            if (updateError) throw updateError;
          } else {
            // Like post
            const [likeResult] = await Promise.all([
              supabase.from('post_likes').insert([{ user_id: userId, post_id: postId }]),
            ]);

            if (likeResult.error) throw likeResult.error;

            // Update likes count atomically using database-level increment
            const { error: updateError } = await supabase.rpc('increment_likes_count', {
              post_id: postId,
            });

            if (updateError) throw updateError;
          }

          // Invalidate posts cache so other users see the updated counts
          // Use a small delay to allow database propagation
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['posts'] });
          }, 100);

          // Don't invalidate cache immediately - let the optimistic update handle UI
          // The cron job will update trending scores every 30 minutes

          // Note: Individual trending score updates are now handled by the cron job
          // to prevent constant feed reordering

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
            [postId]: Math.max(
              0,
              likedPosts.has(postId) ? (postLikes[postId] || 0) + 1 : (postLikes[postId] || 0) - 1
            ),
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

  // Reset state when user changes (account switching)
  useEffect(() => {
    if (userId) {
      // Clear previous user's like counts when switching accounts
      setPostLikes({});
      // Clear any pending operations
      pendingLikes.current.clear();
      // Clear operation promises
      Object.keys(operationPromises.current).forEach((key) => {
        delete operationPromises.current[key];
      });
      // Clear cooldown timers
      Object.values(cooldownTimers.current).forEach((timer) => clearTimeout(timer));
      cooldownTimers.current = {};
    }
  }, [userId]);

  // Refresh liked posts when posts are invalidated (debounced)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && event.query.queryKey[0] === 'posts') {
        // Debounce the refresh to avoid too many calls
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          fetchLikedPosts();
        }, 300); // Slightly longer delay for DB propagation
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
