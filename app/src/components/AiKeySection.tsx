import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GlassButton } from './glass';
import { Panel } from './ui/Panel';
import { TextButton } from './ui/TextButton';
import { AI_PROVIDERS, providerModel } from '../services/aiKey';
import { useAiKeyStore } from '../store/useAiKeyStore';
import { colors, radius, spacing, typography } from '../theme';

/**
 * Bring-your-own-key. The secret is written to the keychain and is not
 * shown again after saving.
 */
export function AiKeySection() {
  const hydrated = useAiKeyStore((s) => s.hydrated);
  const provider = useAiKeyStore((s) => s.provider);
  const hasKey = useAiKeyStore((s) => s.hasKey);
  const hydrate = useAiKeyStore((s) => s.hydrate);
  const selectProvider = useAiKeyStore((s) => s.selectProvider);
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
      setMessage('Saved on this iPhone. It won’t be shown again.');
    } catch (error) {
      setMessageTone('error');
      setMessage(error instanceof Error ? error.message : 'Could not save that key.');
    }
  };

  const onClear = async () => {
    await clearKey();
    setDraft('');
    setMessageTone('ok');
    setMessage('Key removed from this iPhone.');
  };

  return (
    <View>
      <Text style={styles.groupTitle}>Photo estimates</Text>
      <Panel>
        <Text style={styles.body}>
          Paste your own key. The photo goes only to the provider you pick, and nothing is logged
          until you review it.
        </Text>

        {Platform.OS === 'web' ? (
          <Text style={styles.hint}>A key can be saved on iPhone, in the keychain.</Text>
        ) : (
          <>
            <View style={styles.segment}>
              {AI_PROVIDERS.map((item) => {
                const selected = provider === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      void selectProvider(item.id);
                      setMessage(null);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.segmentItem, selected && styles.segmentItemOn]}
                  >
                    <Text style={[styles.segmentLabel, selected && styles.segmentLabelOn]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.hint}>
              {hydrated && hasKey
                ? `Key saved · ${providerModel(provider)}`
                : `${providerModel(provider)} · billed to your account`}
            </Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={hasKey ? 'Paste a replacement key' : 'Paste API key'}
              placeholderTextColor={colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="none"
              keyboardAppearance="dark"
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
          </>
        )}

        {message ? (
          <Text style={[styles.hint, messageTone === 'error' ? styles.error : styles.ok]}>{message}</Text>
        ) : null}
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  groupTitle: {
    ...typography.eyebrow,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    padding: 3,
    marginBottom: spacing.sm,
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.sm - 2,
  },
  segmentItemOn: {
    backgroundColor: colors.surfaceRaised,
  },
  segmentLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  segmentLabelOn: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  hint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginBottom: spacing.md,
  },
  ok: {
    color: colors.success,
    marginTop: spacing.sm,
    marginBottom: 0,
  },
  error: {
    color: colors.danger,
    marginTop: spacing.sm,
    marginBottom: 0,
  },
  input: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
});
