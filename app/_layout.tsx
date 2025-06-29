import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';

if (!global.Buffer) {
  global.Buffer = Buffer;
}

import '../global.css';
import 'expo-dev-client';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Icon } from '@roninoss/icons';
import { Link, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, View, Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';

import { ThemeToggle } from '~/components/ThemeToggle';
import { cn } from '~/lib/cn';
import { useColorScheme, useInitialAndroidBarSync } from '~/lib/useColorScheme';
import { NAV_THEME } from '~/theme';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  useInitialAndroidBarSync();
  const { colorScheme, isDarkColorScheme } = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    // Handle deep linking for password reset
    const handleDeepLink = (url: string) => {
      // Parse the URL to extract parameters
      const parsedUrl = Linking.parse(url);

      // Check if this is a password reset link
      if (url.includes('new-password') || url.includes('access_token')) {
        console.log('Password reset link detected');

        // Check for errors in the URL
        if (url.includes('error=')) {
          console.log('Error detected in reset link');

          // Extract error information
          const errorMatch = url.match(/error=([^&]+)/);
          const errorCodeMatch = url.match(/error_code=([^&]+)/);
          const errorDescMatch = url.match(/error_description=([^&]+)/);

          const error = errorMatch ? decodeURIComponent(errorMatch[1]) : '';
          const errorCode = errorCodeMatch ? decodeURIComponent(errorCodeMatch[1]) : '';
          const errorDesc = errorDescMatch ? decodeURIComponent(errorDescMatch[1]) : '';

          console.log('Error details:', { error, errorCode, errorDesc });

          // Handle specific errors
          if (errorCode === 'otp_expired') {
            Alert.alert(
              'Link Expired',
              'This password reset link has expired. Please request a new one.',
              [
                {
                  text: 'OK',
                  onPress: () => router.replace('/(auth)/reset-password' as any),
                },
              ]
            );
            return;
          }

          Alert.alert(
            'Invalid Link',
            'This password reset link is invalid. Please request a new one.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(auth)/reset-password' as any),
              },
            ]
          );
          return;
        }

        // Extract tokens from URL
        // Check both query parameters (?) and hash fragments (#)
        let accessToken = null;
        let refreshToken = null;

        // Try query parameters first
        if (url.includes('?')) {
          const urlParams = new URLSearchParams(url.split('?')[1] || '');
          accessToken = urlParams.get('access_token');
          refreshToken = urlParams.get('refresh_token');
        }

        // If not found in query params, try hash fragment
        if (!accessToken && !refreshToken && url.includes('#')) {
          const hashFragment = url.split('#')[1] || '';
          const hashParams = new URLSearchParams(hashFragment);
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
        }

        console.log('Extracted tokens:', {
          accessToken: !!accessToken,
          refreshToken: !!refreshToken,
        });

        if (accessToken && refreshToken) {
          console.log('Setting session with extracted tokens');
          // Set the session and navigate to new password screen
          supabase.auth
            .setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            .then(({ data, error }) => {
              if (error) {
                console.error('Error setting session:', error);
                Alert.alert('Error', 'Failed to set up session. Please try the reset link again.', [
                  {
                    text: 'OK',
                    onPress: () => router.replace('/(auth)/reset-password' as any),
                  },
                ]);
              } else if (data.session) {
                console.log('Session set successfully, navigating to new-password');
                router.replace('/(auth)/new-password' as any);
              }
            });
        } else {
          console.log('No tokens found in URL, navigating anyway');
          router.replace('/(auth)/new-password' as any);
        }
      }

      // Check if this is an email verification link
      if (url.includes('email-verified')) {
        console.log('Email verification link detected');
        router.replace('/(auth)/email-verified' as any);
      }
    };

    // Listen for incoming links
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('Linking event received:', event);
      handleDeepLink(event.url);
    });

    // Check for initial URL (if app was opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('Initial URL found:', url);
        handleDeepLink(url);
      }
    });

    // Listen for password recovery events
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session ? 'Session exists' : 'No session');

      if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery event detected, navigating to new-password');
        router.replace('/(auth)/new-password' as any);
      }

      // Also handle when tokens are passed via URL
      if (event === 'TOKEN_REFRESHED' && session) {
        console.log('Token refreshed, session is ready');
      }
    });

    return () => {
      subscription?.remove();
      authSubscription.unsubscribe();
    };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar
        key={`root-status-bar-${isDarkColorScheme ? 'light' : 'dark'}`}
        style={isDarkColorScheme ? 'light' : 'dark'}
      />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <ActionSheetProvider>
            <NavThemeProvider value={NAV_THEME[colorScheme]}>
              <Stack
                screenOptions={{
                  headerShown: false, // Hide header for all screens by default
                  animation: 'none',
                }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(main)" options={{ headerShown: false }} />
              </Stack>
            </NavThemeProvider>
          </ActionSheetProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const SCREEN_OPTIONS = {
  animation: 'none', // for android
} as const;

const INDEX_OPTIONS = {
  headerShown: false,
  headerLargeTitle: true,
  title: 'My App',
} as const;
