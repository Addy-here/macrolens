import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeOut, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import { GlassButton } from '../components/glass';
import { Card } from '../components/ui/Card';
import { FoodThumb } from '../components/ui/FoodThumb';
import { Icon } from '../components/ui/Icon';
import { PhotoScan } from '../components/ui/PhotoScan';
import { RecordingBar } from '../components/ui/RecordingBar';
import { SectionHeader } from '../components/ui/SectionHeader';
import { colors, radius, shadow, spacing, typography } from '../theme';
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
import { parseDescription, portionLabel } from '../utils/describe';
import { entryTitle, MEALS, mealLabel } from '../utils/meals';
import type { FoodLogEntry } from '../types';

const EXAMPLES = [
  'Two eggs, sourdough toast and a flat white',
  'Chicken burrito bowl and a Diet Coke',
  'Greek yogurt with blueberries and honey',
  '200 g salmon, a cup of rice and broccoli',
  'Two rotis, dal and a bowl of curd',
];

/**
 * The logging hub. Speak and Photo are equal, one tap each; typing works in
 * the same field. Search, the photo library, and quick add sit below. Every
 * path ends on the review sheet.
 */
export function LogScreen() {
  const hasKey = useAiKeyStore((s) => s.hasKey);
  const hydrate = useAiKeyStore((s) => s.hydrate);
  const target = useReviewStore((s) => s.target);
  const loggedToken = useReviewStore((s) => s.loggedToken);
  const entries = useFoodLogStore((s) => s.entries);
  const library = useParserLibrary();
  const voice = useVoiceCapture();
  const scrollRef = useDevAutoScroll('log');
  const reduceMotion = useReducedMotion();

  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState<DescribeMode | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [photo, setPhoto] = useState<CapturedPhoto | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [example] = useState(() => EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);
  /** Text typed before the mic was tapped; speech is appended to it. */
  const base = useRef('');
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
  /** With a key, a shaky match goes to the AI by default; the heard version stays one tap away. */
  const preferAI = hasKey && hasText && !parsed.confident;

  useDevAction('log.review', () => void review(preferAI ? 'ai' : 'local'));
  useDevAction('log.reviewAsHeard', () => void review('local'));
  useDevAction('log.stop', () => voice.stop());
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
      'Calories',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (value?: string) => {
            const calories = Number(String(value ?? '').replace(/[^\d.]/g, ''));
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

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      {target ? <TargetChip mealType={target.mealType} dateKey={target.dateKey} /> : null}

      <Card style={styles.describe}>
        <Text style={styles.describeTitle}>{listening ? 'Listening…' : 'What did you eat?'}</Text>

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
          <View style={[styles.field, listening && styles.fieldListening]}>
            <TextInput
              value={draft}
              onChangeText={(text) => {
                setDraft(text);
                setMessage(null);
                voice.clearError();
              }}
              editable={!voice.active}
              multiline
              placeholder={example}
              placeholderTextColor={colors.textTertiary}
              keyboardAppearance="light"
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              onSubmitEditing={() => {
                if (hasText) void review(preferAI ? 'ai' : 'local');
              }}
              accessibilityLabel="What you ate"
              style={styles.input}
            />
            {hasText && !voice.active ? (
              <View style={styles.fieldTools}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear"
                  hitSlop={10}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    setDraft('');
                    base.current = '';
                    setMessage(null);
                    voice.clearError();
                  }}
                >
                  <Icon name="xmark.circle.fill" size={20} color={colors.textTertiary} weight="regular" />
                </Pressable>
                <IconButton icon="mic.fill" label="Add by voice" onPress={() => void startListening()} />
              </View>
            ) : null}
          </View>
        )}

        {!photo && parsed.items.length > 0 ? (
          <Animated.View layout={reduceMotion ? undefined : LinearTransition.springify().damping(20)} style={styles.parsed}>
            {parsed.items.map((item, index) => (
              <Animated.View
                key={`${item.heard}-${index}`}
                entering={reduceMotion ? undefined : FadeIn.duration(180)}
                exiting={reduceMotion ? undefined : FadeOut.duration(120)}
                style={styles.parsedRow}
              >
                <View style={[styles.parsedDot, { backgroundColor: item.unresolved ? colors.fillStrong : colors.accent }]} />
                <Text style={[styles.parsedName, item.unresolved && styles.parsedUnknown]} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.parsedMeta}>{item.unresolved ? '' : portionLabel(item)}</Text>
                <Text style={styles.parsedKcal}>{item.unresolved ? '–' : Math.round(item.macros.calories)}</Text>
              </Animated.View>
            ))}
            <View style={styles.parsedTotal}>
              <Text style={styles.parsedTotalLabel}>Total</Text>
              <Text style={styles.parsedTotalValue}>{Math.round(total).toLocaleString()} kcal</Text>
            </View>
          </Animated.View>
        ) : null}

        {photo ? null : voice.active ? (
          <RecordingBar
            level={voice.level}
            finishing={voice.status === 'finishing'}
            onCancel={voice.cancel}
            onDone={voice.stop}
          />
        ) : hasText ? (
          <View style={styles.actions}>
            {preferAI ? (
              <>
                <GlassButton
                  label={busy === 'ai' ? 'Estimating…' : 'Review with AI'}
                  icon={busy ? undefined : 'sparkles'}
                  variant="primary"
                  disabled={Boolean(busy)}
                  onPress={() => void review('ai')}
                />
                <GlassButton label="Review as heard" variant="tonal" disabled={Boolean(busy)} onPress={() => void review('local')} />
              </>
            ) : (
              <GlassButton label="Review" icon="arrow.right" variant="primary" disabled={Boolean(busy)} onPress={() => void review('local')} />
            )}
          </View>
        ) : (
          <View style={styles.capture}>
            <GlassButton label="Speak" icon="mic.fill" variant="primary" onPress={() => void startListening()} style={styles.flex} />
            <GlassButton
              label="Photo"
              icon="camera.fill"
              variant="primary"
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                void takePhoto('camera');
              }}
              style={styles.flex}
            />
          </View>
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

      <View style={styles.methods}>
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
                accessibilityLabel={`Log ${entryTitle(entry.items)} again, ${Math.round(entry.totalMacros.calories)} calories`}
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
                <Text style={styles.recentKcal}>{Math.round(entry.totalMacros.calories)} kcal</Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}
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

