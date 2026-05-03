/**
 * Krok 4 — Sytuacja zdrowotna
 */
import React from "react";
import { View, ScrollView, StyleSheet, Text, KeyboardAvoidingView, Platform } from "react-native";
import { useScrollGuard } from "@/hooks/useScrollGuard";
import ScrollEndBanner from "@/components/ui/ScrollEndBanner";
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
import ChipSelector from "@/components/ui/ChipSelector";
import ScanSectionButton from "@/components/ui/ScanSectionButton";

export default function Step4() {
  const store = useInterviewStore();
  const hl = store.formData.health;
  const { scrollRef, isAtBottom, scrollProps, tryNext } = useScrollGuard();

  const handleScanApply = (data: Record<string, any>) => {
    const toStr = (v: any) => (v != null && v !== "" ? String(v) : "");
    store.updateHealth({
      chronically_ill_count:      toStr(data.chronically_ill_count)      || hl.chronically_ill_count,
      illness_types:              toStr(data.illness_types)              || hl.illness_types,
      disability_degree:          toStr(data.disability_degree)          || hl.disability_degree,
      additional_health_info:     toStr(data.additional_health_info)     || hl.additional_health_info,
      addiction_types:            Array.isArray(data.addiction_types) && data.addiction_types.length > 0
                                    ? data.addiction_types
                                    : hl.addiction_types,
      ...(data.has_health_insurance        != null ? { has_health_insurance:        data.has_health_insurance        } : {}),
      ...(data.has_disability_certificate  != null ? { has_disability_certificate:  data.has_disability_certificate  } : {}),
      ...(data.has_incapacity_certificate  != null ? { has_incapacity_certificate:  data.has_incapacity_certificate  } : {}),
      ...(data.has_addiction               != null ? { has_addiction:               data.has_addiction               } : {}),
    });
  };

  const handleNext = () =>
    tryNext(() => { store.setCurrentStep(5); router.push("/interview/step5"); });

  return (
    <SafeAreaView style={cs.safe}>
      <StepHeader step={4} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView ref={scrollRef} {...scrollProps} contentContainerStyle={cs.scroll} keyboardShouldPersistTaps="handled">
        <Text style={cs.title}>Sytuacja zdrowotna</Text>
        <ScanSectionButton step={4} onApply={handleScanApply} />

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
            onChange={(v) => store.updateHealth({ has_disability_certificate: v, disability_degree: v ? hl.disability_degree : "" })}
          />
          {hl.has_disability_certificate && (
            <>
              <Text style={[cs.fieldLabel, { marginTop: spacing.md }]}>Stopień niepełnosprawności</Text>
              <ChipSelector
                options={DISABILITY_DEGREES}
                value={hl.disability_degree}
                onSelect={(v) => store.updateHealth({ disability_degree: v })}
                size="md"
              />
            </>
          )}
          <Text style={[cs.fieldLabel, { marginTop: spacing.md }]}>Orzeczenie o niezdolności do samodzielnej egzystencji?</Text>
          <YesNo
            value={hl.has_incapacity_certificate}
            onChange={(v) => store.updateHealth({ has_incapacity_certificate: v })}
          />
        </View>

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Uzależnienia</Text>
          <Text style={cs.fieldLabel}>Stwierdzono uzależnienie?</Text>
          <YesNo
            value={hl.has_addiction}
            onChange={(v) => store.updateHealth({ has_addiction: v, addiction_types: v ? hl.addiction_types : [] })}
          />
          {hl.has_addiction && (
            <>
              <Text style={[cs.fieldLabel, { marginTop: spacing.md }]}>Rodzaj uzależnienia (wielokrotny wybór)</Text>
              <ChipSelector
                multi
                options={ADDICTION_TYPES}
                values={hl.addiction_types}
                onSelect={(v) => store.updateHealth({ addiction_types: v })}
                size="md"
              />
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

        <ScrollEndBanner visible={!isAtBottom} />
        <View style={cs.footer}>
          <Button mode="contained" onPress={handleNext} style={cs.nextBtn} contentStyle={{ paddingVertical: 8 }} icon="arrow-right">
            Dalej
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});
