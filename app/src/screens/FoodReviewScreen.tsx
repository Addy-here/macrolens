import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard, GlassButton } from '../components/glass';
import { colors, spacing, typography, radius } from '../theme';
import type { FoodItem } from '../types';

interface FoodReviewScreenProps {
  /** Vision-AI-detected items awaiting user confirmation. In the real
   *  navigation flow these come via route params from CameraScreen after
   *  the vision API call resolves — stubbed here as a prop for now. */
  detectedItems: FoodItem[];
  onConfirm: (items: FoodItem[]) => void;
}

/**
 * THE core differentiator screen (see docs/PRODUCT.md): nothing from the
 * vision AI is saved to the log until the user reviews/adjusts it here.
 * Portion weight is editable per item; macros recompute proportionally
 * since they're estimated per-gram from the original AI/database lookup.
 */
export function FoodReviewScreen({ detectedItems, onConfirm }: FoodReviewScreenProps) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<FoodItem[]>(detectedItems);

  const adjustPortion = (id: string, newGrams: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const ratio = newGrams / item.portionGrams;
        return {
          ...item,
          portionGrams: newGrams,
          userAdjusted: true,
          macros: {
            calories: Math.round(item.macros.calories * ratio),
            proteinG: Math.round(item.macros.proteinG * ratio),
            carbsG: Math.round(item.macros.carbsG * ratio),
            fatG: Math.round(item.macros.fatG * ratio),
          },
        };
      }),
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}>
      <Text style={[typography.largeTitle, { color: colors.textPrimary, paddingHorizontal: spacing.lg }]}>
        Review
      </Text>
      <Text
        style={[
          typography.body,
          { color: colors.textSecondary, paddingHorizontal: spacing.lg, marginTop: spacing.xs },
        ]}
      >
        Adjust portions if they look off — nothing is logged until you confirm.
      </Text>

      <ScrollView contentContainerStyle={styles.list}>
        {items.map((item) => (
          <GlassCard key={item.id} style={styles.itemCard} elevation="card" tint="light">
            <View style={styles.itemHeader}>
              <Text style={[typography.bodyEmphasized, { color: colors.textPrimary }]}>
                {item.name}
              </Text>
              <Pressable onPress={() => removeItem(item.id)}>
                <Text style={{ color: colors.danger }}>Remove</Text>
              </Pressable>
            </View>

            <View style={styles.portionRow}>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Portion (g)
              </Text>
              <TextInput
                style={styles.portionInput}
                keyboardType="numeric"
                defaultValue={String(item.portionGrams)}
                onEndEditing={(e) =>
                  adjustPortion(item.id, Number(e.nativeEvent.text) || item.portionGrams)
                }
              />
            </View>

            <View style={styles.macroRow}>
              <Text style={[typography.caption, { color: colors.calories }]}>
                {item.macros.calories} kcal
              </Text>
              <Text style={[typography.caption, { color: colors.protein }]}>
                {item.macros.proteinG}g P
              </Text>
              <Text style={[typography.caption, { color: colors.carbs }]}>
                {item.macros.carbsG}g C
              </Text>
              <Text style={[typography.caption, { color: colors.fat }]}>
                {item.macros.fatG}g F
              </Text>
            </View>
          </GlassCard>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <GlassButton
          label="Confirm & Log"
          variant="primary"
          onPress={() => onConfirm(items)}
          style={{ width: '100%' }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  itemCard: {
    padding: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  portionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  portionInput: {
    backgroundColor: colors.glassLight,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: colors.textPrimary,
    minWidth: 60,
    textAlign: 'right',
  },
  macroRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  footer: {
    padding: spacing.lg,
  },
});
