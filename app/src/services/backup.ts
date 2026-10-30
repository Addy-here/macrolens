import { Share } from 'react-native';
import { Directory, File, Paths } from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { useFoodLibraryStore, type LibraryFood } from '../store/useFoodLibraryStore';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { usePlanStore } from '../store/usePlanStore';
import { useUserStore } from '../store/useUserStore';
import { localDateKey } from '../utils/date';
import type { AdaptivePlan, FoodLogEntry, UserProfile, WeightEntry } from '../types';

/**
 * A single file holding everything Macrolens keeps on the phone, so data
 * survives deleting the app or moving to a new iPhone. The API key is never
 * included; it stays in the keychain. Versioned so a future server can
 * import the same file.
 */
export interface Backup {
  app: 'macrolens';
  version: 1;
  exportedAt: string;
  profile: UserProfile | null;
  plan: AdaptivePlan | null;
  weights: WeightEntry[];
  entries: FoodLogEntry[];
  foods: LibraryFood[];
  links: Record<string, string>;
  /** Meal photos by file name, base64. */
  photos: Record<string, string>;
}

const PHOTO_FOLDER = 'meal-photos';

export class BackupError extends Error {}

export async function exportBackup() {
  const photos: Record<string, string> = {};
  const folder = new Directory(Paths.document, PHOTO_FOLDER);
  if (folder.exists) {
    for (const entry of folder.list()) {
      if (entry instanceof File) photos[entry.name] = await entry.base64();
    }
  }

  const { foods, links } = useFoodLibraryStore.getState();
  const backup: Backup = {
    app: 'macrolens',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: useUserStore.getState().profile,
    plan: usePlanStore.getState().currentPlan,
    weights: usePlanStore.getState().weightHistory,
    entries: useFoodLogStore.getState().entries,
    foods,
    links,
    photos,
  };

  const file = new File(Paths.cache, `Macrolens backup ${localDateKey(new Date())}.json`);
  if (file.exists) file.delete();
  file.create();
  await file.write(JSON.stringify(backup));
  await Share.share({ url: file.uri, title: 'Macrolens backup' });
}

export interface BackupSummary {
  backup: Backup;
  meals: number;
  weighIns: number;
  foods: number;
  exportedAt: Date;
}

/** Lets the person pick a backup file and checks it. Nothing is changed until `restoreBackup`. */
export async function pickBackup(): Promise<BackupSummary | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'public.json', '*/*'], copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(await new File(result.assets[0].uri).text());
  } catch {
    throw new BackupError('That file isn’t a Macrolens backup.');
  }
  const backup = parsed as Partial<Backup>;
  if (backup?.app !== 'macrolens' || typeof backup.version !== 'number') {
    throw new BackupError('That file isn’t a Macrolens backup.');
  }
  if (backup.version > 1) throw new BackupError('This backup is from a newer version of Macrolens. Update the app first.');
  const complete: Backup = {
    app: 'macrolens',
    version: 1,
    exportedAt: backup.exportedAt ?? new Date().toISOString(),
    profile: backup.profile ?? null,
    plan: backup.plan ?? null,
    weights: Array.isArray(backup.weights) ? backup.weights : [],
    entries: Array.isArray(backup.entries) ? backup.entries : [],
    foods: Array.isArray(backup.foods) ? backup.foods : [],
    links: backup.links && typeof backup.links === 'object' ? backup.links : {},
    photos: backup.photos && typeof backup.photos === 'object' ? backup.photos : {},
  };
  return {
    backup: complete,
    meals: complete.entries.length,
    weighIns: complete.weights.length,
    foods: complete.foods.length,
    exportedAt: new Date(complete.exportedAt),
  };
}

/** Replaces everything on the phone with the backup. */
export async function restoreBackup(backup: Backup) {
  const folder = new Directory(Paths.document, PHOTO_FOLDER);
  folder.create({ idempotent: true, intermediates: true });
  for (const [name, data] of Object.entries(backup.photos)) {
    if (!/^[\w.-]+$/.test(name)) continue;
    const file = new File(folder, name);
    if (file.exists) file.delete();
    file.create();
    await file.write(data, { encoding: 'base64' });
  }

  if (backup.profile) useUserStore.getState().setProfile(backup.profile);
  else useUserStore.setState({ profile: null, isOnboarded: false });
  usePlanStore.setState({ currentPlan: backup.plan, weightHistory: backup.weights });
  useFoodLogStore.setState({ entries: backup.entries });
  useFoodLibraryStore.setState({ foods: backup.foods, links: backup.links });
}
