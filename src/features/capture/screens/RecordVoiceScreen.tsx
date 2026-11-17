import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootStackParamList } from '@/app/navigation';
import { Icon } from '@/shared/ui/Icon';
import { colors, fontSize, radius, spacing, touchTarget } from '@/shared/ui/theme';

import { useVoiceRecorder } from '../hooks/useVoiceRecorder';

type Props = NativeStackScreenProps<RootStackParamList, 'RecordVoice'>;

const RECORD_BUTTON_SIZE = 112;

function formatDuration(millis: number): string {
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

export function RecordVoiceScreen({ navigation }: Props) {
  const { isRecording, durationMillis, recordingError, saving, start, stopAndSave, saveSample } =
    useVoiceRecorder(() => navigation.goBack());
  const insets = useSafeAreaInsets();

  const hint = saving ? 'Saving…' : isRecording ? 'Tap to stop and save' : 'Tap to start recording';

  return (
    <View style={[styles.screen, { paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.center}>
        <View style={styles.statusLine}>
          {isRecording && <View style={styles.recordingDot} />}
          <Text style={[styles.status, isRecording && styles.statusRecording]}>
            {isRecording ? 'Recording' : 'Ready'}
          </Text>
        </View>

        <Text style={styles.timer}>{formatDuration(isRecording ? durationMillis : 0)}</Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isRecording ? 'Stop and save recording' : 'Start recording'}
          accessibilityState={{ disabled: saving }}
          onPress={isRecording ? stopAndSave : start}
          disabled={saving}
          style={({ pressed }) => [
            styles.recordButton,
            isRecording && styles.recordButtonActive,
            (pressed || saving) && styles.pressed,
          ]}
        >
          {saving ? (
            <ActivityIndicator size="large" color={colors.primaryText} />
          ) : (
            <Icon name={isRecording ? 'stop' : 'microphone'} size={48} color={colors.primaryText} />
          )}
        </Pressable>

        <Text style={styles.hint}>{hint}</Text>

        {recordingError && (
          <View style={styles.errorBox}>
            <Icon name="alert-circle" size={20} color={colors.danger} />
            <Text style={styles.errorText}>
              Recording failed: {recordingError} You can save a sample recording instead.
            </Text>
          </View>
        )}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={saveSample}
        disabled={saving || isRecording}
        style={({ pressed }) => [styles.sampleLink, (pressed || saving || isRecording) && styles.pressed]}
      >
        <Text style={styles.sampleText}>No microphone? Use a sample recording</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  status: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.textMuted,
  },
  statusRecording: {
    color: colors.danger,
  },
  timer: {
    fontSize: fontSize.timer,
    fontWeight: '300',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  recordButton: {
    width: RECORD_BUTTON_SIZE,
    height: RECORD_BUTTON_SIZE,
    borderRadius: RECORD_BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginTop: spacing.lg,
  },
  recordButtonActive: {
    backgroundColor: colors.danger,
  },
  pressed: {
    opacity: 0.6,
  },
  hint: {
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.danger,
  },
  sampleLink: {
    minHeight: touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sampleText: {
    fontSize: fontSize.body,
    fontWeight: '600',
    color: colors.primary,
  },
});
