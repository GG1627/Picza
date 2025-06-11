import {
  View,
  Text,
  StatusBar,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { useColorScheme } from '../../lib/useColorScheme';
import { useAuth } from '~/lib/auth';
import { useEffect, useState } from 'react';
import { supabase } from '~/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { time } from '../sharedTime';

type Submission = {
  id: string;
  image_url: string;
  vote_count: number;
};

type GridItem = Submission | null;

export default function VotingScreen() {
  const { colorScheme } = useColorScheme();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [votedSubmissionId, setVotedSubmissionId] = useState<string | null>(null);
  const { competitionId: routeCompetitionId } = useLocalSearchParams();

  // Check if user has already voted
  const checkVoteStatus = async () => {
    if (!user || !competitionId) return;

    try {
      const { data, error } = await supabase
        .from('votes')
        .select('submission_id')
        .eq('competition_id', competitionId)
        .eq('voter_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setHasVoted(true);
        setVotedSubmissionId(data.submission_id);
      }
    } catch (error) {
      console.error('Error checking vote status:', error);
    }
  };

  // Fetch competition status and submissions
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get competition ID and end time
        const { data: competition, error: compError } = await supabase
          .from('competitions')
          .select('id, vote_end_time')
          .eq('id', routeCompetitionId)
          .single();

        if (compError) throw compError;

        if (competition) {
          setCompetitionId(competition.id);
          const voteEnd = new Date(competition.vote_end_time);
          const now = new Date();
          const remaining = Math.floor((voteEnd.getTime() - now.getTime()) / 1000);
          setTimeRemaining(remaining);

          // Get submissions with vote counts
          const { data: submissionsData, error: subError } = await supabase
            .from('submissions')
            .select(
              `
              id,
              image_url,
              votes:votes(count)
            `
            )
            .eq('competition_id', competition.id);

          if (subError) throw subError;

          // Transform the data to include vote counts
          const submissionsWithVotes = submissionsData.map((submission) => ({
            id: submission.id,
            image_url: submission.image_url,
            vote_count: submission.votes[0]?.count || 0,
          }));

          setSubmissions(submissionsWithVotes);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        Alert.alert('Error', 'Failed to load submissions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = Math.max(0, prev - 1);
        if (newTime === 0) {
          // Clear the interval when time is up
          clearInterval(timer);
          // Show alert and navigate back
          Alert.alert(
            'Voting Ended',
            'The voting period has ended. Check the results in the competitions screen!',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/competitions'),
              },
            ]
          );
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Check vote status when competition ID is set
  useEffect(() => {
    if (competitionId) {
      checkVoteStatus();
    }
  }, [competitionId]);

  const handleVote = async () => {
    if (!user || !competitionId || !votedSubmissionId) return;

    try {
      const { error } = await supabase.from('votes').insert({
        competition_id: competitionId,
        voter_id: user.id,
        submission_id: votedSubmissionId,
      });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Error', 'You have already voted in this competition');
        } else {
          throw error;
        }
        return;
      }

      // Update the vote count for the selected submission
      setSubmissions((prevSubmissions) =>
        prevSubmissions.map((submission) =>
          submission.id === votedSubmissionId
            ? { ...submission, vote_count: submission.vote_count + 1 }
            : submission
        )
      );

      setHasVoted(true);
      Alert.alert('Success', 'Your vote has been recorded!');
    } catch (error) {
      console.error('Error submitting vote:', error);
      Alert.alert('Error', 'Failed to submit vote');
    }
  };

  const handleUndo = () => {
    setIsSelecting(false);
    setVotedSubmissionId(null);
  };

  const formatTimeRemaining = (seconds: number) => {
    if (seconds <= 0) return "Time's up!";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours}h ${minutes}m ${remainingSeconds}s`;
  };

  const renderGridItem = (item: GridItem, index: number) => {
    if (!item) {
      // Render placeholder
      return (
        <View key={`placeholder-${index}`} className="aspect-square w-1/3 p-1">
          <View
            className={`h-full w-full items-center justify-center rounded-lg ${
              colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-200'
            }`}>
            <Ionicons
              name="image-outline"
              size={32}
              color={colorScheme === 'dark' ? '#333' : '#666'}
            />
            <Text
              className={`mt-2 text-sm ${
                colorScheme === 'dark' ? 'text-gray-500' : 'text-gray-400'
              }`}>
              No submission
            </Text>
          </View>
        </View>
      );
    }

    const isSelected = votedSubmissionId === item.id;
    const isGrayscale = isSelecting && !isSelected;

    return (
      <TouchableOpacity
        key={item.id}
        onPress={() => {
          if (isSelecting) {
            setVotedSubmissionId(item.id);
          } else {
            setSelectedImage(item.image_url);
          }
        }}
        className="aspect-square w-1/3 p-1">
        <View className="h-full w-full overflow-hidden rounded-lg">
          <Image
            source={{ uri: item.image_url }}
            className="h-full w-full"
            style={[
              isGrayscale && {
                opacity: 0.3,
                tintColor: '#000',
              },
            ]}
          />
          {!isSelecting && (
            <View className="absolute bottom-0 left-0 right-0 bg-black/50 p-1">
              <Text className="text-center text-sm text-white">
                {item.vote_count} {item.vote_count === 1 ? 'vote' : 'votes'}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Create array of 9 items, filling empty slots with null
  const gridItems: GridItem[] = [...submissions];
  while (gridItems.length < 9) {
    gridItems.push(null);
  }

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
          Vote for the Best
        </Text>
        <Text
          className={`mt-1 text-center text-base ${colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          Choose your favorite submission!
        </Text>
        <Text
          className={`mt-2 text-center text-sm ${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          Tap any image to view it larger
        </Text>
      </View>

      {/* Timer Section */}
      <View className="mb-8 items-center">
        <Text
          className={`text-lg font-semibold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Time remaining:
        </Text>
        <Text
          className={`text-2xl font-bold ${colorScheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          {formatTimeRemaining(timeRemaining)}
        </Text>
      </View>

      {/* Main Content */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#fa6f48' : '#fa6f48'} />
        </View>
      ) : (
        <View className="flex-1">
          {/* Grid View */}
          <View className="flex-row flex-wrap">
            {gridItems.map((item, index) => renderGridItem(item, index))}
          </View>

          {/* Action Buttons or Thank You Message */}
          <View className="mt-4 px-4">
            {hasVoted ? (
              <View className="items-center space-y-2">
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color={colorScheme === 'dark' ? '#fa6f48' : '#fa6f48'}
                />
                <Text
                  className={`text-center text-lg font-semibold ${
                    colorScheme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>
                  Thank you for voting!
                </Text>
                <Text
                  className={`text-center ${colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Results will be available soon.
                </Text>
              </View>
            ) : !isSelecting ? (
              <TouchableOpacity
                onPress={() => setIsSelecting(true)}
                className="rounded-full bg-[#fa6f48] px-6 py-3">
                <Text className="text-center text-lg font-semibold text-white">
                  Select Your Choice
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleVote}
                  disabled={!votedSubmissionId}
                  className={`rounded-full px-6 py-3 ${
                    votedSubmissionId ? 'bg-[#fa6f48]' : 'bg-gray-400'
                  }`}>
                  <Text className="text-center text-lg font-semibold text-white">Vote</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleUndo}
                  className="mt-2 rounded-full bg-gray-500 px-6 py-3">
                  <Text className="text-center text-lg font-semibold text-white">Undo</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

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
    </View>
  );
}
