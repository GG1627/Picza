import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useAuth } from '../../lib/auth';
import { useFriends, type Friend, type User } from '../../lib/hooks/useFriends';
import { useColorScheme } from '../../lib/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabType = 'friends' | 'sent' | 'received' | 'search';

export default function FriendsScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { user } = useAuth();
  const { colorScheme } = useColorScheme();
  const router = useRouter();

  const {
    friends,
    sentRequests,
    receivedRequests,
    friendsLoading,
    sentLoading,
    receivedLoading,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    cancelRequest,
    isSending,
    isAccepting,
    isRejecting,
    isRemoving,
    isCancelling,
    searchUsers,
  } = useFriends(user?.id || '');

  // Search functionality
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchUsers(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        Alert.alert('Error', 'Failed to search users. Please try again.');
      } finally {
        setIsSearching(false);
      }
    },
    [searchUsers]
  );

  // Render friend item
  const renderFriendItem = ({ item }: { item: Friend }) => (
    <View
      className={`mb-3 flex-row items-center justify-between rounded-xl p-4 ${
        colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'
      }`}>
      <View className="flex-1 flex-row items-center">
        <Pressable
          onPress={() => router.push(`/user-profile?userId=${item.profiles.id}`)}
          className="h-12 w-12 overflow-hidden rounded-full border-2 border-gray-200">
          <Image
            source={
              item.profiles.avatar_url
                ? { uri: item.profiles.avatar_url }
                : require('../../assets/default-avatar.png')
            }
            className="h-full w-full"
          />
        </Pressable>
        <View className="ml-3 flex-1">
          <Text
            className={`text-base font-semibold ${
              colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
            }`}>
            @{item.profiles.username}
          </Text>
          {item.profiles.bio && (
            <Text
              className={`text-sm ${colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'}`}
              numberOfLines={1}>
              {item.profiles.bio}
            </Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            'Remove Friend',
            `Are you sure you want to remove @${item.profiles.username}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: () => removeFriend(item.profiles.id),
              },
            ]
          );
        }}
        disabled={isRemoving}
        className="ml-3 rounded-full bg-red-50 p-2">
        <Ionicons name="person-remove" size={20} color="#F00511" />
      </TouchableOpacity>
    </View>
  );

  // Render sent request item
  const renderSentRequestItem = ({ item }: { item: Friend }) => (
    <View
      className={`mb-3 flex-row items-center justify-between rounded-xl p-4 ${
        colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'
      }`}>
      <View className="flex-1 flex-row items-center">
        <Pressable
          onPress={() => router.push(`/user-profile?userId=${item.profiles.id}`)}
          className="h-12 w-12 overflow-hidden rounded-full border-2 border-gray-200">
          <Image
            source={
              item.profiles.avatar_url
                ? { uri: item.profiles.avatar_url }
                : require('../../assets/default-avatar.png')
            }
            className="h-full w-full"
          />
        </Pressable>
        <View className="ml-3 flex-1">
          <Text
            className={`text-base font-semibold ${
              colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
            }`}>
            @{item.profiles.username}
          </Text>
          <Text
            className={`text-sm ${colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'}`}>
            Request sent
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={() => {
          Alert.alert('Cancel Request', `Cancel friend request to @${item.profiles.username}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Cancel Request',
              style: 'destructive',
              onPress: () => cancelRequest(item.id),
            },
          ]);
        }}
        disabled={isCancelling}
        className="ml-3 rounded-full bg-gray-100 p-2">
        <Ionicons name="close" size={20} color="#6B7280" />
      </TouchableOpacity>
    </View>
  );

  // Render received request item
  const renderReceivedRequestItem = ({ item }: { item: Friend }) => (
    <View
      className={`mb-3 flex-row items-center justify-between rounded-xl p-4 ${
        colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'
      }`}>
      <View className="flex-1 flex-row items-center">
        <Pressable
          onPress={() => router.push(`/user-profile?userId=${item.profiles.id}`)}
          className="h-12 w-12 overflow-hidden rounded-full border-2 border-gray-200">
          <Image
            source={
              item.profiles.avatar_url
                ? { uri: item.profiles.avatar_url }
                : require('../../assets/default-avatar.png')
            }
            className="h-full w-full"
          />
        </Pressable>
        <View className="ml-3 flex-1">
          <Text
            className={`text-base font-semibold ${
              colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
            }`}>
            @{item.profiles.username}
          </Text>
          <Text
            className={`text-sm ${colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'}`}>
            Wants to be your friend
          </Text>
        </View>
      </View>
      <View className="flex-row space-x-2">
        <TouchableOpacity
          onPress={() => acceptRequest(item.id)}
          disabled={isAccepting}
          className="rounded-full bg-green-50 p-2">
          <Ionicons name="checkmark" size={20} color="#10B981" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => rejectRequest(item.id)}
          disabled={isRejecting}
          className="rounded-full bg-red-50 p-2">
          <Ionicons name="close" size={20} color="#F00511" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render search result item
  const renderSearchResultItem = ({ item }: { item: User }) => (
    <View
      className={`mb-3 flex-row items-center justify-between rounded-xl p-4 ${
        colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'
      }`}>
      <View className="flex-1 flex-row items-center">
        <Pressable
          onPress={() => router.push(`/user-profile?userId=${item.id}`)}
          className="h-12 w-12 overflow-hidden rounded-full border-2 border-gray-200">
          <Image
            source={
              item.avatar_url
                ? { uri: item.avatar_url }
                : require('../../assets/default-avatar.png')
            }
            className="h-full w-full"
          />
        </Pressable>
        <View className="ml-3 flex-1">
          <Text
            className={`text-base font-semibold ${
              colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
            }`}>
            @{item.username}
          </Text>
          {item.bio && (
            <Text
              className={`text-sm ${colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'}`}
              numberOfLines={1}>
              {item.bio}
            </Text>
          )}
        </View>
      </View>
      {item.friend_status === 'none' && (
        <TouchableOpacity
          onPress={() => sendRequest(item.id)}
          disabled={isSending}
          className="ml-3 rounded-full bg-blue-50 p-2">
          <Ionicons name="person-add" size={20} color="#3B82F6" />
        </TouchableOpacity>
      )}
      {item.friend_status === 'pending_sent' && (
        <View className="ml-3 rounded-full bg-gray-100 px-3 py-2">
          <Text className="text-sm text-gray-500">Sent</Text>
        </View>
      )}
      {item.friend_status === 'pending_received' && (
        <View className="ml-3 rounded-full bg-green-100 px-3 py-2">
          <Text className="text-sm text-green-600">Received</Text>
        </View>
      )}
      {item.friend_status === 'friends' && (
        <View className="ml-3 rounded-full bg-green-100 px-3 py-2">
          <Text className="text-sm text-green-600">Friends</Text>
        </View>
      )}
    </View>
  );

  // Tab button component
  const TabButton = ({ tab, label }: { tab: TabType; label: string }) => {
    const isActive = activeTab === tab;

    return (
      <TouchableOpacity onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
        <BlurView
          intensity={20}
          tint={colorScheme}
          style={{
            borderRadius: 16,
            borderWidth: 1,
            overflow: 'hidden',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderColor:
              colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
            backgroundColor: isActive
              ? colorScheme === 'dark'
                ? 'rgba(247, 127, 94, 0.8)' // Same orange as light mode for consistency
                : 'rgba(247, 127, 94, 0.8)' // Better orange for light mode
              : 'transparent',
          }}>
          <Text
            className={`px-3 py-1.5 text-center text-sm font-medium ${
              isActive ? 'text-white' : colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
            }`}>
            {label}
          </Text>
        </BlurView>
      </TouchableOpacity>
    );
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'friends':
        return friends;
      case 'sent':
        return sentRequests;
      case 'received':
        return receivedRequests;
      case 'search':
        return searchResults;
      default:
        return [];
    }
  };

  // Get current loading state
  const getCurrentLoading = () => {
    switch (activeTab) {
      case 'friends':
        return friendsLoading;
      case 'sent':
        return sentLoading;
      case 'received':
        return receivedLoading;
      case 'search':
        return isSearching;
      default:
        return false;
    }
  };

  // Render item based on active tab
  const renderItem = ({ item }: { item: any }) => {
    switch (activeTab) {
      case 'friends':
        return renderFriendItem({ item });
      case 'sent':
        return renderSentRequestItem({ item });
      case 'received':
        return renderReceivedRequestItem({ item });
      case 'search':
        return renderSearchResultItem({ item });
      default:
        return renderFriendItem({ item });
    }
  };

  return (
    <SafeAreaView className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#E8E9EB]'}`}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
          />
        </TouchableOpacity>
        <Text
          className={`text-xl font-bold ${
            colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
          }`}>
          Friends
        </Text>
        <View className="w-6" />
      </View>

      {/* Tab Navigation */}
      <View className="px-6 pb-4">
        <View className="flex-row space-x-4">
          <TabButton tab="friends" label="Friends" />
          <TabButton tab="sent" label="Sent" />
          <TabButton tab="received" label="Received" />
          <TabButton tab="search" label="Search" />
        </View>
      </View>

      {/* Search Bar (only for search tab) */}
      {activeTab === 'search' && (
        <View className="px-6 pb-4">
          <View
            className={`flex-row items-center rounded-xl border px-4 py-3 ${
              colorScheme === 'dark' ? 'border-[#9ca3af] bg-[#282828]' : 'border-[#07020D] bg-white'
            }`}>
            <Ionicons
              name="search"
              size={20}
              color={colorScheme === 'dark' ? '#9ca3af' : '#877B66'}
            />
            <TextInput
              value={searchQuery}
              onChangeText={handleSearch}
              placeholder="Search by username..."
              placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#877B66'}
              className={`ml-3 flex-1 ${
                colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
              }`}
            />
          </View>
        </View>
      )}

      {/* Content */}
      <View className="flex-1 px-6">
        {getCurrentLoading() ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#f77f5e" />
          </View>
        ) : (
          <FlatList
            data={getCurrentData()}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center py-8">
                <Text
                  className={`text-center text-base ${
                    colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'
                  }`}>
                  {activeTab === 'friends' && 'No friends yet'}
                  {activeTab === 'sent' && 'No sent requests'}
                  {activeTab === 'received' && 'No received requests'}
                  {activeTab === 'search' && 'Search for users to add as friends'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}
