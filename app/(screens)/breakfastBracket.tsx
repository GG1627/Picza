import { View, Text, TouchableOpacity, Image, ScrollView, Pressable, Alert } from 'react-native';
import { useColorScheme } from '../../lib/useColorScheme';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/useAuth';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

type Submission = {
  id: string;
  image_url: string;
  participant_id: string;
  user_id: string;
  caption: string;
  competition_id: string;
};

export default function BreakfastBracketScreen() {
  const { colorScheme } = useColorScheme();
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [votedImage, setVotedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      console.log('Fetching active competition...');
      const { data: competition, error: competitionError } = await supabase
        .from('breakfast_competitions')
        .select('id')
        .eq('status', 'active')
        .single();

      if (competitionError) {
        console.error('Error fetching competition:', competitionError);
        throw competitionError;
      }

      if (!competition) {
        console.log('No active competition found');
        Alert.alert('Error', 'No active competition found');
        return;
      }

      console.log('Found competition:', competition.id);

      const { data: submissions, error: submissionsError } = await supabase
        .from('breakfast_submissions')
        .select(
          `
          id,
          image_url,
          participant_id,
          caption,
          competition_id,
          breakfast_participants (
            user_id
          )
        `
        )
        .eq('competition_id', competition.id)
        .eq('status', 'active');

      if (submissionsError) {
        console.error('Error fetching submissions:', submissionsError);
        throw submissionsError;
      }

      console.log('Found submissions:', submissions);

      if (!submissions || submissions.length === 0) {
        console.log('No submissions found');
        Alert.alert('Info', 'No submissions have been made yet.');
        return;
      }

      // Transform the data to match our Submission type
      const transformedSubmissions = submissions.map((sub) => ({
        id: sub.id,
        image_url: sub.image_url,
        participant_id: sub.participant_id,
        user_id: sub.breakfast_participants[0]?.user_id,
        caption: sub.caption,
        competition_id: sub.competition_id,
      }));

      console.log('Transformed submissions:', transformedSubmissions);
      setSubmissions(transformedSubmissions);
    } catch (error) {
      console.error('Error in fetchSubmissions:', error);
      Alert.alert('Error', 'Failed to load submissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImagePress = (imageId: string) => {
    if (isSelectMode) {
      setVotedImage(votedImage === imageId ? null : imageId);
    } else {
      setSelectedImage(selectedImage === imageId ? null : imageId);
    }
  };

  const handleVote = async () => {
    if (!votedImage || !user) return;

    try {
      const { error } = await supabase.from('breakfast_votes').insert({
        submission_id: votedImage,
        voter_id: user.id,
        competition_id: submissions[0]?.competition_id,
      });

      if (error) throw error;

      Alert.alert('Success', 'Your vote has been recorded!', [
        {
          text: 'OK',
          onPress: () => {
            setIsSelectMode(false);
            setVotedImage(null);
          },
        },
      ]);
    } catch (error) {
      console.error('Error submitting vote:', error);
      Alert.alert('Error', 'Failed to submit vote. Please try again.');
    }
  };

  const renderImage = (submission: Submission) => {
    const isSelected = selectedImage === submission.id;
    const isVoted = votedImage === submission.id;

    return (
      <Pressable
        key={submission.id}
        onPressIn={() => handleImagePress(submission.id)}
        onPressOut={() => handleImagePress(submission.id)}
        className={`aspect-square w-1/4 p-1`}>
        <Image
          source={{ uri: submission.image_url }}
          className={`h-full w-full rounded-lg ${
            isSelectMode ? 'opacity-50' : ''
          } ${isVoted ? 'border-4 border-green-500' : ''}`}
          style={[
            isSelected &&
              !isSelectMode && {
                transform: [{ scale: 1.1 }],
                zIndex: 1,
              },
          ]}
        />
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-lg text-gray-600">Loading submissions...</Text>
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
              Vote for Your Favorite
            </Text>
            <Text
              className={`mt-1 text-center text-base ${colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Tap and hold to enlarge images
            </Text>
          </View>
          <View className="w-10" />
        </View>
      </View>

      {/* Grid Container */}
      <ScrollView className="flex-1 px-2">
        {submissions.length > 0 ? (
          <View className="flex-row flex-wrap">{submissions.map(renderImage)}</View>
        ) : (
          <View className="flex-1 items-center justify-center py-8">
            <Text className="text-lg text-gray-600">No submissions yet</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Controls */}
      {submissions.length > 0 && (
        <View className="border-t border-gray-200 bg-white p-4">
          {!isSelectMode ? (
            <TouchableOpacity
              onPress={() => setIsSelectMode(true)}
              className="rounded-full bg-[#FF8C00] px-6 py-3">
              <Text className="text-center text-lg font-semibold text-white">Select to Vote</Text>
            </TouchableOpacity>
          ) : (
            <View className="space-y-3">
              <Text className="text-center text-sm text-gray-600">
                {votedImage ? 'Tap an image to change your vote' : 'Select your favorite breakfast'}
              </Text>
              <TouchableOpacity
                onPress={handleVote}
                disabled={!votedImage}
                className={`rounded-full px-6 py-3 ${votedImage ? 'bg-[#FF8C00]' : 'bg-gray-300'}`}>
                <Text className="text-center text-lg font-semibold text-white">
                  {votedImage ? 'Submit Vote' : 'Select an image to vote'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
