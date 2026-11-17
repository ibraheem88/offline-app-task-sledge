import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';

import type { RootStackParamList } from '@/app/navigation';
import { Button } from '@/shared/ui/Button';
import { colors, spacing } from '@/shared/ui/theme';

import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

type Props = NativeStackScreenProps<RootStackParamList, 'RecordVoice'>;

function formatDuration(millis: number): string {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function RecordVoiceScreen({ navigation }: Props) {
  const { isRecording, durationMillis, recordingError, saving, start, stopAndSave, saveSample } =
    useVoiceRecorder(() => navigation.goBack());

  return (
    <View style={styles.screen}>
      <Text style={styles.timer}>{formatDuration(isRecording ? durationMillis : 0)}</Text>
      <Text style={styles.hint}>{isRecording ? 'Recording…' : 'Tap Record to start'}</Text>

      {isRecording ? (
        <Button title={saving ? 'Saving…' : 'Stop and save'} onPress={stopAndSave} disabled={saving} />
      ) : (
        <Button title="Record" onPress={start} disabled={saving} />
      )}

      {recordingError && <Text style={styles.error}>Recording failed: {recordingError}</Text>}

      <View style={styles.fallback}>
        <Text style={styles.hint}>No microphone (e.g. on an emulator)?</Text>
        <Button title="Use sample recording" variant="secondary" onPress={saveSample} disabled={saving || isRecording} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: spacing.lg,
    padding: spacing.xl,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  timer: {
    fontSize: 48,
    fontWeight: '300',
    textAlign: 'center',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    textAlign: 'center',
    color: colors.textMuted,
  },
  error: {
    textAlign: 'center',
    color: colors.danger,
  },
  fallback: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
});
