import { StyleSheet, Text, View } from 'react-native';

import type { CaptureItem } from '@/shared/types/capture';
import { Button } from '@/shared/ui/Button';
import { Icon, type IconName } from '@/shared/ui/Icon';
import { colors, fontSize, spacing } from '@/shared/ui/theme';

type Props = {
  items: CaptureItem[];
  isOffline: boolean;
  onRetryAllFailed: () => void;
};

type Summary = { icon: IconName; text: string; color: string; background: string };

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/** Answers the one question a field worker has: is my work safe and on its way? */
function summarize(items: CaptureItem[], isOffline: boolean): Summary {
  const waiting = items.filter((item) => item.status === 'pending' || item.status === 'syncing').length;
  const synced = items.filter((item) => item.status === 'synced').length;

  if (isOffline) {
    return {
      icon: 'wifi-off',
      text: waiting > 0 ? `Offline · ${waiting} waiting to upload` : 'Offline · captures are saved on this phone',
      color: colors.warning,
      background: colors.warningSoft,
    };
  }
  if (waiting > 0) {
    return {
      icon: 'cloud-sync-outline',
      text: `Uploading ${plural(waiting, 'capture')}…`,
      color: colors.info,
      background: colors.infoSoft,
    };
  }
  if (synced < items.length) {
    // Some captures failed; the failed row below explains them, so stay neutral here.
    return {
      icon: 'cloud-outline',
      text: `${synced} of ${plural(items.length, 'capture')} uploaded`,
      color: colors.text,
      background: colors.surface,
    };
  }
  return {
    icon: 'cloud-check',
    text: synced > 0 ? `All ${plural(synced, 'capture')} uploaded` : 'Online',
    color: colors.success,
    background: colors.successSoft,
  };
}

export function SyncStatusBar({ items, isOffline, onRetryAllFailed }: Props) {
  const { icon, text, color, background } = summarize(items, isOffline);
  const failed = items.filter((item) => item.status === 'error').length;

  return (
    <View>
      <View style={[styles.bar, { backgroundColor: background }]} accessibilityLiveRegion="polite">
        <Icon name={icon} size={20} color={color} />
        <Text style={[styles.text, { color }]}>{text}</Text>
      </View>

      {failed > 0 && (
        <View style={styles.failedRow}>
          <Text style={styles.failedText}>{plural(failed, 'capture')} failed to upload</Text>
          <Button title="Retry all" icon="refresh" variant="danger" onPress={onRetryAllFailed} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: '600',
  },
  failedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.dangerSoft,
  },
  failedText: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.danger,
  },
});
