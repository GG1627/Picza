import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../../lib/useColorScheme';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { colorScheme, colors } = useColorScheme();

  async function getSchoolFromEmail(email: string) {
    const domain = email.split('@')[1];
    const { data: school, error } = await supabase
      .from('schools')
      .select('*')
      .eq('domain', domain)
      .single();

    if (error) {
      console.error('Error fetching school:', error);
      return null;
    }
    return school;
  }

  async function signUpWithEmail() {
    if (loading) return;

    // Validate passwords match
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Please make sure your passwords match.');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
      return;
    }

    // Get school from email domain
    const school = await getSchoolFromEmail(email);
    if (!school) {
      Alert.alert('Invalid Email', 'Please use a valid school email address.');
      return;
    }

    setLoading(true);
    try {
      // Check if the user already exists
      const { data: existingUser, error: checkError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (existingUser?.user) {
        setLoading(false);
        Alert.alert(
          'Account Exists',
          'An account with this email already exists. Would you like to sign in instead?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Sign In',
              onPress: () => {
                router.replace('/(auth)/login');
              },
            },
          ]
        );
        return;
      }

      // If no existing user, proceed to create profile
      router.replace({
        pathname: '/(auth)/create-profile',
        params: {
          schoolId: school.id,
          schoolName: school.name,
          email: email,
          password: password,
        },
      });
    } catch (error) {
      console.error('Unexpected error during signup:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <View className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
        <View className="flex-1 items-center justify-center px-8">
          <View className="w-full max-w-sm space-y-8">
            {/* Header Section */}
            <View className="items-center space-y-4">
              {/* <Image
                source={require('../../images/logo.png')}
                className="mb-2 h-28 w-28"
                resizeMode="contain"
              /> */}
              <View className="items-center">
                <Text
                  className={`mb-2 text-6xl font-bold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  Picza
                </Text>
                <Text
                  className={`mb-1 text-2xl font-medium ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  Create Account
                </Text>
                <Text
                  className={`text-base ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  Join our food community
                </Text>
              </View>
            </View>

            {/* Form Section */}
            <View className="space-y-5">
              <View className="mt-3 space-y-2">
                <Text
                  className={`ml-1 text-sm font-medium ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  School Email
                </Text>
                <View className="relative">
                  <TextInput
                    placeholder="Enter your @.edu email"
                    value={email}
                    onChangeText={setEmail}
                    className={`w-full rounded-2xl border px-4 py-4 pl-12 shadow-sm ${colorScheme === 'dark' ? 'border-[#9ca3af] bg-[#282828] text-[#9ca3af]' : 'border-[#07020D] bg-[#f9f9f9] text-[#0d0302]'}`}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#9ca3af"
                    spellCheck={false}
                    style={{ textAlignVertical: 'center' }}
                  />
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={colorScheme === 'dark' ? '#9ca3af' : '#07020D'}
                    className="absolute left-4 top-4"
                  />
                </View>
              </View>

              <View className="mt-3 space-y-2">
                <Text
                  className={`ml-1 text-sm font-medium ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  Password
                </Text>
                <View className="relative">
                  <TextInput
                    placeholder="Create a password"
                    value={password}
                    onChangeText={setPassword}
                    className={`w-full rounded-2xl border px-4 py-4 pl-12 shadow-sm ${colorScheme === 'dark' ? 'border-[#9ca3af] bg-[#282828] text-[#9ca3af]' : 'border-[#07020D] bg-[#f9f9f9] text-[#07020D]'}`}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#9ca3af"
                    textContentType="newPassword"
                    autoComplete="new-password"
                  />
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colorScheme === 'dark' ? '#9ca3af' : '#07020D'}
                    className="absolute left-4 top-4"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4">
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colorScheme === 'dark' ? '#9ca3af' : '#07020D'}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mt-3 space-y-2">
                <Text
                  className={`ml-1 text-sm font-medium ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  Confirm Password
                </Text>
                <View className="relative">
                  <TextInput
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    className={`w-full rounded-2xl border px-4 py-4 pl-12 shadow-sm ${colorScheme === 'dark' ? 'border-[#9ca3af] bg-[#282828] text-[#9ca3af]' : 'border-[#07020D] bg-[#f9f9f9] text-[#07020D]'}`}
                    secureTextEntry={!showConfirmPassword}
                    placeholderTextColor="#9ca3af"
                    textContentType="newPassword"
                    autoComplete="new-password"
                    style={{ textAlignVertical: 'center' }}
                  />
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={colorScheme === 'dark' ? '#9ca3af' : '#07020D'}
                    className="absolute left-4 top-4"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-4">
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colorScheme === 'dark' ? '#9ca3af' : '#07020D'}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Button Section */}
            <View className="space-y-4 pt-4">
              <Pressable
                className={`w-full rounded-2xl ${colorScheme === 'dark' ? 'bg-[#F00511]' : 'bg-[#F00511]'} py-4 shadow-sm`}
                onPress={signUpWithEmail}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text
                    className={`text-center text-base font-semibold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#E0E0E0]'}`}>
                    Create Account
                  </Text>
                )}
              </Pressable>

              <View className="mt-4 flex-row items-center justify-center space-x-2">
                <View
                  className={`h-[1px] flex-1 ${colorScheme === 'dark' ? 'bg-[#E0E0E0]' : 'bg-gray-400'}`}
                />
                <Text
                  className={`text-gray-500 ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  or
                </Text>
                <View
                  className={`h-[1px] flex-1 ${colorScheme === 'dark' ? 'bg-[#E0E0E0]' : 'bg-gray-400'}`}
                />
              </View>

              <View className="mt-2">
                <View className="flex-row items-center justify-center">
                  <Text
                    className={`text-sm ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-gray-500'}`}>
                    Already have an account?{' '}
                  </Text>
                  <Pressable
                    onPress={() => {
                      if (!loading) router.replace('/(auth)/login');
                    }}>
                    <Text
                      className={`font-semibold ${colorScheme === 'dark' ? 'text-[#F00511]' : 'text-[#F00511]'}`}>
                      Sign in
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
