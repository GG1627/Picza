import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { Alert } from 'react-native';

// Types
export type SavedPost = {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
  posts: {
    id: string;
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
};

// Custom Hook
export const useSavedPosts = (userId: string) => {
  const queryClient = useQueryClient();

  // Get saved posts
  const { data: savedPosts, isLoading: savedPostsLoading } = useQuery({
    queryKey: ['saved-posts', userId],
    queryFn: async () => {
      console.log('Fetching saved posts for user:', userId);

      const { data, error } = await supabase
        .from('saved_posts')
        .select(
          `
          *,
          posts:post_id (
            id,
            image_url,
            caption,
            created_at,
            likes_count,
            dish_name,
            ingredients,
            comments_count,
            profiles:user_id (
              id,
              username,
              avatar_url,
              competitions_won,
              custom_tag,
              custom_tag_color,
              schools:school_id (name)
            )
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved posts:', error);
        throw error;
      }

      // Filter out any posts that might have been deleted
      const validSavedPosts = (data || []).filter((savedPost) => savedPost.posts !== null);
      console.log('Saved posts:', validSavedPosts);
      return validSavedPosts as SavedPost[];
    },
    enabled: !!userId,
  });

  // Save post
  const savePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      console.log('Saving post:', postId, 'for user:', userId);

      // Insert into saved_posts
      const { error: saveError } = await supabase
        .from('saved_posts')
        .insert([{ user_id: userId, post_id: postId }]);

      if (saveError) {
        console.error('Error saving post:', saveError);
        if (saveError.code === '23505') {
          throw new Error('Post already saved');
        }
        throw saveError;
      }

      console.log('Post saved successfully');
    },
    onSuccess: () => {
      console.log('Invalidating queries after saving post');
      queryClient.invalidateQueries({ queryKey: ['saved-posts', userId] });
      // Also invalidate the specific post's data if it's cached
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      console.error('Save post mutation error:', error);
      if (error instanceof Error && error.message === 'Post already saved') {
        Alert.alert('Already Saved', 'This post is already in your saved posts.');
      } else {
        Alert.alert('Error', 'Failed to save post. Please try again.');
      }
    },
  });

  // Unsave post
  const unsavePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      console.log('Unsaving post:', postId, 'for user:', userId);

      // Delete from saved_posts
      const { error: deleteError } = await supabase
        .from('saved_posts')
        .delete()
        .eq('user_id', userId)
        .eq('post_id', postId);

      if (deleteError) {
        console.error('Error unsaving post:', deleteError);
        throw deleteError;
      }

      console.log('Post unsaved successfully');
    },
    onSuccess: () => {
      console.log('Invalidating queries after unsaving post');
      queryClient.invalidateQueries({ queryKey: ['saved-posts', userId] });
      // Also invalidate the specific post's data if it's cached
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      console.error('Unsave post mutation error:', error);
      Alert.alert('Error', 'Failed to unsave post. Please try again.');
    },
  });

  // Check if post is saved
  const checkIfSaved = useCallback(
    async (postId: string): Promise<boolean> => {
      const { data, error } = await supabase
        .from('saved_posts')
        .select('id')
        .eq('user_id', userId)
        .eq('post_id', postId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking if post is saved:', error);
        return false;
      }

      return !!data;
    },
    [userId]
  );

  return {
    // Data
    savedPosts: savedPosts || [],

    // Loading states
    savedPostsLoading,

    // Mutations
    savePost: savePostMutation.mutate,
    unsavePost: unsavePostMutation.mutate,

    // Loading states for mutations
    isSaving: savePostMutation.isPending,
    isUnsaving: unsavePostMutation.isPending,

    // Utility
    checkIfSaved,
  };
};
