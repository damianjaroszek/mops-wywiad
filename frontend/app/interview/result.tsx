/**
 * Ekran wynikowy — podgląd i eksport wygenerowanego pisma
 */
import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Share, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Button, FAB } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useInterviewStore } from "@/store/interviewStore";
import { getInterview, reviseDocument } from "@/services/api";
import { colors, spacing, fontSize, shadow } from "@/constants/theme";

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useInterviewStore();
  const [document, setDocument] = useState(store.generatedDocument || "");
  const [markedDocument, setMarkedDocument] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [lawRefs, setLawRefs] = useState<string[]>(store.lawReferences || []);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [revising, setRevising] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [reviseOpen, setReviseOpen] = useState(false);
  const interviewId = id || store.interviewId;

  useEffect(() => {
    if (id && !store.generatedDocument) {
      setLoading(true);
      getInterview(id)
        .then((interview) => {
          if (interview.generated_document) {
            setDocument(interview.generated_document);
            setLawRefs(interview.used_law_references || []);
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

  const stripMarkers = (text: string) => text.replace(/[«»]/g, "");

  const handleRevise = async () => {
    if (!instruction.trim() || !interviewId || !document) return;
    setRevising(true);
    try {
      const result = await reviseDocument(
        interviewId,
        instruction.trim(),
        document,
        selectedText || undefined,
      );
      const clean = stripMarkers(result.document);
      setMarkedDocument(result.document);
      setDocument(clean);
      store.setGeneratedDocument(clean, lawRefs);
      setInstruction("");
      setSelectedText("");
      setReviseOpen(false);
    } catch (e: any) {
      Alert.alert("Błąd korekty", e.message);
    } finally {
      setRevising(false);
    }
  };

  const renderDocumentText = (text: string) => {
    const parts = text.split(/(«[^»]*»)/g);
    return (
      <Text style={styles.docText} selectable>
        {parts.map((part, i) => {
          if (part.startsWith("«") && part.endsWith("»")) {
            return (
              <Text key={i} style={styles.highlighted}>
                {part.slice(1, -1)}
              </Text>
            );
          }
          return part;
        })}
      </Text>
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Dokument — scrollowalny zawsze */}
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✓ Pismo wygenerowane pomyślnie</Text>
            </View>
            <View style={styles.docCard}>
              {renderDocumentText(markedDocument ?? document)}
              {markedDocument && (
                <TouchableOpacity
                  onPress={() => setMarkedDocument(null)}
                  style={styles.clearHighlightBtn}
                >
                  <Text style={styles.clearHighlightText}>Ukryj podświetlenie zmian</Text>
                </TouchableOpacity>
              )}
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

          {/* FAB — widoczny gdy panel korekty zamknięty */}
          {!reviseOpen && (
            <FAB
              icon="pencil"
              label="Popraw"
              style={styles.fab}
              onPress={() => setReviseOpen(true)}
              color="#fff"
            />
          )}

          {/* Stopka — przyciski eksportu lub panel korekty */}
          {reviseOpen ? (
            <View style={styles.revisePanel}>
              <View style={styles.revisePanelHeader}>
                <Text style={styles.revisePanelTitle}>Popraw pismo</Text>
                <TouchableOpacity
                  onPress={() => { if (!revising) { setReviseOpen(false); setSelectedText(""); } }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.revisePanelClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.fragmentInput}
                value={selectedText}
                onChangeText={setSelectedText}
                placeholder="Wklej fragment który chcesz zmienić (opcjonalnie)"
                placeholderTextColor={colors.text.disabled}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                editable={!revising}
              />
              <View style={styles.revisePanelRow}>
                <TextInput
                  style={styles.revisePanelInput}
                  value={instruction}
                  onChangeText={setInstruction}
                  placeholder='Co zmienić?  np. "klient ogrzewa węglem"'
                  placeholderTextColor={colors.text.disabled}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!revising}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.reviseSendBtn, (revising || !instruction.trim()) && styles.reviseSendBtnDisabled]}
                  onPress={handleRevise}
                  disabled={revising || !instruction.trim()}
                >
                  {revising
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={styles.reviseSendIcon}>➤</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ) : (
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
            </View>
          )}
        </KeyboardAvoidingView>
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
  scroll:         { padding: spacing.md, paddingBottom: 120 },
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
  noDoc:          { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl, gap: spacing.md },
  noDocText:      { fontSize: fontSize.lg, color: colors.text.secondary },
  fab:            { position: "absolute", right: spacing.md, bottom: 160, backgroundColor: colors.secondary, zIndex: 10, elevation: 6 },
  revisePanel:    { backgroundColor: colors.surface, borderTopWidth: 2, borderTopColor: colors.primary, padding: spacing.md, gap: spacing.sm },
  revisePanelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  revisePanelTitle:  { fontSize: fontSize.md, fontWeight: "700", color: colors.primary },
  revisePanelClose:  { fontSize: 20, color: colors.text.secondary, paddingHorizontal: spacing.xs },
  revisePanelRow:    { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs },
  revisePanelInput:  { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, fontSize: fontSize.sm, color: colors.text.primary, minHeight: 60, maxHeight: 100, backgroundColor: colors.background, textAlignVertical: "top" },
  reviseSendBtn:     { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondary, justifyContent: "center", alignItems: "center" },
  reviseSendBtnDisabled: { backgroundColor: colors.border },
  reviseSendIcon:    { color: "#fff", fontSize: 18, marginLeft: 2 },
  highlighted:        { backgroundColor: "#FFEE58", color: "#1A1A1A", fontWeight: "700" },
  clearHighlightBtn:  { marginTop: 12, alignSelf: "flex-end" },
  clearHighlightText: { fontSize: 11, color: colors.text.disabled, textDecorationLine: "underline" },
  fragmentInput:      { borderWidth: 1, borderColor: colors.primaryLight, borderRadius: 6, padding: spacing.sm, fontSize: fontSize.sm, color: colors.text.primary, minHeight: 44, maxHeight: 80, backgroundColor: colors.primaryLight, textAlignVertical: "top", marginBottom: spacing.xs },
});
