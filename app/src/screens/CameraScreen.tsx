import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton, GlassCard } from '../components/glass';
import { colors, spacing, typography } from '../theme';

/**
 * Entry point for the photo-logging flow. Captures/selects a photo, then
 * hands off to the review screen (FoodReviewScreen) once the vision API
 * call returns — that hand-off is NOT auto-committed to the log, per the
 * hard product requirement in docs/PRODUCT.md.
 *
 * Vision API wiring is a backend/services concern — see
 * src/services/visionApi.ts (not yet built) and docs/DECISIONS.md.
 */
export function CameraScreen() {
  const insets = useSafeAreaInsets();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
      // TODO: call services/visionApi.analyzeFoodPhoto(uri) then navigate
      // to FoodReviewScreen with the result — not implemented yet.
    }
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={[typography.largeTitle, { color: colors.textPrimary, paddingHorizontal: spacing.lg }]}>
        Log a meal
      </Text>

      <View style={styles.previewArea}>
        {photoUri ? (
          <GlassCard style={styles.previewCard} elevation="card" tint="medium">
            <Image source={{ uri: photoUri }} style={styles.preview} />
          </GlassCard>
        ) : (
          <GlassCard style={styles.previewCard} elevation="card" tint="light">
            <Text style={[typography.body, { color: colors.textTertiary, textAlign: 'center', padding: spacing.xl }]}>
              Take a photo of your meal to get started.
            </Text>
          </GlassCard>
        )}
      </View>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 100 }]}>
        {photoUri ? (
          <>
            <GlassButton
              label="Analyze this photo"
              onPress={() => {
                // TODO: services/visionApi.analyzeFoodPhoto(photoUri) then
                // navigate to FoodReviewScreen with the result.
              }}
              variant="primary"
              style={styles.actionButton}
            />
            <GlassButton
              label="Retake / choose a different photo"
              onPress={() => setPhotoUri(null)}
              variant="secondary"
              style={styles.actionButton}
            />
          </>
        ) : (
          <>
            <GlassButton
              label="Take Photo"
              onPress={pickFromCamera}
              variant="primary"
              style={styles.actionButton}
            />
            <GlassButton
              label="Upload a Picture"
              onPress={pickFromLibrary}
              variant="secondary"
              style={styles.actionButton}
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  previewArea: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  previewCard: {
    flex: 1,
    overflow: 'hidden',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  actionButton: {
    width: '100%',
  },
});
