/**
 * ChipSelector — single-select i multi-select w stylu klikanych chipów.
 *
 * Single:  <ChipSelector value={str} onSelect={(v) => ...} options={...} />
 * Multi:   <ChipSelector multi values={arr} onSelect={(arr) => ...} options={...} />
 *
 * variant="outline" (domyślny): active chip ma jasne tło (primaryLight) i niebieski tekst
 * variant="filled": active chip ma pełne tło primary i biały tekst
 * size="sm" (domyślny): do modali / gęstych widoków
 * size="md": do głównych ekranów formularza
 */
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, LayoutAnimation, Platform, UIManager } from "react-native";
import { colors, spacing, fontSize } from "@/constants/theme";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface Option {
  value: string;
  label: string;
}

interface BaseProps {
  options: readonly Option[];
  variant?: "outline" | "filled";
  size?: "sm" | "md";
  containerStyle?: ViewStyle;
}

interface SingleProps extends BaseProps {
  multi?: false;
  value: string;
  onSelect: (v: string) => void;
  values?: never;
}

interface MultiProps extends BaseProps {
  multi: true;
  values: string[];
  onSelect: (v: string[]) => void;
  value?: never;
}

type Props = SingleProps | MultiProps;

export default function ChipSelector(props: Props) {
  const { options, variant = "outline", size = "sm", containerStyle } = props;
  const isFilled = variant === "filled";
  const isMd = size === "md";

  const isActive = (optValue: string) =>
    props.multi ? props.values.includes(optValue) : props.value === optValue;

  const handlePress = (optValue: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (props.multi) {
      const current = props.values;
      const next = current.includes(optValue)
        ? current.filter((v) => v !== optValue)
        : [...current, optValue];
      props.onSelect(next);
    } else {
      props.onSelect(optValue);
    }
  };

  return (
    <View style={[styles.group, containerStyle]}>
      {options.map((opt) => {
        const active = isActive(opt.value);
        return (
          <TouchableOpacity
            key={opt.value}
            style={[
              styles.chip,
              isMd && styles.chipMd,
              active && (isFilled ? styles.chipFilledActive : styles.chipOutlineActive),
            ]}
            onPress={() => handlePress(opt.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.text,
                isMd && styles.textMd,
                active && (isFilled ? styles.textFilledActive : styles.textOutlineActive),
              ]}
            >
              {props.multi && active ? `✓ ${opt.label}` : opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group:             { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  chip:              { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  chipMd:            { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipOutlineActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipFilledActive:  { backgroundColor: colors.primary, borderColor: colors.primary },
  text:              { fontSize: fontSize.sm, color: colors.text.secondary, fontWeight: "500" },
  textMd:            { fontSize: fontSize.md },
  textOutlineActive: { color: colors.primary, fontWeight: "700" },
  textFilledActive:  { color: "#fff", fontWeight: "700" },
});
