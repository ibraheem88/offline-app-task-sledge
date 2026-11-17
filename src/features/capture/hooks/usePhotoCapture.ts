import { useState } from 'react';
import { Alert } from 'react-native';

import { saveCapture } from '../captureService';
import { getPhoto, type PhotoSource } from '../photoSource';

export function usePhotoCapture() {
  const [saving, setSaving] = useState(false);

  const capturePhoto = async (source: PhotoSource) => {
    setSaving(true);
    try {
      const photo = await getPhoto(source);
      if (photo) await saveCapture('photo', photo);
    } catch (error) {
      Alert.alert('Could not save photo', error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return { capturePhoto, saving };
}
