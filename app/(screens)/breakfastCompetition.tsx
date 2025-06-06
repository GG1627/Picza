// app/(screens)/breakfastCompetition.tsx
import { View, Text, TouchableOpacity, Image, Alert } from 'react-native';
import { useColorScheme } from '../../lib/useColorScheme';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/useAuth';
import {
  getCompetitionPhase,
  getTimeUntilNextPhase,
  submitBreakfastPhoto,
} from '../../lib/competitions';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, router } from 'expo-router';
import { uploadToCloudinary } from '../../lib/cloudinary';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../../lib/supabase';

export default function BreakfastCompetitionScreen() {
  const { colorScheme } = useColorScheme();
  const { user } = useAuth();
  const { competitionId } = useLocalSearchParams();
  const [timeLeft, setTimeLeft] = useState('');
  const [competitionPhase, setCompetitionPhase] = useState<
    'registration' | 'competition' | 'voting' | 'completed'
  >('competition');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkExistingSubmission = async () => {
      if (!user || !competitionId) return;

      try {
        const { data: participant } = await supabase
          .from('breakfast_participants')
          .select('id')
          .eq('competition_id', competitionId)
          .eq('user_id', user.id)
          .single();

        if (participant) {
          const { data: submission } = await supabase
            .from('breakfast_submissions')
            .select('id')
            .eq('competition_id', competitionId)
            .eq('participant_id', participant.id)
            .single();

          if (submission) {
            setHasSubmitted(true);
          }
        }
      } catch (error) {
        // Silent error handling
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSubmission();
  }, [user, competitionId]);

  const formatTimeLeft = (timeString: string) => {
    const totalMilliseconds = parseInt(timeString);
    if (isNaN(totalMilliseconds)) return timeString;

    const totalSeconds = Math.floor(totalMilliseconds / 1000);

    if (totalSeconds <= 0) {
      router.push('/breakfastBracket');
      return "Time's up!";
    }

    if (totalSeconds < 60) {
      return `${totalSeconds}s`;
    } else if (totalSeconds < 300) {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${mins}m ${secs}s`;
    } else if (totalSeconds < 3600) {
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${mins}m ${secs}s`;
    } else if (totalSeconds < 86400) {
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    } else {
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      return `${days}d ${hours}h`;
    }
  };

  useEffect(() => {
    const fetchCompetitionData = async () => {
      try {
        if (!competitionId) return;

        const phase = await getCompetitionPhase(competitionId as string);
        setCompetitionPhase(phase);

        if (phase === 'voting') {
          router.push('/breakfastBracket');
          return;
        }

        const timeUntilNext = await getTimeUntilNextPhase(competitionId as string);
        setTimeLeft(formatTimeLeft(timeUntilNext));
      } catch (error) {
        // Silent error handling
      }
    };

    fetchCompetitionData();
    const interval = setInterval(fetchCompetitionData, 100);
    return () => clearInterval(interval);
  }, [competitionId]);

  const handleImagePick = async () => {
    if (isLoading) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleUpload = async () => {
    if (!selectedImage || !user || !competitionId || isLoading) return;

    try {
      setIsUploading(true);

      const base64 = await FileSystem.readAsStringAsync(selectedImage, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const imageUrl = await uploadToCloudinary(base64, 'post');

      const success = await submitBreakfastPhoto(
        competitionId as string,
        user.id,
        imageUrl,
        'My breakfast creation'
      );

      if (success) {
        setHasSubmitted(true);
        Alert.alert('Success!', 'Your breakfast photo has been submitted successfully.');
        setTimeout(() => {
          router.push('/competitions');
        }, 2000);
      } else {
        Alert.alert(
          'Error',
          'You must join the competition before submitting a photo. Please go back and join the competition first.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <View
        className={`flex-1 items-center justify-center ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
        <Text className={`text-lg ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
      {/* Header */}
      <View className="mt-20 px-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.push('/competitions')}
            className="rounded-full bg-white/20 p-2">
            <Ionicons
              name="arrow-back"
              size={24}
              color={colorScheme === 'dark' ? 'white' : 'black'}
            />
          </TouchableOpacity>
          <View className="flex-1 items-center">
            <Text
              className={`text-center text-3xl font-bold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Breakfast Challenge
            </Text>
            <Text
              className={`mt-1 text-center text-base ${colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              {hasSubmitted ? 'Thank you for participating!' : 'Create your masterpiece!'}
            </Text>
          </View>
          <View className="w-10" />
        </View>
      </View>

      {/* Timer Section */}
      {!hasSubmitted && (
        <View className="mt-8 items-center">
          <View className="flex-row items-center space-x-2 rounded-full bg-[#FFD700] px-6 py-3">
            <Ionicons name="time-outline" size={24} color="#FF8C00" />
            <Text className="text-lg font-semibold text-[#1A1A1A]">
              <Text>{timeLeft}</Text>
              <Text> left to submit</Text>
            </Text>
          </View>
        </View>
      )}

      {/* Upload Section */}
      <View className="mt-8 flex-1 items-center px-4">
        {hasSubmitted ? (
          <View className="w-full items-center justify-center space-y-4">
            <View className="h-64 w-full items-center justify-center rounded-2xl bg-green-100">
              <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
              <Text className="mt-4 text-xl font-semibold text-green-700">Entry Submitted!</Text>
              <Text className="mt-2 text-center text-gray-600">
                Your breakfast photo has been submitted successfully.
              </Text>
              <Text className="mt-2 text-center text-gray-600">
                You can return to the competitions screen.
              </Text>
            </View>
          </View>
        ) : selectedImage ? (
          <View className="w-full items-center space-y-4">
            <Image
              source={{ uri: selectedImage }}
              className="h-64 w-full rounded-2xl"
              resizeMode="cover"
            />
            <TouchableOpacity
              onPress={handleUpload}
              disabled={isUploading}
              className={`w-full rounded-full bg-[#FF8C00] px-6 py-3 ${
                isUploading ? 'opacity-50' : ''
              }`}>
              <Text className="text-center text-lg font-semibold text-white">
                {isUploading ? 'Uploading...' : 'Submit Entry'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleImagePick}
              className="w-full rounded-full bg-gray-200 px-6 py-3">
              <Text className="text-center text-lg font-semibold text-gray-600">
                Choose Different Image
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={handleImagePick}
            className="h-64 w-full items-center justify-center rounded-2xl border-2 border-dashed border-gray-400 bg-gray-100">
            <Ionicons name="cloud-upload-outline" size={48} color="#666" />
            <Text className="mt-2 text-lg font-medium text-gray-600">
              Tap to upload your breakfast photo
            </Text>
            <Text className="mt-1 text-sm text-gray-500">Make sure it's clear and appetizing!</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Guidelines Section */}
      {!hasSubmitted && (
        <View className="mt-8 px-4 pb-8">
          <Text className="text-lg font-semibold text-gray-700">Guidelines:</Text>
          <View className="mt-2 space-y-2">
            <View className="flex-row items-center space-x-2">
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text className="text-gray-600">Photo must be clear and well-lit</Text>
            </View>
            <View className="flex-row items-center space-x-2">
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text className="text-gray-600">Show your breakfast creation in full</Text>
            </View>
            <View className="flex-row items-center space-x-2">
              <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
              <Text className="text-gray-600">Make sure it's appetizing!</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
