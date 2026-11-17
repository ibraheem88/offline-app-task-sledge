import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing } from './theme';

type Variant = 'primary' | 'secondary' | 'danger';

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: 'regular' | 'small';
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', size = 'regular', disabled = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        size === 'small' && styles.small,
        variantStyles[variant].container,
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text style={[styles.label, size === 'small' && styles.smallLabel, variantStyles[variant].label]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  small: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  smallLabel: {
    fontSize: 13,
  },
  dimmed: {
    opacity: 0.6,
  },
});

const variantStyles = {
  primary: StyleSheet.create({
    container: { backgroundColor: colors.primary, borderColor: colors.primary },
    label: { color: colors.primaryText },
  }),
  secondary: StyleSheet.create({
    container: { backgroundColor: colors.surface, borderColor: colors.border },
    label: { color: colors.text },
  }),
  danger: StyleSheet.create({
    container: { backgroundColor: colors.surface, borderColor: colors.danger },
    label: { color: colors.danger },
  }),
};
