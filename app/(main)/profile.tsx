import { View, Text, Pressable, ActivityIndicator, Image, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Alert } from 'react-native';

type Profile = {
  username: string;
  full_name: string;
  created_at: string;
  avatar_url: string | null;
};

export default function ProfileScreen() {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState('');
  const [editedFullName, setEditedFullName] = useState('');
  const [newImage, setNewImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profile) {
      setEditedUsername(profile.username);
      setEditedFullName(profile.full_name);
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
        .select('username, full_name, created_at, avatar_url')
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
      alert('Please fill in all fields');
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#FFB38A" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Settings Button */}
      <Pressable
        onPress={() => setSettingsVisible(true)}
        className="absolute right-4 top-12 z-10 rounded-full bg-gray-100 p-3">
        <Ionicons name="settings-outline" size={24} color="#374151" />
      </Pressable>

      {/* Main Profile Content */}
      <View className="flex-1 px-6">
        <View className="mt-16 flex-row items-center justify-between">
          <View>
            <Text className="text-3xl font-bold text-gray-900">Profile</Text>
            <Text className="mt-2 text-base text-gray-600">Your personal information</Text>
          </View>
          <Pressable
            onPress={() => setIsEditing(!isEditing)}
            className="mt-8 rounded-xl bg-gray-100 px-4 py-2.5">
            <Text className="font-medium text-gray-700">
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </Text>
          </Pressable>
        </View>

        <View className="mt-8 space-y-6">
          {/* Profile Avatar */}
          <View className="items-center">
            <Pressable
              onPress={isEditing ? pickImage : undefined}
              className={`h-32 w-32 items-center justify-center rounded-full bg-gray-100 ${
                isEditing ? 'opacity-90' : ''
              }`}>
              {newImage || profile?.avatar_url ? (
                <Image
                  source={{ uri: newImage || profile?.avatar_url || '' }}
                  className="h-32 w-32 rounded-full"
                />
              ) : (
                <View className="items-center">
                  <Ionicons name="person-outline" size={48} color="#6B7280" />
                </View>
              )}
              {isEditing && (
                <View className="absolute inset-0 items-center justify-center rounded-full bg-black/30">
                  <Ionicons name="camera" size={32} color="white" />
                </View>
              )}
            </Pressable>
          </View>

          {/* Profile Information */}
          <View className="rounded-2xl bg-gray-50 p-6">
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-500">Username</Text>
                {isEditing ? (
                  <TextInput
                    value={editedUsername}
                    onChangeText={setEditedUsername}
                    className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-lg text-gray-900"
                    placeholder="Enter username"
                  />
                ) : (
                  <Text className="mt-1 text-lg text-gray-900">{profile?.username}</Text>
                )}
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-500">Full Name</Text>
                {isEditing ? (
                  <TextInput
                    value={editedFullName}
                    onChangeText={setEditedFullName}
                    className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-lg text-gray-900"
                    placeholder="Enter full name"
                  />
                ) : (
                  <Text className="mt-1 text-lg text-gray-900">{profile?.full_name}</Text>
                )}
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-500">Member Since</Text>
                <Text className="mt-1 text-lg text-gray-900">
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

          {/* Save Button */}
          {isEditing && (
            <Pressable
              onPress={handleSaveProfile}
              disabled={saving}
              className={`rounded-xl bg-[#FFB38A] py-4 ${saving ? 'opacity-50' : ''}`}>
              <Text className="text-center text-base font-semibold text-white">
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={settingsVisible}
        onRequestClose={() => setSettingsVisible(false)}>
        <View className="flex-1 justify-end bg-black/50">
          <View className="rounded-t-3xl bg-white p-6">
            {/* Modal Header */}
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-xl font-semibold text-gray-900">Settings</Text>
              <Pressable
                onPress={() => setSettingsVisible(false)}
                className="rounded-full bg-gray-100 p-2">
                <Ionicons name="close" size={24} color="#374151" />
              </Pressable>
            </View>

            {/* Settings Options */}
            <View className="space-y-3">
              <Pressable
                onPress={handleLogout}
                className="flex-row items-center space-x-3 rounded-xl bg-red-50 p-4">
                <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                <Text className="text-base font-medium text-red-500">Log Out</Text>
              </Pressable>

              <Pressable
                onPress={handleDeleteAccount}
                disabled={deleting}
                className={`flex-row items-center space-x-3 rounded-xl bg-red-50 p-4 ${
                  deleting ? 'opacity-50' : ''
                }`}>
                <Ionicons name="trash-outline" size={24} color="#EF4444" />
                <Text className="text-base font-medium text-red-500">
                  {deleting ? 'Deleting Account...' : 'Delete Account'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
