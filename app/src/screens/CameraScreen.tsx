import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { GlassButton } from '../components/glass';
import { Card } from '../components/ui/Card';
import { FoodThumb } from '../components/ui/FoodThumb';
import { Icon } from '../components/ui/Icon';
import { ListRow } from '../components/ui/ListRow';
import { SectionHeader } from '../components/ui/SectionHeader';
import { colors, radius, spacing, typography } from '../theme';
import { modelLabel, providerLabel } from '../services/aiKey';
import { analyzeFoodPhoto, VisionError } from '../services/visionApi';
import { useAiKeyStore } from '../store/useAiKeyStore';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { useReviewStore } from '../store/useReviewStore';
import { useDevAutoScroll } from '../dev/devScroll';
import { createId } from '../utils/id';
import { entryTitle } from '../utils/meals';
import type { FoodLogEntry } from '../types';

interface SelectedPhoto {
  uri: string;
  base64: string;
  mimeType: string;
}

const STEPS = ['Finding foods…', 'Estimating portions…', 'Adding up macros…'];

/**
 * Photo logging. Estimate opens the review sheet. Only Confirm there writes the log.
 */
export function CameraScreen() {
  const hydrate = useAiKeyStore((s) => s.hydrate);
  const hasKey = useAiKeyStore((s) => s.hasKey);
  const provider = useAiKeyStore((s) => s.provider);
  const model = useAiKeyStore((s) => s.model);
  const loggedToken = useReviewStore((s) => s.loggedToken);
  const pending = useReviewStore((s) => s.pending);
  const entries = useFoodLogStore((s) => s.entries);
  const seenLog = useRef(loggedToken);
  const scrollRef = useDevAutoScroll('log');

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

  const recent = useMemo(() => {
    const seen = new Set<string>();
    const list: FoodLogEntry[] = [];
    for (const entry of [...entries].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))) {
      const title = entryTitle(entry.items);
      if (seen.has(title)) continue;
      seen.add(title);
      list.push(entry);
      if (list.length === 8) break;
    }
    return list;
  }, [entries]);

  const canReview = Boolean(photo && pending && pending.photoUri === photo.uri);

  const takePhoto = async (source: 'camera' | 'library') => {
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError(
        source === 'camera'
          ? 'Camera access is off. Turn it on in Settings to photograph a meal.'
          : 'Photo access is off. Turn it on in Settings to choose a picture.',
      );
      return;
    }

    const options: ImagePicker.ImagePickerOptions = { quality: 0.6, base64: true, mediaTypes: ['images'] };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    if (!asset.base64) {
      setError('Could not read that photo. Try another one.');
      return;
    }
    setPhoto({ uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType ?? 'image/jpeg' });
    setError(null);
  };

  const analyze = async () => {
    if (!photo || isAnalyzing) return;
    if (!hasKey) {
      setError('Add your API key in Settings first. The photo goes only to the provider you choose.');
      return;
    }
    setIsAnalyzing(true);
    setError(null);
    try {
      const items = await analyzeFoodPhoto({ base64: photo.base64, mimeType: photo.mimeType });
      useReviewStore.getState().setPending({ photoUri: photo.uri, items });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/review');
    } catch (err) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err instanceof VisionError ? err.message : 'Could not analyze that photo.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const logAgain = (entry: FoodLogEntry) => {
    useReviewStore.getState().setPending({
      photoUri: entry.photoUri ?? '',
      items: entry.items.map((food) => ({ ...food, id: createId(), userAdjusted: false })),
    });
    router.push('/review');
  };

  const primary = !photo
    ? { label: 'Take Photo', icon: 'camera.fill' as const, run: () => void takePhoto('camera') }
    : canReview
      ? { label: 'Review Estimate', icon: 'list.bullet.rectangle' as const, run: () => router.push('/review') }
      : {
          label: isAnalyzing ? 'Estimating…' : 'Estimate Meal',
          icon: 'sparkles' as const,
          run: () => void analyze(),
        };

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
    >
      <Viewfinder
        photoUri={photo?.uri}
        analyzing={isAnalyzing}
        ready={canReview}
        onPress={() => {
          if (!photo) void takePhoto('camera');
        }}
      />

      {error ? (
        <View style={styles.error} accessibilityRole="alert">
          <Icon name="exclamationmark.triangle.fill" size={15} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <GlassButton
          label={primary.label}
          icon={primary.icon}
          onPress={primary.run}
          disabled={isAnalyzing}
          variant="primary"
        />
        <View style={styles.secondaryRow}>
          {photo ? (
            <GlassButton
              label="Retake"
              icon="arrow.counterclockwise"
              onPress={() => void takePhoto('camera')}
              disabled={isAnalyzing}
              style={styles.flex}
            />
          ) : null}
          <GlassButton
            label={photo ? 'Library' : 'Choose from Library'}
            icon="photo.on.rectangle"
            onPress={() => void takePhoto('library')}
            disabled={isAnalyzing}
            style={styles.flex}
          />
        </View>
      </View>

      {hasKey ? (
        <View style={styles.privacy}>
          <Icon name="lock.fill" size={12} color={colors.textTertiary} />
          <Text style={styles.privacyText}>
            Sent only to {providerLabel(provider)} · {modelLabel(provider, model)}. Nothing is saved until you
            confirm.
          </Text>
        </View>
      ) : (
        <Card padded={false} style={styles.keyCard}>
          <ListRow
            first
            icon="key.fill"
            tint={colors.tile.orange}
            title="Add your API key"
            subtitle="Estimates use your own Gemini, OpenAI, or Anthropic key."
            accessory="chevron"
            onPress={() => router.navigate('/settings')}
          />
        </Card>
      )}

      {recent.length > 0 ? (
        <>
          <SectionHeader title="Log again" trailing="Opens review first" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentRow}
            style={styles.recentScroller}
          >
            {recent.map((entry) => (
              <Pressable
                key={entry.id}
                accessibilityRole="button"
                accessibilityLabel={`Log ${entryTitle(entry.items)} again`}
                onPress={() => logAgain(entry)}
                style={({ pressed }) => [styles.recent, pressed && styles.recentPressed]}
              >
                <FoodThumb uri={entry.photoUri} size={128} />
                <Text style={styles.recentTitle} numberOfLines={1}>
                  {entryTitle(entry.items)}
                </Text>
                <Text style={styles.recentKcal}>{Math.round(entry.totalMacros.calories)} kcal</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}
    </ScrollView>
  );
}

function Viewfinder({
  photoUri,
  analyzing,
  ready,
  onPress,
}: {
  photoUri?: string;
  analyzing: boolean;
  ready: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={Boolean(photoUri)}
      accessibilityRole={photoUri ? 'image' : 'button'}
      accessibilityLabel={photoUri ? 'Meal photo' : 'Take a photo of your meal'}
      style={styles.viewfinder}
    >
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
      ) : (
        <View style={styles.prompt}>
          <Icon name="camera.viewfinder" size={40} color={colors.textOnMedia} weight="regular" />
          <Text style={styles.promptTitle}>Photograph your plate</Text>
          <Text style={styles.promptBody}>Fit the whole plate in the frame, from a little above.</Text>
        </View>
      )}
      <Corners />
      {analyzing ? <Scanning /> : null}
      {photoUri && !analyzing ? (
        <View style={styles.badge}>
          <Icon
            name={ready ? 'checkmark.circle.fill' : 'sparkles'}
            size={13}
            color={ready ? '#7CE0A8' : colors.textOnMedia}
          />
          <Text style={styles.badgeText}>{ready ? 'Estimate ready' : 'Ready to estimate'}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function Corners() {
  return (
    <View pointerEvents="none" style={styles.corners}>
      <View style={[styles.corner, styles.tl]} />
      <View style={[styles.corner, styles.tr]} />
      <View style={[styles.corner, styles.bl]} />
      <View style={[styles.corner, styles.br]} />
    </View>
  );
}

/** A line sweeps the photo while the model works; the caption names each stage. */
function Scanning() {
  const reduceMotion = useReducedMotion();
  const [height, setHeight] = useState(0);
  const [step, setStep] = useState(0);
  const sweep = useSharedValue(0);

  useEffect(() => {
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, STEPS.length - 1)), 1600);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (reduceMotion || height === 0) return;
    sweep.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.cubic) }), -1, true);
    return () => cancelAnimation(sweep);
  }, [height, reduceMotion, sweep]);

  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sweep.value * Math.max(height - 2, 0) }],
  }));

  return (
    <View
      style={styles.scanning}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      accessibilityLiveRegion="polite"
      accessibilityLabel={STEPS[step]}
    >
      {!reduceMotion ? <Animated.View style={[styles.scanLine, lineStyle]} /> : null}
      <View style={styles.scanCaption}>
        <ActivityIndicator color={colors.textOnMedia} />
        <Text style={styles.scanText}>{STEPS[step]}</Text>
      </View>
    </View>
  );
}

