/**
 * Krok 6 — Dochody i wydatki
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useScrollGuard } from "@/hooks/useScrollGuard";
import ScrollEndBanner from "@/components/ui/ScrollEndBanner";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { HELP_FORMS, suggestHelpForms, calculateBenefits, THRESHOLD_SINGLE, THRESHOLD_FAMILY } from "@/constants/helpForms";
import { useInterviewStore } from "@/store/interviewStore";
import { colors, spacing, fontSize } from "@/constants/theme";
import { cs } from "@/constants/commonStyles";
import FormField, { FormFieldRef } from "@/components/ui/FormField";
import StepHeader from "@/components/ui/StepHeader";
import ScanSectionButton from "@/components/ui/ScanSectionButton";

export default function Step6() {
  const store = useInterviewStore();
  const { scrollRef, isAtBottom, scrollProps, tryNext } = useScrollGuard();

  const fin     = store.formData.financial;
  const members = store.formData.family.members;
  const personal = store.formData.personal;

  const mainPersonName = [personal.first_name, personal.last_name].filter(Boolean).join(" ");
  const mainPersonIncome = parseFloat(personal.income_amount) || 0;

  // Auto-suma dochodów: głowa rodziny (krok 1) + członkowie (krok 5)
  const membersIncome = members.reduce((sum, m) => sum + (m.income_amount || 0), 0);
  const autoIncome = mainPersonIncome + membersIncome;
  const totalCount = (mainPersonName ? 1 : 0) + members.length;
  const autoPerPerson = totalCount > 0 ? autoIncome / totalCount : 0;

  const suggested  = useMemo(() => suggestHelpForms(store.formData),   [store.formData]);
  const benefits   = useMemo(() => calculateBenefits(store.formData),  [store.formData]);

  useEffect(() => {
    if ((fin.selected_help_forms ?? []).length === 0 && suggested.length > 0) {
      store.updateFinancial({ selected_help_forms: suggested });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleHelpForm = (id: string) => {
    const current = fin.selected_help_forms ?? [];
    const next = current.includes(id) ? current.filter((f) => f !== id) : [...current, id];
    store.updateFinancial({ selected_help_forms: next });
  };

  const applyAutoIncome = () => {
    store.updateFinancial({
      total_family_income: autoIncome > 0 ? autoIncome.toFixed(2) : "",
      income_per_person: autoPerPerson > 0 ? autoPerPerson.toFixed(2) : "",
    });
  };

  const incomeRef = useRef<FormFieldRef>(null);
  const [incomeError, setIncomeError] = useState(false);

  const handleScanApply = (data: Record<string, any>) => {
    const toStr = (v: any) => (v != null && v !== "" ? String(v) : "");
    store.updateFinancial({
      total_family_income:    toStr(data.total_family_income)    || fin.total_family_income,
      income_per_person:      toStr(data.income_per_person)      || fin.income_per_person,
      monthly_expenses_total: toStr(data.monthly_expenses_total) || fin.monthly_expenses_total,
      needs_and_expectations: toStr(data.needs_and_expectations) || fin.needs_and_expectations,
    });
  };

  const handleNext = () => {
    if (!fin.total_family_income) {
      setIncomeError(true);
      incomeRef.current?.focus();
      return;
    }
    tryNext(() => {
      store.setCurrentStep(7);
      router.push("/interview/summary");
    });
  };

  return (
    <SafeAreaView style={cs.safe}>
      <StepHeader step={6} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView ref={scrollRef} {...scrollProps} contentContainerStyle={cs.scroll} keyboardShouldPersistTaps="handled">
        <Text style={cs.title}>Dochody i wydatki</Text>
        <ScanSectionButton step={6} onApply={handleScanApply} />

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Dochody rodziny</Text>

          {(mainPersonName || members.length > 0) ? (
            <View style={styles.autoIncomeBox}>
              <Text style={styles.autoIncomeTitle}>Wyliczone z kroków 1 i 5</Text>

              {mainPersonName ? (
                <View style={styles.autoIncomeRow}>
                  <View style={styles.autoIncomeNameWrap}>
                    <Text style={styles.autoIncomeName} numberOfLines={1}>{mainPersonName}</Text>
                    <View style={styles.autoIncomeHeadBadge}>
                      <Text style={styles.autoIncomeHeadBadgeText}>głowa</Text>
                    </View>
                  </View>
                  <Text style={styles.autoIncomeAmt}>
                    {mainPersonIncome > 0 ? `${mainPersonIncome.toFixed(2)} zł` : "—"}
                  </Text>
                </View>
              ) : null}

              {members.map((m) => (
                <View key={m.id} style={styles.autoIncomeRow}>
                  <Text style={styles.autoIncomeName} numberOfLines={1}>{m.name}</Text>
                  <Text style={styles.autoIncomeAmt}>
                    {m.income_amount ? `${m.income_amount.toFixed(2)} zł` : "—"}
                  </Text>
                </View>
              ))}

              <View style={styles.autoIncomeDivider} />
              <View style={styles.autoIncomeRow}>
                <Text style={styles.autoIncomeSumLabel}>Łącznie</Text>
                <Text style={styles.autoIncomeSumValue}>{autoIncome.toFixed(2)} zł</Text>
              </View>
              {totalCount > 0 && (
                <View style={styles.autoIncomeRow}>
                  <Text style={styles.autoIncomePerLabel}>Na osobę ({totalCount} os.)</Text>
                  <Text style={styles.autoIncomePerValue}>{autoPerPerson.toFixed(2)} zł</Text>
                </View>
              )}
              <TouchableOpacity style={styles.applyBtn} onPress={applyAutoIncome}>
                <Text style={styles.applyBtnText}>↓ Zastosuj tę sumę</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.noMembersNote}>Brak danych — uzupełnij dochód w kroku 1 lub dodaj członków w kroku 5</Text>
          )}

          <FormField
            ref={incomeRef}
            label="Łączny dochód rodziny (zł/mies.)"
            required
            error={incomeError}
            value={fin.total_family_income}
            onChangeText={(v) => {
              store.updateFinancial({ total_family_income: v.replace(/[^0-9.,]/g, "") });
              if (incomeError) setIncomeError(false);
            }}
            keyboardType="numeric"
            placeholder="0.00"
            style={{ marginTop: spacing.sm }}
          />
          <FormField
            label="Dochód na osobę w rodzinie (zł/mies.)"
            value={fin.income_per_person}
            onChangeText={(v) => store.updateFinancial({ income_per_person: v.replace(/[^0-9.,]/g, "") })}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </View>

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Miesięczne wydatki</Text>
          <FormField
            label="Łączne wydatki miesięczne (zł)"
            value={fin.monthly_expenses_total}
            onChangeText={(v) => store.updateFinancial({ monthly_expenses_total: v.replace(/[^0-9.,]/g, "") })}
            keyboardType="numeric"
            placeholder="0.00"
          />
        </View>

        <View style={cs.card}>
          <Text style={cs.cardTitle}>Potrzeby i oczekiwania</Text>
          <FormField
            label="Opis potrzeb i oczekiwań osoby ubiegającej się o pomoc"
            value={fin.needs_and_expectations}
            onChangeText={(v) => store.updateFinancial({ needs_and_expectations: v })}
            multiline
            numberOfLines={5}
            placeholder="np. potrzeba wsparcia finansowego, pomoc w znalezieniu pracy, dofinansowanie leków"
          />
        </View>

        {/* Wnioskowane formy pomocy */}
        <View style={cs.card}>
          <Text style={cs.cardTitle}>Wnioskowane formy pomocy</Text>

          {/* Info o kryterium dochodowym */}
          {fin.income_per_person ? (
            <View style={styles.thresholdBox}>
              <Text style={styles.thresholdLabel}>Kryterium dochodowe 2024</Text>
              <Text style={styles.thresholdRow}>
                Osoba samotna: <Text style={styles.thresholdVal}>{THRESHOLD_SINGLE} zł/mies.</Text>
                {"   "}Rodzina: <Text style={styles.thresholdVal}>{THRESHOLD_FAMILY} zł/os.</Text>
              </Text>
              <Text style={styles.thresholdRow}>
                Dochód na osobę:{" "}
                <Text style={[
                  styles.thresholdVal,
                  parseFloat(fin.income_per_person) < THRESHOLD_FAMILY
                    ? styles.thresholdBelow
                    : styles.thresholdAbove,
                ]}>
                  {parseFloat(fin.income_per_person).toFixed(2)} zł
                  {parseFloat(fin.income_per_person) < THRESHOLD_FAMILY
                    ? "  ✓ poniżej kryterium"
                    : "  ✗ powyżej kryterium"}
                </Text>
              </Text>
            </View>
          ) : (
            <Text style={styles.thresholdNote}>
              Uzupełnij dochód na osobę (wyżej) — wyświetlimy automatyczne sugestie.
            </Text>
          )}

          <Text style={[cs.fieldLabel, { marginTop: spacing.md }]}>
            Zaznacz formy pomocy do uwzględnienia w piśmie:
          </Text>
          {HELP_FORMS.map((form) => {
            const selected    = (fin.selected_help_forms ?? []).includes(form.id);
            const isSuggested = suggested.includes(form.id);
            const calc        = (benefits as any)[form.id] as import("@/constants/helpForms").BenefitAmount | undefined;

            return (
              <TouchableOpacity
                key={form.id}
                style={[styles.formRow, selected && styles.formRowSelected]}
                onPress={() => toggleHelpForm(form.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                  {selected && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.formLabelRow}>
                    <Text style={[styles.formLabel, selected && styles.formLabelSelected]}>
                      {form.label}
                    </Text>
                    {isSuggested && (
                      <View style={styles.suggestedBadge}>
                        <Text style={styles.suggestedBadgeText}>sugerowane</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.formDescription}>{form.description}</Text>
                  <Text style={styles.formLaw}>{form.lawBasis}</Text>

                  {calc && !calc.isAboveThreshold && (
                    <View style={styles.calcBox}>
                      <Text style={styles.calcAmount}>
                        ~{calc.amount.toFixed(2).replace(".", ",")} zł/mies.
                      </Text>
                      <Text style={styles.calcFormula}>{calc.formula}</Text>
                      {calc.note && <Text style={styles.calcNote}>{calc.note}</Text>}
                    </View>
                  )}
                  {calc?.isAboveThreshold && (
                    <View style={styles.calcBoxAbove}>
                      <Text style={styles.calcAboveText}>Dochód powyżej kryterium — {calc.formula}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Po naciśnięciu „Dalej" przejdziesz do podsumowania. Sprawdź dane i wygeneruj pismo urzędowe.
          </Text>
        </View>
        </ScrollView>

        <ScrollEndBanner visible={!isAtBottom} />
        <View style={cs.footer}>
          <Button mode="contained" onPress={handleNext} style={cs.nextBtn} contentStyle={{ paddingVertical: 8 }} icon="file-check">
            Przejdź do podsumowania
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  autoIncomeBox:          { backgroundColor: colors.primaryLight, borderRadius: 8, padding: spacing.sm, marginBottom: spacing.sm },
  autoIncomeTitle:        { fontSize: fontSize.xs, fontWeight: "600", color: colors.secondary, marginBottom: spacing.xs, textTransform: "uppercase" },
  autoIncomeRow:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 3 },
  autoIncomeNameWrap:     { flexDirection: "row", alignItems: "center", flex: 1, marginRight: spacing.sm, gap: 5 },
  autoIncomeName:         { fontSize: fontSize.sm, color: colors.text.primary },
  autoIncomeHeadBadge:    { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  autoIncomeHeadBadgeText:{ fontSize: 9, fontWeight: "700", color: "#fff" },
  autoIncomeAmt:          { fontSize: fontSize.sm, color: colors.text.secondary },
  autoIncomeDivider:      { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  autoIncomeSumLabel:     { fontSize: fontSize.sm, fontWeight: "700", color: colors.primary },
  autoIncomeSumValue:     { fontSize: fontSize.sm, fontWeight: "700", color: colors.primary },
  autoIncomePerLabel:     { fontSize: fontSize.xs, color: colors.text.secondary },
  autoIncomePerValue:     { fontSize: fontSize.xs, color: colors.text.secondary },
  applyBtn:               { marginTop: spacing.sm, backgroundColor: colors.primary, borderRadius: 6, paddingVertical: spacing.xs, alignItems: "center" },
  applyBtnText:           { color: "#fff", fontSize: fontSize.sm, fontWeight: "600" },
  noMembersNote:          { fontSize: fontSize.sm, color: colors.text.disabled, fontStyle: "italic", marginBottom: spacing.sm },
  infoBox:                { backgroundColor: colors.primaryLight, padding: spacing.md, borderRadius: 8, marginBottom: spacing.md },
  infoText:               { fontSize: fontSize.sm, color: colors.secondary, lineHeight: 20 },

  // Kryterium dochodowe
  thresholdBox:           { backgroundColor: "#F1F8E9", borderRadius: 8, padding: spacing.sm, marginBottom: spacing.sm, borderWidth: 1, borderColor: "#C5E1A5" },
  thresholdLabel:         { fontSize: fontSize.xs, fontWeight: "700", color: colors.secondary, textTransform: "uppercase", marginBottom: spacing.xs },
  thresholdRow:           { fontSize: fontSize.sm, color: colors.text.primary, marginBottom: 2 },
  thresholdVal:           { fontWeight: "700" },
  thresholdBelow:         { color: "#2E7D32" },
  thresholdAbove:         { color: colors.warning },
  thresholdNote:          { fontSize: fontSize.sm, color: colors.text.disabled, fontStyle: "italic", marginBottom: spacing.sm },

  // Lista form pomocy
  formRow:                { flexDirection: "row", alignItems: "flex-start", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  formRowSelected:        { backgroundColor: "#F3F8FF" },
  checkbox:               { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginTop: 2, flexShrink: 0 },
  checkboxSelected:       { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark:              { color: "#fff", fontSize: 13, fontWeight: "700" },
  formLabelRow:           { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 2 },
  formLabel:              { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.secondary },
  formLabelSelected:      { color: colors.primary },
  formDescription:        { fontSize: fontSize.xs, color: colors.text.secondary, lineHeight: 17 },
  formLaw:                { fontSize: 10, color: colors.text.disabled, marginTop: 2 },
  suggestedBadge:         { backgroundColor: "#E8F5E9", borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: "#A5D6A7" },
  suggestedBadgeText:     { fontSize: 10, fontWeight: "700", color: "#2E7D32" },

  // Blok z wyliczoną kwotą świadczenia
  calcBox:                { marginTop: spacing.xs, backgroundColor: "#E8F5E9", borderRadius: 6, padding: spacing.xs, borderLeftWidth: 3, borderLeftColor: "#2E7D32" },
  calcAmount:             { fontSize: fontSize.md, fontWeight: "700", color: "#1B5E20" },
  calcFormula:            { fontSize: fontSize.xs, color: "#388E3C", marginTop: 1 },
  calcNote:               { fontSize: 10, color: colors.text.disabled, marginTop: 1, fontStyle: "italic" },
  calcBoxAbove:           { marginTop: spacing.xs, backgroundColor: "#FFF3E0", borderRadius: 6, padding: spacing.xs, borderLeftWidth: 3, borderLeftColor: colors.warning },
  calcAboveText:          { fontSize: fontSize.xs, color: colors.warning },
});
