/**
 * Podsumowanie przed generowaniem pisma
 */
import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { Button, ActivityIndicator, Snackbar, List } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useInterviewStore } from "@/store/interviewStore";
import { createInterview, generateDocument, healthCheck, saveDraft } from "@/services/api";
import {
  HELP_REASONS, APARTMENT_TYPES, HEATING_TYPES, APARTMENT_CONDITION,
  MARITAL_STATUS, EMPLOYMENT_STATUS, DISABILITY_DEGREES,
} from "@/constants/formOptions";
import { colors, spacing, fontSize, shadow } from "@/constants/theme";


const yesNo = (v: boolean | null) => (v === true ? "Tak" : v === false ? "Nie" : "—");
const labelFor = (opts: readonly { value: string; label: string }[], value: string) =>
  opts.find((o) => o.value === value)?.label || value || "—";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "—"}</Text>
    </View>
  );
}

export default function SummaryScreen() {
  const store = useInterviewStore();
  const { formData, isGenerating, interviewId } = store;
  const { personal: p, housing: h, employment: e, health: hl, family: fam, financial: fin } = formData;
  const [genStatus, setGenStatus] = useState("");
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMsg, setSnackMsg] = useState("");

  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    try {
      const saved = await saveDraft(formData, interviewId);
      store.setInterviewId(saved.id);
      setSnackMsg("Wersja robocza zapisana");
      setSnackVisible(true);
    } catch (ex: any) {
      Alert.alert("Błąd zapisu", ex.message || "Spróbuj ponownie.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleGenerate = async () => {
    if (!p.first_name || !p.last_name) {
      Alert.alert("Brak danych", "Formularz nie zawiera danych osobowych. Cofnij i uzupełnij.");
      return;
    }

    store.setIsGenerating(true);
    setGenStatus("Sprawdzam połączenie z serwerem...");

    try {
      const isAlive = await healthCheck();
      if (!isAlive) {
        Alert.alert("Błąd", "Serwer jest niedostępny. Sprawdź połączenie z internetem.");
        return;
      }

      setGenStatus("Generuję pismo urzędowe...");
      let interviewIdToUse = interviewId;
      if (!interviewIdToUse) {
        const interview = await createInterview("—", formData);
        interviewIdToUse = interview.id;
        store.setInterviewId(interview.id);
      }

      const result = await generateDocument(interviewIdToUse);
      store.setGeneratedDocument(result.document, result.law_references);

      router.push("/interview/result");
    } catch (ex: any) {
      Alert.alert("Błąd generowania", ex.message || "Spróbuj ponownie.");
    } finally {
      store.setIsGenerating(false);
    }
  };

  const utilities = [
    h.has_cold_water && "zimna woda",
    h.has_hot_water && "ciepła woda",
    h.has_bathroom && "łazienka",
    h.has_wc && "WC",
    h.has_gas && "gaz",
  ].filter(Boolean).join(", ") || "brak";

  const helpLabels = p.help_reasons.map((v) => labelFor(HELP_REASONS, v)).join(", ") || "—";

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Wróć</Text>
        </TouchableOpacity>
        <Text style={styles.stepLabel}>Podsumowanie</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: "100%" }]} />
      </View>

      {isGenerating ? (
        <View style={styles.generating}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.genTitle}>Generuję wywiad środowiskowy</Text>
          <Text style={styles.genStep}>{genStatus}</Text>
          <Text style={styles.genHint}>To może potrwać 15–30 sekund</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>Sprawdź dane przed generowaniem</Text>

            <View style={styles.accWrapper}>
              <List.Accordion title="1. Dane osobowe" titleStyle={styles.accTitle} style={styles.acc}>
                <View style={styles.accBody}>
                  <Row label="Imię i nazwisko" value={`${p.first_name} ${p.last_name}`.trim()} />
                  <Row label="PESEL" value={p.pesel} />
                  <Row label="Data urodzenia" value={p.birth_date} />
                  <Row label="Płeć" value={p.gender} />
                  <Row label="Stan cywilny" value={labelFor(MARITAL_STATUS, p.marital_status)} />
                  <Row label="Adres" value={[p.address_street, p.address_postal_code, p.address_city].filter(Boolean).join(", ")} />
                  <Row label="Telefon" value={p.phone} />
                  <Row label="Dochód własny" value={p.income_amount ? `${p.income_amount} zł/mies.` : "—"} />
                  <Row label="Przyczyny pomocy" value={helpLabels} />
                </View>
              </List.Accordion>
            </View>

            <View style={styles.accWrapper}>
              <List.Accordion title="2. Sytuacja mieszkaniowa" titleStyle={styles.accTitle} style={styles.acc}>
                <View style={styles.accBody}>
                  <Row label="Typ mieszkania" value={labelFor(APARTMENT_TYPES, h.apartment_type)} />
                  <Row label="Liczba pokoi" value={h.rooms_count} />
                  <Row label="Piętro" value={h.floor} />
                  <Row label="Miejsca do spania" value={h.sleeping_places} />
                  <Row label="Media" value={utilities} />
                  <Row label="Ogrzewanie" value={labelFor(HEATING_TYPES, h.heating_type)} />
                  <Row label="Stan lokalu" value={labelFor(APARTMENT_CONDITION, h.apartment_condition)} />
                </View>
              </List.Accordion>
            </View>

            <View style={styles.accWrapper}>
              <List.Accordion title="3. Sytuacja zawodowa" titleStyle={styles.accTitle} style={styles.acc}>
                <View style={styles.accBody}>
                  <Row label="Status zawodowy" value={labelFor(EMPLOYMENT_STATUS, e.employment_status)} />
                  {e.employment_status === "bezrobotny" && (
                    <>
                      <Row label="Zarejestrowany w PUP" value={yesNo(e.is_registered_unemployed)} />
                      <Row label="Pobiera zasiłek" value={yesNo(e.has_unemployment_benefit)} />
                      {e.has_unemployment_benefit && (
                        <Row label="Kwota zasiłku" value={e.unemployment_benefit_amount ? `${e.unemployment_benefit_amount} zł/mies.` : "—"} />
                      )}
                    </>
                  )}
                  <Row label="Wykształcenie / kwalifikacje" value={e.qualifications} />
                  <Row label="Ostatnie miejsce pracy" value={e.last_employment} />
                </View>
              </List.Accordion>
            </View>

            <View style={styles.accWrapper}>
              <List.Accordion title="4. Sytuacja zdrowotna" titleStyle={styles.accTitle} style={styles.acc}>
                <View style={styles.accBody}>
                  <Row label="Ubezpieczenie NFZ" value={yesNo(hl.has_health_insurance)} />
                  <Row label="Osoby długotrwale chore" value={hl.chronically_ill_count} />
                  <Row label="Rodzaj schorzeń" value={hl.illness_types} />
                  <Row label="Orzeczenie o niepełnospr." value={yesNo(hl.has_disability_certificate)} />
                  {hl.has_disability_certificate && (
                    <Row label="Stopień niepełnospr." value={labelFor(DISABILITY_DEGREES, hl.disability_degree)} />
                  )}
                  <Row label="Uzależnienie" value={yesNo(hl.has_addiction)} />
                  {hl.has_addiction && hl.addiction_types.length > 0 && (
                    <Row label="Rodzaj uzależnienia" value={hl.addiction_types.join(", ")} />
                  )}
                  <Row label="Uwagi zdrowotne" value={hl.additional_health_info} />
                </View>
              </List.Accordion>
            </View>

            <View style={styles.accWrapper}>
              <List.Accordion title="5. Sytuacja rodzinna" titleStyle={styles.accTitle} style={styles.acc}>
                <View style={styles.accBody}>
                  {fam.members.length === 0 ? (
                    <Text style={styles.emptyNote}>Brak dodanych członków rodziny</Text>
                  ) : (
                    fam.members.map((m) => (
                      <Row
                        key={m.id}
                        label={m.name}
                        value={[m.relation, m.birth_year ? `ur. ${m.birth_year}` : null, m.income_amount ? `${m.income_amount} zł` : null].filter(Boolean).join(" · ")}
                      />
                    ))
                  )}
                  <Row label="Konflikty rodzinne" value={yesNo(fam.has_conflicts)} />
                  <Row label="Przemoc domowa" value={yesNo(fam.has_domestic_violence)} />
                  <Row label="Problemy opiekuńcze" value={yesNo(fam.has_childcare_issues)} />
                </View>
              </List.Accordion>
            </View>

            <View style={styles.accWrapper}>
              <List.Accordion title="6. Sytuacja finansowa" titleStyle={styles.accTitle} style={styles.acc}>
                <View style={styles.accBody}>
                  <Row label="Dochód rodziny" value={fin.total_family_income ? `${fin.total_family_income} zł/mies.` : "—"} />
                  <Row label="Dochód na osobę" value={fin.income_per_person ? `${fin.income_per_person} zł/mies.` : "—"} />
                  <Row label="Wydatki łącznie" value={fin.monthly_expenses_total ? `${fin.monthly_expenses_total} zł/mies.` : "—"} />
                  <Row label="Czynsz" value={fin.rent ? `${fin.rent} zł` : "—"} />
                  <Row label="Prąd" value={fin.electricity ? `${fin.electricity} zł` : "—"} />
                  <Row label="Gaz" value={fin.gas_cost ? `${fin.gas_cost} zł` : "—"} />
                  <Row label="Leki" value={fin.medications ? `${fin.medications} zł` : "—"} />
                  <Row label="Inne wydatki" value={fin.other_expenses ? `${fin.other_expenses} zł` : "—"} />
                  <Row label="Potrzeby i oczekiwania" value={fin.needs_and_expectations} />
                </View>
              </List.Accordion>
            </View>

            {interviewId && (
              <View style={styles.draftBadge}>
                <Text style={styles.draftBadgeText}>✓ Szkic zapisany na serwerze</Text>
              </View>
            )}

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ℹ️ Generowanie wymaga połączenia z internetem i trwa ok. 15–30 sekund.
                Pismo zostanie wygenerowane z cytowaniem aktualnych przepisów prawnych.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              mode="outlined"
              onPress={handleSaveDraft}
              loading={isSavingDraft}
              disabled={isSavingDraft}
              icon="content-save"
              style={styles.draftBtn}
              contentStyle={{ paddingVertical: 8 }}
            >
              Zapisz wersję roboczą
            </Button>
            <Button
              mode="contained"
              onPress={handleGenerate}
              style={styles.genBtn}
              contentStyle={{ paddingVertical: 10 }}
              icon="file-document"
            >
              Generuj pismo
            </Button>
          </View>
        </>
      )}

      <Snackbar
        visible={snackVisible}
        onDismiss={() => setSnackVisible(false)}
        duration={3000}
        style={styles.snackbar}
        action={{ label: "OK", onPress: () => setSnackVisible(false) }}
      >
        <Text style={{ color: "#fff" }}>✓ {snackMsg}</Text>
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.background },
  header:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, backgroundColor: colors.primary },
  backBtn:        { padding: spacing.sm },
  backText:       { color: "#fff", fontSize: fontSize.md },
  stepLabel:      { color: "#ffffffcc", fontSize: fontSize.sm },
  progressBar:    { height: 4, backgroundColor: colors.primary },
  progressFill:   { height: 4, backgroundColor: colors.primary },
  scroll:         { padding: spacing.md },
  title:          { fontSize: fontSize.xl, fontWeight: "700", color: colors.text.primary, marginBottom: spacing.md },

  accWrapper:     { marginBottom: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.border, overflow: "hidden", backgroundColor: colors.surface, ...shadow.sm },
  acc:            { backgroundColor: colors.surface },
  accTitle:       { fontSize: fontSize.sm, fontWeight: "700", color: colors.primary },
  accBody:        { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.surface },

  row:            { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel:       { fontSize: fontSize.sm, color: colors.text.secondary, flex: 1 },
  rowValue:       { fontSize: fontSize.sm, color: colors.text.primary, flex: 2, textAlign: "right" },
  emptyNote:      { fontSize: fontSize.sm, color: colors.text.disabled, fontStyle: "italic", paddingVertical: spacing.sm },

  draftBadge:     { backgroundColor: "#E8F5E9", borderRadius: 8, padding: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.success },
  draftBadgeText: { fontSize: fontSize.sm, color: colors.success, fontWeight: "600" },
  infoBox:        { backgroundColor: colors.primaryLight, padding: spacing.md, borderRadius: 8, marginBottom: spacing.md },
  infoText:       { fontSize: fontSize.sm, color: colors.secondary, lineHeight: 20 },

  footer:         { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  draftBtn:       { borderColor: colors.primary },
  genBtn:         { backgroundColor: colors.primary },
  snackbar:       { backgroundColor: colors.success },

  generating:     { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  genTitle:       { fontSize: fontSize.xl, fontWeight: "700", color: colors.text.primary, marginTop: spacing.lg, textAlign: "center" },
  genStep:        { fontSize: fontSize.md, color: colors.primary, marginTop: spacing.md, textAlign: "center" },
  genHint:        { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.sm },
});
