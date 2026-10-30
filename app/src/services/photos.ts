import { Platform } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';

/**
 * Meal photos live in Documents/meal-photos. The image picker hands back a
 * file in a cache iOS may clear, so a logged photo is copied here. The app
 * container's path changes when the app updates, so stored URIs are resolved
 * against the current Documents folder when shown.
 */

const FOLDER = 'meal-photos';
const MARKER = `/Documents/${FOLDER}/`;

export function persistPhoto(uri: string | undefined, id: string): string | undefined {
  if (!uri || Platform.OS === 'web' || !uri.startsWith('file://') || uri.includes(MARKER)) return uri;
  try {
    const folder = new Directory(Paths.document, FOLDER);
    folder.create({ idempotent: true, intermediates: true });
    const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
    const destination = new File(folder, `${id}.${extension}`);
    if (destination.exists) destination.delete();
    new File(uri).copy(destination);
    return destination.uri;
  } catch {
    // Keeping the original is better than losing the meal over a photo.
    return uri;
  }
}

export function resolvePhotoUri(uri: string | undefined) {
  if (!uri || Platform.OS === 'web') return uri;
  const index = uri.indexOf(MARKER);
  if (index < 0) return uri;
  return new File(Paths.document, FOLDER, uri.slice(index + MARKER.length)).uri;
}

export function deletePhoto(uri: string | undefined) {
  const resolved = resolvePhotoUri(uri);
  if (!resolved || !resolved.includes(MARKER)) return;
  try {
    const file = new File(resolved);
    if (file.exists) file.delete();
  } catch {
    // A missing file is already the goal.
  }
}
