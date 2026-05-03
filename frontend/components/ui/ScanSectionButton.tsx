/**
 * ScanSectionButton — przycisk skanowania sekcji formularza papierowego.
 * Używa Claude Vision do wyodrębnienia danych (bez danych osobowych).
 * Wyświetla podgląd wyodrębnionych pól przed zastosowaniem.
 */
import React, { useState } from "react";
import {
  View, Text, StyleSheet, Modal, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
} from "react-native";
import { Button } from "react-native-paper";
import { colors, spacing, fontSize } from "@/constants/theme";
import { pickAndScanSection, pickFromLibraryAndScanSection, ScanResult } from "@/services/scan";

interface Props {
  step: number;
  onApply: (data: Record<string, any>) => void;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "boolean") return val ? "Tak" : "Nie";
  if (Array.isArray(val)) {
    if (val.length === 0) return "—";
    if (typeof val[0] === "object") {
      return `${val.length} element(ów)`;
    }
    return val.join(", ");
  }
  if (typeof val === "object") return JSON.stringify(val);
  const s = String(val);
  return s === "" ? "—" : s;
}

function hasNonNullFields(data: Record<string, any>): boolean {
  return Object.values(data).some((v) => {
    if (v === null || v === undefined || v === "") return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
}

const FIELD_LABELS: Record<string, string> = {
  apartment_type: "Typ lokalu",
  rooms_count: "Liczba izb",
  floor: "Piętro",
  sleeping_places: "Miejsca do spania",
  has_cold_water: "Zimna woda",
  has_hot_water: "Ciepła woda",
  has_bathroom: "Łazienka",
  has_wc: "WC",
  has_gas: "Gaz",
  heating_type: "Ogrzewanie",
  apartment_condition: "Stan techniczny",
  employment_status: "Status zawodowy",
  is_registered_unemployed: "Rejestracja PUP",
  has_unemployment_benefit: "Zasiłek dla bezrobotnych",
  unemployment_benefit_amount: "Kwota zasiłku",
  qualifications: "Wykształcenie / kwalifikacje",
  last_employment: "Ostatnie miejsce pracy",
  has_health_insurance: "Ubezpieczenie NFZ",
  chronically_ill_count: "Os. długotrwale chore",
  illness_types: "Rodzaj schorzeń",
  has_disability_certificate: "Orzeczenie niepełnosprawności",
  disability_degree: "Stopień niepełnosprawności",
  has_incapacity_certificate: "Orzeczenie niezdolności",
  has_addiction: "Uzależnienie",
  addiction_types: "Rodzaj uzależnienia",
  additional_health_info: "Inne informacje zdrowotne",
  members: "Członkowie rodziny",
  has_conflicts: "Konflikty w rodzinie",
  has_domestic_violence: "Przemoc domowa",
  has_childcare_issues: "Problemy wychowawcze",
  conflicts_description: "Opis konfliktów",
  violence_description: "Opis przemocy",
  childcare_description: "Opis problemów wychowawczych",
  total_family_income: "Dochód rodziny (zł/mies.)",
  income_per_person: "Dochód na osobę (zł/mies.)",
  monthly_expenses_total: "Wydatki miesięczne (zł)",
  needs_and_expectations: "Potrzeby i oczekiwania",
};

export default function ScanSectionButton({ step, onApply }: Props) {
  const [loading, setLoading] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, any> | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleScan = async (fromLibrary = false) => {
    setLoading(true);
    try {
      const result: ScanResult = fromLibrary
        ? await pickFromLibraryAndScanSection(step)
        : await pickAndScanSection(step);

      if (!hasNonNullFields(result.extracted_data)) {
        Alert.alert(
          "Brak danych",
          "Nie udało się odczytać żadnych pól z tego zdjęcia. Sprawdź jakość zdjęcia i spróbuj ponownie."
        );
        return;
      }

      setPreviewData(result.extracted_data);
      setModalVisible(true);
    } catch (err: any) {
      if (err?.message === "CANCELLED") return;
      Alert.alert("Błąd skanowania", err?.message ?? "Wystąpił nieznany błąd. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (previewData) {
      onApply(previewData);
    }
    setModalVisible(false);
    setPreviewData(null);
  };

  const handlePickSource = () => {
    Alert.alert(
      "Źródło zdjęcia",
      "Wybierz skąd pobrać zdjęcie formularza",
      [
        { text: "Aparat", onPress: () => handleScan(false) },
        { text: "Galeria", onPress: () => handleScan(true) },
        { text: "Anuluj", style: "cancel" },
      ]
    );
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            Masz papierowy formularz? Zrób zdjęcie tej sekcji aby automatycznie wypełnić pola.
          </Text>
        </View>
        <Button
          mode="outlined"
          icon={loading ? undefined : "camera"}
          onPress={handlePickSource}
          disabled={loading}
          style={styles.btn}
          contentStyle={styles.btnContent}
          labelStyle={styles.btnLabel}
        >
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.btnLabel}>Analizuję zdjęcie…</Text>
            </View>
          ) : "Skanuj sekcję formularza"}
        </Button>
        <Text style={styles.disclaimer}>
          Dane osobowe nie są skanowane — wypełnij je ręcznie w kroku 1.
        </Text>
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Podgląd rozpoznanych danych</Text>
            <Text style={styles.modalSubtitle}>
              Sprawdź czy dane są poprawne, a następnie zastosuj lub wróć do ręcznego wypełniania.
            </Text>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
            {previewData && Object.entries(previewData).map(([key, val]) => {
              if (val === null || val === undefined || val === "") return null;
              if (Array.isArray(val) && val.length === 0) return null;
              const label = FIELD_LABELS[key] ?? key;
              const display = formatValue(val);
              if (display === "—") return null;
              return (
                <View key={key} style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>{label}</Text>
                  <Text style={styles.fieldValue}>{display}</Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              mode="contained"
              onPress={handleApply}
              style={styles.applyBtn}
              icon="check"
            >
              Zastosuj dane
            </Button>
            <Button
              mode="outlined"
              onPress={() => { setModalVisible(false); setPreviewData(null); }}
              style={styles.cancelBtn}
            >
              Wypełnij ręcznie
            </Button>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container:    { backgroundColor: colors.primaryLight, borderRadius: 8, padding: spacing.md, marginBottom: spacing.md },
  infoRow:      { flexDirection: "row", alignItems: "flex-start", marginBottom: spacing.sm },
  infoText:     { fontSize: fontSize.sm, color: colors.secondary, flex: 1 },
  btn:          { borderColor: colors.primary },
  btnContent:   { paddingVertical: 4 },
  btnLabel:     { fontSize: fontSize.sm, color: colors.primary },
  loadingRow:   { flexDirection: "row", alignItems: "center" },
  disclaimer:   { fontSize: 11, color: colors.text.disabled, marginTop: spacing.xs, textAlign: "center" },

  modal:        { flex: 1, backgroundColor: colors.background },
  modalHeader:  { padding: spacing.lg, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle:   { fontSize: fontSize.lg, fontWeight: "700", color: colors.text.primary, marginBottom: 4 },
  modalSubtitle:{ fontSize: fontSize.sm, color: colors.text.secondary },
  modalScroll:  { flex: 1 },
  modalContent: { padding: spacing.md, paddingBottom: spacing.xl },

  fieldRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  fieldLabel:   { fontSize: fontSize.sm, color: colors.text.secondary, flex: 1, marginRight: spacing.sm },
  fieldValue:   { fontSize: fontSize.sm, color: colors.text.primary, fontWeight: "600", flex: 1, textAlign: "right" },

  modalFooter:  { padding: spacing.md, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  applyBtn:     { borderRadius: 8 },
  cancelBtn:    { borderRadius: 8, borderColor: colors.primary },
});