/** A round soft-accent icon button that sits beside the primary action. */
function IconButton({ icon, label, onPress }: { icon: SFSymbol; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Icon name={icon} size={15} color={colors.accent} />
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
  flex: {
    flex: 1,
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
  field: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingLeft: spacing.md - 2,
    paddingRight: spacing.sm + 2,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md + 2,
    borderCurve: 'continuous',
    backgroundColor: colors.surfaceRaised,
  },
  fieldListening: {
    backgroundColor: colors.accentSoft,
  },
  fieldTools: {
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: 2,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  describe: {
    padding: spacing.lg - 4,
    gap: spacing.sm + 2,
  },
  describeTitle: {
    ...typography.title,
    color: colors.textPrimary,
  },
  input: {
    ...typography.body,
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textPrimary,
    minHeight: 48,
    padding: 0,
    textAlignVertical: 'top',
  },
  parsed: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
    paddingTop: spacing.sm,
    gap: 2,
  },
  parsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 30,
  },
  parsedDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  parsedName: {
    ...typography.subheadline,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  parsedUnknown: {
    color: colors.textTertiary,
  },
  parsedMeta: {
    ...typography.footnote,
    color: colors.textTertiary,
    flex: 1,
  },
  parsedKcal: {
    ...typography.statSmall,
    color: colors.textPrimary,
  },
  parsedTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: spacing.xs,
  },
  parsedTotalLabel: {
    ...typography.footnote,
    color: colors.textSecondary,
  },
  parsedTotalValue: {
    ...typography.statSmall,
    fontSize: 17,
    color: colors.textPrimary,
  },
  capture: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginTop: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
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
