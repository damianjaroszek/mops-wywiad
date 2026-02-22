/**
 * Podsumowanie przed generowaniem pisma
 */
import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert } from "react-native";
import { Button, ActivityIndicator, Snackbar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useInterviewStore } from "@/store/interviewStore";
import { createInterview, generateDocument, healthCheck, saveDraft } from "@/services/api";
import { colors, spacing, fontSize, shadow } from "@/constants/theme";

const GENERATION_STEPS = [
  "Sprawdzam połączenie z serwerem...",
  "Analizuję dane wywiadu...",
  "Przeszukuję przepisy prawne...",
  "Generuję pismo urzędowe...",
  "Finalizuję dokument...",
];

export default function SummaryScreen() {
  const store = useInterviewStore();
  const { formData, isGenerating, interviewId } = store;
  const p = formData.personal;
  const [genStep, setGenStep] = useState(0);
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
    } catch (e: any) {
      Alert.alert("Błąd zapisu", e.message || "Spróbuj ponownie.");
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
    setGenStep(0);

    try {
      // Krok 1: health check (cold start Render.com)
      setGenStep(0);
      const isAlive = await healthCheck();
      if (!isAlive) {
        Alert.alert("Błąd", "Serwer jest niedostępny. Sprawdź połączenie z internetem.");
        return;
      }

      // Krok 2: Utwórz wywiad lub użyj istniejącego szkicu
      setGenStep(1);
      let interviewIdToUse = interviewId;
      if (!interviewIdToUse) {
        const interview = await createInterview("—", formData);
        interviewIdToUse = interview.id;
        store.setInterviewId(interview.id);
      }

      // Krok 3-4: Generuj pismo
      setGenStep(2);
      setTimeout(() => setGenStep(3), 3000);
      setTimeout(() => setGenStep(4), 8000);

      const result = await generateDocument(interviewIdToUse);
      store.setGeneratedDocument(result.document, result.law_references);

      router.push("/interview/result");
    } catch (e: any) {
      Alert.alert("Błąd generowania", e.message || "Spróbuj ponownie.");
    } finally {
      store.setIsGenerating(false);
    }
  };

  const renderSummaryRow = (label: string, value: string) => (
    <View style={styles.row} key={label}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value || "—"}</Text>
    </View>
  );

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
          <Text style={styles.genStep}>{GENERATION_STEPS[genStep]}</Text>
          <Text style={styles.genHint}>To może potrwać 15–30 sekund</Text>
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll}>
            <Text style={styles.title}>Sprawdź dane przed generowaniem</Text>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Dane osobowe</Text>
              {renderSummaryRow("Imię i nazwisko", `${p.first_name} ${p.last_name}`)}
              {renderSummaryRow("PESEL", p.pesel)}
              {renderSummaryRow("Miejscowość", p.address_city)}
              {renderSummaryRow("Przyczyny pomocy", p.help_reasons.slice(0, 3).join(", ") + (p.help_reasons.length > 3 ? "..." : ""))}
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
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, backgroundColor: colors.primary },
  backBtn: { padding: spacing.sm },
  backText: { color: "#fff", fontSize: fontSize.md },
  stepLabel: { color: "#ffffffcc", fontSize: fontSize.sm },
  progressBar: { height: 4, backgroundColor: colors.primary },
  progressFill: { height: 4, backgroundColor: colors.primary },
  scroll: { padding: spacing.md },
  title: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text.primary, marginBottom: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  cardTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.primary, marginBottom: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { fontSize: fontSize.sm, color: colors.text.secondary, flex: 1 },
  rowValue: { fontSize: fontSize.sm, color: colors.text.primary, flex: 2, textAlign: "right" },
  draftBadge: { backgroundColor: "#E8F5E9", borderRadius: 8, padding: spacing.sm, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.success },
  draftBadgeText: { fontSize: fontSize.sm, color: colors.success, fontWeight: "600" },
  infoBox: { backgroundColor: colors.primaryLight, padding: spacing.md, borderRadius: 8, marginBottom: spacing.md },
  infoText: { fontSize: fontSize.sm, color: colors.secondary, lineHeight: 20 },
  footer: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  draftBtn: { borderColor: colors.primary },
  genBtn: { backgroundColor: colors.primary },
  snackbar: { backgroundColor: colors.success },
  generating: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  genTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.text.primary, marginTop: spacing.lg, textAlign: "center" },
  genStep: { fontSize: fontSize.md, color: colors.primary, marginTop: spacing.md, textAlign: "center" },
  genHint: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: spacing.sm },
});
