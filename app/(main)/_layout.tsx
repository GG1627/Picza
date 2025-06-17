import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useColorScheme } from '../../lib/useColorScheme';

export default function MainLayout() {
  const { colorScheme } = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colorScheme === 'dark' ? '#E0E0E0' : '#121113',
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#666666' : '#9ca3af',
        tabBarStyle: {
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderLeftWidth: 1,
          borderRightWidth: 1,
          backgroundColor:
            colorScheme === 'dark' ? 'rgba(18, 17, 19, 0.5)' : 'rgba(224, 224, 224, 0.3)',
          height: Platform.OS === 'ios' ? 75 : 55,
          paddingBottom: Platform.OS === 'ios' ? 20 : 5,
          paddingTop: 10,
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          elevation: 0,
          borderRadius: 40,
          marginHorizontal: 20,
          backdropFilter: 'blur(10px)',
          borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)',
          shadowColor: colorScheme === 'dark' ? '#000' : '#000',
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowRadius: 3,
          shadowOpacity: 0.1,
        },
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#121113' : 'white',
        },
        headerTitleStyle: {
          color: colorScheme === 'dark' ? '#E0E0E0' : '#1f2937',
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="create-post"
        options={{
          title: 'Post',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'add-circle' : 'add-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="competitions"
        options={{
          title: 'Compete',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'trophy' : 'trophy-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
