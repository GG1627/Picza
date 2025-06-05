// app/(screens)/breakfastCompetition.tsx
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useColorScheme } from '../../lib/useColorScheme';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/useAuth';
import { getCompetitionPhase, getTimeUntilNextPhase } from '../../lib/competitions';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, router } from 'expo-router';

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

  useEffect(() => {
    const fetchCompetitionData = async () => {
      try {
        if (!competitionId) {
          console.error('No competition ID provided');
          return;
        }

        const phase = await getCompetitionPhase(competitionId as string);
        setCompetitionPhase(phase);

        // If phase is voting, redirect to bracket screen
        if (phase === 'voting') {
          router.push('/breakfastBracket');
          return;
        }

        const timeUntilNext = await getTimeUntilNextPhase(competitionId as string);
        setTimeLeft(timeUntilNext);
      } catch (error) {
        console.error('Error fetching competition data:', error);
      }
    };

    fetchCompetitionData();
    const interval = setInterval(fetchCompetitionData, 1000); // Update every second
    return () => clearInterval(interval);
  }, [competitionId]);

  const formatTimeLeft = (timeString: string) => {
    // Extract hours, minutes, and seconds from the time string
    const match = timeString.match(/(\d+)h (\d+)m/);
    if (!match) return timeString;

    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const totalSeconds = hours * 3600 + minutes * 60;

    if (totalSeconds <= 0) {
      router.push('/breakfastBracket');
      return "Time's up!";
    }

    if (totalSeconds < 60) {
      return `${totalSeconds}s remaining`;
    } else if (totalSeconds < 300) {
      // Less than 5 minutes
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${mins}m ${secs}s remaining`;
    } else if (totalSeconds < 3600) {
      // Less than 1 hour
      const mins = Math.floor(totalSeconds / 60);
      return `${mins}m remaining`;
    } else {
      return timeString;
    }
  };

  const handleImagePick = async () => {
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
      console.error('Error picking image:', error);
    }
  };

  const handleUpload = async () => {
    if (!selectedImage) return;

    try {
      setIsUploading(true);
      // TODO: Implement image upload to storage and submission to competition
      console.log('Uploading image:', selectedImage);
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
      {/* Header */}
      <View className="mt-20 px-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={() => router.back()} className="rounded-full bg-white/20 p-2">
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
              Create your masterpiece!
            </Text>
          </View>
          <View className="w-10" /> {/* Spacer to balance the back button */}
        </View>
      </View>

      {/* Timer Section */}
      <View className="mt-8 items-center">
        <View className="flex-row items-center space-x-2 rounded-full bg-[#FFD700] px-6 py-3">
          <Ionicons name="time-outline" size={24} color="#FF8C00" />
          <Text className="text-lg font-semibold text-[#1A1A1A]">{formatTimeLeft(timeLeft)}</Text>
        </View>
      </View>

      {/* Upload Section */}
      <View className="mt-8 flex-1 items-center px-4">
        {selectedImage ? (
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
    </View>
  );
}
