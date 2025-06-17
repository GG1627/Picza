import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../lib/useColorScheme';

interface FeedListComponentsProps {
  isLoading: boolean;
  activeFilter: 'all' | 'mySchool' | 'friends';
  isLoadingMore: boolean;
  schoolData?: {
    short_name: string;
  } | null;
}

export function ListEmptyComponent({ isLoading, activeFilter }: FeedListComponentsProps) {
  const { colorScheme } = useColorScheme();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <ActivityIndicator size="large" color="#f77f5e" />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center p-8">
      <View className="mb-6 h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-[#000000] to-[#2f4ccc]">
        <Ionicons
          name={
            activeFilter === 'mySchool' ? 'school' : activeFilter === 'friends' ? 'people' : 'globe'
          }
          size={48}
          color="white"
        />
      </View>
      <Text
        className={`mb-2 text-center text-2xl font-bold ${
          colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
        }`}>
        {activeFilter === 'mySchool'
          ? 'No posts from your school yet'
          : activeFilter === 'friends'
            ? 'No posts from friends yet'
            : 'No posts yet'}
      </Text>
      {activeFilter === 'mySchool' && (
        <Text
          className={`text-center text-base ${
            colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'
          }`}>
          Be the first to share something!
        </Text>
      )}
    </View>
  );
}

export function ListFooterComponent({ isLoadingMore }: FeedListComponentsProps) {
  if (!isLoadingMore) return null;
  return (
    <View className="w-full items-center py-4">
      <ActivityIndicator size="small" color="#f77f5e" />
    </View>
  );
}
