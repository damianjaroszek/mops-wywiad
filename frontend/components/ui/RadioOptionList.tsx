/**
 * RadioOptionList — lista opcji z RadioButton (react-native-paper).
 * Zastępuje powtarzający się pattern RadioButton.Group + TouchableOpacity.map.
 */
import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { RadioButton } from "react-native-paper";
import { colors, fontSize } from "@/constants/theme";

interface Option {
  value: string;
  label: string;
}

interface Props {
  options: readonly Option[];
  value: string;
  onValueChange: (v: string) => void;
}

export default function RadioOptionList({ options, value, onValueChange }: Props) {
  return (
    <RadioButton.Group value={value} onValueChange={onValueChange}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={styles.row}
          onPress={() => onValueChange(opt.value)}
        >
          <RadioButton value={opt.value} color={colors.primary} />
          <Text style={styles.label}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </RadioButton.Group>
  );
}

const styles = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  label: { fontSize: fontSize.md, color: colors.text.primary, flex: 1 },
});
