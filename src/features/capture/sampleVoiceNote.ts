import { Asset } from 'expo-asset';

import type { CapturedMedia } from './captureService';

// Bundled clip used when the device or emulator can't record (no mic, permission denied).
const SAMPLE_VOICE_NOTE: number = require('../../../assets/mock/voice-note.m4a');

export async function getSampleVoiceNote(): Promise<CapturedMedia> {
  const asset = await Asset.fromModule(SAMPLE_VOICE_NOTE).downloadAsync();
  if (!asset.localUri) throw new Error('Sample voice note is not available.');
  return { uri: asset.localUri, mimeType: 'audio/mp4', extension: 'm4a' };
}
