import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { DEFAULT_BACKOFF } from '@/features/sync/backoff';
import { captureFile } from '@/shared/storage/captureFiles';
import type { CaptureItem } from '@/shared/types/capture';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { colors, radius, spacing } from '@/shared/ui/theme';

type Props = {
  item: CaptureItem;
  isPlaying: boolean;
  onRetry: (id: string) => void;
  onTogglePlayback: (item: CaptureItem) => void;
};

function formatCreatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function retryHint(item: CaptureItem): string {
  return item.nextRetryAt
    ? `Failed ${item.attempts} of ${DEFAULT_BACKOFF.maxAttempts} attempts, retrying automatically`
    : 'Automatic retries stopped. Tap Retry.';
}

export function CaptureRow({ item, isPlaying, onRetry, onTogglePlayback }: Props) {
  const isPhoto = item.type === 'photo';

  return (
    <View style={styles.row}>
      {isPhoto ? (
        <Image source={{ uri: captureFile(item.fileName).uri }} style={styles.thumbnail} />
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause voice note' : 'Play voice note'}
          onPress={() => onTogglePlayback(item)}
          style={({ pressed }) => [styles.thumbnail, styles.voiceThumbnail, pressed && styles.pressed]}
        >
          <Text style={styles.playIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
          <Text style={styles.playLabel}>{isPlaying ? 'Pause' : 'Play'}</Text>
        </Pressable>
      )}

      <View style={styles.body}>
        <View style={styles.titleLine}>
          <Text style={styles.title}>{isPhoto ? 'Photo' : 'Voice note'}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.meta}>{formatCreatedAt(item.createdAt)}</Text>

        {item.status === 'error' && (
          <>
            <Text style={styles.error} numberOfLines={2}>
              {item.lastError}
            </Text>
            <View style={styles.errorFooter}>
              <Text style={styles.meta}>{retryHint(item)}</Text>
              <Button title="Retry" size="small" variant="danger" onPress={() => onRetry(item.id)} />
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  voiceThumbnail: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.infoSoft,
  },
  pressed: {
    opacity: 0.6,
  },
  playIcon: {
    fontSize: 18,
    color: colors.info,
  },
  playLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.info,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    flexShrink: 1,
    fontSize: 12,
    color: colors.textMuted,
  },
  error: {
    fontSize: 13,
    color: colors.danger,
  },
  errorFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
