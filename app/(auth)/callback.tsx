import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function AuthCallbackScreen() {
  const [loading, setLoading] = useState(true);

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
          console.log('Email verified successfully for:', session.user.email);
          router.replace('/(main)/feed');
        } else {
          console.log('No session found after verification');
          router.replace('/(auth)/login');
        }
      } catch (error) {
        console.error('Unexpected error during verification:', error);
        router.replace('/(auth)/login');
      } finally {
        setLoading(false);
      }
    };

    // Add a small delay to ensure the session is properly loaded
    const timer = setTimeout(checkSession, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#000" />
      <Text style={styles.text}>Verifying your email...</Text>
      <Text style={styles.subText}>Please wait while we complete the verification process</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
  },
  text: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  subText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
