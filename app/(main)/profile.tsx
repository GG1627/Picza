import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const [settingsVisible, setSettingsVisible] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Settings Button */}
      <Pressable
        onPress={() => setSettingsVisible(true)}
        className="absolute right-4 top-12 z-10 rounded-full bg-gray-100 p-3">
        <Ionicons name="settings-outline" size={24} color="#374151" />
      </Pressable>

      {/* Main Profile Content */}
      <View className="flex-1 items-center justify-center">
        <Text className="text-xl font-semibold text-gray-900">Profile</Text>
        <Text className="mt-2 text-gray-600">Your profile information will appear here</Text>
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
