import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';
import type { SFSymbol } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { GlassButton } from '../components/glass';
import { Card } from '../components/ui/Card';
import { FoodThumb } from '../components/ui/FoodThumb';
import { MealPlate } from '../components/MealPlate';
import { Icon } from '../components/ui/Icon';
import { PhotoScan } from '../components/ui/PhotoScan';
import { RecordingBar } from '../components/ui/RecordingBar';
import { SectionHeader } from '../components/ui/SectionHeader';
import { colors, radius, shadow, spacing, typography, withAlpha } from '../theme';
import { useVoiceCapture } from '../hooks/useVoiceCapture';
import { DescribeError, quickAddItem, stageAgain, stageDescription, type DescribeMode } from '../services/logFlow';
import { capturePhoto, type CapturedPhoto } from '../services/photoCapture';
import { analyzeFoodPhoto, VisionError } from '../services/visionApi';
import { useAiKeyStore } from '../store/useAiKeyStore';
import { useParserLibrary } from '../store/useFoodLibraryStore';
import { useFoodLogStore } from '../store/useFoodLogStore';
import { useLogIntentStore } from '../store/useLogIntentStore';
import { useReviewStore } from '../store/useReviewStore';
import { useDevAction, useDevAutoScroll } from '../dev/devScroll';
import { dateFromKey, localDateKey } from '../utils/date';
import { parseDescription } from '../utils/describe';
import { entryTitle, MEALS, mealLabel, suggestedMeal } from '../utils/meals';
import { useUnits } from '../store/useSettingsStore';
import { kcalFromEnergy } from '../utils/units';
import type { FoodLogEntry } from '../types';

const PROMPTS: Record<FoodLogEntry['mealType'], string> = {
  breakfast: 'What’s for breakfast?',
  lunch: 'What’s for lunch?',
  dinner: 'What’s for dinner?',
  snack: 'What did you eat?',
};

const EXAMPLES = [
  'Two eggs, sourdough toast and a flat white',
  'Chicken burrito bowl and a Diet Coke',
  'Greek yogurt with blueberries and honey',
  '200 g salmon, a cup of rice and broccoli',
  'Two rotis, dal and a bowl of curd',
];

/**
 * The logging hub. One card that changes with what you're doing: two equal
 * tiles to speak or take a photo; while listening, a glow that follows your
 * voice and the meal assembling below your words; then the meal as a plate —
 * each food with its macro ring, "Add more", the total — and one Review.
 * Search, the photo library, and quick add sit below. Every path ends on the
 * review sheet.
 */
