import {
  View,
  Text,
  StatusBar,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useColorScheme } from '../../lib/useColorScheme';
import { useAuth } from '~/lib/auth';
import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';
import { uploadToCloudinary } from '~/lib/cloudinary';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {time} from '../sharedTime';

export default function CompetitionScreen() {
  const { colorScheme } = useColorScheme();
  const { user } = useAuth();
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // check if user has already submitted
  const checkSubmission = async () => {
    if (!user || !competitionId) return;

    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('id, status')
        .eq('competition_id', competitionId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error checking submission:', error);
        return;
      }

      const hasSubmitted = !!data && data.status === 'submitted';
      setHasSubmitted(hasSubmitted);
    } catch (error) {
      console.error('Error in checkSubmission:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch competition status and update timer
  useEffect(() => {
    const fetchCompetitionStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('competitions')
          .select('id, submit_end_time')
          .eq('type', time)
          .single();

        if (error) throw error;

        if (data) {
          setCompetitionId(data.id);
          const submitEnd = new Date(data.submit_end_time);
          const now = new Date();
          const remaining = Math.floor((submitEnd.getTime() - now.getTime()) / 1000);
          setTimeRemaining(remaining);
        }
      } catch (error) {
        console.error('Error fetching competition status:', error);
      }
    };

    fetchCompetitionStatus();
    const timer = setInterval(async () => {
      const { data } = await supabase
        .from('competitions')
        .select('submit_end_time')
        .eq('type', time)
        .single();

      if (data) {
        const submitEnd = new Date(data.submit_end_time);
        const now = new Date();
        const remaining = Math.floor((submitEnd.getTime() - now.getTime()) / 1000);
        setTimeRemaining(remaining);

        if (remaining <= 0) {
          clearInterval(timer);
          Alert.alert(
            'Submission Time Ended',
            'The time to submit your entry has ended. Time to vote!',
            [
              {
                text: 'OK',
                onPress: () => {
                  router.replace('/allVoting');
                },
              },
            ]
          );
        }
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  // Add a new useEffect to check submission whenever competitionId or user changes
  useEffect(() => {
    if (competitionId && user) {
      console.log('Checking submission on mount/update');
      checkSubmission();
    }
  }, [competitionId, user]);

  // Format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return "Time's up!";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  };

  const pickImage = async () => {
    if (hasSubmitted) {
      Alert.alert('Already Submitted', 'You have already submitted an image for this competition.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage || !user || !competitionId) return;

    try {
      setIsUploading(true);

      // convert image to base64
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      // upload to Cloudinary
      const imageUrl = await uploadToCloudinary(base64, 'post');

      // save submission to database
      const { error } = await supabase.from('submissions').insert({
        competition_id: competitionId,
        user_id: user.id,
        image_url: imageUrl,
        status: 'submitted',
      });

      if (error) throw error;

      setHasSubmitted(true);
      Alert.alert('Success', 'Your submission has been saved!');
      setSelectedImage(null);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

      {/* Back Button */}
      <TouchableOpacity
        onPress={() => router.back()}
        className="absolute left-4 top-20 z-10 rounded-full p-2"
        style={{
          backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        }}>
        <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
      </TouchableOpacity>

      {/* Title Section */}
      <View className="mb-8 mt-20 px-4 pt-2">
        <Text
          className={`text-center text-3xl font-bold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Competition
        </Text>
        <Text
          className={`mt-1 text-center text-base ${colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          Time to show your skills!
        </Text>
      </View>

      {/* Timer Section */}
      <View className="mb-[-8rem] items-center">
        <Text
          className={`text-lg font-semibold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Time until voting:
        </Text>
        <Text
          className={`text-2xl font-bold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {formatTimeRemaining(timeRemaining)}
        </Text>
      </View>

      {/* Image Upload Section */}
      <View className="flex-1 items-center justify-center px-4">
        {isLoading ? (
          <View className="items-center">
            <ActivityIndicator
              size="large"
              color={colorScheme === 'dark' ? '#fa6f48' : '#fa6f48'}
            />
            <Text
              className={`mt-4 text-center ${
                colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
              Loading...
            </Text>
          </View>
        ) : hasSubmitted ? (
          <View className="mt-[-5rem] items-center">
            <Ionicons
              name="checkmark-circle"
              size={64}
              color={colorScheme === 'dark' ? '#fa6f48' : '#fa6f48'}
            />
            <Text
              className={`mt-4 text-center text-lg font-semibold ${
                colorScheme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
              Thank you for your submission!
            </Text>
            <Text
              className={`mt-2 text-center ${
                colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
              Voting will begin soon.
            </Text>
          </View>
        ) : selectedImage ? (
          <View className="items-center">
            <Image source={{ uri: selectedImage }} className="mb-4 h-80 w-80 rounded-lg" />
            <TouchableOpacity
              onPress={handleUpload}
              disabled={isUploading}
              className={`rounded-full px-6 py-3 ${
                colorScheme === 'dark' ? 'bg-[#fa6f48]' : 'bg-[#fa6f48]'
              }`}>
              {isUploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-lg font-semibold text-white">Submit Image</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center">
            <TouchableOpacity
              onPress={pickImage}
              className={`h-80 w-80 items-center justify-center rounded-lg border-2 border-dashed ${
                colorScheme === 'dark' ? 'border-gray-600' : 'border-gray-400'
              }`}>
              <Ionicons
                name="cloud-upload-outline"
                size={64}
                color={colorScheme === 'dark' ? '#fff' : '#000'}
              />
              <Text
                className={`mt-4 text-center text-lg ${
                  colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                Tap to select an image
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
