import React from 'react';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import { ViewStyle } from 'react-native';

interface Props {
    colors: [string, string];
    size?: number;
    style?: ViewStyle;
    radius?: string; // e.g., '50%' or '40%'
  }
  

export default function RadialGradientView({ colors, size = 300, style }: Props) {
  return (
    <Svg height={size} width={size} style={style}>
      <Defs>
      <RadialGradient id="grad" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
  <Stop offset="0%" stopColor={colors[0]} stopOpacity="1" />
  <Stop offset="40%" stopColor={colors[1]} stopOpacity="0.7" />
  <Stop offset="70%" stopColor={colors[1]} stopOpacity="0.3" />
  <Stop offset="100%" stopColor={colors[1]} stopOpacity="0" />
</RadialGradient>

      </Defs>
      <Circle cx="50%" cy="50%" r="50%" fill="url(#grad)" />
    </Svg>
  );
}
