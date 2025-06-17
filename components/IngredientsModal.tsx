import React from 'react';
import { View, Text, Modal, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { useColorScheme } from '../lib/useColorScheme';

interface IngredientsModalProps {
  visible: boolean;
  onClose: () => void;
  ingredients: string;
}

export default function IngredientsModal({ visible, onClose, ingredients }: IngredientsModalProps) {
  const { colorScheme } = useColorScheme();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center">
        <Pressable className="h-full w-full flex-1" onPress={onClose}>
          <View className="flex-1 items-center justify-center">
            <Pressable
              className={`w-80 overflow-hidden rounded-3xl shadow-2xl ${
                colorScheme === 'dark' ? 'bg-[#282828]' : 'bg-white'
              }`}
              onPress={(e) => e.stopPropagation()}>
              {/* Header */}
              <View
                className={`border-b p-5 ${
                  colorScheme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                }`}>
                <Text
                  className={`text-center text-xl font-bold ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  Ingredients
                </Text>
              </View>

              {/* Ingredients List */}
              <View className="p-5">
                <Text
                  className={`text-base leading-6 ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  {ingredients}
                </Text>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={onClose}
                className={`border-t p-4 ${
                  colorScheme === 'dark' ? 'border-gray-800' : 'border-gray-100'
                }`}>
                <Text
                  className={`text-center text-base font-medium ${
                    colorScheme === 'dark' ? 'text-[#E0E0E0]' : 'text-[#07020D]'
                  }`}>
                  Close
                </Text>
              </TouchableOpacity>
            </Pressable>
          </View>
        </Pressable>
      </View>
    </Modal>
  );
}
