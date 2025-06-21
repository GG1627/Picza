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
      console.log('Fetching friends for user:', userId);

      // Get accepted friend relationships in both directions
      const { data: friendRelationships, error: friendError } = await supabase
        .from('friends')
        .select('*')
        .or(
          `and(user_id.eq.${userId},status.eq.accepted),and(friend_id.eq.${userId},status.eq.accepted)`
        );

      if (friendError) {
        console.error('Error fetching friend relationships:', friendError);
        throw friendError;
      }

      console.log('Friend relationships:', friendRelationships);

      // Then get the profiles for each friend
      const friendsWithProfiles = await Promise.all(
        (friendRelationships || []).map(async (relationship) => {
          // Determine which ID is the friend's ID
          const friendId =
            relationship.user_id === userId ? relationship.friend_id : relationship.user_id;

          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, full_name, bio')
            .eq('id', friendId)
            .single();

          if (profileError) {
            console.error('Error fetching profile for friend_id:', friendId, profileError);
            return null;
          }

          return {
            ...relationship,
            profiles: profile,
          };
        })
      );

      const validFriends = friendsWithProfiles.filter(Boolean);
      console.log('Friends with profiles:', validFriends);
      return validFriends as Friend[];
    },
    enabled: !!userId,
  });

  // Get sent requests (pending)
  const { data: sentRequests, isLoading: sentLoading } = useQuery({
    queryKey: ['friends-sent', userId],
    queryFn: async () => {
      console.log('Fetching sent requests for user:', userId);

      // First get the friend requests
      const { data: friendRequests, error: friendError } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending');

      if (friendError) {
        console.error('Error fetching friend requests:', friendError);
        throw friendError;
      }

      console.log('Friend requests:', friendRequests);

      // Then get the profiles for each friend request
      const requestsWithProfiles = await Promise.all(
        (friendRequests || []).map(async (request) => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, full_name, bio')
            .eq('id', request.friend_id)
            .single();

          if (profileError) {
            console.error('Error fetching profile for friend_id:', request.friend_id, profileError);
            return null;
          }

          return {
            ...request,
            profiles: profile,
          };
        })
      );

      const validRequests = requestsWithProfiles.filter(Boolean);
      console.log('Sent requests with profiles:', validRequests);
      return validRequests as Friend[];
    },
    enabled: !!userId,
  });

  // Get received requests (pending)
  const { data: receivedRequests, isLoading: receivedLoading } = useQuery({
    queryKey: ['friends-received', userId],
    queryFn: async () => {
      console.log('Fetching received requests for user:', userId);

      // First get the received friend requests
      const { data: friendRequests, error: friendError } = await supabase
        .from('friends')
        .select('*')
        .eq('friend_id', userId)
        .eq('status', 'pending');

      if (friendError) {
        console.error('Error fetching received friend requests:', friendError);
        throw friendError;
      }

      console.log('Received friend requests:', friendRequests);

      // Then get the profiles for each friend request
      const requestsWithProfiles = await Promise.all(
        (friendRequests || []).map(async (request) => {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, full_name, bio')
            .eq('id', request.user_id)
            .single();

          if (profileError) {
            console.error('Error fetching profile for user_id:', request.user_id, profileError);
            return null;
          }

          return {
            ...request,
            profiles: profile,
          };
        })
      );

      const validRequests = requestsWithProfiles.filter(Boolean);
      console.log('Received requests with profiles:', validRequests);
      return validRequests as Friend[];
    },
    enabled: !!userId,
  });

  // Send friend request
  const sendRequestMutation = useMutation({
    mutationFn: async (friendId: string) => {
      console.log('Sending friend request from', userId, 'to', friendId);
      const { data, error } = await supabase
        .from('friends')
        .insert([{ user_id: userId, friend_id: friendId, status: 'pending' }])
        .select();

      if (error) {
        console.error('Error sending friend request:', error);
        if (error.code === '23505') {
          throw new Error('Friend request already sent');
        }
        throw error;
      }

      console.log('Friend request sent successfully:', data);
    },
    onSuccess: () => {
      console.log('Invalidating queries after sending request');
      queryClient.invalidateQueries({ queryKey: ['friends-sent', userId] });
      queryClient.invalidateQueries({ queryKey: ['friends-received', userId] });
      Alert.alert('Success', 'Friend request sent!');
    },
    onError: (error) => {
      console.error('Send request mutation error:', error);
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
      console.log('Accepting friend request:', requestId);

      // First get the request details to know who sent it
      const { data: request, error: requestError } = await supabase
        .from('friends')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) {
        console.error('Error fetching request details:', requestError);
        throw requestError;
      }

      console.log('Request details:', request);

      // Update the original request to accepted
      const { error: updateError } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating request status:', updateError);
        throw updateError;
      }

      // Create the reciprocal friendship (the other direction)
      const { error: insertError } = await supabase.from('friends').insert([
        {
          user_id: userId,
          friend_id: request.user_id,
          status: 'accepted',
        },
      ]);

      if (insertError) {
        console.error('Error creating reciprocal friendship:', insertError);
        // Don't throw here as the main request was already accepted
      }

      console.log('Friend request accepted successfully');
    },
    onSuccess: () => {
      console.log('Invalidating queries after accepting request');
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
      console.log('Removing friend:', friendId, 'for user:', userId);

      // Use the database function to remove the friend relationship
      const { data, error } = await supabase.rpc('remove_friend_relationship', {
        current_user_id: userId,
        friend_user_id: friendId,
      });

      if (error) {
        console.error('Error removing friend relationship:', error);
        throw error;
      }

      console.log('Friend removal function result:', data);

      // Check if relationships still exist after deletion
      const { data: remainingRelationships, error: remainingError } = await supabase
        .from('friends')
        .select('*')
        .or(
          `and(user_id.eq.${userId},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${userId})`
        );

      if (remainingError) {
        console.error('Error checking remaining relationships:', remainingError);
      } else {
        console.log('Remaining relationships after deletion:', remainingRelationships);
      }
    },
    onSuccess: () => {
      console.log('Invalidating queries after removing friend');
      // Clear the cache completely for friends
      queryClient.removeQueries({ queryKey: ['friends', userId] });
      queryClient.removeQueries({ queryKey: ['friends-sent', userId] });
      queryClient.removeQueries({ queryKey: ['friends-received', userId] });
      // Force refetch the friends query
      queryClient.refetchQueries({ queryKey: ['friends', userId] });
      Alert.alert('Success', 'Friend removed.');
    },
    onError: (error) => {
      console.error('Remove friend mutation error:', error);
      Alert.alert('Error', 'Failed to remove friend. Please try again.');
    },
  });

  // Cancel sent request
  const cancelRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      console.log('Cancelling friend request:', requestId);

      // First get the request details
      const { data: request, error: requestError } = await supabase
        .from('friends')
        .select('*')
        .eq('id', requestId)
        .single();

      if (requestError) {
        console.error('Error fetching request details:', requestError);
        throw requestError;
      }

      console.log('Request to cancel:', request);

      // Try using a database function to cancel the request
      const { data, error } = await supabase.rpc('cancel_friend_request', {
        request_id: requestId,
        current_user_id: userId,
      });

      if (error) {
        console.error('Function call failed, trying direct deletion:', error);

        // Fallback to direct deletion
        const { data: deleteData, error: deleteError } = await supabase
          .from('friends')
          .delete()
          .eq('id', requestId)
          .select();

        if (deleteError) {
          console.error('Error cancelling friend request:', deleteError);
          throw deleteError;
        }

        console.log('Cancel request result (direct):', deleteData);
      } else {
        console.log('Cancel request result (function):', data);
      }
    },
    onSuccess: () => {
      console.log('Invalidating queries after cancelling request');
      queryClient.removeQueries({ queryKey: ['friends-sent', userId] });
      queryClient.refetchQueries({ queryKey: ['friends-sent', userId] });
      Alert.alert('Success', 'Friend request cancelled.');
    },
    onError: (error) => {
      console.error('Cancel request mutation error:', error);
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
