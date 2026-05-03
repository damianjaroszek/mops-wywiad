/**
 * StepHeader — wspólny nagłówek formularza wywiadu
 * Zawiera: pasek aplikacji, pasek postępu, nawigator kroków
 */
import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ViewStyle, StyleProp } from "react-native";
import { router } from "expo-router";
import { colors, spacing, fontSize } from "@/constants/theme";
import { useInterviewStore, FormData } from "@/store/interviewStore";
import SyncStatusBar from "@/components/ui/SyncStatusBar";

const STEPS = [
  { n: 1, label: "Dane",    route: "/interview/step1" },
  { n: 2, label: "Dom",     route: "/interview/step2" },
  { n: 3, label: "Praca",   route: "/interview/step3" },
  { n: 4, label: "Zdrowie", route: "/interview/step4" },
  { n: 5, label: "Rodzina", route: "/interview/step5" },
  { n: 6, label: "Finanse", route: "/interview/step6" },
] as const;

type StepStatus = "complete" | "warn" | "empty";

function getStepStatus(n: number, fd: FormData): StepStatus {
  switch (n) {
    case 1: {
      const p = fd.personal;
      const hasAny = !!(p.first_name || p.last_name || p.income_amount);
      const ok = !!(p.first_name && p.last_name && p.income_amount && p.help_reasons.length > 0);
      if (!hasAny) return "empty";
      return ok ? "complete" : "warn";
    }
    case 2:
      return fd.housing.apartment_type ? "complete" : "empty";
    case 3:
      return fd.employment.employment_status ? "complete" : "empty";
    case 4: {
      const hl = fd.health;
      return (hl.has_health_insurance !== null || hl.chronically_ill_count !== "") ? "complete" : "empty";
    }
    case 5: {
      const fam = fd.family;
      const touched = fam.members.length > 0
        || fam.has_conflicts !== null
        || fam.has_domestic_violence !== null
        || fam.has_childcare_issues !== null;
      return touched ? "complete" : "empty";
    }
    case 6: {
      const fin = fd.financial;
      const hasAny = !!(fin.total_family_income || fin.monthly_expenses_total);
      if (!hasAny) return "empty";
      return fin.total_family_income ? "complete" : "warn";
    }
    default:
      return "empty";
  }
}

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
  const progressPercent: `${number}%` = `${Math.round((step / 6) * 100)}%`;
  const formData = useInterviewStore((s) => s.formData);

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

      {/* Wskaźnik synchronizacji */}
      <SyncStatusBar />

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
            const status = getStepStatus(n, formData);

            const chipStyle: StyleProp<ViewStyle> = [
              styles.chip,
              isActive                              && styles.chipActive,
              !isActive && status === "complete"    && styles.chipDone,
              !isActive && status === "warn"        && styles.chipWarn,
              !isActive && status === "empty"       && styles.chipFuture,
            ];

            let label_text: string;
            if (isActive) {
              label_text = `${n}. ${label}`;
            } else if (status === "complete") {
              label_text = `✓ ${label}`;
            } else if (status === "warn") {
              label_text = `! ${label}`;
            } else {
              label_text = `${n}. ${label}`;
            }

            const textStyle = [
              styles.chipText,
              isActive                           && styles.chipTextActive,
              !isActive && status === "complete" && styles.chipTextDone,
              !isActive && status === "warn"     && styles.chipTextWarn,
              !isActive && status === "empty"    && styles.chipTextFuture,
            ];

            return (
              <TouchableOpacity
                key={n}
                style={chipStyle}
                onPress={() => router.push(route as any)}
                activeOpacity={0.7}
              >
                <Text style={textStyle}>{label_text}</Text>
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

  // Chip — ostrzeżenie (brakujące wymagane pola)
  chipWarn: {
    backgroundColor: "#FFF3E0",
    borderColor: colors.warning,
  },
  chipTextWarn: {
    color: colors.warning,
    fontWeight: "700",
  },

  // Chip — pusty / nieodwiedzony
  chipFuture: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  chipTextFuture: {
    color: colors.text.disabled,
    fontWeight: "500",
  },
});
