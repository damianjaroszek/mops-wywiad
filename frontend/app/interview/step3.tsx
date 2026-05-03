/**
 * Krok 3 — Sytuacja zawodowa
 */
import React from "react";
import { View, ScrollView, Text, KeyboardAvoidingView, Platform } from "react-native";
import { useScrollGuard } from "@/hooks/useScrollGuard";
import ScrollEndBanner from "@/components/ui/ScrollEndBanner";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useInterviewStore } from "@/store/interviewStore";
import { EMPLOYMENT_STATUS } from "@/constants/formOptions";
import { spacing } from "@/constants/theme";
import { cs } from "@/constants/commonStyles";
import FormField from "@/components/ui/FormField";
import StepHeader from "@/components/ui/StepHeader";
import YesNo from "@/components/ui/YesNo";
import ChipSelector from "@/components/ui/ChipSelector";
import ScanSectionButton from "@/components/ui/ScanSectionButton";

export default function Step3() {
  const store = useInterviewStore();
  const e = store.formData.employment;
  const { scrollRef, isAtBottom, scrollProps, tryNext } = useScrollGuard();

  const handleScanApply = (data: Record<string, any>) => {
    const toStr = (v: any) => (v != null && v !== "" ? String(v) : "");
    store.updateEmployment({
      employment_status:           toStr(data.employment_status)           || e.employment_status,
      qualifications:              toStr(data.qualifications)              || e.qualifications,
      last_employment:             toStr(data.last_employment)             || e.last_employment,
      unemployment_benefit_amount: toStr(data.unemployment_benefit_amount) || e.unemployment_benefit_amount,
      ...(data.is_registered_unemployed  != null ? { is_registered_unemployed:  data.is_registered_unemployed  } : {}),
      ...(data.has_unemployment_benefit  != null ? { has_unemployment_benefit:  data.has_unemployment_benefit  } : {}),
    });
  };

  return (
    <SafeAreaView style={cs.safe}>
      <StepHeader step={3} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          ref={scrollRef}
          {...scrollProps}
          contentContainerStyle={cs.scroll}
          keyboardShouldPersistTaps="handled"
        >
        <Text style={cs.title}>Sytuacja zawodowa</Text>
        <ScanSectionButton step={3} onApply={handleScanApply} />

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Status zawodowy</Text>
          <ChipSelector
            options={EMPLOYMENT_STATUS}
            value={e.employment_status}
            onSelect={(v) => store.updateEmployment({ employment_status: v })}
            size="md"
          />
        </View>

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Rejestracja w urzędzie pracy</Text>
          <Text style={cs.fieldLabel}>Zarejestrowana/y w urzędzie pracy (PUP)?</Text>
          <YesNo value={e.is_registered_unemployed} onChange={(v) => store.updateEmployment({ is_registered_unemployed: v })} />
        </View>

        {e.employment_status === "bezrobotny" && (
          <View style={cs.card}>
            <Text style={cs.cardTitle}>Szczegóły bezrobocia</Text>
            <Text style={cs.fieldLabel}>Pobiera zasiłek dla bezrobotnych?</Text>
            <YesNo value={e.has_unemployment_benefit} onChange={(v) => store.updateEmployment({ has_unemployment_benefit: v })} />
            {e.has_unemployment_benefit && (
              <FormField
                label="Kwota zasiłku (zł/mies.)"
                value={e.unemployment_benefit_amount}
                onChangeText={(v) => store.updateEmployment({ unemployment_benefit_amount: v.replace(/[^0-9.,]/g, "") })}
                keyboardType="numeric"
                style={{ marginTop: spacing.sm }}
              />
            )}
          </View>
        )}

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Kwalifikacje i historia zatrudnienia</Text>
          <FormField
            label="Wykształcenie / kwalifikacje zawodowe"
            value={e.qualifications}
            onChangeText={(v) => store.updateEmployment({ qualifications: v })}
            multiline
            numberOfLines={2}
            placeholder="np. zawód wyuczony, kursy, certyfikaty"
          />
          <FormField
            label="Ostatnie miejsce pracy"
            value={e.last_employment}
            onChangeText={(v) => store.updateEmployment({ last_employment: v })}
            placeholder="np. nazwa firmy, okres zatrudnienia"
          />
        </View>
        </ScrollView>

        <ScrollEndBanner visible={!isAtBottom} />
        <View style={cs.footer}>
          <Button
            mode="contained"
            onPress={() => tryNext(() => { store.setCurrentStep(4); router.push("/interview/step4"); })}
            style={cs.nextBtn}
            contentStyle={{ paddingVertical: 8 }}
            icon="arrow-right"
          >
            Dalej
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
