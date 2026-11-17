import { Pressable, StyleSheet, Text } from 'react-native';

import { Icon, type IconName } from './Icon';
import { colors, fontSize, radius, spacing, touchTarget } from './theme';

type Variant = 'primary' | 'secondary' | 'danger';
type Size = 'regular' | 'large';

type Props = {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
};

export function Button({ title, onPress, icon, variant = 'primary', size = 'regular', disabled = false }: Props) {
  const { container, labelColor } = variantStyles[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        size === 'large' && styles.large,
        container,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {icon && <Icon name={icon} size={size === 'large' ? 24 : 20} color={labelColor} />}
      <Text style={[styles.label, size === 'large' && styles.largeLabel, { color: labelColor }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  large: {
    minHeight: 64,
    borderRadius: radius.lg,
  },
  label: {
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  largeLabel: {
    fontSize: fontSize.title,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.45,
  },
});

const variantStyles = {
  primary: {
    container: { backgroundColor: colors.primary, borderColor: colors.primary },
    labelColor: colors.primaryText,
  },
  secondary: {
    container: { backgroundColor: colors.surface, borderColor: colors.border },
    labelColor: colors.text,
  },
  danger: {
    container: { backgroundColor: colors.surface, borderColor: colors.danger },
    labelColor: colors.danger,
  },
};
