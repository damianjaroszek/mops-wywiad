import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { fontSize, spacing } from "@/constants/theme";

interface Props { visible: boolean }

export default function ScrollEndBanner({ visible }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.text}>↓ Przewiń w dół — formularz ma więcej pól</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#FFF8E1",
    borderTopWidth: 1,
    borderTopColor: "#FFD54F",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: "center",
  },
  text: {
    fontSize: fontSize.sm,
    color: "#E65100",
    fontWeight: "600",
  },
});
