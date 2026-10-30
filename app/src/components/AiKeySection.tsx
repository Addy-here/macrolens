import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GlassButton } from './glass';
import { Card } from './ui/Card';
import { GroupLabel, ListRow } from './ui/ListRow';
import { AI_MODELS, AI_PROVIDERS, providerLabel } from '../services/aiKey';
import { useAiKeyStore } from '../store/useAiKeyStore';
import { useDevAction } from '../dev/devScroll';
import { colors, radius, spacing, typography } from '../theme';

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
  const keyRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  useDevAction('settings.focusKey', () => keyRef.current?.focus());
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'ok' | 'error'>('ok');

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const onSave = async () => {
    try {
      await saveKey(draft.trim());
      setDraft('');
      setMessageTone('ok');
      setMessage(null);
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

  if (Platform.OS === 'web') {
    return (
      <>
        <GroupLabel>Photo estimates</GroupLabel>
        <Text style={styles.footnote}>A key can be saved on iPhone, in the keychain.</Text>
      </>
    );
  }

  return (
    <View>
      <GroupLabel>AI</GroupLabel>
      <Card padded={false}>
        {AI_PROVIDERS.map((item, index) => (
          <ListRow
            key={item.id}
            first={index === 0}
            title={item.label}
            accessory="check"
            selected={provider === item.id}
            onPress={() => {
              void selectProvider(item.id);
              setMessage(null);
            }}
          />
        ))}
      </Card>

      <GroupLabel>Model</GroupLabel>
      <Card padded={false}>
        {AI_MODELS[provider].map((item, index) => (
          <ListRow
            key={item.id}
            first={index === 0}
            title={item.label}
            accessory="check"
            selected={model === item.id}
            onPress={() => {
              void selectModel(item.id);
              setMessage(null);
            }}
          />
        ))}
      </Card>

      <GroupLabel>{`${providerLabel(provider)} key`}</GroupLabel>
      <Card padded={false}>
        <ListRow
          first
          icon={hasKey ? 'lock.fill' : 'key.fill'}
          tint={hasKey ? colors.tile.green : colors.tile.orange}
          title={hasKey ? 'Saved in Keychain' : 'No key yet'}
          subtitle={hasKey ? undefined : 'For photo estimates and AI matching'}
          trailing={
            hasKey ? (
              <Pressable accessibilityRole="button" onPress={() => void onClear()} hitSlop={8}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            ) : undefined
          }
        />
        <View style={styles.keyEntry}>
          <TextInput
            ref={keyRef}
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
            accessibilityLabel={`${providerLabel(provider)} API key`}
          />
          <GlassButton
            label={hasKey ? 'Replace' : 'Save'}
            onPress={() => void onSave()}
            disabled={draft.trim().length === 0}
            style={styles.keyButton}
          />
        </View>
      </Card>
      {message ? (
        <Text style={[styles.footnote, messageTone === 'error' ? styles.error : styles.ok]}>{message}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  keyEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md - 4,
    paddingTop: 0,
  },
  input: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceRaised,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: 12,
  },
  keyButton: {
    minWidth: 96,
  },
  remove: {
    ...typography.body,
    color: colors.danger,
  },
  footnote: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginHorizontal: spacing.md,
    lineHeight: 18,
  },
  ok: {
    color: colors.success,
  },
  error: {
    color: colors.danger,
  },
});
