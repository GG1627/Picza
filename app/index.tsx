import { useEffect } from 'react';
import { View, Text, ActivityIndicator, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Error checking session:', error.message);
          router.replace('/(auth)/login');
          return;
        }

        if (session) {
          console.log('Logged in as:', session.user.email);
          router.replace('/(main)/feed');
        } else {
          console.log('No active session, redirecting to login');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        router.replace('/(auth)/login');
      }
    };

    // Add a small delay for better UX
    const timer = setTimeout(checkSession, 700);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-[#ffddc1]">
      <StatusBar hidden={true} />
      <Image source={require('../images/logo.png')} className="h-32 w-32" resizeMode="contain" />
      <Text className="text-[5rem] font-bold text-black">Picza</Text>
      {/* <ActivityIndicator size="large" color="#000" className="mt-4" /> */}
    </View>
  );
}
