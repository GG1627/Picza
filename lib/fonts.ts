import * as Font from 'expo-font';

export const loadFonts = async () => {
  try {
    console.log('Starting to load fonts...');
    await Font.loadAsync({
      LuckiestGuy: require('../assets/fonts/LuckiestGuy-Regular.ttf'),
      Pattaya: require('../assets/fonts/Pattaya-Regular.ttf'),
      Nunito: require('../assets/fonts/Nunito-VariableFont_wght.ttf'),
      Jua: require('../assets/fonts/Jua-Regular.ttf'),
    });
    console.log('Fonts loaded successfully!');
  } catch (error) {
    console.error('Error loading fonts:', error);
    throw error;
  }
};
