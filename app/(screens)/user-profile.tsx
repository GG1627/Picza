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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useColorScheme } from '../../lib/useColorScheme';
import React from 'react';
import { getCompetitionTag } from '../../lib/competitionTags';
import { useAuth } from '../../lib/auth';
import { useFriends } from '../../lib/hooks/useFriends';
import { useUserBlocking } from '../../lib/hooks/useUserBlocking';

type Post = {
  id: string;
  image_url: string;
  caption: string | null;
  created_at: string;
  likes_count: number;
};

type School = {
  name: string;
  primary_color: string;
  secondary_color: string;
};

type Profile = {
  id: string;
  username: string;
  full_name: string;
  created_at: string;
  avatar_url: string | null;
  bio: string | null;
  school_id: string | null;
  competitions_won: number | null;
  custom_tag: string | null;
  custom_tag_color: string | null;
};

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [friendStatus, setFriendStatus] = useState<
    'none' | 'pending_sent' | 'pending_received' | 'friends'
  >('none');
  const [friendsCount, setFriendsCount] = useState(0);
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const { user } = useAuth();
  const { sendRequest, isSending } = useFriends(user?.id || '');
  const { blockUser, unblockUser, isUserBlocked, isBlocking, isUnblocking } = useUserBlocking(
    user?.id || ''
  );
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const loadingScale = React.useRef(new Animated.Value(1)).current;
  const loadingOpacity = React.useRef(new Animated.Value(1)).current;
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const pageSize = 10;

  useEffect(() => {
    fetchProfile();
    if (user?.id && userId) {
      checkFriendStatus();
    }
  }, [userId, user?.id]);

  useEffect(() => {
    if (userId) {
      fetchFriendsCount();
    }
  }, [userId]);

  useEffect(() => {
    if (!loading) {
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
  }, [loading]);

  const fetchProfile = async () => {
    try {
      if (!userId) throw new Error('No user ID provided');

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, username, full_name, created_at, avatar_url, bio, school_id, competitions_won, custom_tag, custom_tag_color'
        )
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);

      if (data.school_id) {
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('name, primary_color, secondary_color')
          .eq('id', data.school_id)
          .single();

        if (schoolError) throw schoolError;
        setSchool(schoolData);
      }

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, image_url, caption, created_at, likes_count')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(0, pageSize - 1);

      if (postsError) throw postsError;
      setAllPosts(postsData || []);
      setHasMore(postsData?.length === pageSize);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;

    try {
      if (!userId) throw new Error('No user ID provided');

      const nextPage = page + 1;
      const { data: newPosts, error } = await supabase
        .from('posts')
        .select('id, image_url, caption, created_at, likes_count')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range((nextPage - 1) * pageSize, nextPage * pageSize - 1);

      if (error) throw error;

      if (newPosts && newPosts.length > 0) {
        setAllPosts((prev) => [...prev, ...newPosts]);
        setPage(nextPage);
        setHasMore(newPosts.length === pageSize);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more posts:', error);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchProfile();
      await fetchFriendsCount();
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const checkFriendStatus = async () => {
    if (!user?.id || !userId || user.id === userId) return;

    try {
      const { data: friendData } = await supabase
        .from('friends')
        .select('*')
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${user.id})`
        )
        .single();

      if (friendData) {
        if (friendData.status === 'accepted') {
          setFriendStatus('friends');
        } else if (friendData.status === 'pending') {
          setFriendStatus(friendData.user_id === user.id ? 'pending_sent' : 'pending_received');
        }
      } else {
        setFriendStatus('none');
      }
    } catch (error) {
      console.error('Error checking friend status:', error);
      setFriendStatus('none');
    }
  };

  const handleFriendRequest = () => {
    if (!user?.id || !userId) return;

    if (friendStatus === 'none') {
      sendRequest(userId as string);
      setFriendStatus('pending_sent');
    }
  };

  const renderFriendButton = () => {
    if (!user?.id || user.id === userId) return null;

    switch (friendStatus) {
      case 'friends':
        return (
          <View className="rounded-full bg-white/10 p-2">
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          </View>
        );
      case 'pending_sent':
        return (
          <View className="rounded-full bg-white/10 p-2">
            <Ionicons name="time" size={24} color="#F59E0B" />
          </View>
        );
      case 'pending_received':
        return (
          <Pressable
            onPress={() => router.push('/friends')}
            className="rounded-full bg-white/10 p-2">
            <Ionicons name="person-add" size={24} color="#3B82F6" />
          </Pressable>
        );
      default:
        return (
          <Pressable
            onPress={handleFriendRequest}
            disabled={isSending}
            className={`rounded-full bg-white/10 p-2 ${isSending ? 'opacity-50' : ''}`}>
            <Ionicons name="person-add-outline" size={24} color="#3B82F6" />
          </Pressable>
        );
    }
  };

  const renderBlockButton = () => {
    if (!user?.id || user.id === userId) return null;

    const isBlocked = isUserBlocked(userId as string);
    const isLoading = isBlocking || isUnblocking;

    return (
      <Pressable
        onPress={() => {
          if (isBlocked) {
            unblockUser(userId as string);
          } else {
            Alert.alert(
              'Block User',
              `Are you sure you want to block @${profile?.username}? You won't see their posts or comments anymore.`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block',
                  style: 'destructive',
                  onPress: () => blockUser(userId as string),
                },
              ]
            );
          }
        }}
        disabled={isLoading}
        className={`rounded-full bg-white/10 p-2 ${isLoading ? 'opacity-50' : ''}`}>
        <Ionicons
          name={isBlocked ? 'lock-open' : 'ban'}
          size={24}
          color={isBlocked ? '#10B981' : '#EF4444'}
        />
      </Pressable>
    );
  };

  const fetchFriendsCount = async () => {
    if (!userId) return;

    try {
      // Get accepted friend relationships in both directions
      const { data: friendRelationships, error } = await supabase
        .from('friends')
        .select('*')
        .or(
          `and(user_id.eq.${userId},status.eq.accepted),and(friend_id.eq.${userId},status.eq.accepted)`
        );

      if (error) {
        console.error('Error fetching friend relationships:', error);
        return;
      }

      // Count unique friends (deduplicate based on the other user's ID)
      const uniqueFriends = new Set();
      (friendRelationships || []).forEach((relationship) => {
        const friendId =
          relationship.user_id === userId ? relationship.friend_id : relationship.user_id;
        uniqueFriends.add(friendId);
      });

      setFriendsCount(uniqueFriends.size);
    } catch (error) {
      console.error('Error fetching friends count:', error);
    }
  };

  if (loading) {
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

  // Check if user is blocked
  const isBlocked = user?.id && userId && isUserBlocked(userId as string);

  // Show blocked user message
  if (isBlocked) {
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
            <View className="flex-row items-center space-x-2">{renderBlockButton()}</View>
          </View>

          {/* Blocked User Message */}
          <View className="flex-1 items-center justify-center px-6">
            <View className="items-center space-y-4">
              <View
                className={`h-32 w-32 items-center justify-center rounded-full border-2 ${
                  colorScheme === 'dark'
                    ? 'border-gray-600 bg-gray-800'
                    : 'border-gray-400 bg-gray-200'
                }`}>
                <Ionicons
                  name="person-remove"
                  size={48}
                  color={colorScheme === 'dark' ? '#666' : '#999'}
                />
              </View>

              <Text
                className={`text-xl font-bold ${
                  colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                User Blocked
              </Text>

              <Text
                className={`text-center text-base ${
                  colorScheme === 'dark' ? 'text-gray-500' : 'text-gray-500'
                }`}>
                You have blocked this user. Their content is hidden from your feed.
              </Text>

              <Pressable
                onPress={() => unblockUser(userId as string)}
                disabled={isUnblocking}
                className={`rounded-full px-6 py-3 ${isUnblocking ? 'opacity-50' : ''} ${
                  colorScheme === 'dark' ? 'bg-blue-600' : 'bg-blue-500'
                }`}>
                <Text className="font-semibold text-white">
                  {isUnblocking ? 'Unblocking...' : 'Unblock User'}
                </Text>
              </Pressable>
            </View>
          </View>
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
          <View className="flex-row items-center space-x-2">
            {renderFriendButton()}
            {renderBlockButton()}
          </View>
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
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isCloseToBottom =
              layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

            if (isCloseToBottom) {
              loadMore();
            }
          }}
          scrollEventThrottle={400}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 84 }}>
          <View className="px-6">
            {/* Profile Header */}
            <View className="mt-0 items-center">
              <View
                className={`h-32 w-32 items-center justify-center rounded-full border-2 ${
                  colorScheme === 'dark'
                    ? 'border-[#E0E0E0] bg-[#282828]'
                    : 'border-[#07020D] bg-black'
                }`}>
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    className="h-full w-full rounded-full"
                  />
                ) : (
                  <View className="items-center">
                    <Ionicons
                      name="person-outline"
                      size={48}
                      color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                    />
                  </View>
                )}
              </View>

              <View className="mt-4 items-center">
                <Text
                  className={`text-2xl font-bold ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  @{profile?.username}
                </Text>
                {profile && (
                  <View className="mb-1 mt-1">
                    <View
                      style={{
                        backgroundColor: getCompetitionTag(
                          profile.competitions_won,
                          profile.username,
                          {
                            tag: profile.custom_tag,
                            color: profile.custom_tag_color,
                          },
                          colorScheme
                        ).bgColor,
                        borderColor: getCompetitionTag(
                          profile.competitions_won,
                          profile.username,
                          {
                            tag: profile.custom_tag,
                            color: profile.custom_tag_color,
                          },
                          colorScheme
                        ).borderColor,
                      }}
                      className="rounded-xl border-2 px-4 py-1">
                      <Text
                        style={{
                          color: getCompetitionTag(
                            profile.competitions_won,
                            profile.username,
                            {
                              tag: profile.custom_tag,
                              color: profile.custom_tag_color,
                            },
                            colorScheme
                          ).color,
                        }}
                        className="text-center text-sm font-semibold">
                        {
                          getCompetitionTag(
                            profile.competitions_won,
                            profile.username,
                            {
                              tag: profile.custom_tag,
                              color: profile.custom_tag_color,
                            },
                            colorScheme
                          ).tag
                        }
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Bio and School Section */}
              <View className="mt-0 items-center">
                {profile?.bio && (
                  <Text
                    className={`text-center text-base ${
                      colorScheme === 'dark' ? 'text-[#b3b3b3]' : 'text-[#07020D]'
                    }`}>
                    {profile.bio}
                  </Text>
                )}
                {school && (
                  <View className="mt-2 flex-row items-center justify-center space-x-2">
                    <Ionicons
                      name="school"
                      size={16}
                      color={colorScheme === 'dark' ? '#9ca3af' : '#877B66'}
                    />
                    <Text
                      className={`ml-1 text-sm ${
                        colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'
                      }`}>
                      {school.name}
                    </Text>
                  </View>
                )}
              </View>

              {/* Stats Section */}
              <View className="mt-3 flex-row items-center justify-center space-x-10">
                <View className="items-center">
                  <Text
                    className={`text-xl font-bold ${
                      colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                    }`}>
                    {allPosts.length}
                  </Text>
                  <Text
                    className={`text-sm ${
                      colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'
                    }`}>
                    Posts
                  </Text>
                </View>
                <View className="items-center">
                  <Text
                    className={`ml-5 mr-5 text-xl font-bold ${
                      colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                    }`}>
                    {friendsCount}
                  </Text>
                  <Text
                    className={`ml-5 mr-5 text-sm ${
                      colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'
                    }`}>
                    Friends
                  </Text>
                </View>
                <View className="items-center">
                  <Text
                    className={`text-xl font-bold ${
                      colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                    }`}>
                    {profile?.competitions_won || 0}
                  </Text>
                  <Text
                    className={`text-sm ${
                      colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'
                    }`}>
                    Wins
                  </Text>
                </View>
              </View>
            </View>

            <View className="mt-8">
              {/* Posts Content */}
              {allPosts.length > 0 ? (
                <View className="-mx-6 flex-row flex-wrap">
                  {allPosts.map((post, index) => (
                    <View key={post.id} className="aspect-square w-1/3">
                      <View
                        className={`aspect-square border-b border-r ${
                          index % 3 !== 2 ? 'border-r' : ''
                        } ${colorScheme === 'dark' ? 'border-[#121113]' : 'border-[#e0e0e0]'}`}>
                        <Image
                          source={{
                            uri: post.image_url,
                          }}
                          className="h-full w-full"
                          resizeMode="cover"
                        />
                        <View className="absolute inset-0 bg-black/0 hover:bg-black/20" />
                        <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2" />
                        <Pressable
                          onPress={() => {
                            console.log('Post clicked:', post.id);
                            console.log('Attempting to navigate to post detail...');
                            router.push(`/post-detail?postId=${post.id}&userId=${profile?.id}`);
                          }}
                          className="absolute inset-0"
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="items-center justify-center py-8">
                  <Text
                    className={`text-center text-base ${
                      colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                    }`}>
                    No posts yet. Start sharing your food adventures!
                  </Text>
                </View>
              )}
              {loading && page > 1 && (
                <View className="w-full items-center py-4">
                  <ActivityIndicator size="small" color="#5070fd" />
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </Animated.View>
    </View>
  );
}
