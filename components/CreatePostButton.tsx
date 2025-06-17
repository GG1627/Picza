import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

export default function CreatePostButton() {
  const router = useRouter();

  return (
    <View className="absolute bottom-24 right-3">
      <TouchableOpacity
        onPress={() => router.push('/create-post')}
        className="h-16 w-16 items-center justify-center rounded-full">
        <LinearGradient
          colors={['#5070fd', '#2f4ccc']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="absolute inset-0 rounded-full"
        />
        <View className="absolute inset-0 rounded-full bg-white opacity-10" />
        <View className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
        <Ionicons name="add" size={32} color="white" />
      </TouchableOpacity>
    </View>
  );
}
