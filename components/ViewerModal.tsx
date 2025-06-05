import { View, Text, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../lib/useColorScheme';
import { CompetitionPhase } from '../lib/competitions';

type ViewerModalProps = {
  isVisible: boolean;
  onClose: () => void;
  timeLeft: string;
  phase: CompetitionPhase;
};

export default function ViewerModal({ isVisible, onClose, timeLeft, phase }: ViewerModalProps) {
  const { colorScheme } = useColorScheme();

  const getPhaseContent = () => {
    switch (phase) {
      case 'registration':
        return {
          title: 'Registration Open',
          message: 'Join now to participate in the upcoming breakfast competition!',
          icon: 'add-circle-outline' as const,
        };
      case 'competition':
        return {
          title: 'In Progress',
          message:
            'Our competitors are currently working on their breakfast masterpieces! Come back in ',
          icon: 'people-outline' as const,
        };
      case 'voting':
        return {
          title: 'Now Voting',
          message: 'Check out all the amazing breakfast creations and vote for your favorite!',
          icon: 'heart-outline' as const,
        };
      case 'completed':
        return {
          title: 'Competition Completed',
          message: 'The competition has ended. Check out the results!',
          icon: 'trophy-outline' as const,
        };
    }
  };

  const content = getPhaseContent();

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/70">
        <View
          className={`w-[90%] max-w-[400px] rounded-2xl p-6 ${
            colorScheme === 'dark' ? 'bg-[#FFD700]' : 'bg-[#FFD700]'
          }`}>
          {/* Header */}
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center space-x-2">
              <Ionicons name={content.icon} size={24} color="#FF8C00" />
              <Text className="text-xl font-bold text-[#1A1A1A]">{content.title}</Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </Pressable>
          </View>

          {/* Content */}
          <View className="mb-6">
            <Text className="text-base text-[#1A1A1A]">
              {content.message}
              {phase === 'competition' && <Text className="font-bold"> {timeLeft} </Text>}
              {phase === 'competition' && ' to vote for your favorite creation.'}
            </Text>
          </View>

          {/* Action Button */}
          <View className="flex-row justify-end">
            <TouchableOpacity onPress={onClose} className="rounded-full bg-[#FF8C00] px-4 py-2">
              <Text className="font-medium text-white">Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
