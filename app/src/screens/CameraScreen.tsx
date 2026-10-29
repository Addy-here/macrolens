import React, { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton } from '../components/glass';
import { ScreenHeader } from '../components/ui/ScreenHeader';
import { TextButton } from '../components/ui/TextButton';
import { colors, radius, spacing, typography } from '../theme';
import { analyzeFoodPhoto, VisionError } from '../services/visionApi';
import { useAiKeyStore } from '../store/useAiKeyStore';
import { useReviewStore } from '../store/useReviewStore';

interface SelectedPhoto {
  uri: string;
  base64: string;
  mimeType: string;
}

/**
 * Photo logging. Analyze opens the review sheet. Only Confirm there writes the log.
 */
export function CameraScreen() {
  const insets = useSafeAreaInsets();
  const hydrate = useAiKeyStore((s) => s.hydrate);
  const hasKey = useAiKeyStore((s) => s.hasKey);
  const loggedToken = useReviewStore((s) => s.loggedToken);
  const pending = useReviewStore((s) => s.pending);
  const seenLog = useRef(loggedToken);

  const [photo, setPhoto] = useState<SelectedPhoto | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (seenLog.current === loggedToken) return;
    seenLog.current = loggedToken;
    setPhoto(null);
    setError(null);
  }, [loggedToken]);

  const canReview = Boolean(photo && pending && pending.photoUri === photo.uri);

  const takePhoto = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        source === 'camera'
          ? 'Camera access is off. Enable it in Settings to photograph a meal.'
          : 'Photo access is off. Enable it in Settings to choose a picture.',
      );
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.6, base64: true });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      setError('Could not read that photo. Try another one.');
      return;
    }
    setPhoto({
      uri: asset.uri,
      base64: asset.base64,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
    setError(null);
  };

  const analyze = async () => {
    if (!photo || isAnalyzing) return;
    if (!hasKey) {
      setError('Add your API key in Settings. The photo goes only to the provider you choose.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const items = await analyzeFoodPhoto({
        base64: photo.base64,
        mimeType: photo.mimeType,
      });
      useReviewStore.getState().setPending({ photoUri: photo.uri, items });
      router.push('/review');
    } catch (err) {
      setError(err instanceof VisionError ? err.message : 'Could not analyze that photo.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const primaryLabel = !photo
    ? 'Take a photo'
    : canReview
      ? 'Review estimate'
      : isAnalyzing
        ? 'Reading the plate…'
        : 'Analyze';

  const onPrimary = () => {
    if (!photo) {
      void takePhoto('camera');
      return;
    }
    if (canReview) {
      router.push('/review');
      return;
    }
    void analyze();
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.header}>
        <ScreenHeader
          eyebrow="Log"
          uppercase
          title={photo ? 'This plate' : 'A new meal'}
          detail={photo ? undefined : 'You’ll check the estimate before anything is saved.'}
        />
      </View>

      {photo ? (
        <View style={styles.stage}>
          <Image source={{ uri: photo.uri }} style={styles.preview} />
          {isAnalyzing ? (
            <View style={styles.analyzing}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.analyzingText}>Reading the plate…</Text>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.invitation}>
          <View style={styles.mark}>
            {Platform.OS === 'ios' ? (
              <SymbolView name="camera.fill" tintColor={colors.accent} size={34} />
            ) : (
              <View style={styles.markDot} />
            )}
          </View>
        </View>
      )}

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}

      <View style={[styles.actions, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <GlassButton
          label={primaryLabel}
          onPress={onPrimary}
          disabled={isAnalyzing}
          variant="primary"
          style={styles.primary}
        />
        <TextButton
          label={photo ? 'Change photo' : 'Choose from library'}
          onPress={() => {
            if (!photo) {
              void takePhoto('library');
              return;
            }
            if (Platform.OS === 'ios') {
              ActionSheetIOS.showActionSheetWithOptions(
                {
                  options: ['Take Photo', 'Choose from Library', 'Cancel'],
                  cancelButtonIndex: 2,
                },
                (index) => {
                  if (index === 0) void takePhoto('camera');
                  if (index === 1) void takePhoto('library');
                },
              );
              return;
            }
            void takePhoto('library');
          }}
          disabled={isAnalyzing}
        />
        {!hasKey ? (
          <TextButton label="Add your API key" onPress={() => router.push('/settings')} tone="muted" />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
  },
  stage: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  invitation: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },
  mark: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  markDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  analyzing: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.scrim,
    gap: spacing.sm,
  },
  analyzingText: {
    ...typography.caption,
    color: colors.textPrimary,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  primary: {
    width: '100%',
  },
});