export function LogScreen() {
  const hasKey = useAiKeyStore((s) => s.hasKey);
  const hydrate = useAiKeyStore((s) => s.hydrate);
  const target = useReviewStore((s) => s.target);
  const loggedToken = useReviewStore((s) => s.loggedToken);
  const entries = useFoodLogStore((s) => s.entries);
  const u = useUnits();
  const library = useParserLibrary();
  // At accessibility text sizes the three shortcuts stack, as iOS does with side-by-side controls.
  const largeText = useWindowDimensions().fontScale >= 1.35;
  const voice = useVoiceCapture();
  const scrollRef = useDevAutoScroll('log');
  const reduceMotion = useReducedMotion();

  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<DescribeMode | null>(null);
  /** The person's pick between the instant match and the AI, when they're offered the choice. */
  const [aiPick, setAiPick] = useState<DescribeMode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [example] = useState(() => EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);
  /** Text typed before the mic was tapped; speech is appended to it. */
  const base = useRef('');
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const seenLog = useRef(loggedToken);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // Speech streams into the same text the person can edit.
  useEffect(() => {
    if (voice.active || voice.transcript) {
      setDraft(base.current ? `${base.current} ${voice.transcript}`.trim() : voice.transcript);
    }
  }, [voice.active, voice.transcript]);

  // A confirmed review clears the screen for the next meal.
  useEffect(() => {
    if (seenLog.current === loggedToken) return;
    seenLog.current = loggedToken;
    setDraft('');
    base.current = '';
    setAiPick(null);
    setMessage(null);
    setPhoto(null);
    setPhotoError(null);
    voice.clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedToken]);

  // One-shot requests from the quick-log bar (or dev tools): start listening, open the camera, prefill text.
  const intent = useLogIntentStore((s) => s.intent);
  useEffect(() => {
    if (!intent) return;
    useLogIntentStore.getState().take(intent.id);
    if (intent.kind === 'listen') void startListening();
    else if (intent.kind === 'capture') void takePhoto(intent.source);
    else if (intent.kind === 'text') {
      if (voice.active) voice.cancel();
      base.current = '';
      setAiPick(null);
      setDraft(intent.text);
      setMessage(null);
      voice.clearError();
    }
    else if (intent.kind === 'speak') void startListening(intent.fileUri.startsWith('file://') ? intent.fileUri : `file://${intent.fileUri}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent?.id]);

  // Tabs stay mounted: leaving Log must not leave the microphone on, or an old error on screen.
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  useFocusEffect(
    useCallback(
      () => () => {
        if (voiceRef.current.active) voiceRef.current.cancel();
        voiceRef.current.clearError();
        setMessage(null);
      },
      [],
    ),
  );

  const parsed = useMemo(() => parseDescription(draft, new Date(), library), [draft, library]);
  const total = parsed.items.reduce((sum, item) => sum + item.macros.calories, 0);
  const hasText = draft.trim().length > 0;
  /** With a key, an unsure match is offered both ways and goes to the AI unless the person picks "As heard". */
  const offerAI = hasKey && hasText && !parsed.confident;
  const mode: DescribeMode = offerAI ? (aiPick ?? 'ai') : 'local';

  useDevAction('log.review', () => void review(mode));
  useDevAction('log.pickHeard', () => setAiPick('local'));
  useDevAction('log.reviewAsHeard', () => void review('local'));
  useDevAction('log.stop', () => voice.stop());
  useDevAction('log.focus', () => inputRef.current?.focus());
  useDevAction('log.blur', () => inputRef.current?.blur());
  // Development: show the photo estimate states without a camera or a key.
  useDevAction('log.simulatePhoto', () => {
    setPhotoError(null);
    setPhoto({ uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=70&fm=jpg&fit=crop', base64: '', mimeType: 'image/jpeg' });
  });
  useDevAction('log.simulatePhotoError', () => setPhotoError('The AI request failed (500). Try again.'));
  useDevAction('log.simulateListening', () => {
    base.current = '';
    voice.simulate('two scrambled eggs, sourdough toast and a flat white');
  });

  async function startListening(fileUri?: string) {
    setMessage(null);
    voice.clearError();
    base.current = draft.trim();
    await voice.start(fileUri);
  }

  async function review(mode: DescribeMode) {
    if (voice.active) voice.stop();
    setBusy(mode);
    setMessage(null);
    try {
      await stageDescription(draft, voice.transcript ? 'voice' : 'text', mode);
      router.push('/review');
    } catch (error) {
      setMessage(error instanceof DescribeError ? error.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(null);
    }
  }

  async function takePhoto(source: 'camera' | 'library') {
    if (!hasKey) {
      Alert.alert('Photo estimates use your AI key', 'Add one in Settings to estimate meals from photos.', [
        { text: 'Not now', style: 'cancel' },
        { text: 'Settings', onPress: () => router.navigate('/settings') },
      ]);
      return;
    }
    if (voice.active) voice.cancel();
    const result = await capturePhoto(source);
    if (result.status === 'cancelled') return;
    if (result.status !== 'ok') {
      setMessage(result.message);
      return;
    }
    setPhoto(result.photo);
    void estimatePhoto(result.photo);
  }

  async function estimatePhoto(captured: CapturedPhoto) {
    setPhotoError(null);
    try {
      const items = await analyzeFoodPhoto({ base64: captured.base64, mimeType: captured.mimeType });
      const { target: current } = useReviewStore.getState();
      useReviewStore.getState().setPending({
        origin: 'photo',
        photoUri: captured.uri,
        items,
        mealType: current?.mealType,
        mealFrom: current ? 'target' : 'clock',
        dateKey: current?.dateKey,
        aiUsed: true,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/review');
      setPhoto(null);
    } catch (error) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setPhotoError(error instanceof VisionError ? error.message : 'Couldn’t estimate that photo.');
    }
  }

  function quickAdd() {
    Alert.prompt(
      'Quick add',
      u.energyName,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (value?: string) => {
            const calories = kcalFromEnergy(Number(String(value ?? '').replace(/[^\d.]/g, '')), u.energy);
            if (!Number.isFinite(calories) || calories <= 0) return;
            const { target: current } = useReviewStore.getState();
            useReviewStore.getState().setPending({
              origin: 'quick',
              items: [quickAddItem(calories)],
              mealType: current?.mealType,
              mealFrom: current ? 'target' : 'clock',
              dateKey: current?.dateKey,
            });
            router.push('/review');
          },
        },
      ],
      'plain-text',
      '',
      'number-pad',
    );
  }

  const recent = useMemo(() => {
    const seen = new Set<string>();
    const list: FoodLogEntry[] = [];
    for (const entry of [...entries].sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))) {
      const title = entryTitle(entry.items);
      if (seen.has(title)) continue;
      seen.add(title);
      list.push(entry);
      if (list.length === 10) break;
    }
    return list;
  }, [entries]);

  const listening = voice.status === 'listening' || voice.status === 'starting';
  const error = voice.error?.message ?? message;

  // While listening the card glows with the voice: a warm edge and halo that swell with the level.
  const live = useSharedValue(0);
  useEffect(() => {
    live.value = withTiming(listening ? 1 : 0, { duration: 260 });
  }, [listening, live]);
  const level = voice.level;
  const glowStyle = useAnimatedStyle(() => {
    const swell = reduceMotion ? 0.4 : level.value;
    return {
      shadowOpacity: live.value * (0.16 + swell * 0.22),
      shadowRadius: 14 + swell * 16,
    };
  });
  // Room to scroll to Review while the keyboard is up. The page itself never auto-scrolls: the composer is
  // the first thing on it, so the keyboard can't cover the field, and KeyboardAwareScrollView jumped the
  // page when the focused field turned into live text on Speak / Add more.
  const keyboard = useReanimatedKeyboardAnimation();
  const keyboardSpace = useAnimatedStyle(() => ({ height: Math.max(-keyboard.height.value, 0) }));
  const edgeStyle = useAnimatedStyle(() => ({
    opacity: live.value * (0.55 + (reduceMotion ? 0.2 : level.value) * 0.45),
  }));

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {target ? <TargetChip mealType={target.mealType} dateKey={target.dateKey} /> : null}

      <Animated.View style={[styles.cardWrap, glowStyle]}>
        <Card style={styles.describe}>
          <View style={styles.head}>
            <Text style={styles.describeTitle} accessibilityRole="header">
              {listening ? 'Listening…' : PROMPTS[target?.mealType ?? suggestedMeal(new Date())]}
            </Text>
            {hasText && !voice.active && !photo ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear"
                hitSlop={8}
                onPress={() => {
                  void Haptics.selectionAsync();
                  setDraft('');
                  base.current = '';
                  setAiPick(null);
                  setMessage(null);
                  voice.clearError();
                }}
                style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
              >
                <Icon name="xmark" size={13} color={colors.textSecondary} weight="bold" />
              </Pressable>
            ) : null}
          </View>

          {photo ? (
            <PhotoScan
              uri={photo.uri}
              error={photoError}
              onRetry={() => void estimatePhoto(photo)}
              onDiscard={() => {
                setPhoto(null);
                setPhotoError(null);
              }}
            />
          ) : (
            <>
              {voice.active ? (
                // Plain text while listening: an editable field would scroll the page to chase its caret as words arrive.
                <Text style={[styles.input, !draft && styles.inputEmpty]} accessibilityLiveRegion="polite">
                  {draft || example}
                </Text>
              ) : (
                <TextInput
                  ref={inputRef}
                  value={draft}
                  onChangeText={(text) => {
                    setDraft(text);
                    setMessage(null);
                    voice.clearError();
                  }}
                  multiline
                  placeholder={example}
                  placeholderTextColor={colors.textTertiary}
                  keyboardAppearance="light"
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onSubmitEditing={() => {
                    if (hasText) void review(mode);
                  }}
                  accessibilityLabel="What you ate"
                  style={styles.input}
                />
              )}

              {hasText || parsed.items.length > 0 ? (
                <MealPlate
                  items={parsed.items}
                  choice={offerAI && !voice.active ? { value: mode, onChange: setAiPick } : null}
                  onAddMore={voice.active ? undefined : () => void startListening()}
                />
              ) : null}

              {voice.active ? (
                <RecordingBar level={voice.level} finishing={voice.status === 'finishing'} onCancel={voice.cancel} onDone={voice.stop} />
              ) : hasText ? (
                <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(200)}>
                  <GlassButton
                    label={busy === 'ai' ? 'Estimating…' : 'Review'}
                    icon={busy || mode !== 'ai' ? undefined : 'sparkles'}
                    variant="primary"
                    disabled={Boolean(busy)}
                    onPress={() => void review(mode)}
                  />
                </Animated.View>
              ) : (
                <View style={styles.tiles}>
                  <CaptureTile icon="mic.fill" label="Speak" onPress={() => void startListening()} />
                  <CaptureTile icon="camera.fill" label="Photo" onPress={() => void takePhoto('camera')} />
                </View>
              )}
            </>
          )}

          {error ? (
            <View style={styles.error} accessibilityRole="alert">
              <Text style={styles.errorText}>{error}</Text>
              {voice.error?.needsSettings ? (
                <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()}>
                  <Text style={styles.errorAction}>Open Settings</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
        </Card>
        <Animated.View pointerEvents="none" style={[styles.glowEdge, edgeStyle]} />
      </Animated.View>

      <View style={[styles.methods, largeText && styles.methodsStacked]}>
        <Method icon="magnifyingglass" title="Search" onPress={() => router.push('/search')} />
        <Method icon="photo.on.rectangle" title="Library" onPress={() => void takePhoto('library')} />
        <Method icon="plusminus" title="Quick add" onPress={quickAdd} />
      </View>

      {recent.length > 0 ? (
        <>
          <SectionHeader title="Log again" />
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
                accessibilityLabel={`Log ${entryTitle(entry.items)} again, ${u.energySpoken(entry.totalMacros.calories)}`}
                onPress={() => {
                  void Haptics.selectionAsync();
                  stageAgain(entry);
                  router.push('/review');
                }}
                style={({ pressed }) => [styles.recent, pressed && styles.pressed]}
              >
                <FoodThumb uri={entry.photoUri} size={112} symbol={MEALS.find((meal) => meal.key === entry.mealType)?.symbol} />
                <Text style={styles.recentTitle} numberOfLines={2}>
                  {entryTitle(entry.items)}
                </Text>
                <Text style={styles.recentKcal}>{u.energyText(entry.totalMacros.calories)}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}
      <Animated.View style={keyboardSpace} />
    </ScrollView>
  );
}

function TargetChip({ mealType, dateKey }: { mealType: Parameters<typeof mealLabel>[0]; dateKey: string }) {
  const today = localDateKey(new Date());
  const day =
    dateKey === today ? 'today' : dateFromKey(dateKey).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  return (
    <View style={styles.target}>
      <Text style={styles.targetText}>
        {mealLabel(mealType)}, {day}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Stop adding to this meal"
        hitSlop={10}
        onPress={() => useReviewStore.getState().setTarget(null)}
      >
        <Icon name="xmark" size={11} color={colors.textSecondary} weight="bold" />
      </Pressable>
    </View>
  );
}

/** One of the two equal ways to start: a soft tile with its symbol in an accent disc. */
function CaptureTile({ icon, label, onPress }: { icon: SFSymbol; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={styles.tileDisc}>
        <Icon name={icon} size={22} color={colors.onAccent} />
      </View>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

function Method({ icon, title, onPress }: { icon: SFSymbol; title: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [styles.method, pressed && styles.pressed]}
    >
      <Icon name={icon} size={17} color={colors.accent} />
      <Text style={styles.methodTitle}>{title}</Text>
    </Pressable>
  );
}

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
  pressed: {
    opacity: 0.7,
  },
  target: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  targetText: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 32,
  },
  clear: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.fill,
  },
  cardWrap: {
    borderRadius: radius.lg,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
  },
  glowEdge: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: withAlpha(colors.accent, 0.55),
  },
  describe: {
    padding: spacing.lg - 2,
    paddingTop: spacing.lg,
    gap: spacing.lg - 4,
  },
  describeTitle: {
    ...typography.title,
    fontSize: 24,
    letterSpacing: -0.5,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  input: {
    ...typography.body,
    fontSize: 21,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: colors.textPrimary,
    minHeight: 56,
    padding: 0,
    marginTop: -spacing.sm,
    textAlignVertical: 'top',
  },
  inputEmpty: {
    color: colors.textTertiary,
  },
  tiles: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
  },
  tile: {
    flex: 1,
    minHeight: 118,
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.lg - 4,
    borderCurve: 'continuous',
    backgroundColor: colors.accentSoft,
  },
  tilePressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  tileDisc: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tileLabel: {
    ...typography.headline,
    fontSize: 18,
    color: colors.textPrimary,
  },
  error: {
    gap: 4,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: colors.dangerSoft,
  },
  errorText: {
    ...typography.footnote,
    color: colors.textPrimary,
  },
  errorAction: {
    ...typography.footnote,
    fontWeight: '600',
    color: colors.accent,
  },
  methods: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginTop: spacing.sm + 4,
  },
  methodsStacked: {
    flexDirection: 'column',
  },
  method: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  methodTitle: {
    ...typography.subheadline,
    color: colors.textPrimary,
  },
  recentScroller: {
    marginHorizontal: -spacing.gutter,
  },
  recentRow: {
    paddingHorizontal: spacing.gutter,
    gap: spacing.sm + 4,
  },
  recent: {
    width: 112,
    gap: 2,
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
