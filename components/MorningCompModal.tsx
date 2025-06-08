import { View, Text, Modal, TouchableOpacity, Alert } from 'react-native';
import { useColorScheme } from '../lib/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { joinCompetition } from '~/lib/competitions';
import { User } from '@supabase/supabase-js';

type MorningCompModalProps = {
  isVisible: boolean;
  onClose: () => void;
  competitionName: string | null;
  competitionId: string | null;
  user: User | null;
};

export default function MorningCompModal({
  isVisible,
  onClose,
  competitionName,
  competitionId,
  user,
}: MorningCompModalProps) {
  const { colorScheme } = useColorScheme();

  const handleJoin = async () => {
    if (!competitionId || !user) {
      Alert.alert('Error', 'Competition not found');
      return;
    }

    const success = await joinCompetition(competitionId, user);
    if (success) {
      onClose();
    }
  };

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50">
        <View
          className={`w-[90%] rounded-xl p-6 ${
            colorScheme === 'dark' ? 'bg-[#fa6f48]' : 'bg-white'
          }`}>
          {/* Close button */}
          <TouchableOpacity onPress={onClose} className="absolute right-4 top-4">
            <Ionicons name="close" size={24} color="black" />
          </TouchableOpacity>

          {/* Title */}
          <Text className="mb-4 mt-4 text-2xl font-bold text-black">
            {competitionName || 'Morning Competition'}
          </Text>

          {/* Description */}
          <Text className="mb-8 text-lg text-black">
            Ready to show off your breakfast skills? Join this exciting morning competition and
            compete against other talented students!
          </Text>

          {/* Buttons */}
          <View className="gap-3">
            <TouchableOpacity onPress={handleJoin} className="rounded-lg bg-black p-4">
              <Text className="text-center font-semibold text-white">Join Now</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} className="rounded-lg bg-gray-200 p-4">
              <Text className="text-center font-semibold text-black">Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