const CORNER = 30;
const INSET = 18;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.gutter,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  flex: {
    flex: 1,
  },
  viewfinder: {
    aspectRatio: 1.2,
    borderRadius: radius.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    backgroundColor: colors.viewfinder,
  },
  prompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  promptTitle: {
    ...typography.headline,
    color: colors.textOnMedia,
    marginTop: spacing.xs,
  },
  promptBody: {
    ...typography.footnote,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  corners: {
    ...StyleSheet.absoluteFill,
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  tl: { top: INSET, left: INSET, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 14 },
  tr: { top: INSET, right: INSET, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 14 },
  bl: { bottom: INSET, left: INSET, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 14 },
  br: { bottom: INSET, right: INSET, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 14 },
  badge: {
    position: 'absolute',
    left: INSET + 6,
    bottom: INSET + 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.textOnMedia,
  },
  scanning: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.scrim,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  scanCaption: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  scanText: {
    ...typography.subheadline,
    color: colors.textOnMedia,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md - 4,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: {
    ...typography.footnote,
    color: colors.textPrimary,
    flex: 1,
  },
  actions: {
    marginTop: spacing.md,
    gap: spacing.sm + 2,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  privacy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  privacyText: {
    ...typography.caption,
    color: colors.textTertiary,
    flex: 1,
    textAlign: 'left',
  },
  keyCard: {
    marginTop: spacing.md,
  },
  recentScroller: {
    marginHorizontal: -spacing.gutter,
  },
  recentRow: {
    paddingHorizontal: spacing.gutter,
    gap: spacing.sm + 4,
  },
  recent: {
    width: 128,
    gap: 2,
  },
  recentPressed: {
    opacity: 0.7,
  },
  recentTitle: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: spacing.sm - 2,
  },
  recentKcal: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
