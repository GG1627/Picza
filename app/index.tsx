import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import Logo from '../images/logo.svg';
import { useColorScheme } from '../lib/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { loadFonts } from '../lib/fonts';

export default function SplashScreen() {
  const router = useRouter();
  const { colorScheme, colors } = useColorScheme();
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const prepare = async () => {
      try {
        // Load fonts
        await loadFonts();
        setFontsLoaded(true);

        // Check session
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error('Error checking session:', error.message);
          router.replace('/(auth)/login');
          return;
        }

        if (!session) {
          console.log('No active session, redirecting to login');
          router.replace('/(auth)/login');
          return;
        }

        // Check if user has verified their email
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error('Error getting user:', userError);
          router.replace('/(auth)/login');
          return;
        }

        // If email is not verified, go to login
        if (!user?.email_confirmed_at) {
          console.log('Email not verified, redirecting to login');
          router.replace('/(auth)/login');
          return;
        }

        // User is verified and has a session, allow access to the app
        console.log('Logged in as:', session.user.email);
        router.replace('/(main)/feed');
      } catch (error) {
        console.error('Unexpected error:', error);
        router.replace('/(auth)/login');
      }
    };

    // Add a small delay for better UX
    const timer = setTimeout(prepare, 700);
    return () => clearTimeout(timer);
  }, []);

  // if (!fontsLoaded) {
  //   return (
  //     <View
  //       className={`flex-1 items-center justify-center ${colorScheme === 'dark' ? 'bg-[#121113]' : ''}`}>
  //       <ActivityIndicator size="large" color="#5070fd" />
  //     </View>
  //   );
  // }

  return (
    <View
      className={`flex-1 items-center justify-center ${colorScheme === 'dark' ? 'bg-[#121113]' : ''}`}>
      <StatusBar hidden={true} />
      {colorScheme !== 'dark' && (
        <View className="absolute inset-0">
          <LinearGradient
            colors={['#fa6f48', '#ffcf99']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ flex: 1 }}
          />
        </View>
      )}
      <MaskedView
        style={{ width: 160, height: 160, marginTop: -100 }}
        maskElement={<Logo width={160} height={160} fill="white" />}>
        <LinearGradient
          colors={
            colorScheme === 'dark'
              ? ['#fa6f48', '#ff6e6a', '#f77f5e', '#ffb76a', '#ffb76a'] // #f77f5e
              : ['black', 'black', '#1c1c1c', '#1c1c1c', '#1c1c1c']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.2, 0.6, 0.8, 1]}
          style={{ flex: 1 }}
        />
      </MaskedView>
    </View>
  );
}
