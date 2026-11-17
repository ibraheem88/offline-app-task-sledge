import { randomUUID } from 'expo-crypto';

import { captureRepository, syncEngine } from '@/app/services';
import { deleteCaptureFile, persistCaptureFile } from '@/shared/storage/captureFiles';
import type { CaptureType } from '@/shared/types/capture';

export type CapturedMedia = {
  /** Temporary location from the picker or recorder. */
  uri: string;
  mimeType: string;
  extension: string;
};

/**
 * Saves a capture so it can never be lost: the file is copied into app storage first,
 * then the queue row is written, then a sync is attempted.
 */
export async function saveCapture(type: CaptureType, media: CapturedMedia): Promise<void> {
  const id = randomUUID();
  const fileName = `${id}.${media.extension}`;

  await persistCaptureFile(media.uri, fileName);
  try {
    await captureRepository.insert({
      id,
      type,
      fileName,
      mimeType: media.mimeType,
      createdAt: Date.now(),
      status: 'pending',
      attempts: 0,
      lastError: null,
      nextRetryAt: null,
    });
  } catch (error) {
    // Don't leave an orphaned file behind if the row could not be written.
    deleteCaptureFile(fileName);
    throw error;
  }

  void syncEngine.sync();
}
