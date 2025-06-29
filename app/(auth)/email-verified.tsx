import { useState, useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../../lib/useColorScheme';
import { supabase } from '../../lib/supabase';
import MeshGradient from '../../components/MeshGradient';

export default function EmailVerified() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const [countdown, setCountdown] = useState(2);
  const hasNavigated = useRef(false);

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(
        'Auth state change in email-verified:',
        event,
        session ? 'Session exists' : 'No session'
      );

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user && !hasNavigated.current) {
          hasNavigated.current = true;

          try {
            // Extract school information from user metadata
            const schoolId = session.user.user_metadata?.school_id;
            const schoolName = session.user.user_metadata?.school_name;
            const email = session.user.user_metadata?.email;
            const password = session.user.user_metadata?.password;

            // Navigate to create profile with school information
            router.replace({
              pathname: '/(auth)/create-profile',
              params: {
                schoolId: schoolId,
                schoolName: schoolName,
                email: email,
                password: password,
              },
            });
          } catch (error) {
            console.error('Error navigating to create profile:', error);
            router.replace('/(auth)/create-profile');
          }
        }
      }
    });

    // Fallback navigation timer (in case auth state change doesn't fire)
    const navigationTimer = setTimeout(async () => {
      if (!hasNavigated.current) {
        hasNavigated.current = true;

        try {
          // Try to get the current session
          const {
            data: { session },
            error,
          } = await supabase.auth.getSession();

          if (error || !session?.user) {
            console.log('No session found, redirecting to login');
            router.replace('/(auth)/login');
            return;
          }

          // Extract school information from user metadata
          const schoolId = session.user.user_metadata?.school_id;
          const schoolName = session.user.user_metadata?.school_name;
          const email = session.user.user_metadata?.email;
          const password = session.user.user_metadata?.password;

          // Navigate to create profile with school information
          router.replace({
            pathname: '/(auth)/create-profile',
            params: {
              schoolId: schoolId,
              schoolName: schoolName,
              email: email,
              password: password,
            },
          });
        } catch (error) {
          console.error('Error getting session:', error);
          router.replace('/(auth)/login');
        }
      }
    }, 3000); // Increased timeout to 3 seconds

    return () => {
      clearInterval(timer);
      clearTimeout(navigationTimer);
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <View className="flex-1">
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <MeshGradient intensity={40} />
      <View className="flex-1 items-center justify-center px-8">
        <View className="w-full max-w-sm items-center space-y-8">
          {/* Success Icon */}
          <View className="items-center space-y-4">
            <View
              className={`h-24 w-24 items-center justify-center rounded-full ${
                colorScheme === 'dark' ? 'bg-green-500/20' : 'bg-green-500/10'
              }`}>
              <Ionicons
                name="checkmark-circle"
                size={60}
                color={colorScheme === 'dark' ? '#10b981' : '#059669'}
              />
            </View>

            <View className="items-center space-y-2">
              <Text
                className={`text-2xl font-bold ${colorScheme === 'dark' ? 'text-white' : 'text-[#07020D]'}`}>
                Email Verified!
              </Text>
              <Text
                className={`text-center text-base ${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Your email has been successfully verified. You can now create your profile.
              </Text>
            </View>
          </View>

          {/* Loading Indicator */}
          <View className="items-center space-y-4">
            <ActivityIndicator
              size="large"
              color={colorScheme === 'dark' ? '#10b981' : '#059669'}
            />
            <Text
              className={`text-sm ${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Redirecting to create profile in {countdown} second{countdown !== 1 ? 's' : ''}...
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
