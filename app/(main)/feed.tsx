import { View, Text } from 'react-native';

export default function FeedScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-semibold text-gray-900">Feed Screen</Text>
      <Text className="mt-2 text-gray-600">Your food feed will appear here</Text>
    </View>
  );
}
