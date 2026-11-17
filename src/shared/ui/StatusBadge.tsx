import { StyleSheet, Text, View } from 'react-native';

import type { SyncStatus } from '@/shared/types/capture';

import { colors, radius, spacing } from './theme';

const appearance: Record<SyncStatus, { label: string; color: string; background: string }> = {
  pending: { label: 'Pending', color: colors.warning, background: colors.warningSoft },
  syncing: { label: 'Syncing', color: colors.info, background: colors.infoSoft },
  synced: { label: 'Synced', color: colors.success, background: colors.successSoft },
  error: { label: 'Error', color: colors.danger, background: colors.dangerSoft },
};

export function StatusBadge({ status }: { status: SyncStatus }) {
  const { label, color, background } = appearance[status];
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
