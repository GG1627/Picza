import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Image,
  TextInput,
  ScrollView,
  Animated,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Alert } from 'react-native';
import { useColorScheme } from '../../lib/useColorScheme';
import React from 'react';
import { uploadToCloudinary, deleteFromCloudinary } from '../../lib/cloudinary';
import { getCompetitionTag } from '../../lib/competitionTags';
import ImageOptimizer from '../../lib/imageOptimization';
import MeshGradient from '../../components/MeshGradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../lib/auth';
import { useSavedPosts } from '../../lib/hooks/useSavedPosts';
import { useFriends } from '../../lib/hooks/useFriends';

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
  last_username_change: string | null;
  competitions_won: number | null;
  custom_tag: string | null;
  custom_tag_color: string | null;
};

export default function ProfileScreen() {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);
  const [usernameChangeError, setUsernameChangeError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved'>('posts');
  const router = useRouter();
  const { colorScheme, toggleColorScheme, isDarkColorScheme } = useColorScheme();
  const { user } = useAuth();
  const { savedPosts, savedPostsLoading } = useSavedPosts(user?.id || '');
  const { friends } = useFriends(user?.id || '');
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const translateY = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const loadingScale = React.useRef(new Animated.Value(1)).current;
  const loadingOpacity = React.useRef(new Animated.Value(1)).current;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const pageSize = 10;

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setEditedUsername(profile.username);
      setEditedBio(profile.bio || '');
    }
  }, [profile]);

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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('profiles')
        .select(
          'id, username, full_name, created_at, avatar_url, bio, school_id, last_username_change, competitions_won, custom_tag, custom_tag_color'
        )
        .eq('id', user.id)
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
        .eq('user_id', user.id)
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
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('No user found');

      const nextPage = page + 1;
      const { data: newPosts, error } = await supabase
        .from('posts')
        .select('id, image_url, caption, created_at, likes_count')
        .eq('user_id', user.id)
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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // Get full quality, we'll optimize it ourselves
      });

      if (!result.canceled) {
        // Optimize image for avatar upload
        const optimized = await ImageOptimizer.optimizeForAvatar(result.assets[0].uri);
        setNewImage(optimized.uri);
      }
    } catch (error) {
      console.error('Error picking/optimizing image:', error);
      alert('Error processing image. Please try again.');
    }
  };

  const uploadImage = async (base64Image: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Upload to Cloudinary with avatar type
      const imageUrl = await uploadToCloudinary(base64Image, 'avatar');
      return imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const canChangeUsername = () => {
    if (!profile?.last_username_change) return true;

    const lastChange = new Date(profile.last_username_change);
    const now = new Date();
    const twoWeeksInMs = 14 * 24 * 60 * 60 * 1000;

    return now.getTime() - lastChange.getTime() >= twoWeeksInMs;
  };

  const getNextUsernameChangeDate = () => {
    if (!profile?.last_username_change) return null;

    const lastChange = new Date(profile.last_username_change);
    const nextChange = new Date(lastChange.getTime() + 14 * 24 * 60 * 60 * 1000);
    return nextChange;
  };

  const handleSaveProfile = async () => {
    if (!editedUsername) {
      alert('Please fill in all required fields');
      return;
    }

    // Check if username has changed and if enough time has passed
    if (editedUsername !== profile?.username && !canChangeUsername()) {
      const nextChange = getNextUsernameChangeDate();
      setUsernameChangeError(
        `You can change your username again on ${nextChange?.toLocaleDateString()}`
      );
      // Don't return here, allow other changes to proceed
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      let avatarUrl = profile?.avatar_url;
      if (newImage) {
        const response = await fetch(newImage);
        const blob = await response.blob();
        const reader = new FileReader();
        const base64Image = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        avatarUrl = await uploadImage(base64Image.split(',')[1]);
      }

      const updateData: any = {
        bio: editedBio,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      // Only update username and last_username_change if username was changed and allowed
      if (editedUsername !== profile?.username && canChangeUsername()) {
        updateData.username = editedUsername;
        updateData.last_username_change = new Date().toISOString();
      } else if (editedUsername !== profile?.username) {
        // If username change not allowed, keep the old username
        updateData.username = profile?.username;
      } else {
        // If username wasn't changed, keep it as is
        updateData.username = editedUsername;
      }

      const { error } = await supabase.from('profiles').update(updateData).eq('id', user.id);

      if (error) throw error;

      await fetchProfile();
      setIsEditing(false);
      setNewImage(null);
      setUsernameChangeError(null);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Error updating profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const {
                data: { user },
              } = await supabase.auth.getUser();
              if (!user) throw new Error('No user found');

              console.log('Starting account deletion for user:', user.id);

              // 1. Delete user's posts (and their images from Cloudinary)
              console.log('Deleting user posts...');
              const { data: userPosts, error: postsError } = await supabase
                .from('posts')
                .select('id, image_url')
                .eq('user_id', user.id);

              if (postsError) {
                console.error('Error fetching user posts:', postsError);
                throw postsError;
              }

              // Delete images from Cloudinary
              if (userPosts && userPosts.length > 0) {
                for (const post of userPosts) {
                  try {
                    await deleteFromCloudinary(post.image_url);
                  } catch (cloudinaryError) {
                    console.error('Error deleting image from Cloudinary:', cloudinaryError);
                    // Continue even if Cloudinary deletion fails
                  }
                }
              }

              // Delete posts from database
              const { error: deletePostsError } = await supabase
                .from('posts')
                .delete()
                .eq('user_id', user.id);

              if (deletePostsError) {
                console.error('Error deleting posts:', deletePostsError);
                throw deletePostsError;
              }

              // 2. Delete saved posts where user is the saver
              console.log('Deleting saved posts...');
              const { error: deleteSavedPostsError } = await supabase
                .from('saved_posts')
                .delete()
                .eq('user_id', user.id);

              if (deleteSavedPostsError) {
                console.error('Error deleting saved posts:', deleteSavedPostsError);
                throw deleteSavedPostsError;
              }

              // 3. Delete saved posts where user's posts are saved by others
              console.log("Deleting saved posts of user's posts...");
              const { error: deleteSavedByOthersError } = await supabase
                .from('saved_posts')
                .delete()
                .in('post_id', userPosts?.map((post) => post.id) || []);

              if (deleteSavedByOthersError) {
                console.error('Error deleting saved posts by others:', deleteSavedByOthersError);
                throw deleteSavedByOthersError;
              }

              // 4. Delete friend relationships
              console.log('Deleting friend relationships...');
              const { error: deleteFriendsError } = await supabase
                .from('friends')
                .delete()
                .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

              if (deleteFriendsError) {
                console.error('Error deleting friend relationships:', deleteFriendsError);
                throw deleteFriendsError;
              }

              // 5. Delete likes on user's posts
              console.log("Deleting likes on user's posts...");
              const { error: deleteLikesError } = await supabase
                .from('post_likes')
                .delete()
                .in('post_id', userPosts?.map((post) => post.id) || []);

              if (deleteLikesError) {
                console.error('Error deleting likes:', deleteLikesError);
                // Don't throw here, as post_likes table might not exist
              }

              // 6. Delete comments on user's posts
              console.log("Deleting comments on user's posts...");
              const { error: deleteCommentsError } = await supabase
                .from('comments')
                .delete()
                .in('post_id', userPosts?.map((post) => post.id) || []);

              if (deleteCommentsError) {
                console.error('Error deleting comments:', deleteCommentsError);
                throw deleteCommentsError;
              }

              // 7. Delete comments made by the user
              console.log("Deleting user's comments...");
              const { error: deleteUserCommentsError } = await supabase
                .from('comments')
                .delete()
                .eq('user_id', user.id);

              if (deleteUserCommentsError) {
                console.error('Error deleting user comments:', deleteUserCommentsError);
                throw deleteUserCommentsError;
              }

              // 8. Delete post reports involving user's posts
              console.log('Deleting post reports...');
              const { error: deleteReportsError } = await supabase
                .from('post_reports')
                .delete()
                .in('post_id', userPosts?.map((post) => post.id) || []);

              if (deleteReportsError) {
                console.error('Error deleting post reports:', deleteReportsError);
                // Don't throw here, as post_reports table might not exist
              }

              // 9. Delete user's profile
              console.log('Deleting user profile...');
              const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);

              if (profileError) {
                console.error('Error deleting profile:', profileError);
                throw profileError;
              }

              // 10. Finally, delete the user from auth
              console.log('Deleting user from auth...');
              // Note: We can't use admin.deleteUser from client side
              // Instead, we'll sign out the user and let them know to contact support
              const { error: signOutError } = await supabase.auth.signOut();
              if (signOutError) {
                console.error('Error signing out:', signOutError);
              }

              console.log('Account deletion completed successfully');

              Alert.alert(
                'Account Deleted',
                'Your account data has been deleted. You have been signed out.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Redirect to login
                      router.replace('/(auth)/login');
                    },
                  },
                ]
              );
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert(
                'Error',
                'Failed to delete account. Please try again or contact support.',
                [{ text: 'OK' }]
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const openSettings = () => {
    setSettingsVisible(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(translateY, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSettings = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setTimeout(() => {
      setSettingsVisible(false);
    }, 200);
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchProfile();
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const tag = profile
    ? getCompetitionTag(
        profile.competitions_won,
        profile.username,
        {
          tag: profile.custom_tag,
          color: profile.custom_tag_color,
        },
        colorScheme
      )
    : null;

  // Tab button component
  const TabButton = ({ tab, label }: { tab: 'posts' | 'saved'; label: string }) => {
    const isActive = activeTab === tab;

    return (
      <TouchableOpacity onPress={() => setActiveTab(tab)} activeOpacity={0.7} style={{ flex: 1 }}>
        <View
          style={{
            alignItems: 'center',
            paddingVertical: 8,
            width: '100%',
          }}>
          <Text
            className={`text-base font-semibold ${
              isActive
                ? 'text-[#3B82F6]'
                : colorScheme === 'dark'
                  ? 'text-[#9ca3af]'
                  : 'text-[#877B66]'
            }`}>
            {label}
          </Text>
          {isActive && (
            <View
              style={{
                width: 70,
                height: 1,
                backgroundColor: '#3B82F6',
                marginTop: 4,
              }}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#E8E9EB]'}`}>
        <View className="flex-1 items-center justify-center">
          <Animated.View
            style={{
              opacity: loadingOpacity,
              transform: [{ scale: loadingScale }],
            }}>
            <ActivityIndicator size="large" color="#f77f5e" />
          </Animated.View>
        </View>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#E8E9EB]'}`}>
      <View className="flex-1 pt-12">
        {/* Black background that shows when screen shrinks */}
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'black',
            opacity: scaleAnim.interpolate({
              inputRange: [0.92, 1],
              outputRange: [1, 0],
            }),
          }}
        />
        <Animated.View
          style={{
            flex: 1,
            transform: [
              { scale: scaleAnim },
              {
                translateY: scaleAnim.interpolate({
                  inputRange: [0.92, 1],
                  outputRange: [-30, 0],
                }),
              },
            ],
            borderRadius: scaleAnim.interpolate({
              inputRange: [0.92, 1],
              outputRange: [30, 0],
            }),
            overflow: 'hidden',
            opacity: scaleAnim.interpolate({
              inputRange: [0.92, 1],
              outputRange: [0.85, 1],
            }),
          }}
          className={`${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#E8E9EB]'}`}>
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            {/* Header */}
            <View className="mt-5 flex-row items-center justify-between px-6">
              <Pressable
                onPress={() => router.push('/friends')}
                className={`rounded-full ${colorScheme === 'dark' ? 'bg-none' : 'bg-none'} p-2 shadow-sm`}>
                <Ionicons
                  name="people-outline"
                  size={24}
                  color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                />
              </Pressable>
              <Pressable
                onPress={openSettings}
                className={`rounded-full ${colorScheme === 'dark' ? 'bg-none' : 'bg-none'} p-2 shadow-sm`}>
                <Ionicons
                  name="settings-outline"
                  size={24}
                  color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                />
              </Pressable>
            </View>

            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              className="flex-1"
              keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}>
              <ScrollView
                className="flex-1"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
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
                    <Pressable onPress={isEditing ? pickImage : undefined} className="relative">
                      <View
                        className={`h-32 w-32 items-center justify-center rounded-full border-2 ${
                          colorScheme === 'dark'
                            ? 'border-[#E0E0E0] bg-[#282828]'
                            : 'border-[#07020D] bg-black'
                        }`}>
                        {newImage || profile?.avatar_url ? (
                          <Image
                            source={{ uri: newImage || profile?.avatar_url || '' }}
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
                        {isEditing && (
                          <View className="absolute inset-0 items-center justify-center rounded-full bg-black/30">
                            <Ionicons name="camera" size={32} color="white" />
                          </View>
                        )}
                      </View>
                    </Pressable>

                    <View className="mt-2 items-center">
                      <Text
                        className={`text-2xl font-bold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                        @{profile?.username}
                      </Text>
                      {profile && tag && (
                        <View className="mb-1 mt-1">
                          <View
                            style={{
                              backgroundColor: tag.bgColor,
                              borderColor: tag.borderColor,
                            }}
                            className="rounded-xl border-2 px-4 py-1">
                            <Text
                              style={{
                                color: tag.color,
                              }}
                              className="text-center text-sm font-semibold">
                              {tag.tag}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>

                    {/* Bio and School Section */}
                    <View className="mt-0 items-center">
                      {profile?.bio && (
                        <Text
                          className={`text-center text-base ${colorScheme === 'dark' ? 'text-[#b3b3b3]' : 'text-[#07020D]'}`}>
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
                            className={`ml-1 text-sm ${colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'}`}>
                            {school.name}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Stats Section */}
                    <View className="mt-3 flex-row items-center justify-center space-x-10">
                      <View className="items-center">
                        <Text
                          className={`text-xl font-bold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                          {allPosts.length}
                        </Text>
                        <Text
                          className={`text-sm ${colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'}`}>
                          Posts
                        </Text>
                      </View>
                      <Pressable onPress={() => router.push('/friends')} className="items-center">
                        <Text
                          className={`ml-5 mr-5 text-xl font-bold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                          {friends.length}
                        </Text>
                        <Text
                          className={`ml-5 mr-5 text-sm ${colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'}`}>
                          Friends
                        </Text>
                      </Pressable>
                      <View className="items-center">
                        <Text
                          className={`text-xl font-bold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                          {profile?.competitions_won || 0}
                        </Text>
                        <Text
                          className={`text-sm ${colorScheme === 'dark' ? 'text-[#9ca3af]' : 'text-[#877B66]'}`}>
                          Wins
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Profile Information */}
                  {isEditing ? (
                    <View className="mt-2 space-y-6">
                      <View className="flex-row items-center justify-between">
                        <Text
                          className={`text-lg font-semibold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                          Edit Profile
                        </Text>
                        <Pressable
                          onPress={() => setIsEditing(false)}
                          className={`rounded-full p-2 ${colorScheme === 'dark' ? 'bg-[#312728]' : 'bg-[#f4cdd0]'}`}>
                          <Ionicons name="close" size={24} color="#BA3B46" />
                        </Pressable>
                      </View>

                      <View>
                        <Text
                          className={` text-sm font-medium ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                          Username
                        </Text>
                        <TextInput
                          value={editedUsername}
                          onChangeText={(text) => {
                            setEditedUsername(text);
                            setUsernameChangeError(null);
                          }}
                          className={`rounded-xl border px-4 py-3 ${
                            colorScheme === 'dark'
                              ? 'border-[#9ca3af] bg-[#282828] text-[#9ca3af]'
                              : 'border-[#07020D] bg-[#f9f9f9] text-[#07020D]'
                          } ${!canChangeUsername() ? 'opacity-50' : ''}`}
                          placeholder="Enter username"
                          placeholderTextColor="#877B66"
                          textAlignVertical="center"
                          editable={canChangeUsername()}
                          pointerEvents={canChangeUsername() ? 'auto' : 'none'}
                        />
                        {!canChangeUsername() && (
                          <Text className="mt-2 text-sm text-[#BA3B46]">
                            You can change your username again on{' '}
                            {getNextUsernameChangeDate()?.toLocaleDateString()}
                          </Text>
                        )}
                      </View>

                      <View>
                        <Text
                          className={`mt-3 text-sm font-medium ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                          Bio
                        </Text>
                        <TextInput
                          value={editedBio}
                          onChangeText={setEditedBio}
                          className={`rounded-xl border px-4 py-3 ${colorScheme === 'dark' ? 'border-[#9ca3af] bg-[#282828] text-[#9ca3af]' : 'border-[#07020D] bg-[#f9f9f9] text-[#07020D]'}`}
                          placeholder="Tell us about yourself"
                          placeholderTextColor="#877B66"
                          numberOfLines={3}
                          textAlignVertical="center"
                        />
                      </View>

                      <Pressable
                        onPress={handleSaveProfile}
                        disabled={saving}
                        className={`mt-4 rounded-xl border-2 py-4 ${colorScheme === 'dark' ? 'border-[#259365] bg-[#26342e]' : 'border-[#259365] bg-[#c7e5d9]'} ${saving ? 'opacity-50' : ''}`}>
                        <Text className="text-center text-base font-semibold text-[#259365]">
                          {saving ? 'Saving...' : 'Save Changes'}
                        </Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View className="mt-2">
                      {/* Tab Navigation */}
                      <View className="mb-[-0.3rem] w-full flex-row">
                        <TabButton tab="posts" label="Posts" />
                        <TabButton tab="saved" label="Saved" />
                      </View>

                      {/* Posts Tab Content */}
                      {activeTab === 'posts' && (
                        <>
                          {allPosts.length > 0 ? (
                            <View className="-mx-6 flex-row flex-wrap">
                              {allPosts.map((post, index) => (
                                <View key={post.id} className="aspect-square w-1/3">
                                  <View
                                    className={`aspect-square border-b border-r ${
                                      index % 3 !== 2 ? 'border-r' : ''
                                    } ${colorScheme === 'dark' ? 'border-[#121113]' : 'border-[#E8E9EB]'}`}>
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
                                        router.push(
                                          `/post-detail?postId=${post.id}&userId=${profile?.id}`
                                        );
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
                              <ActivityIndicator size="small" color="#f77f5e" />
                            </View>
                          )}
                        </>
                      )}

                      {/* Saved Tab Content */}
                      {activeTab === 'saved' && (
                        <>
                          {savedPostsLoading ? (
                            <View className="w-full items-center py-4">
                              <ActivityIndicator size="small" color="#f77f5e" />
                            </View>
                          ) : savedPosts.length > 0 ? (
                            <View className="-mx-6 flex-row flex-wrap">
                              {savedPosts.map((savedPost, index) => (
                                <View key={savedPost.id} className="aspect-square w-1/3">
                                  <View
                                    className={`aspect-square border-b border-r ${
                                      index % 3 !== 2 ? 'border-r' : ''
                                    } ${colorScheme === 'dark' ? 'border-[#121113]' : 'border-[#E8E9EB]'}`}>
                                    <Image
                                      source={{
                                        uri: savedPost.posts.image_url,
                                      }}
                                      className="h-full w-full"
                                      resizeMode="cover"
                                    />
                                    <View className="absolute inset-0 bg-black/0 hover:bg-black/20" />
                                    <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2" />
                                    <Pressable
                                      onPress={() => {
                                        console.log('Saved post clicked:', savedPost.posts.id);
                                        console.log('Attempting to navigate to post detail...');
                                        router.push(
                                          `/post-detail?postId=${savedPost.posts.id}&userId=${savedPost.posts.profiles?.id}`
                                        );
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
                                No saved posts yet. Save posts you love to see them here!
                              </Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  )}
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Settings Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={settingsVisible}
        onRequestClose={closeSettings}>
        <View className="absolute inset-0">
          {/* Black overlay */}
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              opacity: opacityAnim,
            }}
          />
          <Animated.View
            style={{
              flex: 1,
              transform: [
                {
                  translateY: translateY.interpolate({
                    inputRange: [0, 1],
                    outputRange: [800, 0],
                  }),
                },
              ],
            }}
            className="mt-20 flex-1">
            <View
              className={`flex-1 rounded-t-[30px] ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-white'} p-6`}>
              {/* Header */}
              <View className="mb-8 flex-row items-center justify-between">
                <Text
                  className={`text-2xl font-bold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  Settings
                </Text>
                <Pressable
                  onPress={closeSettings}
                  className={`rounded-full p-2 ${colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-gray-100'}`}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                  />
                </Pressable>
              </View>

              <View className="flex-1 space-y-1">
                {/* Theme Toggle */}
                <Pressable
                  onPress={toggleColorScheme}
                  className={`flex-row items-center justify-between rounded-2xl p-4 ${
                    colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                  }`}>
                  <View className="flex-row items-center space-x-4">
                    <View
                      className={`rounded-full p-2 ${colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'}`}>
                      <Ionicons
                        name={isDarkColorScheme ? 'sunny' : 'moon'}
                        size={20}
                        color={colorScheme === 'dark' ? '#fbbf24' : '#6366f1'}
                      />
                    </View>
                    <View>
                      <Text
                        className={`text-base font-semibold ${
                          colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                        }`}>
                        {isDarkColorScheme ? 'Light Mode' : 'Dark Mode'}
                      </Text>
                      <Text
                        className={`text-sm ${
                          colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        Switch appearance
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colorScheme === 'dark' ? '#666' : '#999'}
                  />
                </Pressable>

                {/* Edit Profile Button */}
                <Pressable
                  onPress={() => {
                    setIsEditing(!isEditing);
                    closeSettings();
                  }}
                  className={`flex-row items-center justify-between rounded-2xl p-4 ${
                    colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                  }`}>
                  <View className="flex-row items-center space-x-4">
                    <View
                      className={`rounded-full p-2 ${colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'}`}>
                      <Ionicons name="create" size={20} color="#f77f5e" />
                    </View>
                    <View>
                      <Text
                        className={`text-base font-semibold ${
                          colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                        }`}>
                        {isEditing ? 'Cancel Editing' : 'Edit Profile'}
                      </Text>
                      <Text
                        className={`text-sm ${
                          colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        Change your profile info
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colorScheme === 'dark' ? '#666' : '#999'}
                  />
                </Pressable>

                {/* Blocked Users */}
                <Pressable
                  onPress={() => {
                    closeSettings();
                    router.push('/blockedUsers');
                  }}
                  className={`flex-row items-center justify-between rounded-2xl p-4 ${
                    colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                  }`}>
                  <View className="flex-row items-center space-x-4">
                    <View
                      className={`rounded-full p-2 ${colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'}`}>
                      <Ionicons name="ban" size={20} color="#EF4444" />
                    </View>
                    <View>
                      <Text
                        className={`text-base font-semibold ${
                          colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                        }`}>
                        Blocked Users
                      </Text>
                      <Text
                        className={`text-sm ${
                          colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        Manage blocked accounts
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colorScheme === 'dark' ? '#666' : '#999'}
                  />
                </Pressable>

                {/* Divider */}
                <View className="my-4 h-px bg-gray-200 dark:bg-gray-700" />

                {/* Log Out */}
                <Pressable
                  onPress={handleLogout}
                  className={`flex-row items-center justify-between rounded-2xl p-4 ${
                    colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                  }`}>
                  <View className="flex-row items-center space-x-4">
                    <View
                      className={`rounded-full p-2 ${colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'}`}>
                      <Ionicons name="log-out" size={20} color="#BA3B46" />
                    </View>
                    <View>
                      <Text
                        className={`text-base font-semibold ${
                          colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                        }`}>
                        Log Out
                      </Text>
                      <Text
                        className={`text-sm ${
                          colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        Sign out of your account
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colorScheme === 'dark' ? '#666' : '#999'}
                  />
                </Pressable>

                {/* Delete Account */}
                <Pressable
                  onPress={handleDeleteAccount}
                  disabled={deleting}
                  className={`flex-row items-center justify-between rounded-2xl p-4 ${
                    colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-50'
                  } ${deleting ? 'opacity-50' : ''}`}>
                  <View className="flex-row items-center space-x-4">
                    <View
                      className={`rounded-full p-2 ${colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'}`}>
                      <Ionicons name="trash" size={20} color="#BA3B46" />
                    </View>
                    <View>
                      <Text
                        className={`text-base font-semibold ${
                          colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                        }`}>
                        {deleting ? 'Deleting Account...' : 'Delete Account'}
                      </Text>
                      <Text
                        className={`text-sm ${
                          colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                        Permanently delete your account
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={colorScheme === 'dark' ? '#666' : '#999'}
                  />
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
