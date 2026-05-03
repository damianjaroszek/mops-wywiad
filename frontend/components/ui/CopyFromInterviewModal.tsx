/**
 * CopyFromInterviewModal — wyszukiwarka poprzednich wywiadów do skopiowania danych.
 * Otwierana z kroku 1. Pracownik wybiera wywiad, dane wczytują się do nowego formularza.
 */
import React, { useState, useEffect, useMemo } from "react";
import {
  View, Text, Modal, StyleSheet, FlatList,
  TouchableOpacity, TextInput, ActivityIndicator,
} from "react-native";
import { Button } from "react-native-paper";
import { colors, spacing, fontSize } from "@/constants/theme";
import { listInterviews, Interview } from "@/services/api";

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (formData: Record<string, any>) => void;
}

function interviewLabel(item: Interview): { name: string; sub: string } {
  const p = item.form_data?.personal ?? {};
  const name = [p.first_name, p.last_name].filter(Boolean).join(" ") || "Wywiad bez danych";
  const date = new Date(item.created_at).toLocaleDateString("pl-PL");
  const city = p.address_city ? ` · ${p.address_city}` : "";
  const sub = `${date}${city}`;
  return { name, sub };
}

export default function CopyFromInterviewModal({ visible, onClose, onApply }: Props) {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setError(null);
    setLoading(true);
    listInterviews(1, 100)
      .then((data) => setInterviews(data.items ?? []))
      .catch((e) => setError(e.message ?? "Błąd ładowania wywiadów"))
      .finally(() => setLoading(false));
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return interviews;
    return interviews.filter((item) => {
      const p = item.form_data?.personal ?? {};
      const name = `${p.first_name ?? ""} ${p.last_name ?? ""} ${p.address_city ?? ""}`.toLowerCase();
      return name.includes(q);
    });
  }, [interviews, query]);

  const handleSelect = (item: Interview) => {
    setApplying(item.id);
    // Small delay so the spinner renders before the synchronous store update
    setTimeout(() => {
      onApply(item.form_data ?? {});
      setApplying(null);
      onClose();
    }, 50);
  };

  const renderItem = ({ item }: { item: Interview }) => {
    const { name, sub } = interviewLabel(item);
    const isApplying = applying === item.id;
    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => handleSelect(item)}
        disabled={applying !== null}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
          <Text style={styles.rowSub}>{sub}</Text>
        </View>
        {isApplying
          ? <ActivityIndicator size="small" color={colors.primary} />
          : <Text style={styles.rowArrow}>→</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        {/* Nagłówek */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Kopiuj z poprzedniego wywiadu</Text>
            <Text style={styles.subtitle}>
              Wybierz klienta — jego dane trafią do nowego formularza
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.closeText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Wyszukiwarka */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Szukaj po imieniu, nazwisku lub miejscowości…"
            placeholderTextColor={colors.text.disabled}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
        </View>

        {/* Lista */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Wczytuję wywiady…</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <Button onPress={() => {
              setError(null);
              setLoading(true);
              listInterviews(1, 100)
                .then((data) => setInterviews(data.items ?? []))
                .catch((e) => setError(e.message))
                .finally(() => setLoading(false));
            }}>Spróbuj ponownie</Button>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyText}>
              {query ? "Brak wyników dla podanej frazy." : "Brak poprzednich wywiadów."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Stopka */}
        <View style={styles.footer}>
          <Text style={styles.footerNote}>
            Po wczytaniu możesz zaktualizować dane, które się zmieniły. Powstanie nowy wywiad.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: colors.background },
  header:       { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", backgroundColor: colors.primary, padding: spacing.md, paddingTop: spacing.lg },
  title:        { color: "#fff", fontSize: fontSize.md, fontWeight: "700" },
  subtitle:     { color: "#ffffffbb", fontSize: fontSize.sm, marginTop: 2 },
  closeBtn:     { padding: spacing.xs },
  closeText:    { color: "#fff", fontSize: fontSize.lg, fontWeight: "700" },

  searchRow:    { padding: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  searchInput:  { backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: fontSize.sm, color: colors.text.primary, borderWidth: 1, borderColor: colors.border },

  list:         { paddingBottom: spacing.xl },
  row:          { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  rowName:      { fontSize: fontSize.md, fontWeight: "600", color: colors.text.primary },
  rowSub:       { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: 2 },
  rowArrow:     { fontSize: fontSize.lg, color: colors.primary, fontWeight: "700", marginLeft: spacing.sm },

  center:       { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  loadingText:  { marginTop: spacing.sm, fontSize: fontSize.sm, color: colors.text.secondary },
  errorText:    { fontSize: fontSize.sm, color: colors.error, textAlign: "center", marginBottom: spacing.sm },
  emptyText:    { fontSize: fontSize.sm, color: colors.text.disabled, textAlign: "center" },

  footer:       { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  footerNote:   { fontSize: fontSize.xs, color: colors.text.disabled, textAlign: "center", lineHeight: 18 },
});
