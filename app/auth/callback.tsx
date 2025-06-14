import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StatusBar, Linking } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useColorScheme } from '../../lib/useColorScheme';
import { LinearGradient } from 'expo-linear-gradient';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colorScheme } = useColorScheme();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('Auth callback started');
        console.log('URL params:', params);

        // Get the current URL
        const url = await Linking.getInitialURL();
        console.log('Current URL:', url);

        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        if (url) {
          // Parse the URL to get the tokens
          const urlObj = new URL(url);
          accessToken = urlObj.searchParams.get('access_token');
          refreshToken = urlObj.searchParams.get('refresh_token');
          console.log('Tokens from URL:', { accessToken, refreshToken });
        } else {
          // Try to get tokens from params
          accessToken = params.access_token as string;
          refreshToken = params.refresh_token as string;
          console.log('Tokens from params:', { accessToken, refreshToken });
        }

        if (!accessToken || !refreshToken) {
          console.log('No tokens found, checking existing session');
          const {
            data: { session },
            error: sessionError,
          } = await supabase.auth.getSession();

          if (sessionError) {
            console.error('Error getting session:', sessionError);
            throw sessionError;
          }

          if (!session) {
            console.log('No session found, redirecting to login');
            router.replace('/(auth)/login');
            return;
          }

          // If we have a session, use it
          accessToken = session.access_token;
          refreshToken = session.refresh_token;
        }

        // Set the session with the tokens we found
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('Error setting session:', sessionError);
          throw sessionError;
        }

        // Get the user to check if we need to create a profile
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error('Error getting user:', userError);
          throw userError;
        }

        console.log('User data:', user);

        if (!user) {
          console.log('No user found, redirecting to login');
          router.replace('/(auth)/login');
          return;
        }

        if (user?.user_metadata) {
          console.log('User has metadata, redirecting to profile creation');
          router.replace('/(auth)/create-profile');
        } else {
          console.log('No user metadata, redirecting to feed');
          router.replace('/(main)/feed');
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, []);

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
      <View className="items-center space-y-4">
        {loading ? (
          <>
            <ActivityIndicator size="large" color="#f77f5e" />
            <Text
              className={`text-lg ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
              Verifying your email...
            </Text>
          </>
        ) : error ? (
          <>
            <Text
              className={`text-lg font-semibold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
              Verification Error
            </Text>
            <Text
              className={`text-center ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
              {error}
            </Text>
            <Text
              className={`mt-4 text-center ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
              Please try signing up again.
            </Text>
          </>
        ) : (
          <>
            <Text
              className={`text-lg font-semibold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
              Email Verified!
            </Text>
            <Text
              className={`text-center ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
              Redirecting you to the app...
            </Text>
          </>
        )}
      </View>
    </View>
  );
}
