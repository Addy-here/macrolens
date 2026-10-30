import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { GlassButton } from './glass';
import { Panel } from './ui/Panel';
import { TextButton } from './ui/TextButton';
import { AI_MODELS, AI_PROVIDERS } from '../services/aiKey';
import { useAiKeyStore } from '../store/useAiKeyStore';
import { colors, spacing, typography } from '../theme';

/**
 * Provider, model, and the user's own key. The secret is written to the
 * keychain and is not shown again after saving.
 */
export function AiKeySection() {
  const provider = useAiKeyStore((s) => s.provider);
  const model = useAiKeyStore((s) => s.model);
  const hasKey = useAiKeyStore((s) => s.hasKey);
  const hydrate = useAiKeyStore((s) => s.hydrate);
  const selectProvider = useAiKeyStore((s) => s.selectProvider);
  const selectModel = useAiKeyStore((s) => s.selectModel);
  const saveKey = useAiKeyStore((s) => s.saveKey);
  const clearKey = useAiKeyStore((s) => s.clearKey);

  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'ok' | 'error'>('ok');

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const onSave = async () => {
    try {
      await saveKey(draft);
      setDraft('');
      setMessageTone('ok');
      setMessage('Saved on this iPhone.');
    } catch (error) {
      setMessageTone('error');
      setMessage(error instanceof Error ? error.message : 'Could not save that key.');
    }
  };

  const onClear = async () => {
    await clearKey();
    setDraft('');
    setMessageTone('ok');
    setMessage('Key removed.');
  };

  if (Platform.OS === 'web') {
    return <Text style={styles.hint}>A key can be saved on iPhone, in the keychain.</Text>;
  }

  return (
    <View>
      <Text style={styles.groupTitle}>Provider</Text>
      <Panel padded={false}>
        {AI_PROVIDERS.map((item, index) => (
          <ChoiceRow
            key={item.id}
            label={item.label}
            selected={provider === item.id}
            first={index === 0}
            onPress={() => {
              void selectProvider(item.id);
              setMessage(null);
            }}
          />
        ))}
      </Panel>

      <Text style={styles.groupTitle}>Model</Text>
      <Panel padded={false}>
        {AI_MODELS[provider].map((item, index) => (
          <ChoiceRow
            key={item.id}
            label={item.label}
            selected={model === item.id}
            first={index === 0}
            onPress={() => {
              void selectModel(item.id);
              setMessage(null);
            }}
          />
        ))}
      </Panel>

      <Text style={styles.groupTitle}>Key</Text>
      <Panel>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={hasKey ? 'Paste a replacement key' : 'Paste API key'}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="none"
          keyboardAppearance="light"
          style={styles.input}
          accessibilityLabel="API key"
        />
        <GlassButton
          label={hasKey ? 'Replace key' : 'Save key'}
          onPress={() => void onSave()}
          variant="primary"
          disabled={draft.trim().length === 0}
        />
        {hasKey ? <TextButton label="Remove key" onPress={() => void onClear()} tone="danger" /> : null}
        {message ? (
          <Text style={[styles.hint, messageTone === 'error' ? styles.error : styles.ok]}>{message}</Text>
        ) : null}
      </Panel>
    </View>
  );
}

function ChoiceRow({
  label,
  selected,
  first,
  onPress,
}: {
  label: string;
  selected: boolean;
  first: boolean;
  onPress: () => void;
}) {
  const glass = selected && Platform.OS === 'ios' && isLiquidGlassAvailable();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, !first && styles.divider]}
    >
      {glass ? (
        <GlassView
          pointerEvents="none"
          style={styles.choiceGlass}
          glassEffectStyle="regular"
          tintColor={colors.accentSoft}
          isInteractive
          colorScheme="light"
        />
      ) : null}
      <Text style={[styles.choiceLabel, selected && styles.choiceLabelOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  groupTitle: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  choice: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    overflow: 'hidden',
  },
  choiceGlass: {
    ...StyleSheet.absoluteFill,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.hairline,
  },
  choiceLabel: {
    ...typography.body,
    color: colors.textPrimary,
  },
  choiceLabelOn: {
    color: colors.accent,
    fontWeight: '600',
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  ok: {
    color: colors.success,
  },
  error: {
    color: colors.danger,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
});
