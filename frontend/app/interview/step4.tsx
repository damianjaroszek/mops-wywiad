/**
 * Krok 4 — Sytuacja zdrowotna
 */
import React, { useRef } from "react";
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useInterviewStore } from "@/store/interviewStore";
import { DISABILITY_DEGREES, ADDICTION_TYPES } from "@/constants/formOptions";
import { colors, spacing, fontSize } from "@/constants/theme";
import { cs } from "@/constants/commonStyles";
import FormField from "@/components/ui/FormField";
import StepHeader from "@/components/ui/StepHeader";
import YesNo from "@/components/ui/YesNo";
import RadioOptionList from "@/components/ui/RadioOptionList";

export default function Step4() {
  const store = useInterviewStore();
  const hl = store.formData.health;

  const scrollRef = useRef<ScrollView>(null);
  const scrollToEnd = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  const handleNext = () => {
    store.setCurrentStep(5);
    router.push("/interview/step5");
  };

  return (
    <SafeAreaView style={cs.safe}>
      <StepHeader step={4} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView ref={scrollRef} contentContainerStyle={cs.scroll} keyboardShouldPersistTaps="handled">
        <Text style={cs.title}>Sytuacja zdrowotna</Text>

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Choroby i ubezpieczenie</Text>

          <Text style={cs.fieldLabel}>Ubezpieczenie zdrowotne (NFZ)?</Text>
          <YesNo
            value={hl.has_health_insurance}
            onChange={(v) => store.updateHealth({ has_health_insurance: v })}
          />

          <FormField
            label="Liczba osób długotrwale chorych"
            value={hl.chronically_ill_count}
            onChangeText={(v) => store.updateHealth({ chronically_ill_count: v.replace(/[^0-9]/g, "") })}
            keyboardType="numeric"
            style={{ marginTop: spacing.md }}
          />
          <FormField
            label="Rodzaj schorzeń / diagnoz"
            value={hl.illness_types}
            onChangeText={(v) => store.updateHealth({ illness_types: v })}
            multiline
            numberOfLines={3}
            placeholder="np. cukrzyca, choroba układu krążenia, depresja"
          />
        </View>

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Niepełnosprawność</Text>
          <Text style={cs.fieldLabel}>Orzeczenie o niepełnosprawności?</Text>
          <YesNo
            value={hl.has_disability_certificate}
            onChange={(v) => { store.updateHealth({ has_disability_certificate: v, disability_degree: v ? hl.disability_degree : "" }); if (v) scrollToEnd(); }}
          />
          {hl.has_disability_certificate && (
            <>
              <Text style={[cs.fieldLabel, { marginTop: spacing.md }]}>Stopień niepełnosprawności</Text>
              <RadioOptionList
                options={DISABILITY_DEGREES}
                value={hl.disability_degree}
                onValueChange={(v) => store.updateHealth({ disability_degree: v })}
              />
            </>
          )}
        </View>

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Uzależnienia</Text>
          <Text style={cs.fieldLabel}>Stwierdzono uzależnienie?</Text>
          <YesNo
            value={hl.has_addiction}
            onChange={(v) => { store.updateHealth({ has_addiction: v, addiction_types: v ? hl.addiction_types : [] }); if (v) scrollToEnd(); }}
          />
          {hl.has_addiction && (
            <>
              <Text style={[cs.fieldLabel, { marginTop: spacing.md }]}>Rodzaj uzależnienia (wielokrotny wybór)</Text>
              <View style={styles.chipGroup}>
                {ADDICTION_TYPES.map((opt) => {
                  const selected = hl.addiction_types.includes(opt.value);
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => {
                        const next = selected
                          ? hl.addiction_types.filter((t) => t !== opt.value)
                          : [...hl.addiction_types, opt.value];
                        store.updateHealth({ addiction_types: next });
                      }}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {selected ? "✓ " : ""}{opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Uwagi dodatkowe</Text>
          <FormField
            label="Inne istotne informacje zdrowotne"
            value={hl.additional_health_info}
            onChangeText={(v) => store.updateHealth({ additional_health_info: v })}
            multiline
            numberOfLines={4}
            placeholder="np. leczenie w specjalistycznych placówkach, hospitalizacje"
          />
        </View>
        </ScrollView>

        <View style={cs.footer}>
          <Button mode="contained" onPress={handleNext} style={cs.nextBtn} contentStyle={{ paddingVertical: 8 }} icon="arrow-right">
            Dalej
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Wielokrotny wybór uzależnień
  chipGroup:     { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  chip:          { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  chipActive:    { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText:      { fontSize: fontSize.sm, color: colors.text.secondary, fontWeight: "500" },
  chipTextActive:{ color: colors.primary, fontWeight: "700" },
});
