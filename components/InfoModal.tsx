import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useColorScheme } from '../lib/useColorScheme';
import { Ionicons } from '@expo/vector-icons';

type InfoModalProps = {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  content: string[];
};

export default function InfoModal({ isVisible, onClose, title, content }: InfoModalProps) {
  const { colorScheme } = useColorScheme();

  return (
    <Modal animationType="fade" transparent={true} visible={isVisible} onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/90">
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          className={`w-[90%] rounded-xl p-6 ${
            colorScheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
          }`}>
          {/* Close button */}
          <TouchableOpacity onPress={onClose} className="absolute right-4 top-4">
            <Ionicons
              name="close"
              size={24}
              color={colorScheme === 'dark' ? '#e0e0e0' : '#1a1a1a'}
            />
          </TouchableOpacity>

          {/* Title */}
          <Text
            className={`mb-6 mt-4 text-2xl font-bold ${
              colorScheme === 'dark' ? 'text-[#e0e0e0]' : 'text-[#1a1a1a]'
            }`}>
            {title}
          </Text>

          {/* Content */}
          <View className="mb-0">
            {content.map((item, index) => (
              <View key={index} className="mb-4 flex-row">
                <Text
                  className={`mr-2 text-lg font-semibold ${
                    colorScheme === 'dark' ? 'text-[#e0e0e0]' : 'text-[#1a1a1a]'
                  }`}>
                  {`${index + 1}.`}
                </Text>
                <Text
                  className={`flex-1 text-lg ${
                    colorScheme === 'dark' ? 'text-[#a0a0a0]' : 'text-[#4a4a4a]'
                  }`}>
                  {item}
                </Text>
              </View>
            ))}
          </View>

          {/* Close Button */}
          <TouchableOpacity
            onPress={onClose}
            className={`mt-4 rounded-lg p-4 ${
              colorScheme === 'dark' ? 'bg-[#2a2a2a]' : 'bg-[#f5f5f5]'
            }`}>
            <Text
              className={`text-center font-semibold ${
                colorScheme === 'dark' ? 'text-[#e0e0e0]' : 'text-[#1a1a1a]'
              }`}>
              Got it!
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
