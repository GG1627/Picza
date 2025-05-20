import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import Logo from '../images/logo.svg';
import { useColorScheme } from '../lib/useColorScheme';

export default function SplashScreen() {
  const router = useRouter();
  const { colorScheme, colors } = useColorScheme();

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
    <View
      className={`flex-1 items-center justify-center ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#F00511]'}`}>
      <StatusBar hidden={true} />
      <Logo width={160} height={160} fill={colorScheme === 'dark' ? '#F00511' : '#E0E0E0'} />
      {/* <Text className="text-[5rem] font-bold text-black">Picza</Text> */}
      {/* <ActivityIndicator size="large" color="#000" className="mt-4" /> */}
    </View>
  );
}
