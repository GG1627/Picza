import { View, Text, StatusBar } from 'react-native';
import { useColorScheme } from '../../lib/useColorScheme';

export default function CompetitionsScreen() {
  const { colorScheme } = useColorScheme();
  return (
    <View
      className={`flex-1 items-center justify-center ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <Text
        className={`text-xl font-semibold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'} `}>
        Compete
      </Text>
      <Text
        className={`mt-2 text-gray-600 ${colorScheme === 'dark' ? 'text-white' : 'text-gray-600'} `}>
        Join food competitions here
      </Text>
      <Text className="mt-2 text-center text-gray-600">Big ole caitlins page</Text>
    </View>
  );
}
