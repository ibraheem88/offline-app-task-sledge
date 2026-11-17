import { Directory, File, Paths } from 'expo-file-system';

// Only the file name is stored in the database: on iOS the absolute documents path
// can change between app updates, so the full URI is rebuilt at read time.
const capturesDirectory = new Directory(Paths.document, 'captures');

function ensureDirectory() {
  if (!capturesDirectory.exists) {
    capturesDirectory.create({ intermediates: true });
  }
}

/** Copies a temporary file (picker cache, recorder output) into permanent app storage. */
export async function persistCaptureFile(sourceUri: string, fileName: string): Promise<void> {
  ensureDirectory();
  await new File(sourceUri).copy(new File(capturesDirectory, fileName));
}

export function captureFile(fileName: string): File {
  return new File(capturesDirectory, fileName);
}

export function captureFileExists(fileName: string): boolean {
  return captureFile(fileName).exists;
}

export function deleteCaptureFile(fileName: string): void {
  const file = captureFile(fileName);
  if (file.exists) file.delete();
}
