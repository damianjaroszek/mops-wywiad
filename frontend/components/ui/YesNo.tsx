/**
 * YesNo — przycisk Tak/Nie dla pól boolean | null
 * Eksportuje też typ TriBool używany w krokach formularza.
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, spacing, fontSize } from "@/constants/theme";

export type TriBool = boolean | null;

interface Props {
  value: TriBool;
  onChange: (v: boolean) => void;
}

export default function YesNo({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.chip, value === true && styles.chipYes]}
        onPress={() => onChange(true)}
      >
        <Text style={[styles.text, value === true && styles.textYes]}>✓ Tak</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.chip, value === false && styles.chipNo]}
        onPress={() => onChange(false)}
      >
        <Text style={[styles.text, value === false && styles.textNo]}>✗ Nie</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row:     { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  chip:    { flex: 1, paddingVertical: spacing.sm, borderRadius: 8, borderWidth: 1.5, borderColor: colors.border, alignItems: "center" },
  chipYes: { backgroundColor: "#E8F5E9", borderColor: colors.success },
  chipNo:  { backgroundColor: "#FFEBEE", borderColor: colors.error },
  text:    { fontSize: fontSize.md, fontWeight: "600", color: colors.text.secondary },
  textYes: { color: colors.success },
  textNo:  { color: colors.error },
});
