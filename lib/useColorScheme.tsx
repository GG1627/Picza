import * as NavigationBar from 'expo-navigation-bar';
import { useColorScheme as useNativewindColorScheme } from 'nativewind';
import * as React from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS } from '~/theme/colors';

const THEME_STORAGE_KEY = '@theme_preference';

function useColorScheme() {
  const { colorScheme, setColorScheme: setNativeWindColorScheme } = useNativewindColorScheme();
  const [isSystemTheme, setIsSystemTheme] = React.useState(true);

  React.useEffect(() => {
    // Load saved theme preference
    loadThemePreference();
  }, []);

  async function loadThemePreference() {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme) {
        const { theme, isSystem } = JSON.parse(savedTheme);
        setIsSystemTheme(isSystem);
        if (!isSystem) {
          setNativeWindColorScheme(theme);
        }
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  }

  async function setColorScheme(theme: 'light' | 'dark', useSystem: boolean = false) {
    try {
      setIsSystemTheme(useSystem);
      if (!useSystem) {
        setNativeWindColorScheme(theme);
      }
      await AsyncStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ theme, isSystem: useSystem }));
      if (Platform.OS !== 'android') return;
      try {
        await setNavigationBar(theme);
      } catch (error) {
        console.error('useColorScheme.tsx", "setColorScheme', error);
      }
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }

  function toggleColorScheme() {
    const newTheme = colorScheme === 'light' ? 'dark' : 'light';
    setColorScheme(newTheme, false);
  }

  return {
    colorScheme: colorScheme ?? 'light',
    isDarkColorScheme: colorScheme === 'dark',
    setColorScheme,
    toggleColorScheme,
    isSystemTheme,
    colors: COLORS[colorScheme ?? 'light'],
  };
}

/**
 * Set the Android navigation bar color based on the color scheme.
 */
function useInitialAndroidBarSync() {
  const { colorScheme } = useColorScheme();
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    setNavigationBar(colorScheme).catch((error) => {
      console.error('useColorScheme.tsx", "useInitialColorScheme', error);
    });
  }, []);
}

export { useColorScheme, useInitialAndroidBarSync };

function setNavigationBar(colorScheme: 'light' | 'dark') {
  return Promise.all([
    NavigationBar.setButtonStyleAsync(colorScheme === 'dark' ? 'light' : 'dark'),
    NavigationBar.setPositionAsync('absolute'),
    NavigationBar.setBackgroundColorAsync(colorScheme === 'dark' ? '#00000030' : '#ffffff80'),
  ]);
}
