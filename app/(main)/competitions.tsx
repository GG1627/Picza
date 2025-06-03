import { View, Text, StatusBar } from 'react-native';
import { useColorScheme } from '../../lib/useColorScheme';

export default function CompetitionsScreen() {
  const { colorScheme } = useColorScheme();
  return (
    <View className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Title Section */}
      <View className="mb-16 mt-16 px-6">
        <Text
          className={`text-center text-4xl font-bold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Let's Compete!
        </Text>
        <Text
          className={`mt-2 text-center text-lg ${colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          Challenge yourself against others
        </Text>
      </View>

      {/* Competition Boxes Container */}
      <View className="flex-1 px-6">
        {/* Box 1 */}
        <View
          className={`mb-8 h-40 w-full items-center justify-center rounded-2xl ${
            colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
          <Text
            className={`text-xl font-semibold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Competition 1
          </Text>
        </View>

        {/* Box 2 */}
        <View
          className={`mb-8 h-40 w-full items-center justify-center rounded-2xl ${
            colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
          <Text
            className={`text-xl font-semibold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Competition 2
          </Text>
        </View>

        {/* Box 3 */}
        <View
          className={`h-40 w-full items-center justify-center rounded-2xl ${
            colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
          <Text
            className={`text-xl font-semibold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Competition 3
          </Text>
        </View>
      </View>
    </View>
  );
}
