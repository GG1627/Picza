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
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    // Ensure it's a UFL email
    if (!email.toLowerCase().endsWith('@ufl.edu')) {
      Alert.alert('Invalid Email', 'Please use your @ufl.edu school email.');
      return;
    }

    setLoading(true);
    try {
      // First check if the user already exists
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

      // If no existing user, proceed with signup
      const {
        data: { session },
        error,
      } = await supabase.auth.signUp({
        email: email,
        password: password,
      });

      if (error) {
        if (error.message.includes('already registered')) {
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
        } else {
          Alert.alert('Error', error.message);
        }
        setLoading(false);
        return;
      }

      if (session) {
        console.log('Successfully signed up as:', session.user.email);
        router.replace('/(auth)/create-profile');
      } else {
        Alert.alert(
          'Verification Required',
          'Please check your email for a verification link to complete your registration.'
        );
      }
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
      <View className="flex-1 bg-[#ffddc1]">
        {/* Decorative Elements */}
        <View className="absolute right-0 top-0 -mr-32 -mt-32 h-64 w-64 rounded-full bg-[#da4314] opacity-10" />
        <View className="absolute bottom-0 left-0 -mb-24 -ml-24 h-48 w-48 rounded-full bg-[#FFB38A] opacity-10" />

        <View className="flex-1 items-center justify-center px-8">
          <View className="w-full max-w-sm space-y-8">
            {/* Header Section */}
            <View className="items-center space-y-4">
              <Image
                source={require('../../images/logo.png')}
                className="mb-2 h-28 w-28"
                resizeMode="contain"
              />
              <View className="items-center">
                <Text className="mb-2 text-5xl font-bold text-[#da4314]">Picza</Text>
                <Text className="mb-1 text-2xl font-medium text-gray-700">Create Account</Text>
                <Text className="text-base text-gray-600">Join our food community</Text>
              </View>
            </View>

            {/* Form Section */}
            <View className="space-y-5">
              <View className="space-y-2">
                <Text className="ml-1 text-sm font-medium text-gray-700">School Email</Text>
                <View className="relative">
                  <TextInput
                    placeholder="Enter your @ufl.edu email"
                    value={email}
                    onChangeText={setEmail}
                    className="w-full rounded-2xl border border-[#da4314] bg-white/90 px-4 py-4 pl-12 text-gray-900 shadow-sm"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#9ca3af"
                  />
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color="#da4314"
                    className="absolute left-4 top-4"
                  />
                </View>
              </View>

              <View className="space-y-2">
                <Text className="ml-1 text-sm font-medium text-gray-700">Password</Text>
                <View className="relative">
                  <TextInput
                    placeholder="Create a password"
                    value={password}
                    onChangeText={setPassword}
                    className="w-full rounded-2xl border border-[#da4314] bg-white/90 px-4 py-4 pl-12 text-gray-900 shadow-sm"
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#9ca3af"
                  />
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#da4314"
                    className="absolute left-4 top-4"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4">
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#da4314"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View className="space-y-2">
                <Text className="ml-1 text-sm font-medium text-gray-700">Confirm Password</Text>
                <View className="relative">
                  <TextInput
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    className="w-full rounded-2xl border border-[#da4314] bg-white/90 px-4 py-4 pl-12 text-gray-900 shadow-sm"
                    secureTextEntry={!showConfirmPassword}
                    placeholderTextColor="#9ca3af"
                  />
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color="#da4314"
                    className="absolute left-4 top-4"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-4">
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#da4314"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Button Section */}
            <View className="space-y-4 pt-4">
              <Pressable
                className="w-full rounded-2xl bg-[#da4314] py-4 shadow-sm"
                onPress={signUpWithEmail}
                disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-center text-base font-semibold text-white">
                    Create Account
                  </Text>
                )}
              </Pressable>

              <View className="mt-2 flex-row items-center justify-center space-x-2">
                <View className="h-[1px] flex-1 bg-gray-400" />
                <Text className="text-gray-500">or</Text>
                <View className="h-[1px] flex-1 bg-gray-400" />
              </View>

              <Pressable
                onPress={() => {
                  if (!loading) router.replace('/(auth)/login');
                }}
                className="mt-2">
                <Text className="text-center text-sm text-gray-600">
                  Already have an account?{' '}
                  <Text className="font-semibold text-[#da4314]">Sign in</Text>
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
