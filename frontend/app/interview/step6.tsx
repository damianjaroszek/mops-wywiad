/**
 * Krok 6 — Dochody i wydatki
 */
import React from "react";
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useInterviewStore } from "@/store/interviewStore";
import { colors, spacing, fontSize } from "@/constants/theme";
import { cs } from "@/constants/commonStyles";
import FormField from "@/components/ui/FormField";
import StepHeader from "@/components/ui/StepHeader";

const EXPENSE_FIELDS: { key: keyof ReturnType<typeof useInterviewStore>["formData"]["financial"]; label: string }[] = [
  { key: "rent", label: "Czynsz i opłaty mieszkaniowe" },
  { key: "electricity", label: "Energia elektryczna" },
  { key: "gas_cost", label: "Gaz" },
  { key: "medications", label: "Leki i leczenie" },
  { key: "other_expenses", label: "Inne wydatki" },
];

export default function Step6() {
  const store = useInterviewStore();
  const fin = store.formData.financial;
  const members = store.formData.family.members;
  const personal = store.formData.personal;

  const mainPersonName = [personal.first_name, personal.last_name].filter(Boolean).join(" ");
  const mainPersonIncome = parseFloat(personal.income_amount) || 0;

  // Auto-suma dochodów: głowa rodziny (krok 1) + członkowie (krok 5)
  const membersIncome = members.reduce((sum, m) => sum + (m.income_amount || 0), 0);
  const autoIncome = mainPersonIncome + membersIncome;
  const totalCount = (mainPersonName ? 1 : 0) + members.length;
  const autoPerPerson = totalCount > 0 ? autoIncome / totalCount : 0;

  const applyAutoIncome = () => {
    store.updateFinancial({
      total_family_income: autoIncome > 0 ? autoIncome.toFixed(2) : "",
      income_per_person: autoPerPerson > 0 ? autoPerPerson.toFixed(2) : "",
    });
  };

  const calcTotal = () => {
    const sum = EXPENSE_FIELDS.reduce((acc, { key }) => {
      return acc + (parseFloat(fin[key] as string) || 0);
    }, 0);
    return sum > 0 ? sum.toFixed(2) : "";
  };

  const handleNext = () => {
    const total = calcTotal();
    if (total && !fin.monthly_expenses_total) {
      store.updateFinancial({ monthly_expenses_total: total });
    }
    store.setCurrentStep(7);
    router.push("/interview/summary");
  };

  return (
    <SafeAreaView style={cs.safe}>
      <StepHeader step={6} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={cs.scroll} keyboardShouldPersistTaps="handled">
        <Text style={cs.title}>Dochody i wydatki</Text>

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
            label="Łączny dochód rodziny (zł/mies.)"
            value={fin.total_family_income}
            onChangeText={(v) => store.updateFinancial({ total_family_income: v.replace(/[^0-9.,]/g, "") })}
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
          {EXPENSE_FIELDS.map(({ key, label }) => (
            <FormField
              key={key}
              label={`${label} (zł)`}
              value={fin[key] as string}
              onChangeText={(v) => store.updateFinancial({ [key]: v.replace(/[^0-9.,]/g, "") } as any)}
              keyboardType="numeric"
              placeholder="0.00"
            />
          ))}

          {calcTotal() ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Suma wydatków:</Text>
              <Text style={styles.totalValue}>{calcTotal()} zł</Text>
            </View>
          ) : null}

          <FormField
            label="Łączne wydatki miesięczne (zł) — opcjonalnie nadpisz"
            value={fin.monthly_expenses_total}
            onChangeText={(v) => store.updateFinancial({ monthly_expenses_total: v.replace(/[^0-9.,]/g, "") })}
            keyboardType="numeric"
            style={{ marginTop: spacing.sm }}
            placeholder={calcTotal() || "0.00"}
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

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Po naciśnięciu „Dalej" przejdziesz do podsumowania. Sprawdź dane i wygeneruj pismo urzędowe.
          </Text>
        </View>
        </ScrollView>

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
  totalRow:               { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.primaryLight, padding: spacing.md, borderRadius: 8, marginBottom: spacing.sm },
  totalLabel:             { fontSize: fontSize.md, fontWeight: "600", color: colors.primary },
  totalValue:             { fontSize: fontSize.lg, fontWeight: "700", color: colors.primary },
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
});
