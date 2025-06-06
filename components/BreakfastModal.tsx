import { View, Text, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../lib/useColorScheme';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { joinBreakfastCompetition } from '../lib/competitions';
import { useAuth } from '../lib/useAuth';

type BreakfastModalProps = {
  isVisible: boolean;
  onClose: () => void;
  timeLeft: string;
  competitionId: string;
  onJoin: () => void;
  hasJoined: boolean;
};

export default function BreakfastModal({
  isVisible,
  onClose,
  timeLeft,
  competitionId,
  onJoin,
  hasJoined: initialHasJoined,
}: BreakfastModalProps) {
  const { colorScheme } = useColorScheme();
  const { user } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(initialHasJoined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHasJoined(initialHasJoined);
  }, [initialHasJoined]);

  const handleJoin = async () => {
    if (!user) {
      setError('Please sign in to join the competition');
      return;
    }

    try {
      setIsJoining(true);
      setError(null);

      const success = await joinBreakfastCompetition(competitionId, user.id);

      if (success) {
        setHasJoined(true);
        onJoin();
        onClose();
      } else {
        setError('Failed to join competition. It might be full or you might have already joined.');
      }
    } catch (err) {
      setError('An error occurred while joining the competition');
      console.error(err);
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/80">
        <View
          className={`w-[90%] max-w-[400px] rounded-2xl p-6 ${
            colorScheme === 'dark' ? 'bg-[#FFD700]' : 'bg-[#FFD700]'
          }`}>
          {/* Header */}
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center space-x-2">
              <Ionicons name="sunny" size={24} color="#FF8C00" />
              <Text className="text-xl font-bold text-[#1A1A1A]">Breakfast Challenge</Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </Pressable>
          </View>

          {/* Content */}
          <View className="mb-6">
            <Text className="mb-4 text-lg font-semibold text-[#1A1A1A]">
              Ready to Show Off Your Breakfast Skills?
            </Text>
            <Text className="text-base text-[#1A1A1A]">
              Compete against others and create the most amazing breakfast dish! Share your culinary
              creativity, get votes from the community, and win exciting prizes.
            </Text>
            <Text className="mt-4 text-base font-medium text-[#1A1A1A]">
              <Text>Time remaining: </Text>
              <Text>{timeLeft}</Text>
            </Text>

            {error && <Text className="mt-4 text-sm text-red-600">{error}</Text>}
          </View>

          {/* Action Buttons */}
          <View className="flex-row justify-end space-x-3">
            {!hasJoined && (
              <TouchableOpacity onPress={onClose} className="rounded-full bg-white/30 px-4 py-2">
                <Text className="font-medium text-[#1A1A1A]">Maybe Later</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleJoin}
              className={`rounded-full px-4 py-2 ${hasJoined ? 'bg-green-500' : 'bg-[#FF8C00]'}`}
              disabled={Boolean(isJoining || hasJoined)}>
              <Text className="font-medium text-white">
                {isJoining ? 'Joining...' : hasJoined ? 'Joined!' : 'Join Now'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
