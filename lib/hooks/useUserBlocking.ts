import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase';
import { Alert } from 'react-native';

// Types
export type BlockedUser = {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
  blocked_profile: {
    id: string;
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
};

// Custom Hook
export const useUserBlocking = (currentUserId: string) => {
  const queryClient = useQueryClient();

  // Get list of users that the current user has blocked
  const { data: blockedUsers, isLoading: blockedUsersLoading } = useQuery({
    queryKey: ['blocked-users', currentUserId],
    queryFn: async () => {
      console.log('Fetching blocked users for:', currentUserId);

      const { data, error } = await supabase
        .from('blocked_users')
        .select(
          `
          id,
          blocker_id,
          blocked_id,
          created_at,
          blocked_profile:blocked_id (
            id,
            username,
            avatar_url,
            full_name
          )
        `
        )
        .eq('blocker_id', currentUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching blocked users:', error);
        throw error;
      }

      console.log('Blocked users:', data);
      return data as unknown as BlockedUser[];
    },
    enabled: !!currentUserId,
  });

  // Check if a specific user is blocked by the current user
  const checkIfBlocked = async (targetUserId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', currentUserId)
        .eq('blocked_id', targetUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - user is not blocked
          return false;
        }
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking if user is blocked:', error);
      return false;
    }
  };

  // Block a user
  const blockUserMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      console.log('Blocking user:', targetUserId);

      const { error } = await supabase.from('blocked_users').insert({
        blocker_id: currentUserId,
        blocked_id: targetUserId,
      });

      if (error) {
        console.error('Error blocking user:', error);
        throw error;
      }

      return targetUserId;
    },
    onSuccess: (blockedUserId) => {
      console.log('Successfully blocked user:', blockedUserId);

      // Invalidate and refetch blocked users list
      queryClient.invalidateQueries({ queryKey: ['blocked-users', currentUserId] });

      // Invalidate feed queries to remove blocked user's content
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });

      Alert.alert('User Blocked', 'This user has been blocked successfully.');
    },
    onError: (error) => {
      console.error('Error in block user mutation:', error);
      Alert.alert('Error', 'Failed to block user. Please try again.');
    },
  });

  // Unblock a user
  const unblockUserMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      console.log('Unblocking user:', targetUserId);

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', currentUserId)
        .eq('blocked_id', targetUserId);

      if (error) {
        console.error('Error unblocking user:', error);
        throw error;
      }

      return targetUserId;
    },
    onSuccess: (unblockedUserId) => {
      console.log('Successfully unblocked user:', unblockedUserId);

      // Invalidate and refetch blocked users list
      queryClient.invalidateQueries({ queryKey: ['blocked-users', currentUserId] });

      // Invalidate feed queries to show unblocked user's content
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['comments'] });

      Alert.alert('User Unblocked', 'This user has been unblocked successfully.');
    },
    onError: (error) => {
      console.error('Error in unblock user mutation:', error);
      Alert.alert('Error', 'Failed to unblock user. Please try again.');
    },
  });

  // Block user function
  const blockUser = (targetUserId: string) => {
    if (currentUserId === targetUserId) {
      Alert.alert('Error', 'You cannot block yourself.');
      return;
    }
    blockUserMutation.mutate(targetUserId);
  };

  // Unblock user function
  const unblockUser = (targetUserId: string) => {
    unblockUserMutation.mutate(targetUserId);
  };

  // Check if user is blocked (for use in components)
  const isUserBlocked = (targetUserId: string): boolean => {
    return blockedUsers?.some((blocked) => blocked.blocked_id === targetUserId) || false;
  };

  // Utility function to filter out blocked users from a list
  const filterBlockedUsers = <T extends { user_id?: string; profiles?: { id: string } }>(
    items: T[]
  ): T[] => {
    if (!blockedUsers || blockedUsers.length === 0) {
      return items;
    }

    const blockedUserIds = new Set(blockedUsers.map((blocked) => blocked.blocked_id));

    return items.filter((item) => {
      const userId = item.user_id || item.profiles?.id;
      return userId && !blockedUserIds.has(userId);
    });
  };

  return {
    // Data
    blockedUsers,
    blockedUsersLoading,

    // Actions
    blockUser,
    unblockUser,
    checkIfBlocked,
    isUserBlocked,
    filterBlockedUsers,

    // Mutation states
    isBlocking: blockUserMutation.isPending,
    isUnblocking: unblockUserMutation.isPending,
  };
};
