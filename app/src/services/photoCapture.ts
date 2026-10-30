import * as ImagePicker from 'expo-image-picker';

export interface CapturedPhoto {
  uri: string;
  base64: string;
  mimeType: string;
}

export type CaptureResult =
  | { status: 'ok'; photo: CapturedPhoto }
  | { status: 'cancelled' }
  | { status: 'denied'; message: string }
  | { status: 'failed'; message: string };

/** Opens the camera or the photo library and returns the picture, ready to send for an estimate. */
export async function capturePhoto(source: 'camera' | 'library'): Promise<CaptureResult> {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return {
      status: 'denied',
      message: source === 'camera' ? 'Camera access is off for Macrolens.' : 'Photo access is off for Macrolens.',
    };
  }

  const options: ImagePicker.ImagePickerOptions = { quality: 0.6, base64: true, mediaTypes: ['images'] };
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets[0]) return { status: 'cancelled' };

  const asset = result.assets[0];
  if (!asset.base64) return { status: 'failed', message: 'Couldn’t read that photo.' };
  return { status: 'ok', photo: { uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' } };
}
