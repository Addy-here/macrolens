import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import type { SFSymbol } from 'expo-symbols';
import { Tappable } from './ui/Tappable';
import { GlassButton } from './glass';
import { Card } from './ui/Card';
import { GroupLabel, ListRow } from './ui/ListRow';
import { AI_PROVIDERS, providerLabel, type AiProvider } from '../services/aiKey';
import { resetModelRest } from '../services/visionApi';
import {
  catalogIsStale,
  fallbackProviders,
  modelInfo,
  modelName,
  priceLabel,
  refreshModels,
  useAiModelsStore,
} from '../services/aiModels';
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
  const saveKey = useAiKeyStore((s) => s.saveKey);
  const clearKey = useAiKeyStore((s) => s.clearKey);

  const [draft, setDraft] = useState('');
  const keyRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  useDevAction('settings.focusKey', () => keyRef.current?.focus());
  const keys = useAiKeyStore((s) => s.keys);
  const models = useAiKeyStore((s) => s.models);
  const autoSwitch = useAiModelsStore((s) => s.autoSwitch);
  const setAutoSwitch = useAiModelsStore((s) => s.setAutoSwitch);
  // Subscribed so names and backups redraw when a list arrives or the order changes.
  const fallbackOrder = useAiModelsStore((s) => s.fallbacks);
  const excluded = useAiModelsStore((s) => s.excludedFallbacks);
  const catalogs = useAiModelsStore((s) => s.catalogs);
  const backups = useMemo(
    () => fallbackProviders(provider, keys),
    [provider, keys, fallbackOrder, excluded],
  );
  // Providers with a key that were taken off the list, and can be added back.
  const addable = AI_PROVIDERS.map((item) => item.id).filter((id) => id !== provider && keys[id] && !backups.includes(id));

  // Names and prices come from each provider's own list; keep the ones in use fresh in the background.
  useEffect(() => {
    for (const id of [provider, ...backups]) {
      if ((id === 'openrouter' || keys[id]) && catalogIsStale(id)) void refreshModels(id).catch(() => undefined);
    }
  }, [provider, backups, keys]);

  function openModels(id: AiProvider) {
    router.push({ pathname: '/settings/models', params: { provider: id } });
  }

  function editBackup(index: number) {
    const id = backups[index];
    const store = useAiModelsStore.getState();
    const options = [
      { label: 'Change Model', run: () => openModels(id) },
      ...(index > 0
        ? [
            {
              label: 'Move Up',
              run: () => {
                const next = [...backups];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                store.setFallbacks(next);
              },
            },
          ]
        : []),
      { label: 'Remove', run: () => store.setExcludedFallbacks([...store.excludedFallbacks, id]) },
    ];
    pick(`${providerLabel(id)} · ${modelName(id, models[id])}`, options, true);
  }

  function addBackup() {
    const store = useAiModelsStore.getState();
    pick(
      'Add a backup',
      addable.map((id) => ({
        label: providerLabel(id),
        run: () => {
          store.setExcludedFallbacks(store.excludedFallbacks.filter((other) => other !== id));
          store.setFallbacks([...backups, id]);
        },
      })),
      false,
    );
  }

  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'ok' | 'error'>('ok');

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const onSave = async () => {
    try {
      await saveKey(draft.trim());
      setDraft('');
      // A new key may unlock more models, and starts every model fresh.
      resetModelRest();
      void refreshModels(provider).catch(() => undefined);
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
      <GroupLabel>Provider</GroupLabel>
      <Card padded={false}>
        {AI_PROVIDERS.map((item, index) => (
          <ListRow
            key={item.id}
            first={index === 0}
            title={item.label}
            subtitle={keys[item.id] ? modelName(item.id, models[item.id]) : 'No key'}
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
        <ListRow
          first
          title={modelName(provider, model)}
          subtitle={modelDetail(provider, model)}
          accessory="chevron"
          onPress={() => openModels(provider)}
        />
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
              <Tappable accessibilityRole="button" onPress={() => void onClear()} hitSlop={8}>
                <Text style={styles.remove}>Remove</Text>
              </Tappable>
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

      <GroupLabel>Backups</GroupLabel>
      <Card padded={false}>
        <ListRow
          first
          title="Switch when busy"
          trailing={
            <Switch
              value={autoSwitch}
              onValueChange={setAutoSwitch}
              trackColor={{ true: colors.accent }}
              accessibilityLabel="Switch to a backup provider when busy"
            />
          }
        />
        {autoSwitch
          ? backups.map((id, index) => (
              <ListRow
                key={id}
                icon={`${index + 1}.circle.fill` as SFSymbol}
                tint={colors.tile.gray}
                title={providerLabel(id)}
                subtitle={modelName(id, models[id])}
                accessory="chevron"
                onPress={() => editBackup(index)}
              />
            ))
          : null}
        {autoSwitch && addable.length > 0 ? (
          <ListRow icon="plus" tint={colors.accent} title="Add Backup" onPress={addBackup} />
        ) : null}
      </Card>
      <Text style={styles.footnote}>
        {autoSwitch
          ? 'If a provider isn’t available, the next available one is used.'
          : 'If the provider isn’t available, the estimate fails.'}
      </Text>
    </View>
  );
}

function pick(title: string, options: { label: string; run: () => void }[], lastIsDestructive: boolean) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...options.map((option) => option.label), 'Cancel'],
        destructiveButtonIndex: lastIsDestructive ? options.length - 1 : undefined,
        cancelButtonIndex: options.length,
      },
      (choice) => options[choice]?.run(),
    );
  } else {
    Alert.alert(title, undefined, [
      ...options.map((option) => ({ text: option.label, onPress: option.run })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }
}

/** Who makes it and what it costs, when the provider's list says. */
function modelDetail(provider: AiProvider, id: string) {
  const info = modelInfo(provider, id);
  if (!info) return undefined;
  return [info.vendor, priceLabel(info)].filter(Boolean).join(' · ') || undefined;
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
