import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { useColorScheme } from '../lib/useColorScheme';

export default function VerifyEmail() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { colorScheme } = useColorScheme();

  useEffect(() => {
    async function verifyEmail() {
      try {
        // Get the access token from the URL
        const accessToken = params.access_token as string;
        const refreshToken = params.refresh_token as string;

        if (!accessToken || !refreshToken) {
          throw new Error('Missing tokens');
        }

        // Set the session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          throw sessionError;
        }

        // Get the user's data
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (user?.user_metadata?.school_id) {
          // Redirect to profile creation with school data
          router.replace({
            pathname: '/(auth)/create-profile',
            params: {
              schoolId: user.user_metadata.school_id,
              schoolName: user.user_metadata.school_name,
            },
          });
        } else {
          throw new Error('Missing school information');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError('Failed to verify email. Please try again.');
      } finally {
        setVerifying(false);
      }
    }

    verifyEmail();
  }, [params]);

  return (
    <View
      className={`flex-1 items-center justify-center ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
      {verifying ? (
        <>
          <ActivityIndicator size="large" color="#f77f5e" />
          <Text
            className={`mt-4 text-lg ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
            Verifying your email...
          </Text>
        </>
      ) : error ? (
        <>
          <Text
            className={`text-lg font-semibold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
            {error}
          </Text>
          <Text className={`mt-4 text-[#f77f5e]`} onPress={() => router.replace('/(auth)/login')}>
            Return to login
          </Text>
        </>
      ) : null}
    </View>
  );
}
