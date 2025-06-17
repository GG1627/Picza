import { useState } from 'react';
import { Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { deleteFromCloudinary } from '../cloudinary';

export const usePostDeletion = () => {
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      try {
        // First get the post to get the image URL
        const { data: post, error: fetchError } = await supabase
          .from('posts')
          .select('image_url')
          .eq('id', postId)
          .single();

        if (fetchError) throw new Error(`Failed to fetch post: ${fetchError.message}`);

        // Delete the image from Cloudinary
        if (post?.image_url) {
          try {
            await deleteFromCloudinary(post.image_url);
          } catch (cloudinaryError) {
            console.error('Error deleting from Cloudinary:', cloudinaryError);
            // Continue with post deletion even if Cloudinary deletion fails
          }
        }

        // Then delete the post from the database
        const { error: deleteError } = await supabase.from('posts').delete().eq('id', postId);

        if (deleteError) throw new Error(`Failed to delete post: ${deleteError.message}`);
      } catch (error) {
        console.error('Error in deletePostMutation:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error: Error) => {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Failed to delete post. Please try again.', [{ text: 'OK' }]);
    },
  });

  const handleDeletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingPostId(postId);
            try {
              await deletePostMutation.mutateAsync(postId);
            } finally {
              setDeletingPostId(null);
            }
          },
        },
      ]
    );
  };

  return {
    deletingPostId,
    handleDeletePost,
  };
};
