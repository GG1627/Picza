import { View, Text, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useColorScheme } from '../../lib/useColorScheme';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/useAuth';
import { router } from 'expo-router';

// Types for our bracket data
type Matchup = {
  id: string;
  round: number;
  position: number;
  player1: {
    id: string;
    name: string;
    imageUrl: string | null;
    votes: number;
  } | null;
  player2: {
    id: string;
    name: string;
    imageUrl: string | null;
    votes: number;
  } | null;
  winner: string | null;
};

type BracketRound = {
  round: number;
  matchups: Matchup[];
};

export default function BreakfastBracketScreen() {
  const { colorScheme } = useColorScheme();
  const { user } = useAuth();
  const [rounds, setRounds] = useState<BracketRound[]>([]);
  const [selectedMatchup, setSelectedMatchup] = useState<Matchup | null>(null);

  // Mock data for testing the bracket visualization
  useEffect(() => {
    // This would normally come from your API
    const mockRounds: BracketRound[] = [
      {
        round: 1,
        matchups: [
          {
            id: '1-1',
            round: 1,
            position: 1,
            player1: {
              id: '1',
              name: 'John Doe',
              imageUrl: null,
              votes: 12,
            },
            player2: {
              id: '2',
              name: 'Jane Smith',
              imageUrl: null,
              votes: 8,
            },
            winner: '1',
          },
          {
            id: '1-2',
            round: 1,
            position: 2,
            player1: {
              id: '3',
              name: 'Mike Johnson',
              imageUrl: null,
              votes: 15,
            },
            player2: {
              id: '4',
              name: 'Sarah Wilson',
              imageUrl: null,
              votes: 10,
            },
            winner: '3',
          },
        ],
      },
      {
        round: 2,
        matchups: [
          {
            id: '2-1',
            round: 2,
            position: 1,
            player1: {
              id: '1',
              name: 'John Doe',
              imageUrl: null,
              votes: 20,
            },
            player2: {
              id: '3',
              name: 'Mike Johnson',
              imageUrl: null,
              votes: 18,
            },
            winner: null,
          },
        ],
      },
    ];

    setRounds(mockRounds);
  }, []);

  const handleVote = (matchupId: string, playerId: string) => {
    // TODO: Implement voting logic
    console.log('Voting for player', playerId, 'in matchup', matchupId);
  };

  const renderMatchup = (matchup: Matchup) => {
    const isSelected = selectedMatchup?.id === matchup.id;
    const canVote = !matchup.winner && user; // Only allow voting if no winner and user is logged in

    return (
      <TouchableOpacity
        key={matchup.id}
        onPress={() => setSelectedMatchup(matchup)}
        className={`mb-4 rounded-xl border-2 ${
          isSelected ? 'border-[#FF8C00]' : 'border-gray-200'
        } bg-white p-4 shadow-sm`}>
        {/* Player 1 */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center space-x-2">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              {matchup.player1?.imageUrl ? (
                <Image
                  source={{ uri: matchup.player1.imageUrl }}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <Ionicons name="person" size={24} color="#666" />
              )}
            </View>
            <Text className="text-base font-medium text-gray-800">{matchup.player1?.name}</Text>
          </View>
          <View className="flex-row items-center space-x-2">
            <Text className="text-sm text-gray-500">
              <Text>{matchup.player1?.votes} votes</Text>
            </Text>
            {canVote && (
              <TouchableOpacity
                onPress={() => handleVote(matchup.id, matchup.player1!.id)}
                className="rounded-full bg-[#FF8C00] px-3 py-1">
                <Text className="text-sm font-medium text-white">Vote</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* VS */}
        <View className="my-2 items-center">
          <Text className="text-sm font-medium text-gray-400">VS</Text>
        </View>

        {/* Player 2 */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center space-x-2">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-gray-100">
              {matchup.player2?.imageUrl ? (
                <Image
                  source={{ uri: matchup.player2.imageUrl }}
                  className="h-10 w-10 rounded-full"
                />
              ) : (
                <Ionicons name="person" size={24} color="#666" />
              )}
            </View>
            <Text className="text-base font-medium text-gray-800">{matchup.player2?.name}</Text>
          </View>
          <View className="flex-row items-center space-x-2">
            <Text className="text-sm text-gray-500">
              <Text>{matchup.player2?.votes} votes</Text>
            </Text>
            {canVote && (
              <TouchableOpacity
                onPress={() => handleVote(matchup.id, matchup.player2!.id)}
                className="rounded-full bg-[#FF8C00] px-3 py-1">
                <Text className="text-sm font-medium text-white">Vote</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
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
              Breakfast Bracket
            </Text>
            <Text
              className={`mt-1 text-center text-base ${colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
              Vote for your favorite breakfast!
            </Text>
          </View>
          <View className="w-10" /> {/* Spacer to balance the back button */}
        </View>
      </View>

      {/* Bracket Content */}
      <ScrollView className="flex-1 px-4">
        {rounds.map((round) => (
          <View key={round.round} className="mb-8">
            <Text className="mb-4 text-xl font-bold text-gray-800">
              {round.round === 1 ? 'First Round' : round.round === 2 ? 'Semi-Finals' : 'Finals'}
            </Text>
            {round.matchups.map(renderMatchup)}
          </View>
        ))}
      </ScrollView>

      {/* Selected Matchup Details */}
      {selectedMatchup && (
        <View className="absolute bottom-0 left-0 right-0 bg-white p-4 shadow-lg">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-gray-800">Matchup Details</Text>
            <TouchableOpacity onPress={() => setSelectedMatchup(null)}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <Text className="mt-2 text-base text-gray-600">
            <Text>
              Round {selectedMatchup.round} - Match {selectedMatchup.position}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}
