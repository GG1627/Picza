import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Image,
  ScrollView,
  Animated,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useColorScheme } from '../../lib/useColorScheme';
import React from 'react';
import { useAuth } from '../../lib/auth';
import { useUserBlocking } from '../../lib/hooks/useUserBlocking';

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const { user } = useAuth();
  const { blockedUsers, blockedUsersLoading, unblockUser, isUnblocking } = useUserBlocking(
    user?.id || ''
  );
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const loadingScale = React.useRef(new Animated.Value(1)).current;
  const loadingOpacity = React.useRef(new Animated.Value(1)).current;
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!blockedUsersLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(loadingOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(loadingScale, {
          toValue: 0.8,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
      ]).start();
    }
  }, [blockedUsersLoading]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    // The hook will automatically refetch when we trigger a refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleUnblockUser = (blockedUserId: string, username: string) => {
    Alert.alert(
      'Unblock User',
      `Are you sure you want to unblock @${username}? You will start seeing their posts and comments again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unblock',
          style: 'default',
          onPress: () => unblockUser(blockedUserId),
        },
      ]
    );
  };

  if (blockedUsersLoading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${
          colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'
        }`}>
        <Animated.View
          style={{
            opacity: loadingOpacity,
            transform: [{ scale: loadingScale }],
          }}>
          <ActivityIndicator size="large" color="#5070fd" />
        </Animated.View>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
        }}
        className={`${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
        {/* Header */}
        <View className="mt-16 flex-row items-center justify-between px-6">
          <Pressable
            onPress={() => router.back()}
            className={`rounded-full ${
              colorScheme === 'dark' ? 'bg-none' : 'bg-none'
            } p-2 shadow-sm`}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
            />
          </Pressable>
          <Text
            className={`text-xl font-bold ${
              colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
            }`}>
            Blocked Users
          </Text>
          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
              colors={[colorScheme === 'dark' ? '#E0E0E0' : '#07020D']}
            />
          }
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 84 }}>
          <View className="px-6">
            {/* Description */}
            <View className="mb-6 mt-4">
              <Text
                className={`text-center text-base ${
                  colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                Users you've blocked won't appear in your feed. You can unblock them anytime.
              </Text>
            </View>

            {/* Blocked Users List */}
            {blockedUsers && blockedUsers.length > 0 ? (
              <View className="space-y-3">
                {blockedUsers.map((blockedUser) => (
                  <View
                    key={blockedUser.id}
                    className={`rounded-2xl border p-4 ${
                      colorScheme === 'dark'
                        ? 'border-gray-700 bg-[#1a1a1a]'
                        : 'border-gray-200 bg-white'
                    }`}>
                    <View className="flex-row items-center justify-between">
                      <View className="mr-3 flex-1 flex-row items-center">
                        {/* Avatar */}
                        <View
                          className={`h-12 w-12 items-center justify-center rounded-full border-2 ${
                            colorScheme === 'dark'
                              ? 'border-gray-600 bg-gray-800'
                              : 'border-gray-300 bg-gray-100'
                          }`}>
                          {blockedUser.blocked_profile.avatar_url ? (
                            <Image
                              source={{ uri: blockedUser.blocked_profile.avatar_url }}
                              className="h-full w-full rounded-full"
                            />
                          ) : (
                            <Ionicons
                              name="person-outline"
                              size={24}
                              color={colorScheme === 'dark' ? '#666' : '#999'}
                            />
                          )}
                        </View>

                        {/* User Info */}
                        <View className="ml-3 flex-1">
                          <Text
                            className={`text-base font-semibold ${
                              colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                            }`}>
                            @{blockedUser.blocked_profile.username}
                          </Text>
                          {blockedUser.blocked_profile.full_name && (
                            <Text
                              className={`mt-0.5 text-sm ${
                                colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                              {blockedUser.blocked_profile.full_name}
                            </Text>
                          )}
                          <Text
                            className={`mt-1 text-xs ${
                              colorScheme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                            Blocked on {new Date(blockedUser.created_at).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>

                      {/* Unblock Button */}
                      <Pressable
                        onPress={() =>
                          handleUnblockUser(
                            blockedUser.blocked_id,
                            blockedUser.blocked_profile.username
                          )
                        }
                        disabled={isUnblocking}
                        className={`rounded-full px-4 py-2 ${isUnblocking ? 'opacity-50' : ''} ${
                          colorScheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
                        }`}>
                        <Text className="text-sm font-semibold text-white">
                          {isUnblocking ? 'Unblocking...' : 'Unblock'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              /* Empty State */
              <View className="flex-1 items-center justify-center py-16">
                <View className="items-center space-y-4">
                  <View
                    className={`h-24 w-24 items-center justify-center rounded-full border-2 ${
                      colorScheme === 'dark'
                        ? 'border-gray-600 bg-gray-800'
                        : 'border-gray-300 bg-gray-100'
                    }`}>
                    <Ionicons
                      name="ban-outline"
                      size={48}
                      color={colorScheme === 'dark' ? '#666' : '#999'}
                    />
                  </View>

                  <Text
                    className={`text-xl font-bold ${
                      colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                    No Blocked Users
                  </Text>

                  <Text
                    className={`text-center text-base ${
                      colorScheme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                    You haven't blocked any users yet. Blocked users will appear here.
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
