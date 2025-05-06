import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBrowserClient } from '@supabase/ssr';
import { AppState } from 'react-native';

const supabaseUrl = 'https://ozalkatrpnqebratioui.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96YWxrYXRycG5xZWJyYXRpb3VpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDYzMTAzNjcsImV4cCI6MjA2MTg4NjM2N30.3eUkgvAIhIY5z312bmqa4X5Tqg7z-mHPdRPocAOF-n0';

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
