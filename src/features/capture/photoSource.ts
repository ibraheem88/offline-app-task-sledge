import * as ImagePicker from 'expo-image-picker';

import type { CapturedMedia } from './captureService';

export type PhotoSource = 'camera' | 'library';

const pickerOptions: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7 };

/** Opens the camera or photo library. Returns null if the user cancels. */
export async function getPhoto(source: PhotoSource): Promise<CapturedMedia | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Camera permission was denied.');
  }

  const result =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

  const asset = result.canceled ? undefined : result.assets[0];
  if (!asset) return null;

  return {
    uri: asset.uri,
    mimeType: asset.mimeType ?? 'image/jpeg',
    extension: asset.uri.split('.').pop()?.toLowerCase() || 'jpg',
  };
}
