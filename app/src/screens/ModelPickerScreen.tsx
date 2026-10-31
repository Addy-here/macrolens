import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePushedTabPadding } from '../navigation/TabStack';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { GlassButton } from '../components/glass';
import { Card } from '../components/ui/Card';
import { GroupLabel, ListRow } from '../components/ui/ListRow';
import { colors, spacing, typography } from '../theme';
import { AI_PROVIDERS, providerLabel, type AiProvider } from '../services/aiKey';
import {
  catalogIsStale,
  ModelListError,
  modelsFor,
  priceLabel,
  refreshModels,
  useAiModelsStore,
  type ModelInfo,
} from '../services/aiModels';
import { useAiKeyStore } from '../store/useAiKeyStore';
import { useDevAction } from '../dev/devScroll';

/** Vendors people look for first on OpenRouter; the rest follow alphabetically. */
const FIRST_VENDORS = ['Google', 'Anthropic', 'OpenAI'];

/**
 * Every model a provider offers that can read a photo, fetched live and
 * searchable. `?provider=` says whose model is being chosen — the main
 * provider's, or a backup provider's; each keeps its own.
 */
export function ModelPickerScreen() {
  const bottomPadding = usePushedTabPadding();
  const params = useLocalSearchParams<{ provider?: string }>();
  const main = useAiKeyStore((s) => s.provider);
  const provider = (AI_PROVIDERS.some((item) => item.id === params.provider) ? params.provider : main) as AiProvider;
  const model = useAiKeyStore((s) => s.models[provider]);
  const hasKey = useAiKeyStore((s) => s.keys[provider]);
  const catalog = useAiModelsStore((s) => s.catalogs[provider]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await refreshModels(provider);
    } catch (failure) {
      setError(failure instanceof ModelListError ? failure.message : 'Couldn’t load models. Try again.');
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    if (catalogIsStale(provider)) void load();
  }, [load, provider]);

  const models = useMemo(() => modelsFor(provider), [provider, catalog]);

  const sections = useMemo(() => {
    const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matches = models.filter((item) => {
      const haystack = `${item.name} ${item.id} ${item.vendor ?? ''}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
    if (provider !== 'openrouter') return matches.length ? [{ title: providerLabel(provider), models: matches }] : [];
    const byVendor = new Map<string, ModelInfo[]>();
    for (const item of matches) {
      const vendor = item.vendor ?? 'Other';
      byVendor.set(vendor, [...(byVendor.get(vendor) ?? []), item]);
    }
    const rank = (vendor: string) => {
      const index = FIRST_VENDORS.indexOf(vendor);
      return index < 0 ? FIRST_VENDORS.length : index;
    };
    return [...byVendor.entries()]
      .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
      .map(([title, list]) => ({ title, models: list }));
  }, [models, provider, query]);

  function choose(id: string) {
    void Haptics.selectionAsync();
    void useAiKeyStore.getState().selectModel(id, provider);
    router.back();
  }

  // The native search field can't be typed into here; this stands in for it.
  useDevAction('models.search', () => setQuery('claude haiku'));
  useDevAction('models.chooseFirst', () => {
    const first = sections[0]?.models.find((item) => item.id !== model);
    if (first) choose(first.id);
  });

  const headerOptions = useMemo(
    () => ({
      title: `${providerLabel(provider)} Model`,
      headerLargeTitleEnabled: false,
      headerSearchBarOptions: {
        placeholder: 'Search models',
        placement: 'stacked' as const,
        hideWhenScrolling: false,
        autoCapitalize: 'none' as const,
        onChangeText: (event: { nativeEvent: { text: string } }) => setQuery(event.nativeEvent.text),
        onCancelButtonPress: () => setQuery(''),
      },
    }),
    [provider],
  );

  const needsKey = provider !== 'openrouter' && !hasKey;

  return (
    <>
      <Stack.Screen options={headerOptions} />
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={needsKey ? undefined : <RefreshControl refreshing={loading && Boolean(catalog)} onRefresh={() => void load()} />}
      >
        {loading && !catalog ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.textSecondary} />
            <Text style={styles.stateText}>Loading {providerLabel(provider)} models…</Text>
          </View>
        ) : null}

        {error ? (
          <Card style={styles.error}>
            <Text style={styles.errorText}>{error}</Text>
            <GlassButton label="Try Again" onPress={() => void load()} />
          </Card>
        ) : null}

        {needsKey ? (
          <Text style={styles.footnote}>Save your {providerLabel(provider)} key to see every model it offers.</Text>
        ) : null}

        {sections.map((section) => (
          <View key={section.title}>
            <GroupLabel>{section.title}</GroupLabel>
            <Card padded={false}>
              {section.models.map((item, index) => {
                return (
                  <ListRow
                    key={item.id}
                    first={index === 0}
                    title={item.name}
                    subtitle={[priceLabel(item), provider === 'openrouter' ? undefined : item.id].filter(Boolean).join(' · ') || undefined}
                    accessory="check"
                    selected={item.id === model}
                    onPress={() => choose(item.id)}
                  />
                );
              })}
            </Card>
          </View>
        ))}

        {!loading && sections.length === 0 && query.trim() ? (
          <View style={styles.state}>
            <Text style={styles.stateText}>No models match “{query.trim()}”.</Text>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.gutter,
  },
  state: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  stateText: {
    ...typography.footnote,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  error: {
    gap: spacing.md - 4,
    marginTop: spacing.md,
  },
  errorText: {
    ...typography.subheadline,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  footnote: {
    ...typography.footnote,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    lineHeight: 18,
  },
});
