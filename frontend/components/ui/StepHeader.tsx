/**
 * StepHeader — wspólny nagłówek formularza wywiadu
 * Zawiera: pasek aplikacji, pasek postępu, nawigator kroków
 */
import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import { router } from "expo-router";
import { colors, spacing, fontSize } from "@/constants/theme";

const STEPS = [
  { n: 1, label: "Dane",    route: "/interview/step1" },
  { n: 2, label: "Dom",     route: "/interview/step2" },
  { n: 3, label: "Praca",   route: "/interview/step3" },
  { n: 4, label: "Zdrowie", route: "/interview/step4" },
  { n: 5, label: "Rodzina", route: "/interview/step5" },
  { n: 6, label: "Finanse", route: "/interview/step6" },
] as const;

interface Props {
  step: number; // aktywny krok (1–6)
}

function handleExit() {
  Alert.alert(
    "Opuść wywiad",
    "Czy na pewno chcesz opuścić wywiad? Możesz go wznowić później z poziomu listy.",
    [
      { text: "Anuluj", style: "cancel" },
      { text: "Wyjdź", style: "destructive", onPress: () => router.replace("/") },
    ]
  );
}

export default function StepHeader({ step }: Props) {
  const progressPercent = `${Math.round((step / 6) * 100)}%`;

  return (
    <View>
      {/* Pasek aplikacji */}
      <View style={styles.appBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.backText}>← Wróć</Text>
        </TouchableOpacity>
        <Text style={styles.stepLabel}>Krok {step} z 6</Text>
        <TouchableOpacity onPress={handleExit} style={styles.exitBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.exitText}>✕ Wyjdź</Text>
        </TouchableOpacity>
      </View>

      {/* Pasek postępu */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: progressPercent }]} />
      </View>

      {/* Nawigator kroków */}
      <View style={styles.navWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navScroll}
          bounces={false}
        >
          {STEPS.map(({ n, label, route }) => {
            const isActive = n === step;
            const isDone = n < step;
            const isFuture = n > step;

            return (
              <TouchableOpacity
                key={n}
                style={[
                  styles.chip,
                  isDone && styles.chipDone,
                  isActive && styles.chipActive,
                  isFuture && styles.chipFuture,
                ]}
                onPress={() => router.push(route as any)}
                activeOpacity={0.7}
              >
                {isDone ? (
                  <Text style={[styles.chipText, styles.chipTextDone]}>✓ {label}</Text>
                ) : (
                  <Text style={[styles.chipText, isActive && styles.chipTextActive, isFuture && styles.chipTextFuture]}>
                    {n}. {label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Pasek aplikacji
  appBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
  },
  backBtn: {
    padding: spacing.xs,
  },
  backText: {
    color: "#fff",
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  stepLabel: {
    color: "#ffffffcc",
    fontSize: fontSize.sm,
  },
  exitBtn: {
    padding: spacing.xs,
  },
  exitText: {
    color: "#ffcccc",
    fontSize: fontSize.sm,
    fontWeight: "500",
  },

  // Pasek postępu
  progressBar: {
    height: 4,
    backgroundColor: "#E0E0E0",
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.primary,
  },

  // Nawigator kroków
  navWrapper: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navScroll: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 6,
  },

  // Chip — bazowy
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    minWidth: 44,
    alignItems: "center",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text.disabled,
  },

  // Chip — ukończony (< step)
  chipDone: {
    backgroundColor: "#E8F5E9",
    borderColor: colors.success,
  },
  chipTextDone: {
    color: colors.success,
  },

  // Chip — aktywny (=== step)
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chipTextActive: {
    color: "#fff",
    fontWeight: "700",
  },

  // Chip — przyszły (> step)
  chipFuture: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  chipTextFuture: {
    color: colors.text.disabled,
    fontWeight: "500",
  },
});
