import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { Alert } from 'react-native';

export const usePostReports = () => {
  const [reportedPosts, setReportedPosts] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const reportPostMutation = useMutation({
    mutationFn: async ({ postId, userId }: { postId: string; userId: string }) => {
      const { error } = await supabase
        .from('post_reports')
        .insert([{ post_id: postId, reporter_id: userId }]);

      if (error) {
        // Check if it's a duplicate report error
        if (error.code === '23505') {
          throw new Error('You have already reported this post');
        }
        throw error;
      }

      return { postId };
    },
    onMutate: async ({ postId }) => {
      // Optimistically add to reported posts
      setReportedPosts((prev) => new Set(prev).add(postId));
    },
    onSuccess: ({ postId }) => {
      // Invalidate posts query to refresh data
      queryClient.invalidateQueries({ queryKey: ['posts'] });

      // Force a refetch of all posts queries
      queryClient.refetchQueries({ queryKey: ['posts'] });

      Alert.alert('Post Reported', 'Thank you for your report. We will review this post.', [
        { text: 'OK', style: 'default' },
      ]);
    },
    onError: (error, { postId }) => {
      // Remove from reported posts on error
      setReportedPosts((prev) => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });

      if (error instanceof Error && error.message === 'You have already reported this post') {
        Alert.alert('Already Reported', 'You have already reported this post.');
      } else {
        Alert.alert('Error', 'Failed to report post. Please try again.');
      }
    },
  });

  const reportPost = useCallback(
    (postId: string, userId: string) => {
      if (reportedPosts.has(postId)) {
        Alert.alert('Already Reported', 'You have already reported this post.');
        return;
      }

      reportPostMutation.mutate({ postId, userId });
    },
    [reportedPosts, reportPostMutation]
  );

  const isReported = useCallback((postId: string) => reportedPosts.has(postId), [reportedPosts]);

  return {
    reportPost,
    isReported,
    isReporting: reportPostMutation.isPending,
  };
};
