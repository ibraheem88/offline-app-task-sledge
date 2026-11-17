import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useState } from 'react';

import { saveCapture } from '../captureService';
import { getSampleVoiceNote } from '../sampleVoiceNote';

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Records a real voice note when possible. If recording fails (no microphone,
 * permission denied) `recordingError` is set so the screen can offer the sample clip instead.
 */
export function useVoiceRecorder(onSaved: () => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const { isRecording, durationMillis } = useAudioRecorderState(recorder);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const start = async () => {
    setRecordingError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) throw new Error('Microphone permission was denied.');
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (error) {
      setRecordingError(messageOf(error));
    }
  };

  const stopAndSave = async () => {
    setSaving(true);
    try {
      await recorder.stop();
      if (!recorder.uri) throw new Error('The recorder did not produce a file.');
      await saveCapture('voice', { uri: recorder.uri, mimeType: 'audio/mp4', extension: 'm4a' });
      onSaved();
    } catch (error) {
      setRecordingError(messageOf(error));
    } finally {
      setSaving(false);
    }
  };

  const saveSample = async () => {
    setSaving(true);
    try {
      await saveCapture('voice', await getSampleVoiceNote());
      onSaved();
    } catch (error) {
      setRecordingError(messageOf(error));
    } finally {
      setSaving(false);
    }
  };

  return { isRecording, durationMillis, recordingError, saving, start, stopAndSave, saveSample };
}
