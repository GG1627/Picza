import React from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../lib/useColorScheme';
import { usePostReports } from '../lib/hooks/usePostReports';
import { useAuth } from '../lib/auth';
import { useSavedPosts } from '../lib/hooks/useSavedPosts';

interface OptionsModalProps {
  visible: boolean;
  onClose: () => void;
  post: {
    id: string;
    user_id: string;
  } | null;
  onDeletePost: (postId: string) => void;
  isOwnPost: boolean;
}

export default function OptionsModal({
  visible,
  onClose,
  post,
  onDeletePost,
  isOwnPost,
}: OptionsModalProps) {
  const { colorScheme } = useColorScheme();
  const { user } = useAuth();
  const { reportPost, isReported, isReporting } = usePostReports();
  const {
    savePostWithOptimisticUpdate,
    unsavePostWithOptimisticUpdate,
    isSaving,
    isUnsaving,
    isPostSaved,
  } = useSavedPosts(user?.id || '');

  // Use the cached saved status directly
  const isSaved = post ? isPostSaved(post.id) : false;

  if (!post) return null;

  const handleReportPost = () => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to report a post.');
      return;
    }

    Alert.alert(
      'Report Post',
      'Are you sure you want to report this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            reportPost(post.id, user.id);
            onClose();
          },
        },
      ]
    );
  };

  const handleSaveToggle = () => {
    if (!user?.id) return;

    // Use optimistic updates for instant UI feedback
    if (isSaved) {
      unsavePostWithOptimisticUpdate(post.id);
    } else {
      savePostWithOptimisticUpdate(post.id);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="absolute inset-0 flex-1 items-center justify-center bg-black/50"
        onPress={onClose}>
        <Pressable
          className={`w-80 overflow-hidden rounded-3xl ${
            colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'
          }`}
          onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View
            className={`border-b p-4 ${
              colorScheme === 'dark' ? 'border-gray-800' : 'border-gray-100'
            }`}>
            <Text
              className={`text-center text-lg font-semibold ${
                colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
              }`}>
              Post Options
            </Text>
          </View>

          {/* Options */}
          <View className="p-2">
            {isOwnPost ? (
              <>
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    Alert.alert('Coming Soon', 'Pin functionality will be available soon!');
                  }}
                  className={`flex-row items-center space-x-3 rounded-xl p-3 ${
                    colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                  }`}>
                  <Ionicons name="pin" size={24} color="#5070fd" />
                  <Text
                    className={`text-base ${
                      colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                    }`}>
                    Pin Post
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    onDeletePost(post.id);
                  }}
                  className={`mt-2 flex-row items-center space-x-3 rounded-xl p-3 ${
                    colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                  }`}>
                  <Ionicons name="trash" size={24} color="#F00511" />
                  <Text className="text-base text-[#F00511]">Delete Post</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    handleSaveToggle();
                  }}
                  disabled={isSaving || isUnsaving}
                  className={`flex-row items-center space-x-3 rounded-xl p-3 ${
                    colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                  }`}>
                  <Ionicons
                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={24}
                    color={isSaved ? '#3B82F6' : '#5070fd'}
                  />
                  <Text
                    className={`text-base ${
                      colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                    }`}>
                    {isSaved ? 'Unsave Post' : 'Save Post'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleReportPost}
                  disabled={isReporting}
                  className={`mt-2 flex-row items-center space-x-3 rounded-xl p-3 ${
                    colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                  }`}>
                  <Ionicons
                    name={isReported(post.id) ? 'checkmark-circle' : 'flag-outline'}
                    size={24}
                    color={isReported(post.id) ? '#10B981' : '#F00511'}
                  />
                  <Text
                    className={`text-base ${
                      colorScheme === 'dark' ? 'text-[#F00511]' : 'text-[#F00511]'
                    }`}>
                    {isReported(post.id) ? 'Already Reported' : 'Report Post'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            onPress={onClose}
            className={`border-t p-4 ${
              colorScheme === 'dark' ? 'border-gray-800' : 'border-gray-100'
            }`}>
            <Text
              className={`text-center text-base font-medium ${
                colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
              }`}>
              Cancel
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
