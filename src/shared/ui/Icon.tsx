import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Props = {
  name: IconName;
  size?: number;
  color: string;
};

/** Single icon family for the whole app. The font ships in the bundle, so it works offline. */
export function Icon({ name, size = 20, color }: Props) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
