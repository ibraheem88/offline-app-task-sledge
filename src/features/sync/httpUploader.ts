import { UploadType } from 'expo-file-system';

import { env } from '@/shared/config/env';
import { captureFile } from '@/shared/storage/captureFiles';
import type { CaptureItem } from '@/shared/types/capture';

import type { UploadResult } from './SyncEngine';

const UPLOAD_TIMEOUT_MS = 30_000;

/** Sends one capture as multipart/form-data. The capture id doubles as the idempotency key. */
export async function uploadCapture(item: CaptureItem): Promise<UploadResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

  try {
    const response = await captureFile(item.fileName).upload(`${env.apiUrl}/uploads`, {
      httpMethod: 'POST',
      uploadType: UploadType.MULTIPART,
      fieldName: 'file',
      mimeType: item.mimeType,
      headers: { 'Idempotency-Key': item.id },
      parameters: { id: item.id, type: item.type, createdAt: String(item.createdAt) },
      signal: controller.signal,
    });
    return toUploadResult(response.status, response.body);
  } catch {
    // The native error is long and technical; the user only needs to know the server wasn't reached.
    throw new Error(controller.signal.aborted ? 'Upload timed out' : 'Could not reach the upload server');
  } finally {
    clearTimeout(timeout);
  }
}

function toUploadResult(status: number, body: string): UploadResult {
  if (status >= 200 && status < 300) return { ok: true };

  // Server and rate-limit errors may pass; other 4xx mean the request itself is wrong.
  const retryable = status >= 500 || status === 408 || status === 429;
  return { ok: false, retryable, error: `HTTP ${status}: ${serverMessage(body)}` };
}

function serverMessage(body: string): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === 'object' && 'error' in parsed && typeof parsed.error === 'string') {
      return parsed.error;
    }
  } catch {
    // Not JSON – fall through to the raw body.
  }
  return body.slice(0, 120) || 'Upload failed';
}
