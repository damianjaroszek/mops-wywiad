import React, { useRef, useImperativeHandle } from "react";
import { View, Text, StyleSheet, TextInputProps } from "react-native";
import { TextInput } from "react-native-paper";
import { colors, spacing, fontSize } from "@/constants/theme";

export type FormFieldRef = { focus: () => void };

interface Props {
  label: string;
  required?: boolean;
  error?: boolean;
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

const FormField = React.forwardRef<FormFieldRef, Props>(function FormField(
  {
    label, required, error, value, onChangeText, placeholder,
    keyboardType, multiline, numberOfLines = 1, maxLength, secureTextEntry, style,
  },
  ref,
) {
  const inputRef = useRef<any>(null);
  useImperativeHandle(ref, () => ({ focus: () => inputRef.current?.focus() }));

  return (
    <View style={[styles.wrapper, style]}>
      <Text style={[styles.label, error && styles.labelError]}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TextInput
        ref={inputRef}
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
        underlineColor={error ? colors.error : colors.border}
        activeUnderlineColor={error ? colors.error : colors.primary}
        style={styles.input}
        contentStyle={styles.content}
        dense={!multiline}
      />
      {error && <Text style={styles.errorText}>To pole jest wymagane</Text>}
    </View>
  );
});

export default FormField;

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
  labelError: {
    color: colors.error,
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
  errorText: {
    fontSize: 11,
    color: colors.error,
    marginTop: 2,
  },
});
