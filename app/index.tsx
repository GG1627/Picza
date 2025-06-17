import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import Logo from '../images/logo.svg';
import { useColorScheme } from '../lib/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { loadFonts } from '../lib/fonts';
import MeshGradient from '../components/MeshGradient';

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

        if (error || !session) {
          console.log('No active session, redirecting to login');
          router.replace('/(auth)/login');
          return;
        }

        // Check if user has verified their email
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          console.log('Session expired or invalid, redirecting to login');
          router.replace('/(auth)/login');
          return;
        }

        // If email is not verified, go to login
        if (!user?.email_confirmed_at) {
          console.log('Email not verified, redirecting to login');
          router.replace('/(auth)/login');
          return;
        }

        // Check if user has a profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError || !profile) {
          console.log('No profile found, redirecting to login');
          router.replace('/(auth)/login');
          return;
        }

        // User is verified, has a session, and has a profile, allow access to the app
        console.log('Logged in as:', session.user.email);
        router.replace('/(main)/feed');
      } catch (error) {
        console.error('Unexpected error:', error);
        router.replace('/(auth)/login');
      }
    };

    // Add a small delay for better UX
    const timer = setTimeout(prepare, 850);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        },
        colorScheme === 'dark' ? { backgroundColor: '#0a0a0a' } : {},
      ]}>
      <StatusBar hidden={true} />
      {colorScheme !== 'dark' && <MeshGradient intensity={40} />}
      <MaskedView
        style={{ width: 160, height: 160, marginTop: -100 }}
        maskElement={<Logo width={160} height={160} fill="white" />}>
        <LinearGradient
          colors={
            colorScheme === 'dark'
              ? ['#fa6f48', '#fa6f48', '#ffcf99', '#ffcf99', '#ffcf99']
              : ['black', 'black', '#1c1c1c', '#1c1c1c', '#1c1c1c']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          locations={[0, 0.2, 0.7, 0.8, 1]}
          style={{ flex: 1 }}
        />
      </MaskedView>
    </View>
  );
}
