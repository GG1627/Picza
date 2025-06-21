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
import { uploadToCloudinary } from '../../lib/cloudinary';
import { getCompetitionTag } from '../../lib/competitionTags';
import MeshGradient from '../../components/MeshGradient';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled) {
        setNewImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Error selecting image. Please try again.');
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

              // Delete user's profile
              const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);

              if (profileError) throw profileError;

              // Sign out the user
              const { error: signOutError } = await supabase.auth.signOut();
              if (signOutError) throw signOutError;

              // Redirect to login
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error deleting account:', error);
              alert('Error deleting account. Please try again.');
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
                          0
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
                        <View className="items-center justify-center py-8">
                          <Text
                            className={`text-center text-base ${
                              colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                            }`}>
                            Saved posts feature coming soon!
                          </Text>
                        </View>
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
              backgroundColor: '',
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
              className={`flex-1 rounded-t-[30px] ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#E8E9EB]'} p-6`}>
              <View className="mb-6 flex-row items-center justify-between">
                <Text
                  className={`text-xl font-semibold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  Settings
                </Text>
                <Pressable
                  onPress={closeSettings}
                  className={`rounded-full ${colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-[#E8E9EB]'} p-2`}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                  />
                </Pressable>
              </View>

              <View className="flex-1 space-y-3">
                {/* Theme Toggle */}
                <Pressable
                  onPress={toggleColorScheme}
                  className={`flex-row items-center space-x-3 rounded-t-3xl border ${
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'border-[#b1b9c8] bg-[#E8E9EB]'
                  } p-4`}>
                  <Ionicons
                    name={isDarkColorScheme ? 'sunny-outline' : 'moon-outline'}
                    size={24}
                    color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                  />
                  <Text
                    className={`text-base font-medium ${
                      colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                    }`}>
                    {isDarkColorScheme ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  </Text>
                </Pressable>

                {/* Edit Profile Button */}
                <Pressable
                  onPress={() => {
                    setIsEditing(!isEditing);
                    closeSettings();
                  }}
                  className={`flex-row items-center space-x-3 border border-t-0 ${
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'border-[#b1b9c8] bg-[#E8E9EB]'
                  } p-4`}>
                  <Ionicons
                    name="create-outline"
                    size={24}
                    color={colorScheme === 'dark' ? '#f77f5e' : '#f77f5e'}
                  />
                  <Text
                    className={`text-base font-medium ${
                      colorScheme === 'dark' ? 'text-[#f77f5e]' : 'text-[#f77f5e]'
                    }`}>
                    {isEditing ? 'Cancel Editing' : 'Edit Profile'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={handleLogout}
                  className={`flex-row items-center space-x-3 border border-t-0 ${
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'border-[#b1b9c8] bg-[#E8E9EB]'
                  } p-4`}>
                  <Ionicons name="log-out-outline" size={24} color="#BA3B46" />
                  <Text className="text-base font-medium text-[#BA3B46]">Log Out</Text>
                </Pressable>

                <Pressable
                  onPress={handleDeleteAccount}
                  disabled={deleting}
                  className={`flex-row items-center space-x-3 border border-t-0 ${
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'border-[#b1b9c8] bg-[#E8E9EB]'
                  } p-4 ${deleting ? 'opacity-50' : ''}`}>
                  <Ionicons name="trash-outline" size={24} color="#BA3B46" />
                  <Text className="text-base font-medium text-[#BA3B46]">
                    {deleting ? 'Deleting Account...' : 'Delete Account'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
