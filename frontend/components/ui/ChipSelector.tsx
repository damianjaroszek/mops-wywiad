/**
 * ChipSelector — jednowariantowy selektor chipów (single-select).
 *
 * variant="outline" (domyślny): active chip ma jasne tło (primaryLight) i niebieski tekst
 * variant="filled": active chip ma pełne tło primary i biały tekst
 *
 * size="sm" (domyślny): mniejsze pady — do modali i gęstych widoków
 * size="md": większe pady — do głównych ekranów formularza
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { colors, spacing, fontSize } from "@/constants/theme";

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: Option[];
  value: string;
  onSelect: (v: string) => void;
  variant?: "outline" | "filled";
  size?: "sm" | "md";
  containerStyle?: ViewStyle;
}

export default function ChipSelector({
  options,
  value,
  onSelect,
  variant = "outline",
  size = "sm",
  containerStyle,
}: Props) {
  const isFilled = variant === "filled";
  const isMd = size === "md";

  return (
    <View style={[styles.group, containerStyle]}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.chip,
              isMd && styles.chipMd,
              active && (isFilled ? styles.chipFilledActive : styles.chipOutlineActive),
            ]}
            onPress={() => onSelect(opt.value)}
          >
            <Text
              style={[
                styles.text,
                active && (isFilled ? styles.textFilledActive : styles.textOutlineActive),
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group:             { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  chip:              { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  chipMd:            { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipOutlineActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipFilledActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  text:              { fontSize: fontSize.sm, color: colors.text.secondary },
  textOutlineActive: { color: colors.primary, fontWeight: "600" },
  textFilledActive:  { color: "#fff", fontWeight: "600" },
});
