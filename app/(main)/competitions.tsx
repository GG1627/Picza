import { View, Text, StatusBar, TouchableOpacity, Button, Alert, Image, Modal } from 'react-native';
import { useColorScheme } from '../../lib/useColorScheme';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  getParticipantCount,
} from '~/lib/competitions';
import CompModal from '~/components/CompModal';
import setTime from '../sharedTime';

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
  const [isNoonModalVisible, setIsNoonModalVisible] = useState(false);
  const [isNightModalVisible, setIsNightModalVisible] = useState(false);
  const [winner, setWinner] = useState<Winner>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [numberOfParticipants, setNumberOfParticipants] = useState(0);

  const [morningWinner, setMorningWinner] = useState<Winner>(null);
  const [noonWinner, setNoonWinner] = useState<Winner>(null);
  const [nightWinner, setNightWinner] = useState<Winner>(null);

  const [morningParticipants, setMorningParticipants] = useState(0);
  const [noonParticipants, setNoonParticipants] = useState(0);
  const [nightParticipants, setNightParticipants] = useState(0);

  const [competitionsStatus, setCompetitionsStatus] = useState<AllCompetitionsStatus>({
    morning: { phase: 'completed', timeRemaining: 0, nextPhaseTime: null, name: null, id: null },
    noon: { phase: 'completed', timeRemaining: 0, nextPhaseTime: null, name: null, id: null },
    night: { phase: 'completed', timeRemaining: 0, nextPhaseTime: null, name: null, id: null },
  });

  // Fetch winner when competition is completed
  const fetchWinner = async (competitionId: string, type: 'morning' | 'noon' | 'night') => {
    try {
      // First get all submissions with their vote counts
      const { data: submissions, error: subError } = await supabase
        .from('submissions')
        .select(
          `
          id,
          image_url,
          user_id,
          status
        `
        )
        .eq('competition_id', competitionId)
        .eq('status', 'submitted');

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

        const winnerData = {
          username: profile?.username || 'Unknown',
          image_url: winningSubmission.image_url,
          vote_count: winningSubmission.vote_count,
        };

        switch (type) {
          case 'morning':
            setMorningWinner(winnerData);
            break;
          case 'noon':
            setNoonWinner(winnerData);
            break;
          case 'night':
            setNightWinner(winnerData);
            break;
        }
      }
    } catch (error) {
      console.error('Error fetching winner:', error);
      // Set the appropriate winner state to null based on type
      switch (type) {
        case 'morning':
          setMorningWinner(null);
          break;
        case 'noon':
          setNoonWinner(null);
          break;
        case 'night':
          setNightWinner(null);
          break;
      }
    }
  };

  // Move fetchStatus outside useEffect
  const fetchStatus = async () => {
    try {
      const status = await getAllCompetitionsStatus();
      setCompetitionsStatus(status);

      // If morning competition is in registration or competing phase, fetch participant count
      // If morning competition is completed, fetch the winner
      if (status.morning.id) {
        if (status.morning.phase === 'registration' || status.morning.phase === 'competing') {
          const count = await getParticipantCount(status.morning.id);
          setMorningParticipants(count);
        }
        if (status.morning.phase == 'completed') {
          fetchWinner(status.morning.id, 'morning');
        }
      }

      //Same for noon competitions
      if (status.noon.id) {
        if (status.noon.phase === 'registration' || status.noon.phase === 'competing') {
          const count = await getParticipantCount(status.noon.id);
          setNoonParticipants(count);
        }
        if (status.noon.phase == 'completed') {
          fetchWinner(status.noon.id, 'noon');
        }
      }

      // night competition
      if (status.night.id) {
        if (status.night.phase === 'registration' || status.night.phase === 'competing') {
          const count = await getParticipantCount(status.night.id);
          setNightParticipants(count);
        }
        if (status.night.phase == 'completed') {
          fetchWinner(status.night.id, 'night');
        }
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
        return 'Entry ends in:';
      case 'competing':
        return 'Cooking ends in:';
      case 'voting':
        return 'Voting closes in:';
      case 'completed':
        return 'Next competition:';
      default:
        return '';
    }
  };

  // Helper function to format time remaining
  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return "Time's up!";

    const SECONDS_IN_DAY = 86400; // 24 * 60 * 60
    const SECONDS_IN_HOUR = 3600; // 60 * 60
    const SECONDS_IN_MINUTE = 60;

    if (seconds >= SECONDS_IN_DAY) {
      const days = Math.floor(seconds / SECONDS_IN_DAY);
      const remainingHours = Math.floor((seconds % SECONDS_IN_DAY) / SECONDS_IN_HOUR);
      return `${days}d ${remainingHours}h`;
    } else if (seconds >= SECONDS_IN_HOUR) {
      const hours = Math.floor(seconds / SECONDS_IN_HOUR);
      const remainingMinutes = Math.floor((seconds % SECONDS_IN_HOUR) / SECONDS_IN_MINUTE);
      return `${hours}h ${remainingMinutes}m`;
    } else if (seconds >= SECONDS_IN_MINUTE) {
      const minutes = Math.floor(seconds / SECONDS_IN_MINUTE);
      const remainingSeconds = seconds % SECONDS_IN_MINUTE;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${seconds}s`;
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
        setTime('morning');
        router.push('/allCompetition');
      } else {
        Alert.alert(
          'Competition in Progress',
          'The competition has begun. Come back in a bit for voting!'
        );
      }
    } else if (competitionsStatus.morning.phase === 'voting') {
      router.push('/allVoting');
    } else if (competitionsStatus.morning.phase === 'completed') {
      router.push('/allResults');
    } else {
      Alert.alert('Error', 'Competition not found');
    }
  };

  const handleNoonCompetitionPress = async () => {
    if (competitionsStatus.noon.phase === 'registration') {
      console.log('registration');
      setIsNoonModalVisible(true);
    } else if (competitionsStatus.noon.phase === 'competing') {
      // check if user is a participant in the competition
      if (!user) {
        Alert.alert('Please login to join a competition');
        return;
      }

      if (!competitionsStatus.noon.id) {
        Alert.alert('Error', 'Competition not found');
        return;
      }

      const isParticipant = await isUserParticipant(competitionsStatus.noon.id, user.id);

      if (isParticipant) {
        setTime('noon');
        router.push('/allCompetition');
      } else {
        Alert.alert(
          'Competition in Progress',
          'The competition has begun. Come back in a bit for voting!'
        );
      }
    } else if (competitionsStatus.noon.phase === 'voting') {
      router.push('/allVoting');
    } else if (competitionsStatus.noon.phase === 'completed') {
      router.push('/allResults');
    } else {
      Alert.alert('Error', 'Competition not found');
    }
  };

  const handleNightCompetitionPress = async () => {
    if (competitionsStatus.night.phase === 'registration') {
      console.log('registration');
      setIsNightModalVisible(true);
    } else if (competitionsStatus.night.phase === 'competing') {
      // check if user is a participant in the competition
      if (!user) {
        Alert.alert('Please login to join a competition');
        return;
      }

      if (!competitionsStatus.night.id) {
        Alert.alert('Error', 'Competition not found');
        return;
      }

      const isParticipant = await isUserParticipant(competitionsStatus.night.id, user.id);

      if (isParticipant) {
        setTime('night');
        router.push('/allCompetition');
      } else {
        Alert.alert(
          'Competition in Progress',
          'The competition has begun. Come back in a bit for voting!'
        );
      }
    } else if (competitionsStatus.night.phase === 'voting') {
      router.push('/allVoting');
    } else if (competitionsStatus.night.phase === 'completed') {
      router.push('/allResults');
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
            const success = await createCompetition('noon', user);
            if (success) {
              fetchStatus();
            }
          }}
        />
        <Button
          title="Delete Comp"
          onPress={async () => {
            const success = await deleteCompetition('noon', user);
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
          className={`mb-4 w-full flex-1 items-center justify-center overflow-hidden rounded-2xl ${
            colorScheme === 'dark' ? 'bg-[#fa6f48]' : 'bg-white'
          }`}>
          {/* Header Section */}
          <View className="absolute left-0 top-0 flex-row items-center gap-2 p-4">
            <View className="rounded-full bg-white/20 p-2">
              <Ionicons name="sunny" size={24} color="black" />
            </View>
            <Text className="text-lg font-bold text-black">Morning Competition</Text>
          </View>

          {/* Status Badges */}
          {competitionsStatus.morning.phase === 'registration' ? (
            <>
              <View className="absolute right-0 top-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">Join Now!</Text>
                </View>
              </View>
              <View className="absolute bottom-0 right-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">{morningParticipants}/9</Text>
                </View>
              </View>
            </>
          ) : competitionsStatus.morning.phase === 'competing' ? (
            <>
              <View className="absolute right-0 top-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">In Progress!</Text>
                </View>
              </View>
              <View className="absolute bottom-0 right-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">{morningParticipants}/9</Text>
                </View>
              </View>
            </>
          ) : competitionsStatus.morning.phase === 'voting' ? (
            <>
              <View className="absolute right-0 top-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">Vote Now!</Text>
                </View>
              </View>
              <View className="absolute bottom-0 right-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">{morningParticipants}/9</Text>
                </View>
              </View>
            </>
          ) : null}

          {competitionsStatus.morning.phase === 'completed' ? (
            <View className="w-full flex-1">
              {morningWinner && competitionsStatus.morning.id ? (
                <>
                  {/* Winner Info and Image */}
                  <View className="flex-1 flex-row items-center justify-between px-6">
                    {/* Left side - Winner Info */}
                    <View className="flex-1 items-center space-y-3">
                      <Text className="text-2xl font-bold text-black">Winner!</Text>
                      <Text className="text-2xl text-black">{morningWinner?.username}</Text>
                      <Text className="text-lg text-black/80">
                        with {morningWinner?.vote_count} votes
                      </Text>
                    </View>

                    {/* Right side - Image */}
                    <TouchableOpacity
                      onPress={() => setSelectedImage(morningWinner?.image_url || null)}
                      className="h-32 w-32 overflow-hidden rounded-xl border-2 border-black shadow-lg">
                      <Image
                        source={{ uri: morningWinner?.image_url }}
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-2xl font-semibold text-black">No Submissions</Text>
                  <Text className="mt-2 text-black/80">This competition had no submissions</Text>
                </View>
              )}

              {/* Bottom - Timer */}
              <View className="absolute bottom-0 left-0 p-4">
                <Text className="text-lg font-bold text-black">
                  {getPhaseMessage(competitionsStatus.morning.phase)}
                  {` ${formatTimeRemaining(competitionsStatus.morning.timeRemaining)}`}
                </Text>
              </View>
            </View>
          ) : (
            <>
              <View className="absolute bottom-0 left-0 p-4">
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
                className={`text-3xl font-bold ${colorScheme === 'dark' ? 'text-black' : 'text-gray-900'}`}>
                {competitionsStatus.morning.name || 'No active competition'}
              </Text>
              {competitionsStatus.morning.phase === 'competing' && (
                <Text className="mt-2 text-center text-black/80">Time to submit your entry!</Text>
              )}
            </>
          )}
        </TouchableOpacity>

        {/* Noon Competition */}
        <TouchableOpacity
          onPress={() => {
            handleNoonCompetitionPress();
          }}
          className={`mb-4 w-full flex-1 items-center justify-center overflow-hidden rounded-2xl ${
            colorScheme === 'dark' ? 'bg-[#fa8f48]' : 'bg-white'
          }`}>
          {/* Header Section */}
          <View className="absolute left-0 top-0 flex-row items-center gap-2 p-4">
            <View className="rounded-full bg-white/20 p-2">
              <Ionicons name="partly-sunny" size={24} color="black" />
            </View>
            <Text className="text-lg font-bold text-black">Afternoon Competition</Text>
          </View>

          {/* Status Badges */}
          {competitionsStatus.noon.phase === 'registration' ? (
            <>
              <View className="absolute right-0 top-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">Join Now!</Text>
                </View>
              </View>
              <View className="absolute bottom-0 right-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">{noonParticipants}/9</Text>
                </View>
              </View>
            </>
          ) : competitionsStatus.noon.phase === 'competing' ? (
            <>
              <View className="absolute right-0 top-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">In Progress!</Text>
                </View>
              </View>
              <View className="absolute bottom-0 right-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">{noonParticipants}/9</Text>
                </View>
              </View>
            </>
          ) : competitionsStatus.noon.phase === 'voting' ? (
            <>
              <View className="absolute right-0 top-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">Vote Now!</Text>
                </View>
              </View>
              <View className="absolute bottom-0 right-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">{noonParticipants}/9</Text>
                </View>
              </View>
            </>
          ) : null}

          {competitionsStatus.noon.phase === 'completed' ? (
            <View className="w-full flex-1">
              {noonWinner && competitionsStatus.noon.id ? (
                <>
                  {/* Winner Info and Image */}
                  <View className="flex-1 flex-row items-center justify-between px-6">
                    {/* Left side - Winner Info */}
                    <View className="flex-1 items-center space-y-3">
                      <Text className="text-2xl font-bold text-black">Winner!</Text>
                      <Text className="text-2xl text-black">{noonWinner?.username}</Text>
                      <Text className="text-lg text-black/80">
                        with {noonWinner?.vote_count} votes
                      </Text>
                    </View>

                    {/* Right side - Image */}
                    <TouchableOpacity
                      onPress={() => setSelectedImage(noonWinner?.image_url || null)}
                      className="h-32 w-32 overflow-hidden rounded-xl border-2 border-black shadow-lg">
                      <Image
                        source={{ uri: noonWinner?.image_url }}
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-2xl font-semibold text-black">No Submissions</Text>
                  <Text className="mt-2 text-black/80">This competition had no submissions</Text>
                </View>
              )}

              {/* Bottom - Timer */}
              <View className="absolute bottom-0 left-0 p-4">
                <Text className="text-lg font-bold text-black">
                  {getPhaseMessage(competitionsStatus.noon.phase)}
                  {` ${formatTimeRemaining(competitionsStatus.noon.timeRemaining)}`}
                </Text>
              </View>
            </View>
          ) : (
            <>
              <View className="absolute bottom-0 left-0 p-4">
                <Text className="text-lg font-bold text-black">
                  {getPhaseMessage(competitionsStatus.noon.phase)}
                  {competitionsStatus.noon.phase === 'registration' ||
                  competitionsStatus.noon.phase === 'competing' ||
                  competitionsStatus.noon.phase === 'voting'
                    ? ` ${formatTimeRemaining(competitionsStatus.noon.timeRemaining)}`
                    : ''}
                </Text>
              </View>
              <Text
                className={`text-3xl font-bold ${colorScheme === 'dark' ? 'text-black' : 'text-gray-900'}`}>
                {competitionsStatus.noon.name || 'No active competition'}
              </Text>
              {competitionsStatus.noon.phase === 'competing' && (
                <Text className="mt-2 text-center text-black/80">Time to submit your entry!</Text>
              )}
            </>
          )}
        </TouchableOpacity>

        {/* Night Competition */}
        <TouchableOpacity
          onPress={() => {
            handleNightCompetitionPress();
          }}
          className={`mb-4 w-full flex-1 items-center justify-center overflow-hidden rounded-2xl ${
            colorScheme === 'dark' ? 'bg-[#faa748]' : 'bg-white'
          }`}>
          {/* Header Section */}
          <View className="absolute left-0 top-0 flex-row items-center gap-2 p-4">
            <View className="rounded-full bg-white/20 p-2">
              <Ionicons name="moon" size={24} color="black" />
            </View>
            <Text className="text-lg font-bold text-black">Night Competition</Text>
          </View>

          {/* Status Badges */}
          {competitionsStatus.night.phase === 'registration' ? (
            <>
              <View className="absolute right-0 top-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">Join Now!</Text>
                </View>
              </View>
              <View className="absolute bottom-0 right-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">{nightParticipants}/9</Text>
                </View>
              </View>
            </>
          ) : competitionsStatus.night.phase === 'competing' ? (
            <>
              <View className="absolute right-0 top-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">In Progress!</Text>
                </View>
              </View>
              <View className="absolute bottom-0 right-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">{nightParticipants}/9</Text>
                </View>
              </View>
            </>
          ) : competitionsStatus.night.phase === 'voting' ? (
            <>
              <View className="absolute right-0 top-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">Vote Now!</Text>
                </View>
              </View>
              <View className="absolute bottom-0 right-0 p-4">
                <View className="rounded-full bg-white/90 px-4 py-2 shadow-sm">
                  <Text className="text-base font-bold text-black">{nightParticipants}/9</Text>
                </View>
              </View>
            </>
          ) : null}

          {competitionsStatus.night.phase === 'completed' ? (
            <View className="w-full flex-1">
              {nightWinner && competitionsStatus.night.id ? (
                <>
                  {/* Winner Info and Image */}
                  <View className="flex-1 flex-row items-center justify-between px-6">
                    {/* Left side - Winner Info */}
                    <View className="flex-1 items-center space-y-3">
                      <Text className="text-2xl font-bold text-black">Winner!</Text>
                      <Text className="text-2xl text-black">{nightWinner?.username}</Text>
                      <Text className="text-lg text-black/80">
                        with {nightWinner?.vote_count} votes
                      </Text>
                    </View>

                    {/* Right side - Image */}
                    <TouchableOpacity
                      onPress={() => setSelectedImage(nightWinner?.image_url || null)}
                      className="h-32 w-32 overflow-hidden rounded-xl border-2 border-black shadow-lg">
                      <Image
                        source={{ uri: nightWinner?.image_url }}
                        className="h-full w-full"
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View className="flex-1 items-center justify-center">
                  <Text className="text-2xl font-semibold text-black">No Submissions</Text>
                  <Text className="mt-2 text-black/80">This competition had no submissions</Text>
                </View>
              )}

              {/* Bottom - Timer */}
              <View className="absolute bottom-0 left-0 p-4">
                <Text className="text-lg font-bold text-black">
                  {getPhaseMessage(competitionsStatus.night.phase)}
                  {` ${formatTimeRemaining(competitionsStatus.night.timeRemaining)}`}
                </Text>
              </View>
            </View>
          ) : (
            <>
              <View className="absolute bottom-0 left-0 p-4">
                <Text className="text-lg font-bold text-black">
                  {getPhaseMessage(competitionsStatus.night.phase)}
                  {competitionsStatus.night.phase === 'registration' ||
                  competitionsStatus.night.phase === 'competing' ||
                  competitionsStatus.night.phase === 'voting'
                    ? ` ${formatTimeRemaining(competitionsStatus.night.timeRemaining)}`
                    : ''}
                </Text>
              </View>
              <Text
                className={`text-3xl font-bold ${colorScheme === 'dark' ? 'text-black' : 'text-gray-900'}`}>
                {competitionsStatus.night.name || 'No active competition'}
              </Text>
              {competitionsStatus.night.phase === 'competing' && (
                <Text className="mt-2 text-center text-black/80">Time to submit your entry!</Text>
              )}
            </>
          )}
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
      
<CompModal
        isVisible={isMorningModalVisible}
        onClose={() => setIsMorningModalVisible(false)}
        competitionName={competitionsStatus.morning.name}
        competitionId={competitionsStatus.morning.id}
        competitionType="morning"
        competitionDescription='Ready to show off your breakfast skills? Join this exciting breakfast competition and
            compete against other talented students!'
        competitionTime='Morning Competition'
        user={user}
        numberOfParticipants={numberOfParticipants}
      />
      <CompModal
        isVisible={isNoonModalVisible}
        onClose={() => setIsNoonModalVisible(false)}
        competitionName={competitionsStatus.noon.name}
        competitionId={competitionsStatus.noon.id}
        competitionType="noon"
        competitionDescription='Ready to show off your lunch skills? Join this exciting afternoon competition and
            compete against other talented students!'
        competitionTime='Afternoon Competition'
        user={user}
        numberOfParticipants={numberOfParticipants}
      />
      <CompModal
        isVisible={isNightModalVisible}
        onClose={() => setIsNightModalVisible(false)}
        competitionName={competitionsStatus.night.name}
        competitionId={competitionsStatus.night.id}
        competitionType="night"
        competitionDescription='Ready to show off your late night skills? Join this exciting late night competition and
            compete against other talented students!'
        competitionTime='Late-Night Competition'
        user={user}
        numberOfParticipants={numberOfParticipants}
      />
    </View>
  );
}
