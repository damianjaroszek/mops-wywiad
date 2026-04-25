/**
 * Ekran główny — lista wywiadów
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View, FlatList, TouchableOpacity, StyleSheet, Alert,
  RefreshControl, Text,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, FAB, Divider, ActivityIndicator, Chip } from "react-native-paper";
import { router } from "expo-router";
import { listInterviews, deleteInterview, getInterview, normalizeFormDataForStore, Interview } from "@/services/api";
import { useInterviewStore } from "@/store/interviewStore";
import { colors, spacing, fontSize, shadow } from "@/constants/theme";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Szkic", color: colors.warning },
  completed: { label: "Gotowy", color: colors.success },
  exported: { label: "Eksportowany", color: colors.primary },
};

export default function HomeScreen() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [waking, setWaking] = useState(false);
  const { resetForm, loadInterviewData } = useInterviewStore();
  const [resumingId, setResumingId] = useState<string | null>(null);

  const isNetworkError = (e: any) =>
    e?.message?.toLowerCase().includes("network") || e?.message?.includes("połączenia");

  const load = useCallback(async (isRefresh = false) => {
    try {
      const data = await listInterviews();
      setInterviews(data.items);
      setWaking(false);
    } catch (e: any) {
      if (isNetworkError(e)) {
        setWaking(true);
        setTimeout(() => load(), 20000);
      } else if (!isRefresh) {
        Alert.alert("Błąd", e.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const handleNew = () => {
    resetForm();
    router.push("/interview/step1");
  };

  const handleResumeDraft = async (id: string) => {
    setResumingId(id);
    try {
      const interview = await getInterview(id);
      loadInterviewData(id, normalizeFormDataForStore(interview.form_data));
      router.push("/interview/summary");
    } catch (e: any) {
      Alert.alert("Błąd", e.message);
    } finally {
      setResumingId(null);
    }
  };

  const handleEdit = async (id: string) => {
    setResumingId(id);
    try {
      const interview = await getInterview(id);
      loadInterviewData(id, normalizeFormDataForStore(interview.form_data));
      router.push("/interview/step1");
    } catch (e: any) {
      Alert.alert("Błąd", e.message);
    } finally {
      setResumingId(null);
    }
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      "Usuń wywiad",
      `Czy na pewno usunąć wywiad dla ${name}?`,
      [
        { text: "Anuluj", style: "cancel" },
        {
          text: "Usuń", style: "destructive",
          onPress: async () => {
            try { await deleteInterview(id); setInterviews((p) => p.filter((i) => i.id !== id)); }
            catch (e: any) { Alert.alert("Błąd", e.message); }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Interview }) => {
    const s = STATUS_LABELS[item.status] || STATUS_LABELS.draft;
    const personal = item.form_data?.personal || {};
    const name = `${personal.first_name || "—"} ${personal.last_name || ""}`.trim();
    const date = new Date(item.created_at).toLocaleDateString("pl-PL");
    const isDraft = item.status === "draft";
    const isResuming = resumingId === item.id;
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => isDraft ? handleResumeDraft(item.id) : router.push(`/interview/result?id=${item.id}`)}
      >
        <View style={styles.cardRow}>
          <Text style={styles.cardName}>{name || "Brak danych"}</Text>
          <Chip style={[styles.chip, { backgroundColor: s.color + "22" }]} textStyle={{ color: s.color, fontSize: 11 }}>{s.label}</Chip>
        </View>
        <Text style={styles.cardSub}>{date}</Text>
        <View style={styles.cardActions}>
          {isDraft ? (
            <Button mode="text" compact loading={isResuming} onPress={() => handleResumeDraft(item.id)}>Kontynuuj</Button>
          ) : (
            <Button mode="text" compact onPress={() => router.push(`/interview/result?id=${item.id}`)}>Otwórz</Button>
          )}
          <Button mode="text" compact loading={isResuming} onPress={() => handleEdit(item.id)}>Edytuj</Button>
          <Button mode="text" compact textColor={colors.error} onPress={() => handleDelete(item.id, name)}>Usuń</Button>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>MOPS Wywiad</Text>
        <Text style={styles.headerSub}>Wywiady środowiskowe</Text>
      </View>
      {waking && (
        <View style={styles.wakingBanner}>
          <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: spacing.sm }} />
          <Text style={styles.wakingText}>Serwer się uruchamia, proszę czekać… (~30 s)</Text>
        </View>
      )}
      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} color={colors.primary} />
      ) : (
        <FlatList
          data={interviews}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Brak wywiadów</Text>
              <Text style={styles.emptySubText}>Naciśnij + aby dodać nowy</Text>
            </View>
          }
        />
      )}
      <FAB style={styles.fab} icon="plus" onPress={handleNew} label="Nowy wywiad" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  headerTitle: { color: "#fff", fontSize: fontSize.xxl, fontWeight: "700" },
  headerSub: { color: "#ffffffcc", fontSize: fontSize.sm, marginTop: 2 },
  list: { padding: spacing.md, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, ...shadow.sm },
  cardRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardName: { fontSize: fontSize.lg, fontWeight: "600", color: colors.text.primary, flex: 1 },
  cardSub: { fontSize: fontSize.sm, color: colors.text.secondary, marginTop: 4 },
  cardActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: spacing.xs },
  chip: { borderRadius: 20 },
  empty: { alignItems: "center", paddingTop: 80 },
  emptyText: { fontSize: fontSize.lg, color: colors.text.secondary, fontWeight: "600" },
  emptySubText: { fontSize: fontSize.sm, color: colors.text.disabled, marginTop: 4 },
  fab: { position: "absolute", right: spacing.lg, bottom: spacing.xl, backgroundColor: colors.primary },
  wakingBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFF9C4", paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: "#FDD835" },
  wakingText: { flex: 1, fontSize: fontSize.sm, color: "#5D4037" },
});
