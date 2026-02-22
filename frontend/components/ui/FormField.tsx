/**
 * FormField — pole formularza z etykietą nad inputem (nie pływającą).
 * Eliminuje "notch" i przekreśloną etykietę z MD3 outlined mode.
 */
import React from "react";
import { View, Text, StyleSheet, TextInputProps } from "react-native";
import { TextInput } from "react-native-paper";
import { colors, spacing, fontSize } from "@/constants/theme";

interface Props {
  label: string;
  required?: boolean;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: TextInputProps["keyboardType"];
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  secureTextEntry?: boolean;
  style?: object;
}

export default function FormField({
  label,
  required,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  numberOfLines = 1,
  maxLength,
  secureTextEntry,
  style,
}: Props) {
  return (
    <View style={[styles.wrapper, style]}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.disabled}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? numberOfLines : undefined}
        maxLength={maxLength}
        secureTextEntry={secureTextEntry}
        mode="flat"
        underlineColor={colors.border}
        activeUnderlineColor={colors.primary}
        style={styles.input}
        contentStyle={styles.content}
        dense={!multiline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    color: colors.text.secondary,
    marginBottom: 6,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderRadius: 0,
  },
  content: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    paddingHorizontal: 0,
    minHeight: 44,
  },
});
