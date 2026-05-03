/**
 * Ekran korekty pisma — pełny dokument + panel instrukcji
 * Obsługuje wiele kolejnych korekt bez opuszczania ekranu.
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View, ScrollView, StyleSheet, Text, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { Button } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useInterviewStore } from "@/store/interviewStore";
import { reviseDocument } from "@/services/api";
import { colors, spacing, fontSize, shadow } from "@/constants/theme";

const MAX_FRAGMENT_LEN = 800;

const QUICK_TIPS = [
  "Popraw styl na bardziej formalny",
  "Dodaj podstawę prawną",
  "Skróć ten fragment",
  "Rozwiń opis sytuacji",
  "Popraw błąd gramatyczny",
  "Uzupełnij brakującą datę",
];

export default function ReviseScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const store = useInterviewStore();
  const interviewId = id || store.interviewId;

  // liveDocument — aktualna czysta wersja pisma (bez «»), aktualizowana po każdej korekcie
  const [liveDocument, setLiveDocument] = useState(store.generatedDocument || "");
  // markedDocument — wersja z «» wyświetlana po korekcie; null = brak aktywnej korekty
  const [markedDocument, setMarkedDocument] = useState<string | null>(null);

  const [fragment, setFragment] = useState("");
  const [instruction, setInstruction] = useState("");
  const [revising, setRevising] = useState(false);
  const [reviseCount, setReviseCount] = useState(0);
  const [lastSuccess, setLastSuccess] = useState(false);

  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    Clipboard.getStringAsync()
      .then((clip) => {
        const trimmed = clip?.trim() ?? "";
        if (trimmed.length > 3 && trimmed.length <= MAX_FRAGMENT_LEN && liveDocument.includes(trimmed)) {
          setFragment(trimmed);
        }
      })
      .catch(() => {});
  }, []);

  const handleRevise = async () => {
    if (!instruction.trim() || !interviewId || !liveDocument) return;
    setRevising(true);
    setLastSuccess(false);
    try {
      const result = await reviseDocument(
        interviewId,
        instruction.trim(),
        liveDocument,
        fragment || undefined,
      );
      const clean = result.document.replace(/[«»]/g, "");
      setMarkedDocument(result.document);
      setLiveDocument(clean);
      store.setGeneratedDocument(clean, store.lawReferences);
      setReviseCount((c) => c + 1);
      setInstruction("");
      setFragment("");
      setLastSuccess(true);
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    } catch (e: any) {
      Alert.alert("Błąd korekty", e.message);
    } finally {
      setRevising(false);
    }
  };

  const handlePasteFragment = async () => {
    try {
      const clip = await Clipboard.getStringAsync();
      const trimmed = clip?.trim() ?? "";
      if (trimmed.length > 3) setFragment(trimmed.slice(0, MAX_FRAGMENT_LEN));
    } catch {}
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
      {/* Nagłówek */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Wróć</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Popraw pismo</Text>
        {reviseCount > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{reviseCount}×</Text>
          </View>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        {/* Dokument */}
        <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll}>
          {lastSuccess && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>
                ✓ Korekta {reviseCount} zastosowana — żółte fragmenty zostały zmienione
              </Text>
            </View>
          )}
          <View style={styles.docCard}>
            {renderDocumentText(markedDocument ?? liveDocument)}
          </View>
          <Text style={styles.selectHint}>
            Zaznacz tekst → Kopiuj → wklej w „Fragment do zmiany" poniżej
          </Text>
        </ScrollView>

        {/* Panel korekty — zawsze widoczny */}
        <View style={styles.panel}>
          {/* Fragment */}
          <View style={styles.fragmentHeader}>
            <Text style={styles.fragmentLabel}>
              Fragment do zmiany{" "}
              <Text style={styles.optional}>(opcjonalnie)</Text>
            </Text>
            <TouchableOpacity
              onPress={handlePasteFragment}
              style={styles.pasteBtn}
              disabled={revising}
            >
              <Text style={styles.pasteBtnText}>📋 Wklej</Text>
            </TouchableOpacity>
          </View>

          {fragment ? (
            <View style={styles.fragmentPreview}>
              <Text style={styles.fragmentPreviewText} numberOfLines={2}>
                {fragment}
              </Text>
              <TouchableOpacity
                onPress={() => setFragment("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={revising}
              >
                <Text style={styles.fragmentClear}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TextInput
              style={styles.fragmentInput}
              value={fragment}
              onChangeText={(v) => setFragment(v.slice(0, MAX_FRAGMENT_LEN))}
              placeholder="Skopiuj fragment z dokumentu i wklej tutaj"
              placeholderTextColor={colors.text.disabled}
              multiline
              numberOfLines={2}
              textAlignVertical="top"
              editable={!revising}
            />
          )}

          {/* Szybkie sugestie */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
          >
            {QUICK_TIPS.map((tip) => (
              <TouchableOpacity
                key={tip}
                style={[styles.chip, instruction === tip && styles.chipActive]}
                onPress={() => setInstruction(instruction === tip ? "" : tip)}
                disabled={revising}
              >
                <Text style={[styles.chipText, instruction === tip && styles.chipTextActive]}>
                  {tip}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Instrukcja + wyślij */}
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

          {/* Przycisk powrotu */}
          <Button
            mode={reviseCount > 0 ? "contained" : "outlined"}
            onPress={() => router.back()}
            icon={reviseCount > 0 ? "check" : "arrow-left"}
            style={reviseCount > 0 ? styles.doneBtnFilled : styles.doneBtn}
            disabled={revising}
          >
            {reviseCount > 0 ? "Gotowe — wróć do pisma" : "Wróć bez zmian"}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:                { flex: 1, backgroundColor: colors.background },

  // Nagłówek
  header:              { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: spacing.md, backgroundColor: colors.primary },
  backBtn:             { padding: spacing.sm },
  backText:            { color: "#fff", fontSize: fontSize.sm },
  headerTitle:         { color: "#fff", fontSize: fontSize.md, fontWeight: "600" },
  headerSpacer:        { width: 50 },
  countBadge:          { backgroundColor: colors.success, borderRadius: 12, paddingHorizontal: spacing.sm, paddingVertical: 2, minWidth: 36, alignItems: "center" },
  countText:           { color: "#fff", fontSize: fontSize.sm, fontWeight: "700" },

  // Dokument
  scroll:              { padding: spacing.md, paddingBottom: spacing.md },
  successBanner:       { backgroundColor: "#E8F5E9", borderRadius: 8, padding: spacing.md, marginBottom: spacing.md },
  successText:         { color: colors.success, fontWeight: "700", fontSize: fontSize.sm, lineHeight: 20 },
  docCard:             { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, ...shadow.sm },
  docText:             { fontFamily: "monospace", fontSize: 12, lineHeight: 20, color: colors.text.primary },
  highlighted:         { backgroundColor: "#FFEE58", color: "#1A1A1A", fontWeight: "700" },
  selectHint:          { fontSize: 11, color: colors.text.disabled, textAlign: "center", marginTop: spacing.sm, fontStyle: "italic" },

  // Panel
  panel:               { backgroundColor: colors.surface, borderTopWidth: 2, borderTopColor: colors.primary, padding: spacing.md, gap: spacing.sm },

  // Fragment
  fragmentHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  fragmentLabel:       { fontSize: fontSize.sm, color: colors.text.secondary, fontWeight: "600" },
  optional:            { fontWeight: "400", color: colors.text.disabled },
  pasteBtn:            { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.primaryLight },
  pasteBtnText:        { fontSize: fontSize.sm, color: colors.primary, fontWeight: "600" },
  fragmentInput:       { borderWidth: 1, borderColor: colors.primaryLight, borderRadius: 6, padding: spacing.sm, fontSize: fontSize.sm, color: colors.text.primary, minHeight: 44, maxHeight: 80, backgroundColor: colors.primaryLight, textAlignVertical: "top" },
  fragmentPreview:     { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryLight, borderRadius: 6, padding: spacing.sm, gap: spacing.xs },
  fragmentPreviewText: { flex: 1, fontSize: fontSize.sm, color: colors.primary, fontStyle: "italic" },
  fragmentClear:       { fontSize: 16, color: colors.text.disabled, fontWeight: "700" },

  // Szybkie sugestie
  chipsScroll:         { marginHorizontal: -spacing.md },
  chipsContent:        { paddingHorizontal: spacing.md, gap: spacing.xs },
  chip:                { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  chipActive:          { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText:            { fontSize: 11, color: colors.text.secondary, fontWeight: "500" },
  chipTextActive:      { color: "#fff", fontWeight: "600" },

  // Instrukcja
  instructionRow:      { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs },
  instructionInput:    { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 8, padding: spacing.sm, fontSize: fontSize.sm, color: colors.text.primary, minHeight: 60, maxHeight: 100, backgroundColor: colors.background, textAlignVertical: "top" },
  sendBtn:             { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center" },
  sendBtnDisabled:     { backgroundColor: colors.border },
  sendIcon:            { color: "#fff", fontSize: 18, marginLeft: 2 },

  // Powrót
  doneBtn:             { borderColor: colors.secondary },
  doneBtnFilled:       { backgroundColor: colors.success },
});
