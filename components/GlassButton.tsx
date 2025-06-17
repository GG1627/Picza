import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '../lib/useColorScheme';

interface GlassButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  isActive?: boolean;
}

export default function GlassButton({ onPress, children, isActive = false }: GlassButtonProps) {
  const { colorScheme } = useColorScheme();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <BlurView
        intensity={20}
        tint={colorScheme}
        style={[
          styles.container,
          {
            borderColor:
              colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)',
            paddingVertical: isActive ? 6 : 8,
          },
          isActive && {
            backgroundColor:
              colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.7)',
          },
        ]}>
        {children}
      </BlurView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 12,
  },
});
