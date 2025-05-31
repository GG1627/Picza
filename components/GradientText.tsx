import React from 'react';
import { Text, TextProps, ColorValue } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

interface GradientTextProps extends TextProps {
  colors?: ColorValue[];
  locations?: number[];
}

const GradientText: React.FC<GradientTextProps> = ({
  colors = ['#F00511', '#F00511'],
  locations,
  ...props
}) => {
  return (
    <MaskedView maskElement={<Text {...props} />}>
      <LinearGradient
        colors={colors as unknown as readonly [ColorValue, ColorValue, ...ColorValue[]]}
        locations={locations as unknown as readonly [number, number, ...number[]] | undefined}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <Text {...props} style={[props.style, { opacity: 0 }]} />
      </LinearGradient>
    </MaskedView>
  );
};

export default GradientText;
