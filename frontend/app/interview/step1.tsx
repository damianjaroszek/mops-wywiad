/**
 * Krok 1 — Dane osobowe
 */
import React, { useState, useRef } from "react";
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useScrollGuard } from "@/hooks/useScrollGuard";
import ScrollEndBanner from "@/components/ui/ScrollEndBanner";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useInterviewStore } from "@/store/interviewStore";
import { normalizeFormDataForStore } from "@/services/api";
import { HELP_REASONS, MARITAL_STATUS, GENDER_OPTIONS } from "@/constants/formOptions";
import { generateFakeData } from "@/constants/fakeData";
import { colors, spacing, fontSize } from "@/constants/theme";

function parsePesel(pesel: string): { birth_date: string; gender: "K" | "M" } | null {
  if (!/^\d{11}$/.test(pesel)) return null;
  const digits = pesel.split("").map(Number);
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  const sum = weights.reduce((acc, w, i) => acc + w * digits[i], 0);
  if ((10 - (sum % 10)) % 10 !== digits[10]) return null;
  let yy = digits[0] * 10 + digits[1];
  let mm = digits[2] * 10 + digits[3];
  const dd = digits[4] * 10 + digits[5];
  let century = 1900;
  if (mm >= 81) { century = 2200; mm -= 80; }
  else if (mm >= 61) { century = 1800; mm -= 60; }
  else if (mm >= 41) { century = 2100; mm -= 40; }
  else if (mm >= 21) { century = 2000; mm -= 20; }
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return {
    birth_date: `${String(dd).padStart(2, "0")}.${String(mm).padStart(2, "0")}.${century + yy}`,
    gender: digits[9] % 2 === 0 ? "K" : "M",
  };
}
import { cs } from "@/constants/commonStyles";
import FormField, { FormFieldRef } from "@/components/ui/FormField";
import StepHeader from "@/components/ui/StepHeader";
import ChipSelector from "@/components/ui/ChipSelector";
import CopyFromInterviewModal from "@/components/ui/CopyFromInterviewModal";

