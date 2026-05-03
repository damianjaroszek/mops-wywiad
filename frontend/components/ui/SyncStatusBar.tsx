import React from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useSyncStore, SyncStatus } from "@/store/syncStore";
import { colors, fontSize } from "@/constants/theme";

type Config = { text: string; bg: string; textColor: string; spin?: true };

const CONFIGS: Partial<Record<SyncStatus, Config>> = {
  pending: { text: "● Niezapisane zmiany",               bg: "#FFF8E1", textColor: "#F57F17" },
  syncing: { text: "Zapisywanie...",                      bg: colors.primaryLight, textColor: colors.primary, spin: true },
  synced:  { text: "✓ Zapisano na serwerze",              bg: "#E8F5E9", textColor: colors.success },
  offline: { text: "📵 Offline — dane zapisane lokalnie", bg: "#ECEFF1", textColor: "#546E7A" },
  error:   { text: "⚠ Błąd zapisu — ponawiam za chwilę", bg: "#FFF3E0", textColor: colors.warning },
};

export default function SyncStatusBar() {
  const status = useSyncStore((s) => s.status);
  const cfg = CONFIGS[status];

  if (!cfg) return null;

  return (
    <View style={[styles.bar, { backgroundColor: cfg.bg }]}>
      {cfg.spin && (
        <ActivityIndicator size="small" color={cfg.textColor} style={styles.spinner} />
      )}
      <Text style={[styles.text, { color: cfg.textColor }]}>{cfg.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar:     { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 5, paddingHorizontal: 12 },
  spinner: { marginRight: 6 },
  text:    { fontSize: 11, fontWeight: "600" },
});
