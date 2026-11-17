import { uploadCapture } from '@/features/sync/httpUploader';
import { SyncEngine } from '@/features/sync/SyncEngine';
import { captureFileExists } from '@/shared/storage/captureFiles';
import { SqliteCaptureRepository } from '@/shared/storage/SqliteCaptureRepository';

// The one place where concrete implementations are wired together.
export const captureRepository = new SqliteCaptureRepository();

export const syncEngine = new SyncEngine({
  repository: captureRepository,
  upload: uploadCapture,
  fileExists: (item) => captureFileExists(item.fileName),
});
