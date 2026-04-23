/**
 * Ekran wynikowy — podgląd i eksport wygenerowanego pisma
 */
import React, { useEffect, useRef, useState } from "react";
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Share, Alert, ActivityIndicator, TextInput, Keyboard, KeyboardEvent } from "react-native";
import { Button, Divider, Chip, FAB } from "react-native-paper";
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
  const [lawRefs, setLawRefs] = useState<string[]>(store.lawReferences || []);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [revising, setRevising] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [reviseModalVisible, setReviseModalVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const interviewId = id || store.interviewId;

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e: KeyboardEvent) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);

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
        <!DOCTYPE html>
        <html lang="pl">
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; margin: 2cm; color: #000; }
            h1 { font-size: 14pt; text-align: center; text-transform: uppercase; margin-bottom: 24pt; }
            pre { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 11pt; }
            .refs { margin-top: 24pt; border-top: 1pt solid #999; padding-top: 12pt; }
            .refs h2 { font-size: 11pt; }
            .refs ul { font-size: 10pt; }
          </style>
        </head>
        <body>
          <pre>${document.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          ${lawRefs.length > 0 ? `<div class="refs"><h2>Użyte przepisy prawne:</h2><ul>${lawRefs.map((r) => `<li>${r}</li>`).join("")}</ul></div>` : ""}
        </body>
        </html>
      `;
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

  const handleRevise = async () => {
    if (!instruction.trim() || !interviewId || !document) return;
    setRevising(true);
    try {
      const result = await reviseDocument(interviewId, instruction.trim(), document);
      setDocument(result.document);
      store.setGeneratedDocument(result.document, lawRefs);
      setInstruction("");
      setReviseModalVisible(false);
    } catch (e: any) {
      Alert.alert("Błąd korekty", e.message);
    } finally {
      setRevising(false);
    }
  };

  const handleNew = () => {
    store.resetForm();
    router.replace("/");
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
              <Text style={styles.docText}>{document}</Text>
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

          {/* FAB — pływający przycisk korekty, ukrywa się gdy panel otwarty */}
          {!reviseModalVisible && (
            <FAB
              icon="pencil"
              label="Popraw"
              style={styles.fab}
              onPress={() => setReviseModalVisible(true)}
              color="#fff"
            />
          )}

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
              <Button mode="outlined" onPress={handleNew} icon="plus" style={styles.newBtn}>
                Nowy wywiad
              </Button>
            </View>
          </View>

          {/* Panel korekty — przesuwa się nad klawiaturą */}
          {reviseModalVisible && (
            <View style={[styles.revisePanel, { bottom: keyboardHeight }]}>
              <View style={styles.revisePanelInner}>
                <View style={styles.revisePanelHeader}>
                  <Text style={styles.revisePanelTitle}>Popraw pismo</Text>
                  <TouchableOpacity onPress={() => !revising && setReviseModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.revisePanelClose}>✕</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.revisePanelInput}
                  value={instruction}
                  onChangeText={setInstruction}
                  placeholder='np. "Podkreśl że klient pali węglem, jest środek zimy"'
                  placeholderTextColor={colors.text.disabled}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  editable={!revising}
                  autoFocus
                />
                <Button
                  mode="contained"
                  onPress={handleRevise}
                  loading={revising}
                  disabled={revising || !instruction.trim()}
                  icon="check"
                  style={styles.revisePanelBtn}
                  contentStyle={{ paddingVertical: 6 }}
                >
                  {revising ? "Poprawiam..." : "Popraw pismo"}
                </Button>
              </View>
            </KeyboardAvoidingView>
          )}
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
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, backgroundColor: colors.primary },
  backBtn: { padding: spacing.sm },
  backText: { color: "#fff", fontSize: fontSize.sm },
  headerTitle: { color: "#fff", fontSize: fontSize.md, fontWeight: "600" },
  scroll: { padding: spacing.md, paddingBottom: 120 },
  successBanner: { backgroundColor: "#E8F5E9", borderRadius: 8, padding: spacing.md, marginBottom: spacing.md },
  successText: { color: colors.success, fontWeight: "700", fontSize: fontSize.md },
  docCard: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  docText: { fontFamily: "monospace", fontSize: 12, lineHeight: 20, color: colors.text.primary },
  refsCard: { backgroundColor: colors.primaryLight, borderRadius: 8, padding: spacing.md },
  refsTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.primary, marginBottom: spacing.sm },
  refItem: { fontSize: fontSize.sm, color: colors.secondary, lineHeight: 20, marginBottom: 4 },
  footer: { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  pdfBtn: { backgroundColor: colors.error },
  footerRow: { flexDirection: "row", gap: spacing.sm },
  shareBtn: { flex: 1 },
  newBtn: { flex: 1 },
  noDoc: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl, gap: spacing.md },
  noDocText: { fontSize: fontSize.lg, color: colors.text.secondary },
  fab: { position: "absolute", right: spacing.md, bottom: 160, backgroundColor: colors.secondary, zIndex: 10, elevation: 6 },
  revisePanel: { position: "absolute", left: 0, right: 0, zIndex: 20, elevation: 12 },
  revisePanelInner: { backgroundColor: colors.surface, borderTopWidth: 2, borderTopColor: colors.primary, padding: spacing.md, gap: spacing.sm },
  revisePanelHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  revisePanelTitle: { fontSize: fontSize.md, fontWeight: "700", color: colors.primary },
  revisePanelClose: { fontSize: 18, color: colors.text.secondary, paddingHorizontal: spacing.xs },
  revisePanelInput: { borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, fontSize: fontSize.sm, color: colors.text.primary, minHeight: 75, backgroundColor: colors.background, textAlignVertical: "top" },
  revisePanelBtn: { backgroundColor: colors.secondary },
});
