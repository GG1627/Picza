import { View, Text, StatusBar, TouchableOpacity, Button } from 'react-native';
import { useColorScheme } from '../../lib/useColorScheme';
import { generateRandomBreakfastName } from '../../lib/generateRandomName';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import BreakfastModal from '../../components/BreakfastModal';
import ViewerModal from '../../components/ViewerModal';
import {
  getCurrentBreakfastCompetition,
  getBreakfastParticipantCount,
  checkAndUpdateCompetitionStatus,
  hasUserJoinedCompetition,
  getCompetitionPhase,
  getTimeUntilNextPhase,
  CompetitionPhase,
} from '../../lib/competitions';
import { useAuth } from '../../lib/useAuth';

// function for getting a random breakfast name
const getRandomBreakfastName = () => {
  return generateRandomBreakfastName();
};

// Timer component
const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState('');
  const [isTimeUp, setIsTimeUp] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date();

      // Set target to next Monday at 8 AM
      target.setHours(8, 0, 0, 0);
      target.setDate(now.getDate() + ((8 - now.getDay() + 7) % 7));

      // If we're past Monday 8 AM, set to next Monday
      if (now > target) {
        target.setDate(target.getDate() + 7);
      }

      const difference = target.getTime() - now.getTime();

      // Check if time is up (less than 1 minute remaining)
      if (difference < 60000) {
        setIsTimeUp(true);
        setTimeLeft("Time's Up!");
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);

      // Format the time display based on remaining time
      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h until breakfast`);
      } else {
        setTimeLeft(`${hours}h ${minutes}m until breakfast`);
      }
    };

    // Update immediately
    calculateTimeLeft();

    // Update every minute instead of every second
    const timer = setInterval(calculateTimeLeft, 60000);

    // Cleanup on unmount
    return () => clearInterval(timer);
  }, []);

  return <Text className="text-sm text-[#1A1A1A]">{timeLeft}</Text>;
};

export default function CompetitionsScreen() {
  const { colorScheme } = useColorScheme();
  const { user } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isViewerModalVisible, setIsViewerModalVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [participantCount, setParticipantCount] = useState(0);
  const [currentCompetition, setCurrentCompetition] = useState<any>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [competitionPhase, setCompetitionPhase] = useState<CompetitionPhase>('registration');

  const formatTimeLeft = (timeString: string) => {
    // Convert the time string (milliseconds) to a number
    const totalMilliseconds = parseInt(timeString);
    if (isNaN(totalMilliseconds)) return timeString;

    const totalSeconds = Math.floor(totalMilliseconds / 1000);

    if (totalSeconds < 0) {
      return `${timeLeft} until voting`;
    }

    if (totalSeconds <= 60) {
      // Less than or equal to 1 minute, show seconds
      return `${totalSeconds}s remaining`;
    } else if (totalSeconds < 300) {
      // Less than 5 minutes, show minutes and seconds
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${mins}m ${secs}s remaining`;
    } else if (totalSeconds < 3600) {
      // Less than 1 hour, show minutes and seconds
      const mins = Math.floor(totalSeconds / 60);
      const secs = totalSeconds % 60;
      return `${mins}m ${secs}s remaining`;
    } else if (totalSeconds < 86400) {
      // Less than 1 day
      const hours = Math.floor(totalSeconds / 3600);
      const mins = Math.floor((totalSeconds % 3600) / 60);
      return `${hours}h ${mins}m remaining`;
    } else {
      // More than 1 day
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      return `${days}d ${hours}h remaining`;
    }
  };

  const handleBreakfastPress = () => {
    if (!currentCompetition) {
      console.log('No active competition found');
      return;
    }

    // During registration phase, show the breakfast modal
    if (competitionPhase === 'registration') {
      setIsModalVisible(true);
      return;
    }

    // During competition phase, show viewer modal only for non-competitors
    if (competitionPhase === 'competition') {
      if (!hasJoined) {
        setIsViewerModalVisible(true);
      } else {
        router.push({
          pathname: '/breakfastCompetition',
          params: { competitionId: currentCompetition.id },
        });
      }
      return;
    }

    // During voting phase, redirect everyone to bracket screen
    if (competitionPhase === 'voting') {
      router.push('/breakfastBracket');
      return;
    }

    // During completed phase, do nothing (winner is shown in the box)
    if (competitionPhase === 'completed') {
      return;
    }
  };

  useEffect(() => {
    const fetchCompetitionData = async () => {
      try {
        const competition = await checkAndUpdateCompetitionStatus();
        if (!competition) {
          console.log('No active competition found');
          setTimeLeft('No active competition');
          setParticipantCount(0);
          setHasJoined(false);
          return;
        }
        setCurrentCompetition(competition);

        const count = await getBreakfastParticipantCount(competition.id);
        setParticipantCount(count || 0);

        // Check if user has joined
        if (user) {
          const joined = await hasUserJoinedCompetition(competition.id, user.id);
          setHasJoined(joined);
        }

        // Get competition phase
        const phase = await getCompetitionPhase(competition.id);
        setCompetitionPhase(phase);

        // Get time until next phase
        const timeUntilNext = await getTimeUntilNextPhase(competition.id);
        setTimeLeft(formatTimeLeft(timeUntilNext));
      } catch (error) {
        console.error('Error fetching competition data:', error);
        setTimeLeft('Loading...');
        setParticipantCount(0);
        setHasJoined(false);
      }
    };

    fetchCompetitionData();
    const interval = setInterval(fetchCompetitionData, 100); // Update every 100ms for smoother countdown
    return () => clearInterval(interval);
  }, [user]);

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

      {/* Competition Boxes Container */}
      <View className="h-[65%] px-4 pb-5">
        {/* Box 1 - Breakfast Competition */}
        <TouchableOpacity
          onPress={handleBreakfastPress}
          className={`mb-4 h-1/4 w-full overflow-hidden rounded-2xl ${
            colorScheme === 'dark' ? 'bg-[#FFD700]' : 'bg-[#FFD700]'
          }`}>
          {/* Gradient overlay */}
          <View className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/80 via-[#FFE44D]/60 to-[#FFD700]/40" />

          {/* Content */}
          <View className="flex-1 p-4">
            {competitionPhase === 'completed' ? (
              // Winner Display
              <View className="flex-1 items-center justify-center">
                <Text className="text-center text-2xl font-bold text-[#1A1A1A]">Winner!</Text>
                <View className="mt-2 flex-row items-center space-x-2">
                  <Ionicons name="trophy" size={24} color="#FF8C00" />
                  <Text className="text-lg font-semibold text-[#1A1A1A]">John Doe</Text>
                </View>
                <Text className="mt-1 text-sm text-[#1A1A1A]">with "Amazing Pancakes"</Text>
              </View>
            ) : (
              // Regular Competition Display
              <>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center space-x-2">
                    <Ionicons name="sunny" size={24} color="#FF8C00" />
                    <Text className="ml-1 text-lg font-semibold text-[#1A1A1A]">
                      Breakfast Challenge
                    </Text>
                  </View>
                  {competitionPhase === 'registration' && hasJoined && (
                    <View className="rounded-full bg-green-500 px-3 py-1">
                      <Text className="text-sm font-medium text-white">Joined</Text>
                    </View>
                  )}
                  {competitionPhase === 'competition' && (
                    <View className="rounded-full bg-green-500 px-3 py-1">
                      <Text className="text-sm font-medium text-white">In Progress</Text>
                    </View>
                  )}
                  {competitionPhase === 'voting' && (
                    <View className="rounded-full bg-[#FF8C00] px-3 py-1">
                      <Text className="text-sm font-medium text-white">Vote Now!</Text>
                    </View>
                  )}
                </View>

                <View className="mt-2 flex-1 items-center justify-center">
                  <Text className="text-center text-2xl font-bold text-[#1A1A1A]">
                    {currentCompetition?.theme || 'Loading...'}
                  </Text>
                </View>

                <View className="mt-2 flex-row items-center justify-between">
                  <View className="flex-row items-center space-x-1 rounded-full bg-white/30 px-3 py-1">
                    <Ionicons name="time-outline" size={16} color="#FF8C00" />
                    <Text className="ml-1 text-sm text-[#1A1A1A]">
                      {competitionPhase === 'registration' && `${timeLeft} to join`}
                      {competitionPhase === 'competition' && `${timeLeft} until voting`}
                      {competitionPhase === 'voting' && `${timeLeft} to vote`}
                    </Text>
                  </View>
                  <View className="rounded-full bg-white/30 px-3 py-1">
                    <Text className="text-sm font-medium text-[#1A1A1A]">
                      {participantCount}/16 participants
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>

        {/* Other competition boxes */}
        <TouchableOpacity
          className={`mb-4 h-1/4 w-full items-center justify-center rounded-xl ${
            colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
          <Text
            className={`text-lg font-semibold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Competition 2
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`mb-4 h-1/4 w-full items-center justify-center rounded-xl ${
            colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
          <Text
            className={`text-lg font-semibold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Competition 3
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`h-1/4 w-full items-center justify-center rounded-xl ${
            colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}>
          <Text
            className={`text-lg font-semibold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Competition 4
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <BreakfastModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        timeLeft={timeLeft}
        competitionId={currentCompetition?.id}
        onJoin={() => setHasJoined(true)}
        hasJoined={hasJoined}
      />

      <ViewerModal
        isVisible={isViewerModalVisible}
        onClose={() => setIsViewerModalVisible(false)}
        timeLeft={timeLeft}
      />
    </View>
  );
}
