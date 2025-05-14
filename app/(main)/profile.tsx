import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

type Profile = {
  username: string;
  full_name: string;
  created_at: string;
};

export default function ProfileScreen() {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('profiles')
        .select('username, full_name, created_at')
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

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
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
        <View className="mt-16">
          <Text className="text-3xl font-bold text-gray-900">Profile</Text>
          <Text className="mt-2 text-base text-gray-600">Your personal information</Text>
        </View>

        <View className="mt-8 space-y-6">
          {/* Profile Information */}
          <View className="rounded-2xl bg-gray-50 p-6">
            <View className="space-y-4">
              <View>
                <Text className="text-sm font-medium text-gray-500">Username</Text>
                <Text className="mt-1 text-lg text-gray-900">{profile?.username}</Text>
              </View>

              <View>
                <Text className="text-sm font-medium text-gray-500">Full Name</Text>
                <Text className="mt-1 text-lg text-gray-900">{profile?.full_name}</Text>
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
            <Pressable
              onPress={handleLogout}
              className="flex-row items-center space-x-3 rounded-xl bg-red-50 p-4">
              <Ionicons name="log-out-outline" size={24} color="#EF4444" />
              <Text className="text-base font-medium text-red-500">Log Out</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