export default function Step1() {
  const store = useInterviewStore();
  const { formData, updatePersonal, setCurrentStep, resetForm } = store;
  const p = formData.personal;
  const { scrollRef, isAtBottom, scrollProps, tryNext } = useScrollGuard();

  const firstNameRef = useRef<FormFieldRef>(null);
  const lastNameRef  = useRef<FormFieldRef>(null);
  const incomeRef    = useRef<FormFieldRef>(null);

  const [fe, setFe] = useState({ first_name: false, last_name: false, income_amount: false, help_reasons: false });

  const handleNext = () => {
    const next = {
      first_name:    !p.first_name.trim(),
      last_name:     !p.last_name.trim(),
      income_amount: !p.income_amount,
      help_reasons:  p.help_reasons.length === 0,
    };
    setFe(next);

    if (next.first_name) { firstNameRef.current?.focus(); return; }
    if (next.last_name)  { lastNameRef.current?.focus();  return; }
    if (next.income_amount) { incomeRef.current?.focus(); return; }
    if (next.help_reasons)  { scrollRef.current?.scrollToEnd({ animated: true }); return; }

    tryNext(() => { setCurrentStep(2); router.push("/interview/step2"); });
  };

  const [copyModalVisible, setCopyModalVisible] = useState(false);

  const handleCopyApply = (rawFormData: Record<string, any>) => {
    const n = normalizeFormDataForStore(rawFormData);
    resetForm();
    if (n.personal)    updatePersonal(n.personal);
    if (n.housing)     store.updateHousing(n.housing);
    if (n.employment)  store.updateEmployment(n.employment);
    if (n.health)      store.updateHealth(n.health);
    if (n.financial)   store.updateFinancial({ ...n.financial, selected_help_forms: [] });
    if (n.family) {
      const members = (n.family.members ?? []).map((m: any, i: number) => ({
        ...m, id: m.id ?? String(Date.now() + i),
      }));
      store.updateFamily({ ...n.family, members });
    }
  };

  const [fakeGender, setFakeGender] = useState<"K" | "M">("K");
  const [peselHint, setPeselHint] = useState<"ok" | "invalid" | null>(null);
  const peselHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePeselChange = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    updatePersonal({ pesel: digits });
    if (peselHintTimer.current) clearTimeout(peselHintTimer.current);
    if (digits.length === 11) {
      const parsed = parsePesel(digits);
      if (parsed) {
        updatePersonal({ pesel: digits, birth_date: parsed.birth_date, gender: parsed.gender });
        setPeselHint("ok");
        peselHintTimer.current = setTimeout(() => setPeselHint(null), 4000);
      } else {
        setPeselHint("invalid");
      }
    } else {
      setPeselHint(null);
    }
  };

  const fillFake = () => {
    const genderCode = fakeGender === "K" ? "F" : "M";
    const fake = generateFakeData(genderCode);
    updatePersonal({
      ...fake,
      citizenship: "polskie",
      gender: fakeGender,
    });
  };

  return (
    <SafeAreaView style={cs.safe}>
      <StepHeader step={1} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView ref={scrollRef} {...scrollProps} contentContainerStyle={cs.scroll} keyboardShouldPersistTaps="handled">
        <Text style={cs.title}>Dane osobowe</Text>

        <TouchableOpacity style={styles.copyRow} onPress={() => setCopyModalVisible(true)}>
          <View style={styles.copyRowIcon}><Text style={styles.copyRowIconText}>📋</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.copyRowTitle}>Kopiuj z poprzedniego wywiadu</Text>
            <Text style={styles.copyRowSub}>Dla stałych klientów — wczytaj dane i zaktualizuj co się zmieniło</Text>
          </View>
          <Text style={styles.copyRowArrow}>›</Text>
        </TouchableOpacity>

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

        <FormField ref={firstNameRef} label="Imię" required error={fe.first_name}
          value={p.first_name}
          onChangeText={(v) => { updatePersonal({ first_name: v }); if (fe.first_name) setFe(e => ({ ...e, first_name: false })); }} />
        <FormField ref={lastNameRef} label="Nazwisko" required error={fe.last_name}
          value={p.last_name}
          onChangeText={(v) => { updatePersonal({ last_name: v }); if (fe.last_name) setFe(e => ({ ...e, last_name: false })); }} />
        <FormField label="PESEL (fikcyjny)" value={p.pesel} onChangeText={handlePeselChange} keyboardType="numeric" maxLength={11} />
        {peselHint === "ok" && (
          <Text style={styles.peselHintOk}>✓ Uzupełniono datę urodzenia i płeć z PESEL</Text>
        )}
        {peselHint === "invalid" && (
          <Text style={styles.peselHintErr}>✗ Nieprawidłowy PESEL (błędna suma kontrolna)</Text>
        )}
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
        <FormField ref={incomeRef} label="Dochód własny (zł/mies.)" required error={fe.income_amount}
          value={p.income_amount}
          onChangeText={(v) => { updatePersonal({ income_amount: v.replace(/[^0-9.,]/g, "") }); if (fe.income_amount) setFe(e => ({ ...e, income_amount: false })); }}
          keyboardType="numeric" placeholder="0.00" />

        <Text style={[styles.sectionLabel, fe.help_reasons && styles.sectionLabelError]}>
          Przyczyny ubiegania się o pomoc <Text style={{ color: colors.error }}>*</Text>
          {fe.help_reasons && <Text style={styles.sectionLabelErrorNote}> — wybierz co najmniej jedną</Text>}
        </Text>
        <ChipSelector
          multi
          options={HELP_REASONS}
          values={p.help_reasons}
          onSelect={(v) => { updatePersonal({ help_reasons: v }); if (fe.help_reasons && v.length > 0) setFe(e => ({ ...e, help_reasons: false })); }}
          size="md"
        />
        </ScrollView>

        <ScrollEndBanner visible={!isAtBottom} />
        <View style={cs.footer}>
          <Button mode="contained" onPress={handleNext} style={cs.nextBtn} contentStyle={{ paddingVertical: 8 }} icon="arrow-right">
            Dalej
          </Button>
        </View>
      </KeyboardAvoidingView>

      <CopyFromInterviewModal
        visible={copyModalVisible}
        onClose={() => setCopyModalVisible(false)}
        onApply={(fd) => { handleCopyApply(fd); setCopyModalVisible(false); }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  copyRow:             { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 8, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1.5, borderColor: colors.primary, gap: spacing.sm },
  copyRowIcon:         { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  copyRowIconText:     { fontSize: 18 },
  copyRowTitle:        { fontSize: fontSize.sm, fontWeight: "700", color: colors.primary },
  copyRowSub:          { fontSize: fontSize.xs, color: colors.text.secondary, marginTop: 1 },
  copyRowArrow:        { fontSize: 22, color: colors.primary, fontWeight: "300" },
  fakeSection:         { backgroundColor: colors.primaryLight, borderRadius: 8, padding: spacing.md, marginBottom: spacing.md },
  fakeInfo:            { fontSize: fontSize.sm, color: colors.secondary, marginBottom: spacing.sm },
  fakeGenderRow:       { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  fakeGenderChip:      { flex: 1, paddingVertical: spacing.sm, borderRadius: 20, borderWidth: 1, borderColor: colors.primary, alignItems: "center" },
  fakeGenderChipActive:{ backgroundColor: colors.primary },
  fakeGenderText:      { fontSize: fontSize.sm, fontWeight: "600", color: colors.primary },
  fakeGenderTextActive:{ color: "#fff" },
  fakeBtn:             { borderColor: colors.primary },
  sectionLabel:        { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.secondary, marginTop: spacing.md, marginBottom: spacing.sm },
  sectionLabelError:   { color: colors.error },
  sectionLabelErrorNote: { fontSize: fontSize.xs, fontWeight: "400", color: colors.error },
  peselHintOk:         { fontSize: fontSize.sm, color: colors.success, marginTop: -spacing.sm, marginBottom: spacing.sm, paddingHorizontal: 2 },
  peselHintErr:        { fontSize: fontSize.sm, color: colors.error,   marginTop: -spacing.sm, marginBottom: spacing.sm, paddingHorizontal: 2 },
});
