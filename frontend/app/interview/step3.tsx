/**
 * Krok 3 — Sytuacja zawodowa
 */
import React from "react";
import { View, ScrollView, Text, KeyboardAvoidingView, Platform } from "react-native";
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
import RadioOptionList from "@/components/ui/RadioOptionList";

export default function Step3() {
  const store = useInterviewStore();
  const e = store.formData.employment;

  return (
    <SafeAreaView style={cs.safe}>
      <StepHeader step={3} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={cs.scroll}
          keyboardShouldPersistTaps="handled"
        >
        <Text style={cs.title}>Sytuacja zawodowa</Text>

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Status zawodowy</Text>
          <RadioOptionList
            options={EMPLOYMENT_STATUS}
            value={e.employment_status}
            onValueChange={(v) => store.updateEmployment({ employment_status: v })}
          />
        </View>

        {e.employment_status === "bezrobotny" && (
          <View style={cs.card}>
            <Text style={cs.cardTitle}>Szczegóły bezrobocia</Text>
            <Text style={cs.fieldLabel}>Zarejestrowany w urzędzie pracy (PUP)?</Text>
            <YesNo value={e.is_registered_unemployed} onChange={(v) => store.updateEmployment({ is_registered_unemployed: v })} />
            <Text style={[cs.fieldLabel, { marginTop: spacing.md }]}>Pobiera zasiłek dla bezrobotnych?</Text>
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

        <View style={cs.footer}>
          <Button
            mode="contained"
            onPress={() => { store.setCurrentStep(4); router.push("/interview/step4"); }}
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
