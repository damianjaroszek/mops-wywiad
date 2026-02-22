/**
 * Wspólne style dla ekranów kroków formularza wywiadu.
 * Używaj jako: import { cs } from "@/constants/commonStyles";
 */
import { StyleSheet } from "react-native";
import { colors, spacing, fontSize, shadow } from "@/constants/theme";

export const cs = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: colors.background },
  scroll:     { padding: spacing.md, paddingBottom: 100 },
  title:      { fontSize: fontSize.xl, fontWeight: "700", color: colors.text.primary, marginBottom: spacing.md },
  card:       { backgroundColor: colors.surface, borderRadius: 12, padding: spacing.md, marginBottom: spacing.md, ...shadow.sm },
  cardTitle:  { fontSize: fontSize.md, fontWeight: "700", color: colors.primary, marginBottom: spacing.sm },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: "600", color: colors.text.secondary, marginBottom: spacing.xs },
  footer:     { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  nextBtn:    { backgroundColor: colors.primary },
});
