import {
  View,
  Text,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from '../../lib/useColorScheme';
import { uploadToCloudinary } from '../../lib/cloudinary';

export default function CreateProfileScreen() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [schoolColors, setSchoolColors] = useState({ primary: '#0029A5', secondary: '#FF7824' });
  const router = useRouter();
  const { schoolId, schoolName, email, password } = useLocalSearchParams();
  const { colorScheme, colors } = useColorScheme();

  useEffect(() => {
    const fetchSchoolColors = async () => {
      try {
        const { data, error } = await supabase
          .from('schools')
          .select('primary_color, secondary_color')
          .eq('id', schoolId)
          .single();

        if (error) throw error;
        if (data) {
          setSchoolColors({
            primary: data.primary_color,
            secondary: data.secondary_color,
          });
        }
      } catch (error) {
        console.error('Error fetching school colors:', error);
      }
    };

    if (schoolId) {
      fetchSchoolColors();
    }
  }, [schoolId]);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Error selecting image. Please try again.');
    }
  };

  const uploadImage = async (base64Image: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Upload to Cloudinary with avatar type
      const imageUrl = await uploadToCloudinary(base64Image, 'avatar');
      return imageUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  };

  const handleCreateProfile = async () => {
    if (!username || !fullName) {
      Alert.alert('Required Fields', 'Please fill in all required fields');
      return;
    }

    if (bio.length > 60) {
      Alert.alert('Bio Too Long', 'Bio must be 60 characters or less');
      return;
    }

    setLoading(true);
    try {
      // Create the auth account first
      const {
        data: { session },
        error: signUpError,
      } = await supabase.auth.signUp({
        email: email as string,
        password: password as string,
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
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
          Alert.alert('Error', signUpError.message);
        }
        return;
      }

      if (!session?.user) {
        Alert.alert(
          'Verification Required',
          'Please check your email for a verification link to complete your registration.'
        );
        return;
      }

      let avatarUrl = null;
      if (image) {
        try {
          const response = await fetch(image);
          if (!response.ok) throw new Error('Failed to fetch image');

          const blob = await response.blob();
          const reader = new FileReader();
          const base64Image = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          avatarUrl = await uploadToCloudinary(base64Image.split(',')[1]);
        } catch (error) {
          console.error('Error uploading image:', error);
          Alert.alert(
            'Image Upload Failed',
            'Failed to upload profile image. Would you like to continue without an image?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
              },
              {
                text: 'Continue',
                onPress: async () => {
                  await createProfileWithoutImage(session.user.id);
                },
              },
            ]
          );
          return;
        }
      }

      await createProfileWithImage(session.user.id, avatarUrl);
    } catch (error) {
      console.error('Error creating profile:', error);
      Alert.alert(
        'Error',
        'Failed to create profile. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const createProfileWithImage = async (userId: string, avatarUrl: string | null) => {
    try {
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: userId,
          username: username,
          full_name: fullName,
          bio: bio || null,
          avatar_url: avatarUrl,
          school_id: schoolId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (profileError) throw profileError;

      // Navigate to feed after successful profile creation
      router.replace('/(main)/feed');
    } catch (error) {
      console.error('Error creating profile:', error);
      Alert.alert('Error', 'Failed to create profile. Please try again.');
      throw error;
    }
  };

  const createProfileWithoutImage = async (userId: string) => {
    try {
      const { error: profileError } = await supabase.from('profiles').insert([
        {
          id: userId,
          username: username,
          full_name: fullName,
          bio: bio || null,
          avatar_url: null,
          school_id: schoolId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

      if (profileError) throw profileError;

      // Navigate to feed after successful profile creation
      router.replace('/(main)/feed');
    } catch (error) {
      console.error('Error creating profile:', error);
      Alert.alert('Error', 'Failed to create profile. Please try again.');
      throw error;
    }
  };

  const handleBioChange = (text: string) => {
    // Count existing newlines
    const newlineCount = (text.match(/\n/g) || []).length;

    // If we're at max newlines and trying to add another, don't allow it
    if (newlineCount >= 2 && text.endsWith('\n')) {
      return;
    }

    setBio(text);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1">
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
          <View className="flex-1 items-center justify-center px-8">
            <View className="w-full max-w-sm space-y-8">
              <View className="mt-0">
                <Text
                  className={`text-3xl font-bold ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  Create Profile
                </Text>
                <Text
                  className={`mt-3 text-base ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                  Let's get to know you better
                </Text>
              </View>

              <View className="mt-8 space-y-8">
                {/* Profile Image Upload */}
                <View className="items-center">
                  <View className="relative">
                    <Pressable
                      onPress={pickImage}
                      className={`h-40 w-40 items-center justify-center rounded-full border-4 ${
                        colorScheme === 'dark' ? 'border-[#E0E0E0]' : 'border-[#07020D]'
                      } p-1 ${image ? (colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]') : colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'}`}>
                      {image ? (
                        <Image source={{ uri: image }} className="h-full w-full rounded-full" />
                      ) : (
                        <View className="items-center">
                          <Ionicons
                            name="camera-outline"
                            size={40}
                            color={colorScheme === 'dark' ? '#E0E0E0' : '#07020D'}
                          />
                          <Text
                            className={`mt-2 text-sm ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-gray-500'}`}>
                            Add Photo
                          </Text>
                        </View>
                      )}
                    </Pressable>
                    {/* <View
                      className={`absolute -bottom-0 -right-[-6] h-12 w-12 items-center justify-center rounded-full ${
                        colorScheme === 'dark' ? 'bg-[#E0E0E0]' : 'bg-[#07020D]'
                      }`}>
                      <Ionicons
                        name="pencil"
                        size={26}
                        color={colorScheme === 'dark' ? '#07020D' : 'white'}
                      />
                    </View> */}
                  </View>
                </View>

                {/* School Display */}
                <View>
                  <Text
                    className={`mb-0 text-sm font-medium ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                    School
                  </Text>
                  <View
                    style={{
                      shadowColor: colorScheme === 'dark' ? '#fff' : '#000',
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.9,
                      shadowRadius: 4.65,
                      elevation: 10,
                      borderRadius: 2,
                    }}>
                    <LinearGradient
                      colors={[schoolColors.primary, schoolColors.secondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{
                        borderRadius: 16,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: colorScheme === 'dark' ? '#E0E0E0' : '#07020D',
                      }}>
                      <Text className="text-base font-bold text-white">{schoolName}</Text>
                    </LinearGradient>
                  </View>
                </View>

                {/* Full Name Input */}
                <View>
                  <Text
                    className={`mb-0 mt-3 text-sm font-medium ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                    Full Name
                  </Text>
                  <View className="relative">
                    <TextInput
                      className={`w-full rounded-2xl border px-4 py-4 pl-12 shadow-sm ${
                        colorScheme === 'dark'
                          ? 'border-[#9ca3af] bg-[#282828] text-[#9ca3af]'
                          : 'border-[#07020D] bg-[#f9f9f9] text-[#07020D]'
                      }`}
                      placeholder="Enter your full name"
                      placeholderTextColor="#9ca3af"
                      value={fullName}
                      onChangeText={setFullName}
                      autoCapitalize="words"
                      spellCheck={false}
                    />
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={colorScheme === 'dark' ? '#9ca3af' : '#07020D'}
                      className="absolute left-4 top-4"
                    />
                  </View>
                </View>

                {/* Username Input */}
                <View>
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`mb-0 mt-3 text-sm font-medium ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                      Username
                    </Text>
                    <Text
                      className={`text-xs ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-gray-500'}`}>
                      {username.length}/20
                    </Text>
                  </View>
                  <View className="relative">
                    <TextInput
                      className={`w-full rounded-2xl border px-4 py-4 pl-12 shadow-sm ${
                        colorScheme === 'dark'
                          ? 'border-[#9ca3af] bg-[#282828] text-[#9ca3af]'
                          : 'border-[#07020D] bg-[#f9f9f9] text-[#07020D]'
                      }`}
                      placeholder="Choose a username"
                      placeholderTextColor="#9ca3af"
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={20}
                      spellCheck={false}
                    />
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={colorScheme === 'dark' ? '#9ca3af' : '#07020D'}
                      className="absolute left-4 top-4"
                    />
                  </View>
                </View>

                {/* Bio Input */}
                <View>
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`mb-0 mt-3 text-sm font-medium ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'}`}>
                      Bio (Optional)
                    </Text>
                    <Text
                      className={`text-xs ${colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-gray-500'}`}>
                      {bio.length}/60
                    </Text>
                  </View>
                  <View className="relative">
                    <TextInput
                      className={`w-full rounded-2xl border px-4 py-4 pl-12 shadow-sm ${
                        colorScheme === 'dark'
                          ? 'border-[#9ca3af] bg-[#282828] text-[#9ca3af]'
                          : 'border-[#07020D] bg-[#f9f9f9] text-[#07020D]'
                      }`}
                      placeholder="Tell us about yourself"
                      placeholderTextColor="#9ca3af"
                      value={bio}
                      onChangeText={handleBioChange}
                      maxLength={60}
                      multiline
                      numberOfLines={3}
                      returnKeyType="done"
                      blurOnSubmit={true}
                      onSubmitEditing={Keyboard.dismiss}
                      textAlignVertical="top"
                      style={{ height: 65 }}
                    />
                    <Ionicons
                      name="chatbubble-outline"
                      size={20}
                      color={colorScheme === 'dark' ? '#9ca3af' : '#07020D'}
                      className="absolute left-4 top-4"
                    />
                  </View>
                </View>

                {/* Create Profile Button */}
                <Pressable
                  onPress={handleCreateProfile}
                  disabled={loading}
                  className={`mt-8 rounded-2xl ${colorScheme === 'dark' ? 'bg-[#f77f5e]' : 'bg-[#f77f5e]'} py-4 shadow-sm ${
                    loading ? 'opacity-50' : ''
                  }`}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text
                      className={`text-center text-base font-semibold ${colorScheme === 'dark' ? 'text-white' : 'text-white'}`}>
                      Create Profile
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
