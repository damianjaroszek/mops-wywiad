/**
 * Ekran wynikowy — podgląd i eksport wygenerowanego pisma
 */
import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Share, Alert, ActivityIndicator } from "react-native";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useInterviewStore } from "@/store/interviewStore";
import { getInterview, normalizeFormDataForStore } from "@/services/api";
import { colors, spacing, fontSize, shadow } from "@/constants/theme";

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useInterviewStore();
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingData, setEditingData] = useState(false);
  const interviewId = id || store.interviewId;

  const document = store.generatedDocument || "";
  const lawRefs = store.lawReferences || [];

  useEffect(() => {
    if (id && !store.generatedDocument) {
      setLoading(true);
      getInterview(id)
        .then((interview) => {
          if (interview.generated_document) {
            store.setGeneratedDocument(interview.generated_document, interview.used_law_references || []);
          }
        })
        .catch((e) => Alert.alert("Błąd", e.message))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const handleExportPDF = async () => {
    if (!document) return;
    setExporting(true);
    try {
      const html = `
        <!DOCTYPE html><html lang="pl"><head><meta charset="UTF-8">
        <style>body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;margin:2cm;color:#000;}
        pre{white-space:pre-wrap;font-family:Arial,sans-serif;font-size:11pt;}</style></head>
        <body><pre>${document.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        ${lawRefs.length > 0 ? `<div style="margin-top:24pt;border-top:1pt solid #999;padding-top:12pt"><p><b>Użyte przepisy:</b></p><ul>${lawRefs.map((r) => `<li>${r}</li>`).join("")}</ul></div>` : ""}
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Eksportuj wywiad środowiskowy" });
      } else {
        Alert.alert("Zapisano", `PDF zapisany: ${uri}`);
      }
    } catch (e: any) {
      Alert.alert("Błąd eksportu", e.message);
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    if (!document) return;
    try {
      await Share.share({ message: document, title: "Wywiad środowiskowy" });
    } catch (e: any) {
      Alert.alert("Błąd", e.message);
    }
  };

  const handleEditData = () => {
    if (!interviewId) return;
    Alert.alert(
      "Edytuj dane wywiadu",
      "Przejście do formularza wyczyści obecne pismo. Po edycji wygenerujesz je ponownie.",
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Edytuj",
          onPress: async () => {
            setEditingData(true);
            try {
              const interview = await getInterview(interviewId);
              store.loadInterviewData(interviewId, normalizeFormDataForStore(interview.form_data));
              router.push("/interview/step1");
            } catch (e: any) {
              Alert.alert("Błąd", e.message);
            } finally {
              setEditingData(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator style={{ flex: 1 }} size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push("/")} style={styles.backBtn}>
          <Text style={styles.backText}>← Strona główna</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wywiad gotowy</Text>
      </View>

      {document ? (
        <>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✓ Pismo wygenerowane pomyślnie</Text>
            </View>
            <View style={styles.docCard}>
              <Text style={styles.docText} selectable>{document}</Text>
            </View>
            {lawRefs.length > 0 && (
              <View style={styles.refsCard}>
                <Text style={styles.refsTitle}>Użyte przepisy prawne ({lawRefs.length})</Text>
                {lawRefs.map((ref, i) => (
                  <Text key={i} style={styles.refItem}>• {ref}</Text>
                ))}
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Button
              mode="contained"
              onPress={handleExportPDF}
              loading={exporting}
              disabled={exporting}
              icon="file-pdf-box"
              style={styles.pdfBtn}
              contentStyle={{ paddingVertical: 8 }}
            >
              Eksportuj PDF
            </Button>
            <View style={styles.footerRow}>
              <Button mode="outlined" onPress={handleShare} icon="share" style={styles.shareBtn}>
                Udostępnij tekst
              </Button>
              <Button mode="outlined" onPress={() => { store.resetForm(); router.replace("/"); }} icon="plus" style={styles.newBtn}>
                Nowy wywiad
              </Button>
            </View>
            <Button
              mode="outlined"
              onPress={() => router.push(`/interview/revise?id=${interviewId}`)}
              disabled={!interviewId}
              icon="pencil"
              style={styles.reviseBtn}
            >
              Popraw pismo
            </Button>
            <Button
              mode="outlined"
              onPress={handleEditData}
              loading={editingData}
              disabled={editingData || !interviewId}
              icon="pencil-box-outline"
              style={styles.editDataBtn}
            >
              Edytuj dane wywiadu
            </Button>
          </View>
        </>
      ) : (
        <View style={styles.noDoc}>
          <Text style={styles.noDocText}>Brak wygenerowanego pisma.</Text>
          <Button mode="contained" onPress={() => router.push("/")}>Wróć do listy</Button>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1, backgroundColor: colors.background },
  header:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, backgroundColor: colors.primary },
  backBtn:        { padding: spacing.sm },
  backText:       { color: "#fff", fontSize: fontSize.sm },
  headerTitle:    { color: "#fff", fontSize: fontSize.md, fontWeight: "600" },
  scroll:         { padding: spacing.md, paddingBottom: spacing.lg },
  successBanner:  { backgroundColor: "#E8F5E9", borderRadius: 8, padding: spacing.md, marginBottom: spacing.md },
  successText:    { color: colors.success, fontWeight: "700", fontSize: fontSize.md },
  docCard:        { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  docText:        { fontFamily: "monospace", fontSize: 12, lineHeight: 20, color: colors.text.primary },
  refsCard:       { backgroundColor: colors.primaryLight, borderRadius: 8, padding: spacing.md },
  refsTitle:      { fontSize: fontSize.md, fontWeight: "700", color: colors.primary, marginBottom: spacing.sm },
  refItem:        { fontSize: fontSize.sm, color: colors.secondary, lineHeight: 20, marginBottom: 4 },
  footer:         { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  pdfBtn:         { backgroundColor: colors.error },
  footerRow:      { flexDirection: "row", gap: spacing.sm },
  shareBtn:       { flex: 1 },
  newBtn:         { flex: 1 },
  reviseBtn:      { borderColor: colors.primary },
  editDataBtn:    { borderColor: colors.secondary },
  noDoc:          { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl, gap: spacing.md },
  noDocText:      { fontSize: fontSize.lg, color: colors.text.secondary },
});
