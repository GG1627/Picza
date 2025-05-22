import React from 'react';
import { Text, TextProps, ColorValue } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientTextProps extends TextProps {
  colors?: [ColorValue, ColorValue];
}

const GradientText: React.FC<GradientTextProps> = ({
  colors = ['#F00511', '#F00511'] as [ColorValue, ColorValue],
  ...props
}) => {
  return (
    <MaskedView maskElement={<Text {...props} />}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text {...props} style={[props.style, { opacity: 0 }]} />
      </LinearGradient>
    </MaskedView>
  );
};

export default GradientText;
