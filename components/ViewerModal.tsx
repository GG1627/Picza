import { View, Text, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '../lib/useColorScheme';

type ViewerModalProps = {
  isVisible: boolean;
  onClose: () => void;
  timeLeft: string;
};

export default function ViewerModal({ isVisible, onClose, timeLeft }: ViewerModalProps) {
  const { colorScheme } = useColorScheme();

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/70">
        <View
          className={`w-[90%] max-w-[400px] rounded-2xl p-6 ${
            colorScheme === 'dark' ? 'bg-[#353535]' : 'bg-[#ffffff]'
          }`}>
          {/* Header */}
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center space-x-2">
              <Ionicons name="people-outline" size={24} color="#FF8C00" />
              <Text className="ml-1 text-xl font-bold text-[#1A1A1A]">Competition in Progress</Text>
            </View>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color="#1A1A1A" />
            </Pressable>
          </View>

          {/* Content */}
          <View className="mb-6">
            <Text className="text-base text-[#1A1A1A]">
              <Text>
                Our competitors are currently working on their breakfast masterpieces! Come back
                in{' '}
              </Text>
              <Text className="font-bold">{timeLeft}</Text>
              <Text> to vote for your favorite creation.</Text>
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
