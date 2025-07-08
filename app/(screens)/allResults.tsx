import {
  View,
  Text,
  StatusBar,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  ScrollView,
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
  user_id: string;
  username: string;
  vote_count: number;
  rank: number;
};

export default function ResultsScreen() {
  const { colorScheme } = useColorScheme();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const { competitionId: routeCompetitionId } = useLocalSearchParams();

  // Fetch competition results
  useEffect(() => {
    const fetchResults = async () => {
      try {
        // Get competition ID
        const { data: competition, error: compError } = await supabase
          .from('competitions')
          .select('id')
          .eq('id', routeCompetitionId)
          .single();

        if (compError) throw compError;
        if (!competition) return;

        setCompetitionId(competition.id);

        // Get all submissions with vote counts
        const { data: submissionsData, error: subError } = await supabase
          .from('submissions')
          .select(
            `
            id,
            image_url,
            user_id
          `
          )
          .eq('competition_id', competition.id);

        if (subError) throw subError;

        // If no submissions, set empty array and return
        if (!submissionsData || submissionsData.length === 0) {
          setSubmissions([]);
          setIsLoading(false);
          return;
        }

        // OPTIMIZED: Get vote counts and usernames in batch queries instead of N+1 queries
        const submissionIds = submissionsData.map((s) => s.id);
        const userIds = [...new Set(submissionsData.map((s) => s.user_id))]; // Remove duplicates

        // Batch fetch vote counts for all submissions
        const { data: votesData, error: votesError } = await supabase
          .from('votes')
          .select('submission_id')
          .in('submission_id', submissionIds);

        if (votesError) throw votesError;

        // Batch fetch usernames for all users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);

        if (profilesError) throw profilesError;

        // Count votes per submission
        const voteCountMap =
          votesData?.reduce(
            (acc, vote) => {
              acc[vote.submission_id] = (acc[vote.submission_id] || 0) + 1;
              return acc;
            },
            {} as { [key: string]: number }
          ) || {};

        // Create username lookup map
        const usernameMap =
          profilesData?.reduce(
            (acc, profile) => {
              acc[profile.id] = profile.username;
              return acc;
            },
            {} as { [key: string]: string }
          ) || {};

        // Combine all data efficiently
        const submissionsWithVotes = submissionsData.map((submission) => ({
          id: submission.id,
          image_url: submission.image_url,
          user_id: submission.user_id,
          username: usernameMap[submission.user_id] || 'Unknown',
          vote_count: voteCountMap[submission.id] || 0,
          rank: 0, // Will be calculated after sorting
        }));

        // Sort by vote count and assign ranks (handling ties)
        const sortedSubmissions = submissionsWithVotes.sort((a, b) => b.vote_count - a.vote_count);
        let currentRank = 1;
        let currentVotes = sortedSubmissions[0]?.vote_count;
        let skipRank = 0;

        const rankedSubmissions = sortedSubmissions.map((submission, index) => {
          if (submission.vote_count < currentVotes) {
            currentRank += skipRank + 1;
            currentVotes = submission.vote_count;
            skipRank = 0;
          } else if (index > 0) {
            skipRank++;
          }
          return { ...submission, rank: currentRank };
        });

        setSubmissions(rankedSubmissions);
      } catch (error) {
        console.error('Error fetching results:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, []);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#FFD700'; // Gold
      case 2:
        return '#C0C0C0'; // Silver
      case 3:
        return '#CD7F32'; // Bronze
      default:
        return colorScheme === 'dark' ? '#333' : '#e0e0e0';
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
          Results
        </Text>
        <Text
          className={`mt-1 text-center text-base ${colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
          See how everyone ranked!
        </Text>
      </View>

      {/* Results List */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colorScheme === 'dark' ? '#fa6f48' : '#fa6f48'} />
        </View>
      ) : submissions.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Ionicons
            name="trophy-outline"
            size={64}
            color={colorScheme === 'dark' ? '#fa6f48' : '#fa6f48'}
          />
          <Text
            className={`mt-4 text-center text-2xl font-bold ${
              colorScheme === 'dark' ? 'text-white' : 'text-gray-900'
            }`}>
            No Participants
          </Text>
          <Text
            className={`mt-2 text-center text-base ${
              colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            }`}>
            This competition had no submissions
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4">
          {submissions.map((submission) => (
            <View
              key={submission.id}
              className={`mb-4 flex-row items-center justify-between rounded-xl p-4 ${
                colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
              }`}>
              {/* Rank and Username */}
              <View className="flex-row items-center space-x-4">
                <View
                  className="h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: getRankColor(submission.rank) }}>
                  <Text
                    className={`text-lg font-bold ${
                      submission.rank <= 3
                        ? 'text-black'
                        : colorScheme === 'dark'
                          ? 'text-white'
                          : 'text-gray-900'
                    }`}>
                    {submission.rank}
                  </Text>
                </View>
                <View className="ml-2">
                  <Text
                    className={`text-lg font-semibold ${
                      colorScheme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>
                    {submission.username}
                  </Text>
                  <Text
                    className={`text-sm ${colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {submission.vote_count} {submission.vote_count === 1 ? 'vote' : 'votes'}
                  </Text>
                </View>
              </View>

              {/* Image */}
              <TouchableOpacity
                onPress={() => setSelectedImage(submission.image_url)}
                className="h-16 w-16 overflow-hidden rounded-lg">
                <Image
                  source={{ uri: submission.image_url }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
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
