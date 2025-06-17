import React from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../lib/useColorScheme';

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

  if (!post) return null;

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
                  className="mt-2 flex-row items-center space-x-3 rounded-xl bg-red-50 p-3">
                  <Ionicons name="trash" size={24} color="#F00511" />
                  <Text className="text-base text-[#F00511]">Delete Post</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    Alert.alert('Coming Soon', 'Save functionality will be available soon!');
                  }}
                  className={`flex-row items-center space-x-3 rounded-xl p-3 ${
                    colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                  }`}>
                  <Ionicons name="bookmark-outline" size={24} color="#5070fd" />
                  <Text
                    className={`text-base ${
                      colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                    }`}>
                    Save Post
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    onClose();
                    Alert.alert('Coming Soon', 'Report functionality will be available soon!');
                  }}
                  className="mt-2 flex-row items-center space-x-3 rounded-xl bg-red-50 p-3">
                  <Ionicons name="flag-outline" size={24} color="#F00511" />
                  <Text className="text-base text-[#F00511]">Report Post</Text>
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
