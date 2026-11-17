import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { DEFAULT_BACKOFF } from '@/features/sync/backoff';
import { captureFile } from '@/shared/storage/captureFiles';
import type { CaptureItem } from '@/shared/types/capture';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { colors, fontSize, radius, spacing } from '@/shared/ui/theme';

type Props = {
  item: CaptureItem;
  isPlaying: boolean;
  onRetry: (id: string) => void;
  onTogglePlayback: (item: CaptureItem) => void;
};

const THUMBNAIL_SIZE = 64;

function formatCreatedAt(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function retryHint(item: CaptureItem): string {
  return item.nextRetryAt
    ? `Failed ${item.attempts} of ${DEFAULT_BACKOFF.maxAttempts} attempts, retrying automatically`
    : 'Automatic retries stopped';
}

export function CaptureRow({ item, isPlaying, onRetry, onTogglePlayback }: Props) {
  const isPhoto = item.type === 'photo';

  return (
    <View style={styles.row}>
      <View style={styles.main}>
        {isPhoto ? (
          <Image
            source={{ uri: captureFile(item.fileName).uri }}
            style={styles.thumbnail}
            accessibilityLabel="Photo thumbnail"
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause voice note' : 'Play voice note'}
            onPress={() => onTogglePlayback(item)}
            style={({ pressed }) => [styles.thumbnail, styles.playButton, pressed && styles.pressed]}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={32} color={colors.primary} />
          </Pressable>
        )}

        <View style={styles.details}>
          <View style={styles.titleLine}>
            <Icon name={isPhoto ? 'camera-outline' : 'microphone-outline'} size={18} color={colors.textMuted} />
            <Text style={styles.title}>{isPhoto ? 'Photo' : 'Voice note'}</Text>
          </View>
          <Text style={styles.meta}>{formatCreatedAt(item.createdAt)}</Text>
          <StatusBadge status={item.status} />
        </View>
      </View>

      {item.status === 'error' && (
        <View style={styles.errorPanel}>
          <View style={styles.errorText}>
            <Text style={styles.errorMessage} numberOfLines={2}>
              {item.lastError}
            </Text>
            <Text style={styles.meta}>{retryHint(item)}</Text>
          </View>
          <Button title="Retry" icon="refresh" variant="danger" onPress={() => onRetry(item.id)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  main: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  playButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.infoSoft,
  },
  pressed: {
    opacity: 0.6,
  },
  details: {
    flex: 1,
    gap: spacing.xs,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.title,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  errorPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  errorText: {
    flex: 1,
    gap: 2,
  },
  errorMessage: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.danger,
  },
});
