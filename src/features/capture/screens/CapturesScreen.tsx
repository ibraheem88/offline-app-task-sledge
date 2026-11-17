import { useNetInfo } from '@react-native-community/netinfo';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation';
import { syncEngine } from '@/app/services';
import { Button } from '@/shared/ui/Button';
import { Icon } from '@/shared/ui/Icon';
import { colors, fontSize, spacing } from '@/shared/ui/theme';

import { CaptureRow } from '../components/CaptureRow';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { useCaptures } from '../hooks/useCaptures';
import { usePhotoCapture } from '../hooks/usePhotoCapture';
import { useVoicePlayback } from '../hooks/useVoicePlayback';

type Props = NativeStackScreenProps<RootStackParamList, 'Captures'>;

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Icon name="cloud-upload-outline" size={48} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>No captures yet</Text>
      <Text style={styles.emptyBody}>
        Photos and voice notes are saved on this phone first, then upload automatically when you have signal.
      </Text>
    </View>
  );
}

export function CapturesScreen({ navigation }: Props) {
  const items = useCaptures();
  const { capturePhoto, saving } = usePhotoCapture();
  const { playingId, togglePlayback } = useVoicePlayback();
  const { isConnected } = useNetInfo();
  const insets = useSafeAreaInsets();

  const choosePhotoSource = () => {
    Alert.alert('Add photo', 'Take a new photo or choose one from your library.', [
      { text: 'Take photo', onPress: () => capturePhoto('camera') },
      { text: 'Choose from library', onPress: () => capturePhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.screen}>
      <SyncStatusBar
        items={items}
        isOffline={isConnected === false}
        onRetryAllFailed={() => syncEngine.retryAllFailed()}
      />

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
        contentContainerStyle={[styles.list, items.length === 0 && styles.listEmpty]}
        ListEmptyComponent={EmptyState}
      />

      {/* Capture actions sit at the bottom, within thumb reach, and are sized for gloves. */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={styles.action}>
          <Button
            title={saving ? 'Saving…' : 'Photo'}
            icon="camera"
            size="large"
            onPress={choosePhotoSource}
            disabled={saving}
          />
        </View>
        <View style={styles.action}>
          <Button
            title="Voice note"
            icon="microphone"
            size="large"
            onPress={() => navigation.navigate('RecordVoice')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.title,
    fontWeight: '600',
    color: colors.text,
  },
  emptyBody: {
    fontSize: fontSize.body,
    lineHeight: 22,
    textAlign: 'center',
    color: colors.textMuted,
  },
  actionBar: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  action: {
    flex: 1,
  },
});
