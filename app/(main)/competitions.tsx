import { View, Text, StatusBar, TouchableOpacity, Button, Alert, Image, Modal } from 'react-native';
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

type Winner = {
  username: string;
  image_url: string;
  vote_count: number;
} | null;

const getRandomMorningLunchCompetitionName = () => {
  return generateRandomMorningLunchCompetitionName();
};

export default function CompetitionsScreen() {
  const { colorScheme } = useColorScheme();
  const { user } = useAuth();
  const [isMorningModalVisible, setIsMorningModalVisible] = useState(false);
  const [winner, setWinner] = useState<Winner>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [competitionsStatus, setCompetitionsStatus] = useState<AllCompetitionsStatus>({
    morning: { phase: 'completed', timeRemaining: 0, nextPhaseTime: null, name: null, id: null },
    noon: { phase: 'completed', timeRemaining: 0, nextPhaseTime: null, name: null, id: null },
    night: { phase: 'completed', timeRemaining: 0, nextPhaseTime: null, name: null, id: null },
  });

  // Fetch winner when competition is completed
  const fetchWinner = async (competitionId: string) => {
    try {
      // First get all submissions with their vote counts
      const { data: submissions, error: subError } = await supabase
        .from('submissions')
        .select(
          `
          id,
          image_url,
          user_id
        `
        )
        .eq('competition_id', competitionId);

      if (subError) throw subError;

      // If no submissions, set winner to null
      if (!submissions || submissions.length === 0) {
        setWinner(null);
        return;
      }

      // Get vote counts for each submission
      const submissionsWithVotes = await Promise.all(
        submissions.map(async (submission) => {
          const { count } = await supabase
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('submission_id', submission.id);

          return {
            ...submission,
            vote_count: count || 0,
          };
        })
      );

      // Find the submission with the highest vote count
      const winningSubmission = submissionsWithVotes.reduce((prev, current) => {
        return current.vote_count > prev.vote_count ? current : prev;
      });

      if (winningSubmission) {
        // Get the username for the winning submission
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', winningSubmission.user_id)
          .single();

        setWinner({
          username: profile?.username || 'Unknown',
          image_url: winningSubmission.image_url,
          vote_count: winningSubmission.vote_count,
        });
      }
    } catch (error) {
      console.error('Error fetching winner:', error);
      setWinner(null);
    }
  };

  // Move fetchStatus outside useEffect
  const fetchStatus = async () => {
    try {
      const status = await getAllCompetitionsStatus();
      setCompetitionsStatus(status);

      // If morning competition is completed, fetch the winner
      if (status.morning.phase === 'completed' && status.morning.id) {
        fetchWinner(status.morning.id);
      }
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

  // Get phase-specific message
  const getPhaseMessage = (phase: string) => {
    switch (phase) {
      case 'registration':
        return 'Time left to join:';
      case 'competing':
        return 'Time left til voting begins:';
      case 'voting':
        return 'Time left to vote:';
      case 'completed':
        return 'Next comp in:';
      default:
        return '';
    }
  };

  // Helper function to format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return "Time's up!";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours}h ${minutes}m ${remainingSeconds}s`;
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
        Alert.alert(
          'Competition in Progress',
          'The competition has begun. Come back in a bit for voting!'
        );
      }
    } else if (competitionsStatus.morning.phase === 'voting') {
      router.push('/morningVoting');
    } else if (competitionsStatus.morning.phase === 'completed') {
      router.push('/morningResults');
    } else {
      Alert.alert('Error', 'Competition not found');
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

          {competitionsStatus.morning.phase === 'completed' ? (
            <View className="w-full flex-1">
              {winner ? (
                <>
                  {/* Winner Info and Image */}
                  <View className="flex-1 flex-row items-center justify-between px-4">
                    {/* Left side - Winner Info */}
                    <View className="ml-[3.5rem] flex-1 items-start space-y-2">
                      <Text className="text-2xl font-bold text-black">Winner!</Text>
                      <Text className="text-xl text-black">{winner.username}</Text>
                      <Text className="text-lg text-black">with {winner.vote_count} votes</Text>
                    </View>

                    {/* Right side - Image */}
                    <TouchableOpacity
                      onPress={() => setSelectedImage(winner.image_url)}
                      className="h-36 w-36 overflow-hidden rounded-lg border-2 border-black">
                      <Image
                        source={{ uri: winner.image_url }}
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-xl font-semibold text-black">No Participants</Text>
                  <Text className="mt-2 text-black">This competition had no submissions</Text>
                </View>
              )}

              {/* Bottom - Timer */}
              <View className="absolute bottom-0 left-0 p-2">
                <Text className="text-lg font-bold text-black">
                  {getPhaseMessage(competitionsStatus.morning.phase)}
                  {` ${formatTimeRemaining(competitionsStatus.morning.timeRemaining)}`}
                </Text>
              </View>
            </View>
          ) : (
            <>
              <View className="items center absolute bottom-0 left-0 p-2">
                <Text className="text-lg font-bold text-black">
                  {getPhaseMessage(competitionsStatus.morning.phase)}
                  {competitionsStatus.morning.phase === 'registration' ||
                  competitionsStatus.morning.phase === 'competing' ||
                  competitionsStatus.morning.phase === 'voting'
                    ? ` ${formatTimeRemaining(competitionsStatus.morning.timeRemaining)}`
                    : ''}
                </Text>
              </View>
              <Text
                className={`text-lg font-semibold ${colorScheme === 'dark' ? 'text-black' : 'text-gray-900'}`}>
                {competitionsStatus.morning.name || 'No active competition'}
              </Text>
            </>
          )}
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

      {/* Image Preview Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
          className="flex-1 items-center justify-center bg-black/90">
          {selectedImage && (
            <Image source={{ uri: selectedImage }} className="h-3/4 w-full" resizeMode="contain" />
          )}
        </TouchableOpacity>
      </Modal>

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
