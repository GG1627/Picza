import { View, Text, StatusBar, TouchableOpacity, Button, Alert } from 'react-native';
import { useColorScheme } from '../../lib/useColorScheme';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import ViewerModal from '../../components/ViewerModal';
import { useAuth } from '../../lib/useAuth';
import { supabase } from '../../lib/supabase';
import { generateRandomMorningLunchCompetitionName } from '~/lib/generateRandomName';
import {
  CompetitionStatus,
  createCompetition,
  deleteCompetition,
  getAllCompetitionsStatus,
  AllCompetitionsStatus,
  joinCompetition,
  isUserParticipant,
} from '~/lib/competitions';
import MorningCompModal from '~/components/MorningCompModal';

const getRandomMorningLunchCompetitionName = () => {
  return generateRandomMorningLunchCompetitionName();
};

export default function CompetitionsScreen() {
  const { colorScheme } = useColorScheme();
  const { user } = useAuth();
  const [isMorningModalVisible, setIsMorningModalVisible] = useState(false);
  const [competitionsStatus, setCompetitionsStatus] = useState<AllCompetitionsStatus>({
    morning: { phase: 'completed', timeRemaining: 0, nextPhaseTime: null, name: null, id: null },
    noon: { phase: 'completed', timeRemaining: 0, nextPhaseTime: null, name: null, id: null },
    night: { phase: 'completed', timeRemaining: 0, nextPhaseTime: null, name: null, id: null },
  });

  // Move fetchStatus outside useEffect
  const fetchStatus = async () => {
    try {
      const status = await getAllCompetitionsStatus();
      setCompetitionsStatus(status);
    } catch (error) {
      console.error('Error fetching competition status:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchStatus();

    // Set up interval for both status updates and countdown
    const timer = setInterval(() => {
      fetchStatus();
      setCompetitionsStatus((prev) => ({
        morning: {
          ...prev.morning,
          timeRemaining: Math.max(0, prev.morning.timeRemaining - 1),
        },
        noon: {
          ...prev.noon,
          timeRemaining: Math.max(0, prev.noon.timeRemaining - 1),
        },
        night: {
          ...prev.night,
          timeRemaining: Math.max(0, prev.night.timeRemaining - 1),
        },
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Helper function to format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return "Time's up!";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  };

  // Get phase-specific message
  const getPhaseMessage = (phase: string) => {
    switch (phase) {
      case 'registration':
        console.log('registration');
        return 'Time left to join:';
      case 'competing':
        console.log('competing');
        return 'Time left til voting begins:';
      case 'voting':
        // console.log('voting');
        return 'Time left to vote:';
      case 'completed':
        // console.log('completed');
        return 'Competition completed';
      default:
        return '';
    }
  };

  const handleMorningCompetitionPress = async () => {
    if (competitionsStatus.morning.phase === 'registration') {
      console.log('registration');
      setIsMorningModalVisible(true);
    } else if (competitionsStatus.morning.phase === 'competing') {
      // check if user is a participant in the competition
      if (!user) {
        Alert.alert('Please login to join a competition');
        return;
      }

      if (!competitionsStatus.morning.id) {
        Alert.alert('Error', 'Competition not found');
        return;
      }

      const isParticipant = await isUserParticipant(competitionsStatus.morning.id, user.id);

      if (isParticipant) {
        router.push('/morningCompetition');
      } else {
        // show viewer modal
        // setIsViewerModalVisible(true);
      }
    }
  };

  return (
    <View className={`flex-1 ${colorScheme === 'dark' ? 'bg-[#121113]' : 'bg-[#e0e0e0]'}`}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      {/* Title Section */}
      <View className="mb-8 mt-20 px-4 pt-2">
        <Text
          className={`text-center text-3xl font-bold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Let's Compete!
        </Text>
        <Text
          className={`mt-1 text-center text-base ${colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          Challenge yourself against others
        </Text>
      </View>
      <View className="flex-row justify-center gap-4">
        <Button
          title="Make Comp"
          onPress={async () => {
            const success = await createCompetition('morning', user);
            if (success) {
              fetchStatus();
            }
          }}
        />
        <Button
          title="Delete Comp"
          onPress={async () => {
            const success = await deleteCompetition('morning', user);
            if (success) {
              fetchStatus();
            }
          }}
        />
      </View>
      {/* Competition Boxes Container */}
      <View className="h-[65%] px-4 pb-0">
        {/* Morning Competition */}
        <TouchableOpacity
          onPress={() => {
            handleMorningCompetitionPress();
          }}
          className={`mb-4 w-full flex-1 items-center justify-center rounded-xl ${
            colorScheme === 'dark' ? 'bg-[#fa6f48]' : 'bg-white'
          }`}>
          <View className="absolute left-0 top-0 flex-row items-center gap-2 p-2">
            <Ionicons name="sunny-outline" size={24} color="black" />
            <Text className="text-lg font-bold text-black">Morning Competition</Text>
          </View>
          <View className="items center absolute bottom-0 left-0 p-2">
            <Text className="text-lg font-bold text-black">
              {getPhaseMessage(competitionsStatus.morning.phase)}
              {competitionsStatus.morning.phase !== 'completed' &&
                ` ${formatTimeRemaining(competitionsStatus.morning.timeRemaining)}`}
            </Text>
          </View>
          <Text
            className={`text-lg font-semibold ${colorScheme === 'dark' ? 'text-black' : 'text-gray-900'}`}>
            {competitionsStatus.morning.name || 'No active competition'}
          </Text>
        </TouchableOpacity>

        {/* Noon Competition */}
        <TouchableOpacity
          className={`mb-4 w-full flex-1 items-center justify-center rounded-xl ${
            colorScheme === 'dark' ? 'bg-[#fa8f48]' : 'bg-white'
          }`}>
          {/* <View className="absolute left-0 top-0 flex-row items-center gap-2 p-2">
            <Ionicons name="sunny-outline" size={24} color="black" />
            <Text className="text-lg font-bold text-black">Noon Competition</Text>
          </View>
          <View className="items center absolute bottom-0 left-0 p-2">
            <Text className="text-lg font-bold text-black">
              {getPhaseMessage(competitionsStatus.noon.phase)}
              {competitionsStatus.noon.phase !== 'completed' &&
                ` ${formatTimeRemaining(competitionsStatus.noon.timeRemaining)}`}
            </Text>
          </View>
          <Text
            className={`text-lg font-semibold ${colorScheme === 'dark' ? 'text-black' : 'text-gray-900'}`}>
            {competitionsStatus.noon.name || 'No active competition'}
          </Text> */}
        </TouchableOpacity>

        {/* Night Competition */}
        <TouchableOpacity
          className={`mb-4 w-full flex-1 items-center justify-center rounded-xl ${
            colorScheme === 'dark' ? 'bg-[#faa448]' : 'bg-white'
          }`}>
          {/* <View className="absolute left-0 top-0 flex-row items-center gap-2 p-2">
            <Ionicons name="moon-outline" size={24} color="black" />
            <Text className="text-lg font-bold text-black">Night Competition</Text>
          </View>
          <View className="items center absolute bottom-0 left-0 p-2">
            <Text className="text-lg font-bold text-black">
              {getPhaseMessage(competitionsStatus.night.phase)}
              {competitionsStatus.night.phase !== 'completed' &&
                ` ${formatTimeRemaining(competitionsStatus.night.timeRemaining)}`}
            </Text>
          </View>
          <Text
            className={`text-lg font-semibold ${colorScheme === 'dark' ? 'text-black' : 'text-gray-900'}`}>
            {competitionsStatus.night.name || 'No active competition'}
          </Text> */}
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <MorningCompModal
        isVisible={isMorningModalVisible}
        onClose={() => setIsMorningModalVisible(false)}
        competitionName={competitionsStatus.morning.name}
        competitionId={competitionsStatus.morning.id}
        user={user}
      />
    </View>
  );
}
