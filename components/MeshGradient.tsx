import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColorScheme } from '../lib/useColorScheme';

interface MeshGradientProps {
  intensity?: number;
  style?: any;
}

export default function MeshGradient({ intensity = 50, style }: MeshGradientProps) {
  const { colorScheme } = useColorScheme();

  // Colors for light mode
  const lightColors = {
    primary: '#f77f5e',
    secondary: '#ffcf99',
    tertiary: '#ff9f6b',
    overlay: 'rgba(255, 255, 255, 0.3)',
    accent: 'rgba(247, 127, 94, 0.3)',
    highlight: 'rgba(255, 207, 153, 0.2)',
  };

  // Colors for dark mode
  const darkColors = {
    primary: '#000000', // Pure black
    secondary: '#000000', // Pure black
    tertiary: '#000000', // Pure black
    overlay: 'rgba(0, 0, 0, 1)', // Pure black overlay
    accent: '#ffcf99', // Light peach accent
    highlight: '#000000', // Pure black
  };

  const colors = colorScheme === 'dark' ? darkColors : lightColors;

  if (colorScheme === 'dark') {
    return (
      <ImageBackground
        source={require('../assets/dark-bg.png')}
        style={[styles.container, style]}
        resizeMode="cover"
      />
    );
  }

  // Light mode implementation (unchanged)
  return (
    <View style={[styles.container, style]}>
      {/* Base gradient */}
      <LinearGradient
        colors={[colors.primary, colors.secondary, colors.tertiary, colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.baseGradient}
      />

      {/* Mesh overlay 1 - Diagonal */}
      <BlurView intensity={intensity} style={styles.blurContainer}>
        <LinearGradient
          colors={[colors.overlay, 'rgba(255, 255, 255, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.meshOverlay}
        />
      </BlurView>

      {/* Mesh overlay 2 - Reverse Diagonal */}
      <BlurView intensity={intensity} style={styles.blurContainer}>
        <LinearGradient
          colors={[colors.accent, 'rgba(255, 207, 153, 0)']}
          start={{ x: 1, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.meshOverlay}
        />
      </BlurView>

      {/* Mesh overlay 3 - Vertical */}
      <BlurView intensity={intensity} style={styles.blurContainer}>
        <LinearGradient
          colors={[colors.secondary, colors.primary]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.meshOverlay}
        />
      </BlurView>

      {/* Mesh overlay 4 - Horizontal */}
      <BlurView intensity={intensity} style={styles.blurContainer}>
        <LinearGradient
          colors={[colors.overlay, colors.accent]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.meshOverlay}
        />
      </BlurView>

      {/* Accent gradient - Radial */}
      <BlurView intensity={intensity * 1.5} style={styles.blurContainer}>
        <LinearGradient
          colors={[colors.overlay, 'rgba(255, 255, 255, 0)']}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
          style={[styles.meshOverlay, { transform: [{ scale: 2 }] }]}
        />
      </BlurView>

      {/* Color accent 1 */}
      <BlurView intensity={intensity * 0.8} style={styles.blurContainer}>
        <LinearGradient
          colors={[colors.secondary, 'rgba(255, 207, 153, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 0.5 }}
          style={styles.meshOverlay}
        />
      </BlurView>

      {/* Color accent 2 */}
      <BlurView intensity={intensity * 0.8} style={styles.blurContainer}>
        <LinearGradient
          colors={[colors.primary, 'rgba(247, 127, 94, 0)']}
          start={{ x: 1, y: 1 }}
          end={{ x: 0.5, y: 0.5 }}
          style={styles.meshOverlay}
        />
      </BlurView>

      {/* Additional mesh patterns */}
      <BlurView intensity={intensity * 0.6} style={styles.blurContainer}>
        <LinearGradient
          colors={[colors.highlight, 'rgba(255, 255, 255, 0)']}
          start={{ x: 0.2, y: 0.2 }}
          end={{ x: 0.8, y: 0.8 }}
          style={styles.meshOverlay}
        />
      </BlurView>

      <BlurView intensity={intensity * 0.7} style={styles.blurContainer}>
        <LinearGradient
          colors={[colors.tertiary, 'rgba(255, 255, 255, 0)']}
          start={{ x: 0.8, y: 0.2 }}
          end={{ x: 0.2, y: 0.8 }}
          style={styles.meshOverlay}
        />
      </BlurView>

      {/* Subtle noise texture */}
      <BlurView intensity={intensity * 0.3} style={styles.blurContainer}>
        <LinearGradient
          colors={[colors.overlay, 'rgba(255, 255, 255, 0)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.meshOverlay, { transform: [{ scale: 3 }] }]}
        />
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  baseGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  meshOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
