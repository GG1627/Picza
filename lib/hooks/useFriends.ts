import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { Alert } from 'react-native';

// Types
export type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends';

export type Friend = {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
  profiles: {
    id: string;
    username: string;
    avatar_url: string | null;
    full_name: string;
    bio: string | null;
  };
};

export type User = {
  id: string;
  username: string;
  avatar_url: string | null;
  full_name: string;
  bio: string | null;
  friend_status: FriendStatus;
};

// Custom Hooks
export const useFriends = (userId: string) => {
  const queryClient = useQueryClient();

  // Get all friends (accepted)
  const { data: friends, isLoading: friendsLoading } = useQuery({
    queryKey: ['friends', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friends')
        .select(
          `
          *,
          profiles!friends_friend_id_fkey (
            id,
            username,
            avatar_url,
            full_name,
            bio
          )
        `
        )
        .eq('user_id', userId)
        .eq('status', 'accepted');

      if (error) throw error;
      return data as Friend[];
    },
    enabled: !!userId,
  });

  // Get sent requests (pending)
  const { data: sentRequests, isLoading: sentLoading } = useQuery({
    queryKey: ['friends-sent', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friends')
        .select(
          `
          *,
          profiles!friends_friend_id_fkey (
            id,
            username,
            avatar_url,
            full_name,
            bio
          )
        `
        )
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (error) throw error;
      return data as Friend[];
    },
    enabled: !!userId,
  });

  // Get received requests (pending)
  const { data: receivedRequests, isLoading: receivedLoading } = useQuery({
    queryKey: ['friends-received', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friends')
        .select(
          `
          *,
          profiles!friends_user_id_fkey (
            id,
            username,
            avatar_url,
            full_name,
            bio
          )
        `
        )
        .eq('friend_id', userId)
        .eq('status', 'pending');

      if (error) throw error;
      return data as Friend[];
    },
    enabled: !!userId,
  });

  // Send friend request
  const sendRequestMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const { error } = await supabase
        .from('friends')
        .insert([{ user_id: userId, friend_id: friendId, status: 'pending' }]);

      if (error) {
        if (error.code === '23505') {
          throw new Error('Friend request already sent');
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends-sent', userId] });
      queryClient.invalidateQueries({ queryKey: ['friends-received', userId] });
      Alert.alert('Success', 'Friend request sent!');
    },
    onError: (error) => {
      if (error instanceof Error && error.message === 'Friend request already sent') {
        Alert.alert('Already Sent', 'You have already sent a friend request to this user.');
      } else {
        Alert.alert('Error', 'Failed to send friend request. Please try again.');
      }
    },
  });

  // Accept friend request
  const acceptRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', userId] });
      queryClient.invalidateQueries({ queryKey: ['friends-received', userId] });
      Alert.alert('Success', 'Friend request accepted!');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to accept friend request. Please try again.');
    },
  });

  // Reject friend request
  const rejectRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('friends')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends-received', userId] });
      Alert.alert('Success', 'Friend request rejected.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to reject friend request. Please try again.');
    },
  });

  // Remove friend
  const removeFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      const { error } = await supabase
        .from('friends')
        .delete()
        .or(
          `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends', userId] });
      Alert.alert('Success', 'Friend removed.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to remove friend. Please try again.');
    },
  });

  // Cancel sent request
  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase.from('friends').delete().eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends-sent', userId] });
      Alert.alert('Success', 'Friend request cancelled.');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to cancel friend request. Please try again.');
    },
  });

  // Search users
  const searchUsers = useCallback(
    async (username: string): Promise<User[]> => {
      if (!username.trim()) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name, bio')
        .ilike('username', `%${username}%`)
        .neq('id', userId)
        .limit(20);

      if (error) throw error;

      // Get friend status for each user
      const usersWithStatus = await Promise.all(
        (data || []).map(async (user) => {
          const { data: friendData } = await supabase
            .from('friends')
            .select('*')
            .or(
              `and(user_id.eq.${userId},friend_id.eq.${user.id}),and(user_id.eq.${user.id},friend_id.eq.${userId})`
            )
            .single();

          let friendStatus: FriendStatus = 'none';
          if (friendData) {
            if (friendData.status === 'accepted') {
              friendStatus = 'friends';
            } else if (friendData.status === 'pending') {
              friendStatus = friendData.user_id === userId ? 'pending_sent' : 'pending_received';
            }
          }

          return {
            ...user,
            friend_status: friendStatus,
          };
        })
      );

      return usersWithStatus;
    },
    [userId]
  );

  return {
    // Data
    friends: friends || [],
    sentRequests: sentRequests || [],
    receivedRequests: receivedRequests || [],

    // Loading states
    friendsLoading,
    sentLoading,
    receivedLoading,

    // Mutations
    sendRequest: sendRequestMutation.mutate,
    acceptRequest: acceptRequestMutation.mutate,
    rejectRequest: rejectRequestMutation.mutate,
    removeFriend: removeFriendMutation.mutate,
    cancelRequest: cancelRequestMutation.mutate,

    // Loading states for mutations
    isSending: sendRequestMutation.isPending,
    isAccepting: acceptRequestMutation.isPending,
    isRejecting: rejectRequestMutation.isPending,
    isRemoving: removeFriendMutation.isPending,
    isCancelling: cancelRequestMutation.isPending,

    // Search
    searchUsers,
  };
};
