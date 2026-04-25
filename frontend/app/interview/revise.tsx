/**
 * Ekran korekty pisma — pełny dokument + panel instrukcji
 */
import React, { useEffect, useState } from "react";
import { View, ScrollView, StyleSheet, Text, TouchableOpacity, Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useInterviewStore } from "@/store/interviewStore";
import { reviseDocument } from "@/services/api";
import { colors, spacing, fontSize, shadow } from "@/constants/theme";

const MAX_FRAGMENT_LEN = 800;

export default function ReviseScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useInterviewStore();
  const interviewId = id || store.interviewId;
  const currentDocument = store.generatedDocument || "";

  const [fragment, setFragment] = useState("");
  const [instruction, setInstruction] = useState("");
  const [revising, setRevising] = useState(false);
  const [markedDocument, setMarkedDocument] = useState<string | null>(null);

  useEffect(() => {
    Clipboard.getStringAsync()
      .then((clip) => {
        const trimmed = clip?.trim() ?? "";
        if (trimmed.length > 3 && trimmed.length <= MAX_FRAGMENT_LEN && currentDocument.includes(trimmed)) {
          setFragment(trimmed);
        }
      })
      .catch(() => {});
  }, []);

  const handleRevise = async () => {
    if (!instruction.trim() || !interviewId || !currentDocument) return;
    setRevising(true);
    try {
      const result = await reviseDocument(
        interviewId,
        instruction.trim(),
        currentDocument,
        fragment || undefined,
      );
      const clean = result.document.replace(/[«»]/g, "");
      setMarkedDocument(result.document);
      store.setGeneratedDocument(clean, store.lawReferences);
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
            return <Text key={i} style={styles.highlighted}>{part.slice(1, -1)}</Text>;
          }
          return part;
        })}
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Wróć</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Popraw pismo</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {markedDocument && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✓ Korekta zastosowana — podświetlone fragmenty zostały zmienione</Text>
            </View>
          )}
          <View style={styles.docCard}>
            {renderDocumentText(markedDocument ?? currentDocument)}
          </View>
        </ScrollView>

        {markedDocument ? (
          <View style={styles.panel}>
            <Button
              mode="contained"
              onPress={() => router.back()}
              icon="check"
              style={styles.doneBtn}
              contentStyle={{ paddingVertical: 8 }}
            >
              Gotowe — wróć do pisma
            </Button>
          </View>
        ) : (
          <View style={styles.panel}>
            <TextInput
              style={styles.fragmentInput}
              value={fragment}
              onChangeText={setFragment}
              placeholder="Fragment do zmiany (opcjonalnie — wklej lub zaznacz z dokumentu)"
              placeholderTextColor={colors.text.disabled}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!revising}
            />
            <View style={styles.instructionRow}>
              <TextInput
                style={styles.instructionInput}
                value={instruction}
                onChangeText={setInstruction}
                placeholder={'Co zmienić?  np. "klient ogrzewa węglem"'}
                placeholderTextColor={colors.text.disabled}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!revising}
                autoFocus={!!fragment}
              />
              <TouchableOpacity
                style={[styles.sendBtn, (revising || !instruction.trim()) && styles.sendBtnDisabled]}
                onPress={handleRevise}
                disabled={revising || !instruction.trim()}
              >
                {revising
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.sendIcon}>➤</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex: 1, backgroundColor: colors.background },
  header:           { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, backgroundColor: colors.primary },
  backBtn:          { padding: spacing.sm },
  backText:         { color: "#fff", fontSize: fontSize.sm },
  headerTitle:      { color: "#fff", fontSize: fontSize.md, fontWeight: "600" },
  headerSpacer:     { width: 60 },
  scroll:           { padding: spacing.md, paddingBottom: spacing.lg },
  successBanner:    { backgroundColor: "#E8F5E9", borderRadius: 8, padding: spacing.md, marginBottom: spacing.md },
  successText:      { color: colors.success, fontWeight: "700", fontSize: fontSize.sm },
  docCard:          { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, ...shadow.sm },
  docText:          { fontFamily: "monospace", fontSize: 12, lineHeight: 20, color: colors.text.primary },
  highlighted:      { backgroundColor: "#FFEE58", color: "#1A1A1A", fontWeight: "700" },
  panel:            { backgroundColor: colors.surface, borderTopWidth: 2, borderTopColor: colors.primary, padding: spacing.md, gap: spacing.sm },
  fragmentInput:    { borderWidth: 1, borderColor: colors.primaryLight, borderRadius: 6, padding: spacing.sm, fontSize: fontSize.sm, color: colors.text.primary, minHeight: 44, maxHeight: 120, backgroundColor: colors.primaryLight, textAlignVertical: "top" },
  instructionRow:   { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs },
  instructionInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, fontSize: fontSize.sm, color: colors.text.primary, minHeight: 60, maxHeight: 100, backgroundColor: colors.background, textAlignVertical: "top" },
  sendBtn:          { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.secondary, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled:  { backgroundColor: colors.border },
  sendIcon:         { color: "#fff", fontSize: 18, marginLeft: 2 },
  doneBtn:          { backgroundColor: colors.success },
});
