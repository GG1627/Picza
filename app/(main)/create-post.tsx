import { View, Text } from 'react-native';

export default function CreatePostScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-semibold text-gray-900">Create Post</Text>
      <Text className="mt-2 text-gray-600">Share your food moments here</Text>
    </View>
  );
}
