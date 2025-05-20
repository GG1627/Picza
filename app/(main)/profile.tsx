import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Image,
  TextInput,
  ScrollView,
  Animated,
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

type Profile = {
  username: string;
  full_name: string;
  created_at: string;
  avatar_url: string | null;
  bio: string | null;
};

export default function ProfileScreen() {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [editedFullName, setEditedFullName] = useState('');
  const [editedBio, setEditedBio] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const { colorScheme, toggleColorScheme, isDarkColorScheme } = useColorScheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const translateY = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setEditedUsername(profile.username);
      setEditedFullName(profile.full_name);
      setEditedBio(profile.bio || '');
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, created_at, avatar_url, bio')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
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

      const filePath = `${user.id}/${new Date().getTime()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, decode(base64Image), {
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleSaveProfile = async () => {
    if (!editedUsername || !editedFullName) {
      alert('Please fill in all required fields');
      return;
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

      const { error } = await supabase
        .from('profiles')
        .update({
          username: editedUsername,
          full_name: editedFullName,
          bio: editedBio,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await fetchProfile();
      setIsEditing(false);
      setNewImage(null);
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

              // Delete user's avatar from storage if it exists
              if (profile?.avatar_url) {
                const avatarPath = profile.avatar_url.split('/').pop();
                if (avatarPath) {
                  await supabase.storage.from('avatars').remove([`${user.id}/${avatarPath}`]);
                }
              }

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
        toValue: 0.85,
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
        toValue: 1,
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F1E9DB]">
        <ActivityIndicator size="large" color="#5DB7DE" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Animated.View
        style={{
          flex: 1,
          transform: [{ scale: scaleAnim }],
          borderRadius: scaleAnim.interpolate({
            inputRange: [0.85, 1],
            outputRange: [30, 0],
          }),
          overflow: 'hidden',
          opacity: scaleAnim.interpolate({
            inputRange: [0.85, 1],
            outputRange: [0.7, 1],
          }),
        }}
        className={`${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
        {/* Header */}
        <View className="mt-16 flex-row items-center justify-between px-6">
          <Text
            className={`text-2xl font-bold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
            Profile
          </Text>
          <Pressable
            onPress={openSettings}
            className={`rounded-full ${colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white/80'} p-2 shadow-sm`}>
            <Ionicons
              name="settings-outline"
              size={24}
              color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
            />
          </Pressable>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-6">
            {/* Profile Header */}
            <View className="mt-6 items-center">
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

              <View className="mt-4 items-center">
                <Text
                  className={`text-2xl font-bold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  {profile?.full_name}
                </Text>
                <Text
                  className={`text-base ${colorScheme === 'dark' ? 'text-[#b3b3b3]' : 'text-[#07020D]'}`}>
                  @{profile?.username}
                </Text>
              </View>

              {!isEditing && profile?.bio && (
                <Text
                  className={`mt-2 text-center text-base ${colorScheme === 'dark' ? 'text-[#b3b3b3]' : 'text-[#07020D]'}`}>
                  {profile.bio}
                </Text>
              )}

              <Pressable
                onPress={() => setIsEditing(!isEditing)}
                className="mt-4 rounded-xl bg-[#F00511] px-6 py-2">
                <Text className="font-semibold text-white">
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </Text>
              </Pressable>
            </View>

            {/* Profile Information */}
            {isEditing ? (
              <View className="mt-8 space-y-6">
                <View>
                  <Text className="mb-2 text-sm font-medium text-[#07020D]">Username</Text>
                  <TextInput
                    value={editedUsername}
                    onChangeText={setEditedUsername}
                    className="rounded-xl border border-[#5DB7DE] bg-white px-4 py-3 text-base text-[#07020D]"
                    placeholder="Enter username"
                    placeholderTextColor="#877B66"
                  />
                </View>

                <View>
                  <Text className="mb-2 text-sm font-medium text-[#07020D]">Full Name</Text>
                  <TextInput
                    value={editedFullName}
                    onChangeText={setEditedFullName}
                    className="rounded-xl border border-[#5DB7DE] bg-white px-4 py-3 text-base text-[#07020D]"
                    placeholder="Enter full name"
                    placeholderTextColor="#877B66"
                  />
                </View>

                <View>
                  <Text className="mb-2 text-sm font-medium text-[#07020D]">Bio</Text>
                  <TextInput
                    value={editedBio}
                    onChangeText={setEditedBio}
                    className="rounded-xl border border-[#5DB7DE] bg-white px-4 py-3 text-base text-[#07020D]"
                    placeholder="Tell us about yourself"
                    placeholderTextColor="#877B66"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>

                <Pressable
                  onPress={handleSaveProfile}
                  disabled={saving}
                  className={`mt-4 rounded-xl bg-[#BA3B46] py-4 ${saving ? 'opacity-50' : ''}`}>
                  <Text className="text-center text-base font-semibold text-white">
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View className="mt-8 space-y-6">
                <View
                  className={`rounded-2xl ${colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white/80'} p-6 shadow-sm`}>
                  <View className="space-y-4">
                    <View>
                      <Text className="text-sm font-medium text-[#8c8c8c]">Member Since</Text>
                      <Text className="mt-1 text-base text-[#07020D]">
                        {profile?.created_at
                          ? new Date(profile.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'N/A'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Black background overlay */}
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'black',
          opacity: opacityAnim,
          zIndex: -1,
        }}
      />

      {/* Settings Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={settingsVisible}
        onRequestClose={closeSettings}>
        <View className="absolute inset-0">
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
              className={`flex-1 rounded-t-[30px] ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'} p-6`}>
              <View className="mb-6 flex-row items-center justify-between">
                <Text
                  className={`text-xl font-semibold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  Settings
                </Text>
                <Pressable
                  onPress={closeSettings}
                  className={`rounded-full ${colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white/80'} p-2`}>
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
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'border-[#b1b9c8] bg-white/80'
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

                <Pressable
                  onPress={handleLogout}
                  className={`flex-row items-center space-x-3 border border-t-0 ${
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'border-[#b1b9c8] bg-white/80'
                  } p-4`}>
                  <Ionicons name="log-out-outline" size={24} color="#BA3B46" />
                  <Text className="text-base font-medium text-[#BA3B46]">Log Out</Text>
                </Pressable>

                <Pressable
                  onPress={handleDeleteAccount}
                  disabled={deleting}
                  className={`flex-row items-center space-x-3 border border-t-0 ${
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'border-[#b1b9c8] bg-white/80'
                  } p-4 ${deleting ? 'opacity-50' : ''}`}>
                  <Ionicons name="trash-outline" size={24} color="#BA3B46" />
                  <Text className="text-base font-medium text-[#BA3B46]">
                    {deleting ? 'Deleting Account...' : 'Delete Account'}
                  </Text>
                </Pressable>

                <Pressable
                  className={`flex-row items-center space-x-3 border border-t-0 ${
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'border-[#b1b9c8] bg-white/80'
                  } p-4 ${deleting ? 'opacity-50' : ''}`}>
                  <Text className="text-base font-medium text-[#000000]">Placeholder</Text>
                </Pressable>
                <Pressable
                  className={`flex-row items-center space-x-3 border border-t-0 ${
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'border-[#b1b9c8] bg-white/80'
                  } p-4 ${deleting ? 'opacity-50' : ''}`}>
                  <Text className="text-base font-medium text-[#000000]">Placeholder</Text>
                </Pressable>
                <Pressable
                  className={`flex-row items-center space-x-3 border border-t-0 ${
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'border-[#b1b9c8] bg-white/80'
                  } p-4 ${deleting ? 'opacity-50' : ''}`}>
                  <Text className="text-base font-medium text-[#000000]">Placeholder</Text>
                </Pressable>
                <Pressable
                  className={`flex-row items-center space-x-3 border border-t-0 ${
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'border-[#b1b9c8] bg-white/80'
                  } p-4 ${deleting ? 'opacity-50' : ''}`}>
                  <Text className="text-base font-medium text-[#000000]">Placeholder</Text>
                </Pressable>
                <Pressable
                  className={`flex-row items-center space-x-3 border border-t-0 ${
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'border-[#b1b9c8] bg-white/80'
                  } p-4 ${deleting ? 'opacity-50' : ''}`}>
                  <Text className="text-base font-medium text-[#000000]">Placeholder</Text>
                </Pressable>
                <Pressable
                  className={`flex-row items-center space-x-3 border border-t-0 ${
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'border-[#b1b9c8] bg-white/80'
                  } p-4 ${deleting ? 'opacity-50' : ''}`}>
                  <Text className="text-base font-medium text-[#000000]">Placeholder</Text>
                </Pressable>
                <Pressable
                  className={`flex-row items-center space-x-3 border border-t-0 ${
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'border-[#b1b9c8] bg-white/80'
                  } p-4 ${deleting ? 'opacity-50' : ''}`}>
                  <Text className="text-base font-medium text-[#000000]">Placeholder</Text>
                </Pressable>
                <Pressable
                  className={`flex-row items-center space-x-3 rounded-b-3xl border border-t-0 ${
                    colorScheme === 'dark' ? 'bg-[#282828]' : 'border-[#b1b9c8] bg-white/80'
                  } p-4 ${deleting ? 'opacity-50' : ''}`}>
                  <Text className="text-base font-medium text-[#000000]">Placeholder</Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}
