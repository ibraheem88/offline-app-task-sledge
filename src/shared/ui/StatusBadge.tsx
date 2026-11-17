import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import type { SyncStatus } from '@/shared/types/capture';

import { Icon, type IconName } from './Icon';
import { colors, radius, spacing } from './theme';

const appearance: Record<SyncStatus, { label: string; icon: IconName; color: string; background: string }> = {
  pending: { label: 'Pending', icon: 'clock-outline', color: colors.warning, background: colors.warningSoft },
  syncing: { label: 'Syncing', icon: 'cloud-upload-outline', color: colors.info, background: colors.infoSoft },
  synced: { label: 'Synced', icon: 'cloud-check', color: colors.success, background: colors.successSoft },
  error: { label: 'Error', icon: 'alert-circle', color: colors.danger, background: colors.dangerSoft },
};

export function StatusBadge({ status }: { status: SyncStatus }) {
  const { label, icon, color, background } = appearance[status];
  return (
    <View style={[styles.badge, { backgroundColor: background }]} accessibilityLabel={`Status: ${label}`}>
      {/* The spinner is the only motion on the list, and only while an upload is actually running. */}
      {status === 'syncing' ? <ActivityIndicator size={14} color={color} /> : <Icon name={icon} size={14} color={color} />}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});
