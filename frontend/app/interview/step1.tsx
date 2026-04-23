/**
 * Krok 1 — Dane osobowe
 */
import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Button, Checkbox } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Alert } from "react-native";
import { useInterviewStore } from "@/store/interviewStore";
import { HELP_REASONS, MARITAL_STATUS, GENDER_OPTIONS } from "@/constants/formOptions";
import { generateFakeData } from "@/constants/fakeData";
import { colors, spacing, fontSize } from "@/constants/theme";
import { cs } from "@/constants/commonStyles";
import FormField from "@/components/ui/FormField";
import StepHeader from "@/components/ui/StepHeader";
import ChipSelector from "@/components/ui/ChipSelector";

export default function Step1() {
  const { formData, updatePersonal, setCurrentStep } = useInterviewStore();
  const p = formData.personal;

  const handleNext = () => {
    if (!p.first_name || !p.last_name) {
      Alert.alert("Brak danych", "Imię i nazwisko są wymagane.");
      return;
    }
    setCurrentStep(2);
    router.push("/interview/step2");
  };

  const [fakeGender, setFakeGender] = useState<"K" | "M">("K");

  const fillFake = () => {
    const genderCode = fakeGender === "K" ? "F" : "M";
    const fake = generateFakeData(genderCode);
    updatePersonal({
      ...fake,
      citizenship: "polskie",
      gender: fakeGender,
    });
  };

  const toggleReason = (value: string) => {
    const reasons = p.help_reasons.includes(value)
      ? p.help_reasons.filter((r) => r !== value)
      : [...p.help_reasons, value];
    updatePersonal({ help_reasons: reasons });
  };

  return (
    <SafeAreaView style={cs.safe}>
      <StepHeader step={1} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={cs.scroll} keyboardShouldPersistTaps="handled">
        <Text style={cs.title}>Dane osobowe</Text>

        <View style={styles.fakeSection}>
          <Text style={styles.fakeInfo}>ℹ️ Wybierz płeć i losuj fikcyjne dane osobowe</Text>
          <View style={styles.fakeGenderRow}>
            <TouchableOpacity
              style={[styles.fakeGenderChip, fakeGender === "K" && styles.fakeGenderChipActive]}
              onPress={() => setFakeGender("K")}
            >
              <Text style={[styles.fakeGenderText, fakeGender === "K" && styles.fakeGenderTextActive]}>♀ Kobieta</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fakeGenderChip, fakeGender === "M" && styles.fakeGenderChipActive]}
              onPress={() => setFakeGender("M")}
            >
              <Text style={[styles.fakeGenderText, fakeGender === "M" && styles.fakeGenderTextActive]}>♂ Mężczyzna</Text>
            </TouchableOpacity>
          </View>
          <Button mode="outlined" onPress={fillFake} icon="dice-multiple" style={styles.fakeBtn}>
            Losuj fikcyjne dane
          </Button>
        </View>

        <FormField label="Imię" required value={p.first_name} onChangeText={(v) => updatePersonal({ first_name: v })} />
        <FormField label="Nazwisko" required value={p.last_name} onChangeText={(v) => updatePersonal({ last_name: v })} />
        <FormField label="PESEL (fikcyjny)" value={p.pesel} onChangeText={(v) => updatePersonal({ pesel: v })} keyboardType="numeric" maxLength={11} />
        <FormField label="Data urodzenia" value={p.birth_date} onChangeText={(v) => updatePersonal({ birth_date: v })} placeholder="dd.mm.rrrr" />

        <Text style={styles.sectionLabel}>Płeć</Text>
        <ChipSelector
          options={GENDER_OPTIONS}
          value={p.gender}
          onSelect={(v) => updatePersonal({ gender: v })}
          variant="filled"
          size="md"
        />

        <Text style={styles.sectionLabel}>Stan cywilny</Text>
        <ChipSelector
          options={MARITAL_STATUS}
          value={p.marital_status}
          onSelect={(v) => updatePersonal({ marital_status: v })}
          variant="filled"
          size="md"
        />

        <FormField label="Adres — ulica i numer" value={p.address_street} onChangeText={(v) => updatePersonal({ address_street: v })} />
        <FormField label="Miejscowość" value={p.address_city} onChangeText={(v) => updatePersonal({ address_city: v })} />
        <FormField label="Kod pocztowy" value={p.address_postal_code} onChangeText={(v) => updatePersonal({ address_postal_code: v })} placeholder="00-000" />
        <FormField label="Telefon (fikcyjny)" value={p.phone} onChangeText={(v) => updatePersonal({ phone: v })} keyboardType="phone-pad" />
        <FormField label="Dochód własny (zł/mies.)" value={p.income_amount} onChangeText={(v) => updatePersonal({ income_amount: v.replace(/[^0-9.,]/g, "") })} keyboardType="numeric" placeholder="0.00" />

        <Text style={styles.sectionLabel}>Przyczyny ubiegania się o pomoc <Text style={{ color: colors.error }}>*</Text></Text>
        {HELP_REASONS.map((reason) => (
          <Checkbox.Item
            key={reason.value}
            label={reason.label}
            status={p.help_reasons.includes(reason.value) ? "checked" : "unchecked"}
            onPress={() => toggleReason(reason.value)}
            style={styles.checkboxItem}
            labelStyle={styles.checkboxLabel}
          />
        ))}
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
  fakeSection:         { backgroundColor: colors.primaryLight, borderRadius: 8, padding: spacing.md, marginBottom: spacing.md },
  fakeInfo:            { fontSize: fontSize.sm, color: colors.secondary, marginBottom: spacing.sm },
  fakeGenderRow:       { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  fakeGenderChip:      { flex: 1, paddingVertical: spacing.sm, borderRadius: 20, borderWidth: 1, borderColor: colors.primary, alignItems: "center" },
  fakeGenderChipActive:{ backgroundColor: colors.primary },
  fakeGenderText:      { fontSize: fontSize.sm, fontWeight: "600", color: colors.primary },
  fakeGenderTextActive:{ color: "#fff" },
  fakeBtn:             { borderColor: colors.primary },
  sectionLabel:        { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.secondary, marginTop: spacing.md, marginBottom: spacing.sm },
  checkboxItem:        { paddingVertical: 4 },
  checkboxLabel:       { fontSize: fontSize.sm },
});
