import { Image, StyleSheet, Text, View } from 'react-native';

import { DEFAULT_BACKOFF } from '@/features/sync/backoff';
import { captureFile } from '@/shared/storage/captureFiles';
import type { CaptureItem } from '@/shared/types/capture';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { colors, radius, spacing } from '@/shared/ui/theme';

type Props = {
  item: CaptureItem;
  onRetry: (id: string) => void;
};

function retryHint(item: CaptureItem): string {
  return item.nextRetryAt
    ? `Failed ${item.attempts} of ${DEFAULT_BACKOFF.maxAttempts} attempts, retrying automatically`
    : 'Automatic retries stopped. Tap Retry.';
}

export function CaptureRow({ item, onRetry }: Props) {
  const isPhoto = item.type === 'photo';

  return (
    <View style={styles.row}>
      {isPhoto ? (
        <Image source={{ uri: captureFile(item.fileName).uri }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.voiceThumbnail]}>
          <Text style={styles.voiceIcon}>🎙</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.titleLine}>
          <Text style={styles.title}>{isPhoto ? 'Photo' : 'Voice note'}</Text>
          <StatusBadge status={item.status} />
        </View>
        <Text style={styles.meta}>{new Date(item.createdAt).toLocaleString()}</Text>

        {item.status === 'error' && (
          <>
            <Text style={styles.error}>{item.lastError}</Text>
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
  },
  voiceIcon: {
    fontSize: 24,
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
