import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation';
import { syncEngine } from '@/app/services';
import type { CaptureItem, SyncStatus } from '@/shared/types/capture';
import { Button } from '@/shared/ui/Button';
import { colors, radius, spacing } from '@/shared/ui/theme';

import { CaptureRow } from '../components/CaptureRow';
import { useCaptures } from '../hooks/useCaptures';
import { usePhotoCapture } from '../hooks/usePhotoCapture';
import { useVoicePlayback } from '../hooks/useVoicePlayback';

type Props = NativeStackScreenProps<RootStackParamList, 'Captures'>;

const summaryLabels: [SyncStatus, string][] = [
  ['synced', 'synced'],
  ['syncing', 'uploading'],
  ['pending', 'waiting'],
  ['error', 'failed'],
];

/** e.g. "3 synced · 1 waiting · 1 failed" – zero counts are left out. */
function syncSummary(items: CaptureItem[]): string {
  return summaryLabels
    .map(([status, label]) => [items.filter((item) => item.status === status).length, label] as const)
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${count} ${label}`)
    .join(' · ');
}

export function CapturesScreen({ navigation }: Props) {
  const items = useCaptures();
  const { capturePhoto, saving } = usePhotoCapture();
  const { playingId, togglePlayback } = useVoicePlayback();
  const { isConnected } = useNetInfo();
  const insets = useSafeAreaInsets();
  const failedCount = items.filter((item) => item.status === 'error').length;

  const choosePhotoSource = () => {
    Alert.alert('Add photo', 'Take a new photo or choose one from your library.', [
      { text: 'Take photo', onPress: () => capturePhoto('camera') },
      { text: 'Choose from library', onPress: () => capturePhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.screen}>
      {isConnected === false && (
        <Text style={styles.offlineBanner}>Offline – captures are saved and will upload later</Text>
      )}

      <View style={styles.actions}>
        <View style={styles.action}>
          <Button title={saving ? 'Saving…' : 'Photo'} onPress={choosePhotoSource} disabled={saving} />
        </View>
        <View style={styles.action}>
          <Button title="Voice note" onPress={() => navigation.navigate('RecordVoice')} />
        </View>
      </View>

      {items.length > 0 && <Text style={styles.summary}>{syncSummary(items)}</Text>}

      {failedCount > 0 && (
        <View style={styles.retryAll}>
          <Button
            title={`Retry all failed (${failedCount})`}
            variant="danger"
            onPress={() => syncEngine.retryAllFailed()}
          />
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CaptureRow
            item={item}
            isPlaying={playingId === item.id}
            onRetry={(id) => syncEngine.retry(id)}
            onTogglePlayback={togglePlayback}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing.lg }]}
        ListEmptyComponent={<Text style={styles.empty}>No captures yet. Take a photo or record a voice note.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  offlineBanner: {
    backgroundColor: colors.warningSoft,
    color: colors.warning,
    textAlign: 'center',
    fontWeight: '600',
    padding: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  action: {
    flex: 1,
  },
  summary: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    fontSize: 13,
    color: colors.textMuted,
  },
  retryAll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  empty: {
    marginTop: spacing.xl,
    textAlign: 'center',
    color: colors.textMuted,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.xl,
  },
});
