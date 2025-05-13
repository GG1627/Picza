import { useRouter } from 'expo-router';
import * as React from 'react';
import { View, Text, Pressable } from 'react-native';

function LogOut() {
  const router = useRouter();
  router.replace('/(auth)/login');
}

export default function Home() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-2xl font-bold text-black">Home Screen</Text>
      <Pressable
        className="mt-4 w-[5rem] items-center justify-center rounded bg-black py-3"
        onPress={LogOut}>
        <Text className="text-white">Log Out</Text>
      </Pressable>
    </View>
  );
}
